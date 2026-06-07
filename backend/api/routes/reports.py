"""
Parent Reports API — progress endpoint for parents/teachers.

Exposes a read-only endpoint that generates a full progress report
for a given student, based on their persisted BDI belief base and
session history.

Endpoint:
    GET /api/v1/reports/{student_id}
    → StudentProgressReport

This endpoint fulfils the "Módulo para Padres" described in the
OLIBOT technical specification.
"""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.db.database import get_db
from backend.db.repositories.student_repo import StudentRepository
from backend.db.repositories.session_repo import SessionRepository
from backend.pedagogy.curriculum import CURRICULUM, CurriculumEngine
from backend.pedagogy.scaffolding import ScaffoldingEngine
from backend.api.schemas.report import (
    StudentProgressReport,
    TopicMasteryReport,
    SessionSummary,
    BDIExplanation,
    AgeGroupReport,
)

router = APIRouter(prefix="/reports", tags=["reports"])

_curriculum = CurriculumEngine()
_scaffolding = ScaffoldingEngine()


@router.get("/{student_id}", response_model=StudentProgressReport)
def get_student_report(student_id: int, db: Session = Depends(get_db)):
    """
    Generates a full progress report for a student.

    The report is derived from:
      - student.beliefs["mastery"]  → per-topic progress (BDI belief base)
      - session history              → session-level statistics
      - CurriculumEngine             → topic metadata + recommendations
    """
    student_repo = StudentRepository(db)
    session_repo = SessionRepository(db)

    student = student_repo.get_by_id(student_id)
    if not student:
        raise HTTPException(status_code=404, detail=f"Student {student_id} not found")

    beliefs = student.beliefs
    all_sessions = session_repo.get_sessions_for_student(student_id)

    # ── Per-topic mastery breakdown ────────────────────────────────────────
    mastery_reports: list[TopicMasteryReport] = []

    for topic_id, topic in CURRICULUM.items():
        raw = beliefs.get("mastery", {}).get(topic_id, {})
        attempts = raw.get("attempts", 0)
        correct = raw.get("correct", 0)
        mastered = raw.get("mastered", False)
        success_rate = (correct / attempts) if attempts > 0 else 0.0
        hint_level = _scaffolding.get_hint_level(beliefs, topic_id)

        mastery_reports.append(TopicMasteryReport(
            topic_id=topic_id,
            display_name=topic.display_name,
            category=topic.category.value,
            emoji=topic.emoji,
            attempts=attempts,
            correct=correct,
            success_rate=round(success_rate, 3),
            mastered=mastered,
            hint_level_needed=hint_level,
        ))

    # Sort: mastered first, then by success rate desc, then by display name
    mastery_reports.sort(
        key=lambda r: (-int(r.mastered), -r.success_rate, r.display_name)
    )

    # ── Summary counts ─────────────────────────────────────────────────────
    topics_mastered = sum(1 for r in mastery_reports if r.mastered)
    topics_in_progress = sum(
        1 for r in mastery_reports if r.attempts > 0 and not r.mastered
    )
    topics_not_started = sum(1 for r in mastery_reports if r.attempts == 0)

    # ── Overall success rate ───────────────────────────────────────────────
    overall_success_rate = _scaffolding.get_overall_success_rate(beliefs)

    # ── Recommended focus (topics in progress with lowest success rate) ───
    in_progress = [r for r in mastery_reports if r.attempts > 0 and not r.mastered]
    in_progress_sorted = sorted(in_progress, key=lambda r: r.success_rate)
    recommended = in_progress_sorted[:3]  # Top 3 topics that need most attention
    recommended_focus = [r.topic_id for r in recommended]
    recommended_display_names = [r.display_name for r in recommended]

    # ── Session history ────────────────────────────────────────────────────
    session_summaries: list[SessionSummary] = []
    for sess in sorted(all_sessions, key=lambda s: s.started_at, reverse=True)[:10]:
        topic_obj = CURRICULUM.get(sess.topic)
        topic_display = topic_obj.display_name if topic_obj else sess.topic

        # Count how many shield triggers occurred in this session
        messages = session_repo.get_session_messages(sess.id)
        shield_count = sum(1 for m in messages if m.shield_triggered)

        session_summaries.append(SessionSummary(
            session_id=sess.id,
            topic_id=sess.topic,
            topic_display_name=topic_display,
            started_at=sess.started_at,
            messages_count=sess.messages_count,
            correct_answers=sess.correct_answers,
            incorrect_answers=sess.incorrect_answers,
            hints_given=sess.hints_given,
            success_rate=round(sess.success_rate, 3),
            shield_triggered_count=shield_count,
        ))

    # ── BDI Explainability (L1 Intention, L2 Plan, L3 Beliefs) ───────────────
    # Implements multi-level explainability as described in:
    # [2] Dennis & Oren (2022), [27] Yan, Burattini et al. (2023)
    bdi_explanation = _build_bdi_explanation(
        beliefs=beliefs,
        mastery_reports=mastery_reports,
        student_age=int(student.age or 4),
        recommended=[r for r in mastery_reports if r.topic_id in recommended_focus],
    )

    return StudentProgressReport(
        student_id=student.id,
        student_name=student.name,
        student_age=student.age,
        generated_at=datetime.utcnow(),
        total_sessions=student.total_sessions,
        total_messages=sum(s.messages_count for s in all_sessions),
        overall_success_rate=round(overall_success_rate, 3),
        topics_mastered=topics_mastered,
        topics_in_progress=topics_in_progress,
        topics_not_started=topics_not_started,
        mastery_by_topic=mastery_reports,
        age_groups=_build_age_groups(mastery_reports, int(student.age or 4), student.name),
        recommended_focus=recommended_focus,
        recommended_display_names=recommended_display_names,
        recent_sessions=session_summaries,
        bdi_explanation=bdi_explanation,
    )


# ── BDI explanation builder ────────────────────────────────────────────────────

def _build_bdi_explanation(
    beliefs: dict,
    mastery_reports: list[TopicMasteryReport],
    student_age: int,
    recommended: list[TopicMasteryReport],
) -> BDIExplanation:
    """
    Generates a template-based multi-level BDI explanation from the belief base.

    Cited framework:
        [2]  Dennis & Oren (2022) — three-level explanation (intention, plan, beliefs)
        [27] Yan, Burattini et al. (2023) — multi-level explainability for BDI agents
    """
    worked = [r for r in mastery_reports if r.attempts > 0]
    mastered = [r for r in worked if r.mastered]
    in_progress = [r for r in worked if not r.mastered]

    # ── L1: Intention (current desire / goal) ─────────────────────────────────
    if beliefs.get("placement_in_progress"):
        q_num = beliefs.get("placement_question", 1)
        current_desire = f"Evaluar el nivel inicial del alumno (pregunta {q_num} del test de nivel)"
        agent_status   = "Test de nivel en curso"
    elif beliefs.get("placement_done") is False and student_age >= 4:
        current_desire = "Determinar los conocimientos previos del alumno antes de comenzar"
        agent_status   = "Evaluación diagnóstica inicial"
    elif not worked:
        current_desire = "Iniciar el aprendizaje desde los contenidos básicos del currículo"
        agent_status   = "Primera sesión — sin actividad previa"
    elif in_progress:
        best = min(in_progress, key=lambda r: r.success_rate)
        current_desire = f"Consolidar: {best.display_name} ({round(best.success_rate * 100)}% de aciertos)"
        agent_status   = "Práctica activa"
    else:
        current_desire = "Introducir nuevos contenidos tras superar todos los temas trabajados"
        agent_status   = "Avance a nuevo contenido"

    # ── L2: Plan (topic selection reason + hint strategy) ─────────────────────
    if not worked:
        topic_reason = (
            "El alumno no tiene historial previo. El agente BDI aplica el plan "
            "'!select_first_topic': elige el primer tema del currículo que corresponde "
            "a su edad según los prerequisitos definidos en el currículo."
        )
    elif in_progress:
        focus = in_progress[0]
        sr_pct = round(focus.success_rate * 100)
        if sr_pct < 40:
            topic_reason = (
                f"'{focus.display_name}' tiene una tasa de aciertos baja ({sr_pct}%). "
                "El plan BDI '!respond(attempt_answer)' activa scaffolding máximo (nivel 3): "
                "respuesta guiada paso a paso, pistas explícitas."
            )
        elif sr_pct < 70:
            topic_reason = (
                f"'{focus.display_name}' está en la Zona de Desarrollo Próximo con {sr_pct}% de aciertos. "
                "El plan BDI '!respond(attempt_answer)' aplica scaffolding medio (nivel 2): "
                "pistas indirectas que fomentan el pensamiento autónomo."
            )
        else:
            topic_reason = (
                f"'{focus.display_name}' muestra buen rendimiento ({sr_pct}%). "
                "El plan BDI considera avance de topic o reducción de andamiaje (nivel 1). "
                "Si supera el umbral de mastery, '!select_next_topic' introduce el siguiente contenido."
            )
    else:
        topic_reason = (
            "Todos los temas trabajados han sido superados. "
            "El plan BDI '!select_next_topic' eligirá el siguiente tema del currículo "
            "basándose en la secuencia de prerequisitos."
        )

    # Hint strategy
    if in_progress:
        f = in_progress[0]
        sr = round(f.success_rate * 100)
        hl = f.hint_level_needed
        hint_strategy = (
            f"Nivel de andamiaje actual para '{f.display_name}': {hl}/3. "
            + ("Máximo soporte (respuesta guiada)." if hl == 3 else
               "Soporte medio (pistas socráticas)." if hl == 2 else
               "Mínimo soporte (autonomía del alumno).")
        )
    else:
        hint_strategy = "Sin temas en progreso — el agente determinará el andamiaje al iniciar."

    # Next topic preview
    next_topic = _curriculum.get_next_topic(beliefs, student_age)
    if next_topic:
        next_preview = (
            f"Siguiente tema previsto: {next_topic.emoji} {next_topic.display_name} "
            f"(categoría: {next_topic.category.value}). "
            f"Prerequisito: {', '.join(next_topic.prerequisites) or 'ninguno'}."
        )
    else:
        next_preview = "El alumno ha completado el currículo completo para su franja de edad."

    # ── L3: Beliefs (mastery evidence) ────────────────────────────────────────
    evidence = []
    for r in sorted(worked, key=lambda r: (-int(r.mastered), -r.success_rate))[:6]:
        status = "✅ Superado" if r.mastered else f"{round(r.success_rate * 100)}% aciertos"
        evidence.append(
            f"{r.emoji} {r.display_name}: {r.attempts} intentos — {status} "
            f"(andamiaje nivel {r.hint_level_needed})"
        )

    if not evidence:
        evidence = ["Sin actividad registrada en la base de creencias del agente."]

    # Belief summary
    total_worked = len(worked)
    mastered_count = len(mastered)
    if total_worked == 0:
        belief_summary = "Base de creencias vacía — primera sesión."
    else:
        belief_summary = (
            f"El agente BDI mantiene registros de mastery para {total_worked} tema(s): "
            f"{mastered_count} superado(s), {len(in_progress)} en progreso. "
            f"{'Test de nivel completado.' if beliefs.get('placement_done') else ''}"
        ).strip()

    return BDIExplanation(
        current_desire=current_desire,
        agent_status=agent_status,
        topic_selection_reason=topic_reason,
        hint_strategy=hint_strategy,
        next_topic_preview=next_preview,
        mastery_evidence=evidence,
        belief_summary=belief_summary,
    )


# ── Age-group breakdown builder ───────────────────────────────────────────────

def _build_age_groups(
    mastery_reports: list[TopicMasteryReport],
    student_age: int,
    student_name: str,
) -> list[AgeGroupReport]:
    """
    Groups curriculum topics by min_age and builds a per-age summary.

    For each group:
      - Shows how many topics are mastered / in progress / not started.
      - When all topics for a group are mastered, sets all_mastered=True and
        builds an advance_message suggesting the parent consider moving up.
      - For children aged 3-4 who complete their group, the message asks a
        parent to be present before advancing to the next level.
    """
    groups: dict[int, list[TopicMasteryReport]] = {}
    for r in mastery_reports:
        topic_obj = CURRICULUM.get(r.topic_id)
        if topic_obj is None:
            continue
        age_key = topic_obj.min_age
        groups.setdefault(age_key, []).append(r)

    result: list[AgeGroupReport] = []
    for age in sorted(groups.keys()):
        topics = groups[age]
        total     = len(topics)
        mastered  = sum(1 for t in topics if t.mastered)
        in_prog   = sum(1 for t in topics if t.attempts > 0 and not t.mastered)
        not_start = total - mastered - in_prog
        completion = mastered / total if total > 0 else 0.0
        all_done   = mastered == total and total > 0

        if all_done:
            next_age = age + 1
            if student_age <= 4:
                advance_message = (
                    f"🎉 ¡{student_name} ha superado todos los niveles de {age} años! "
                    f"Para continuar con las actividades de {next_age} años, "
                    f"es recomendable que un adulto esté presente para acompañar "
                    f"el avance a los nuevos contenidos."
                )
            else:
                advance_message = (
                    f"🎉 ¡{student_name} ha completado todos los niveles de {age} años! "
                    f"Ya está listo/a para explorar los contenidos de {next_age} años."
                )
        else:
            advance_message = ""

        result.append(AgeGroupReport(
            age=age,
            total_topics=total,
            mastered_topics=mastered,
            in_progress_topics=in_prog,
            not_started_topics=not_start,
            all_mastered=all_done,
            completion_pct=round(completion, 3),
            advance_message=advance_message,
            topics=sorted(topics, key=lambda t: (-int(t.mastered), -t.success_rate)),
        ))

    return result