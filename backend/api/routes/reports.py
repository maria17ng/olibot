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
        recommended_focus=recommended_focus,
        recommended_display_names=recommended_display_names,
        recent_sessions=session_summaries,
    )