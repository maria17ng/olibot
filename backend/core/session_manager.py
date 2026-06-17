"""
Session Manager — orchestrates the full conversational turn pipeline.

Turn pipeline:
    1. Student message arrives
    2. NLU extracts the intent
    3. Active curriculum topic is resolved from the session record
    4. BDI Bridge decides the pedagogical action (receives current topic)
    5. NLG generates the LLM response (following BDI instruction)
    6. Safety Shield validates/modifies the response
    7. Response + metadata are persisted to DB
    8. Student beliefs updated in DB
    9. Activity logged (if attempt_answer intent)
   10. Topic advancement handled (if BDI sets next_topic_id)
   11. Final ChatResponse returned to the API layer

Fase 2 additions:
    - Topic-aware session creation: CurriculumEngine selects the topic
      that best fits the student's ZDP when starting a new session.
    - Activity logging: every attempt_answer turn is recorded in the
      ActivityModel table (topic_id, student_response, is_correct, hint_level).
    - Hint counter: give_hint / ask_for_hint turns increment session.hints_given.
    - Topic advancement: when BDI returns next_topic_id, the current session
      is closed and a new session is opened for the next topic automatically.
    - ChatResponse extended: is_correct, next_topic_id, current_topic_id.
"""
import logging
import re
import time
import unicodedata
from sqlalchemy.orm import Session

from backend.core.bdi_bridge import BDIBridge

logger = logging.getLogger("olibot.pipeline")
from backend.core.safety_shield import SafetyShield
from backend.llm.nlu import NLUProcessor, Intent
from backend.llm.nlg import NLGProcessor
from backend.llm.ollama_client import OllamaClient
from backend.db.repositories.student_repo import StudentRepository
from backend.db.repositories.session_repo import SessionRepository
from backend.db.models import SessionModel
from backend.api.schemas.chat import ChatResponse
from backend.api.schemas.student import StudentUpdate
from backend.core import assessment_engine
from backend.pedagogy.curriculum import CurriculumEngine, CURRICULUM, CurriculumTopic

_curriculum = CurriculumEngine()


def _answer_tokens(text: str) -> set[str]:
    """Lowercase, strip accents and split into alphanumeric tokens."""
    text = (text or "").lower()
    text = unicodedata.normalize("NFD", text)
    text = "".join(c for c in text if unicodedata.category(c) != "Mn")
    return {t for t in re.split(r"[^a-z0-9]+", text) if t}


# Friendly, child-facing phrase per curriculum category, used to build an instant
# (LLM-free) greeting and avoid the multi-second Ollama latency on the very first turn.
_GREETING_ACTIVITY: dict[str, str] = {
    "pregrafomotricidad": "a hacer trazos",
    "lectoescritura":     "las letras",
    "numeracion":         "los números",
    "fonologia":          "los sonidos de las letras",
    "silabas":            "las sílabas",
    "palabras":           "a leer palabras",
    "silabas_complejas":  "las sílabas",
    "palabras_avanzadas": "a leer palabras",
    "frases":             "a leer frases",
}


def _build_instant_greeting(student_name: str, current_topic: CurriculumTopic | None) -> str:
    """Deterministic, personalised greeting served without calling the LLM."""
    name = (student_name or "").strip()
    hola = f"¡Hola {name}!" if name else "¡Hola!"
    if current_topic is not None:
        activity = _GREETING_ACTIVITY.get(current_topic.category.value, "a aprender")
        return f"{hola} ¿Quieres que aprendamos {activity} hoy? 🌟"
    return f"{hola} ¿Qué quieres aprender hoy? 🌟"


def _build_cache_hint(
    intent_name: str,
    current_topic: CurriculumTopic | None,
    is_correct: bool | None,
) -> tuple[str, str, bool | None] | None:
    """Builds a cache lookup key tuple for the NLG response cache."""
    category = current_topic.category.value if current_topic else "any"
    if intent_name in ("attempt_answer", "tracing_complete"):
        return (intent_name, category, is_correct)
    if intent_name in ("ask_for_hint", "ask_for_answer"):
        return ("ask_for_hint", category, None)
    if intent_name == "greet":
        return ("greet", "any", None)
    if intent_name == "express_emotion":
        return ("express_emotion", "any", None)
    return None


class SessionManager:
    """
    Coordinates all modules to process a single conversational turn.

    BDI integration (Fase 2):
        The BDI bridge now receives the active CurriculumTopic so that
        Jason plans (or the PythonBDIFallback) can reason about topic mastery,
        select appropriate hints from the curriculum ontology, and propose
        topic advancements by returning next_topic_id in BDIDecision.

    DB integration (Fase 2):
        - ActivityModel records are created for each attempt_answer turn,
          forming the persistent evidence base for the progress reports.
        - session.hints_given is incremented whenever a hint is delivered.
        - Student beliefs (including mastery data) are flushed to DB after
          each turn, so the BDI agent always reasons on up-to-date state.
    """

    def __init__(self, db: Session):
        ollama = OllamaClient()
        self.nlu = NLUProcessor(ollama)
        self.nlg = NLGProcessor(ollama)
        self.bdi = BDIBridge()
        self.shield = SafetyShield()
        self.student_repo = StudentRepository(db)
        self.session_repo = SessionRepository(db)

    async def process_message(
        self,
        student_id: int,
        user_message: str,
        session_id: int | None = None,
    ) -> ChatResponse:
        """
        Executes the full turn pipeline and returns the agent's response.

        Args:
            student_id:   ID of the student sending the message.
            user_message: Raw text from the student.
            session_id:   Optional existing session to resume. If None or
                          inactive, a new session is created with the topic
                          selected by CurriculumEngine based on the student's
                          current belief base.

        Returns:
            ChatResponse with the agent's text, safety metadata, current
            belief snapshot, and Fase 2 fields (is_correct, next_topic_id,
            current_topic_id).
        """
        # ── 1. Load student ────────────────────────────────────────────────
        student = self.student_repo.get_by_id(student_id)
        if not student:
            raise ValueError(f"Student {student_id} not found")

        # ── 2. Get or create session (topic auto-selected via CurriculumEngine)
        session = self._get_or_create_session(student_id, session_id, student.beliefs, int(student.age or 4))

        # ── 3. Resolve active curriculum topic from session record ─────────
        current_topic: CurriculumTopic | None = CURRICULUM.get(session.topic)

        # ── 4. NLU: classify the student's message ─────────────────────────
        intent = await self.nlu.extract_intent(user_message)
        logger.info(
            "← msg=%r  student=%s  NLU: intent=%s  conf=%.2f",
            user_message, student_id, intent.name, intent.confidence,
        )

        # ── 5. BDI: decide the pedagogical action ──────────────────────────
        # Jason equivalent:
        #   +percept(StudentId, Intent, Entities, SR, Beliefs, TopicId)
        #   <- +intent(Intent); +success_rate(SR); +!respond(Intent).
        bdi_decision = await self.bdi.process_turn(
            intent=intent,
            student=student,
            session_success_rate=session.success_rate,
            current_topic=current_topic,
            student_age=int(student.age or 4),
            user_message=user_message,
        )
        logger.info("→ BDI: action=%s", bdi_decision.action)

        # ── 6. NLG: generate LLM response following BDI instruction ────────
        conversation_history = self._build_history(session.id)
        conversation_history.append({"role": "user", "content": user_message})

        raw_llm_response = await self.nlg.generate_response(
            student=student,
            topic=session.topic,
            conversation_history=conversation_history,
            agent_instruction=bdi_decision.instruction,
            cache_hint=_build_cache_hint(intent.name, current_topic, bdi_decision.is_correct),
        )

        # ── 7. Safety Shield: validate/modify the LLM response ─────────────
        shield_result = self.shield.evaluate(raw_llm_response, intent, student)
        final_response = self.shield.get_final_response(shield_result, raw_llm_response)

        # ── 8. Persist student message ──────────────────────────────────────
        self.session_repo.add_message(
            session_id=session.id,
            role="user",
            content=user_message,
            detected_intent=intent.name,
        )

        # ── 9. Persist agent message ────────────────────────────────────────
        self.session_repo.add_message(
            session_id=session.id,
            role="agent",
            content=final_response,
            shield_triggered=shield_result.triggered,
            original_llm_response=raw_llm_response if shield_result.triggered else None,
            detected_intent=intent.name,
        )

        # ── 10. Update student beliefs in DB ───────────────────────────────
        updated_beliefs = bdi_decision.updated_beliefs
        self.student_repo.update_beliefs(student_id, updated_beliefs)

        # ── 11. Log activity (attempt_answer and tracing_complete) ───────────
        # Creates an ActivityModel record that feeds into progress reports.
        if intent.name == "attempt_answer" and current_topic:
            answer = intent.entities.get("answer", "")
            self.session_repo.log_activity(
                session_id=session.id,
                topic_id=current_topic.id,
                student_response=answer or None,
                is_correct=bdi_decision.is_correct,
                hint_level_used=bdi_decision.hint_level,
            )
        elif intent.name == "tracing_complete" and current_topic:
            letter = intent.entities.get("letter", "")
            score  = intent.entities.get("score", 0)
            self.session_repo.log_activity(
                session_id=session.id,
                topic_id=current_topic.id,
                student_response=f"tracing:{letter}:{score}%",
                is_correct=bdi_decision.is_correct,
                hint_level_used=bdi_decision.hint_level,
            )

        # ── 12. Increment hint counter for hint-delivery actions ───────────
        if bdi_decision.action in ("give_hint",) or intent.name in (
            "ask_for_hint", "ask_for_answer"
        ):
            self.session_repo.increment_hints(session.id)

        # ── 13. Topic advancement: close session and open new one ──────────
        # When the BDI agent determines the student has mastered the current
        # topic, it returns next_topic_id.  We close the current session
        # and record the new topic in the response so the frontend can
        # transition the UI seamlessly.
        #
        # Jason equivalent:
        #   +!select_next_topic(StudentId) : topic_mastered(T) <-
        #       .send(session_manager, tell, next_topic(NextT)).
        # For mastery_achieved, don't advance the session — let the child choose first.
        # The next_topic_id is still sent to the frontend so it knows what comes next.
        next_topic_id = bdi_decision.next_topic_id
        # For mastery_achieved: don't auto-advance — let the child choose in the dialog.
        # For all other actions with a next_topic_id: advance the session automatically.
        advance_session = (
            next_topic_id
            and next_topic_id != session.topic
            and bdi_decision.action not in ("mastery_achieved", "praise_and_advance")
        )
        if advance_session:
            self.session_repo.close_session(session.id)
            new_session = self.session_repo.create_session(
                student_id=student_id,
                topic=next_topic_id,
            )
            self.student_repo.increment_sessions(student_id)
            response_session_id = new_session.id
        else:
            response_session_id = session.id

        # For mastery actions, still pass next_topic_id so the frontend can offer
        # the choice (keep practising / next topic / free drawing).
        final_next_topic = (
            next_topic_id if advance_session
            else (next_topic_id if bdi_decision.action in ("mastery_achieved", "praise_and_advance") else None)
        )

        return ChatResponse(
            session_id=response_session_id,
            agent_response=final_response,
            shield_triggered=shield_result.triggered,
            detected_intent=intent.name,
            current_beliefs=updated_beliefs,
            is_correct=bdi_decision.is_correct,
            next_topic_id=final_next_topic,
            current_topic_id=current_topic.id if current_topic else None,
            bdi_action=bdi_decision.action,
            free_drawing_subject=bdi_decision.free_drawing_subject,
        )

    async def process_message_stream(
        self,
        student_id: int,
        user_message: str,
        session_id: int | None = None,
        current_screen: str | None = None,
    ):
        """
        Streaming variant of process_message.

        Yields three event types:
          {"type": "meta",  "session_id": ..., "current_topic_id": ..., "detected_intent": ..., "is_correct": ...}
          {"type": "token", "text": "<token>"}   — one per NLG token
          {"type": "final", <same fields as ChatResponse>}

        The Safety Shield is applied to the full accumulated response before "final" is
        emitted, so the streamed tokens may differ from agent_response if the shield
        triggers.  The frontend should replace the displayed text on "final".
        """
        t0 = time.monotonic()

        # ── 1-2. Load student + session ───────────────────────────────────────
        student = self.student_repo.get_by_id(student_id)
        if not student:
            raise ValueError(f"Student {student_id} not found")

        session = self._get_or_create_session(
            student_id, session_id, student.beliefs, int(student.age or 4)
        )
        current_topic: CurriculumTopic | None = CURRICULUM.get(session.topic)

        logger.info(
            "← msg=%r  student=%s  session=%s  topic=%s",
            user_message, student_id, session.id, session.topic,
        )

        # ── Initial placement assessment ──────────────────────────────────────
        # A deterministic, rubric-based staircase computed entirely in code (the
        # LLM is NOT involved: it proved unreliable at following the rubric). OLIBOT
        # only voices the fixed prompts. The child is never told it is a test nor
        # which level is assigned; the level is applied silently to the profile.
        if current_screen == "assessment_mode":
            prev_state = student.beliefs.get(assessment_engine.STATE_KEY)
            result = assessment_engine.step(prev_state, user_message)
            response_text = result["say"]
            assessment_ui = result.get("ui")

            yield {
                "type": "meta",
                "session_id": session.id,
                "current_topic_id": None,
                "detected_intent": "assessment",
                "is_correct": None,
                "next_topic_id": None,
                "bdi_action": "assessment",
                "free_drawing_subject": None,
                "assessment_ui": assessment_ui,
            }
            yield {"type": "token", "text": response_text}

            assigned_level = None
            updated_beliefs = dict(student.beliefs)
            if result["complete"]:
                assigned_level = result["level"]
                new_age = assessment_engine.LEVEL_TO_AGE[assigned_level]
                self.student_repo.update(student_id, StudentUpdate(age=new_age))
                updated_beliefs["needs_assessment"] = False
                updated_beliefs.pop(assessment_engine.STATE_KEY, None)
                logger.info(
                    "→ ASSESSMENT complete: level=%s → age=%s (student=%s, passed=%s)",
                    assigned_level, new_age, student_id, result["state"].get("passed"),
                )
            else:
                updated_beliefs[assessment_engine.STATE_KEY] = result["state"]

            self.session_repo.add_message(
                session_id=session.id, role="user", content=user_message,
                detected_intent="assessment",
            )
            self.session_repo.add_message(
                session_id=session.id, role="agent", content=response_text,
                detected_intent="assessment",
            )
            self.student_repo.update_beliefs(student_id, updated_beliefs)

            yield {
                "type": "final",
                "session_id": session.id,
                "agent_response": response_text,
                "shield_triggered": False,
                "detected_intent": "assessment",
                "current_beliefs": updated_beliefs,
                "is_correct": None,
                "next_topic_id": None,
                "current_topic_id": None,
                "bdi_action": "assessment",
                "free_drawing_subject": None,
                "all_age_topics_complete": False,
                "assessment_complete": result["complete"],
                "assigned_level": assigned_level,
                "assessment_ui": assessment_ui,
            }
            return

        # ── 3-4. NLU + BDI ───────────────────────────────────────────────────
        intent = await self.nlu.extract_intent(user_message)
        logger.info(
            "→ NLU: intent=%s  conf=%.2f  entities=%s",
            intent.name, intent.confidence, intent.entities or "{}",
        )

        # Deterministic answer fast-path for SYLLABLE topics. After tracing a
        # syllable the child must say it aloud; the LLM-NLU frequently mislabels a
        # bare syllable ("ma", "as") as greet/unknown, which would stall the
        # syllable "say" phase forever and block advancement. If the utterance
        # contains the topic's syllable sound, treat it as a correct attempt_answer
        # regardless of the NLU label.
        if (
            current_topic is not None
            and current_topic.id.startswith("silaba")
            and intent.name not in ("tracing_complete", "attempt_answer")
            and current_topic.expected_answers
        ):
            syllable_sound = current_topic.expected_answers[0].strip().lower()
            if syllable_sound and syllable_sound in _answer_tokens(user_message):
                intent = Intent(
                    name="attempt_answer",
                    confidence=1.0,
                    entities={"answer": syllable_sound},
                    raw_text=user_message,
                )
                logger.info(
                    "→ NLU override: syllable answer %r → attempt_answer", syllable_sound
                )

        bdi_decision = await self.bdi.process_turn(
            intent=intent,
            student=student,
            session_success_rate=session.success_rate,
            current_topic=current_topic,
            student_age=int(student.age or 4),
            user_message=user_message,
        )
        logger.info(
            "→ BDI: action=%s  is_correct=%s  next_topic=%s",
            bdi_decision.action, bdi_decision.is_correct, bdi_decision.next_topic_id,
        )

        # Emit meta: NLU+BDI done, NLG is about to start
        yield {
            "type": "meta",
            "session_id": session.id,
            "current_topic_id": current_topic.id if current_topic else None,
            "detected_intent": intent.name,
            "is_correct": bdi_decision.is_correct,
            "next_topic_id": bdi_decision.next_topic_id,
            "bdi_action": bdi_decision.action,
            "free_drawing_subject": bdi_decision.free_drawing_subject,
        }

        # ── 5. NLG — stream tokens ────────────────────────────────────────────
        conversation_history = self._build_history(session.id)
        conversation_history.append({"role": "user", "content": user_message})

        # Prepend screen context to instruction so LLM stays in scope
        _SCREEN_HINTS = {
            "drawing":          "[CONTEXTO: El niño está EN LA PANTALLA DE DIBUJO LIBRE. NO menciones letras ni trazos. Habla solo sobre dibujar y pintar.] ",
            "recognition":      "[CONTEXTO: El niño está EN EL EJERCICIO DE RECONOCIMIENTO (elige la letra correcta). Anímate brevemente, no expliques el ejercicio.] ",
            "emotion_picker":   "[CONTEXTO: Se está mostrando la encuesta de ánimo. NO respondas sobre el contenido académico.] ",
            "activity_picker":  "[CONTEXTO: Se está mostrando el selector de actividad. NO respondas sobre el contenido académico.] ",
        }
        screen_prefix = _SCREEN_HINTS.get(current_screen or "", "")
        augmented_instruction = screen_prefix + bdi_decision.instruction
        cache_hint = _build_cache_hint(intent.name, current_topic, bdi_decision.is_correct)

        # Fast path: serve the greeting deterministically (no LLM) to remove the
        # multi-second Ollama latency on the first turn.
        if intent.name == "greet":
            full_response = _build_instant_greeting(student.name, current_topic)
            logger.info("→ NLG: instant greeting (LLM bypassed)")
            yield {"type": "token", "text": full_response}
        elif bdi_decision.action in ("mastery_achieved", "praise_and_advance"):
            # Fast path: short, fixed celebration (no LLM). The mastery popup narrates
            # the option buttons in sync, so the agent must NOT ask any question or
            # request words/letters — it would desync the voice from the buttons.
            full_response = f"¡Lo has dominado! ¡Eres un campeón, {student.name}! 🎉"
            logger.info("→ NLG: instant mastery celebration (LLM bypassed)")
            yield {"type": "token", "text": full_response}
        else:
            full_response = ""
            async for token in self.nlg.generate_response_stream(
                student=student,
                topic=session.topic,
                conversation_history=conversation_history,
                agent_instruction=augmented_instruction,
                cache_hint=cache_hint,
            ):
                full_response += token
                yield {"type": "token", "text": token}

        # ── 6. Safety Shield on full response ─────────────────────────────────
        shield_result = self.shield.evaluate(full_response, intent, student)
        final_response = self.shield.get_final_response(shield_result, full_response)
        shield_triggered = shield_result.triggered

        elapsed = time.monotonic() - t0
        logger.info(
            "→ RESP (%.1fs) shield=%s  %r",
            elapsed, shield_triggered, final_response[:80],
        )

        # ── 7-12. Persist (same logic as process_message) ─────────────────────
        self.session_repo.add_message(
            session_id=session.id, role="user", content=user_message,
            detected_intent=intent.name,
        )
        self.session_repo.add_message(
            session_id=session.id, role="agent", content=final_response,
            shield_triggered=shield_triggered,
            original_llm_response=full_response if shield_triggered else None,
            detected_intent=intent.name,
        )

        updated_beliefs = bdi_decision.updated_beliefs
        self.student_repo.update_beliefs(student_id, updated_beliefs)

        if intent.name == "attempt_answer" and current_topic:
            answer = intent.entities.get("answer", "")
            self.session_repo.log_activity(
                session_id=session.id, topic_id=current_topic.id,
                student_response=answer or None,
                is_correct=bdi_decision.is_correct,
                hint_level_used=bdi_decision.hint_level,
            )
        elif intent.name == "tracing_complete" and current_topic:
            letter = intent.entities.get("letter", "")
            score  = intent.entities.get("score", 0)
            self.session_repo.log_activity(
                session_id=session.id, topic_id=current_topic.id,
                student_response=f"tracing:{letter}:{score}%",
                is_correct=bdi_decision.is_correct,
                hint_level_used=bdi_decision.hint_level,
            )

        if bdi_decision.action in ("give_hint",) or intent.name in (
            "ask_for_hint", "ask_for_answer"
        ):
            self.session_repo.increment_hints(session.id)

        # ── 14. Age-completion check (only on mastery events for age < 5) ─────
        mastery_actions = {"mastery_achieved", "praise_and_advance"}
        all_age_topics_complete = False
        if bdi_decision.action in mastery_actions and int(student.age or 4) < 5:
            age_topics = _curriculum.get_topics_for_age(int(student.age or 4))
            mastery_data = updated_beliefs.get("mastery", {})
            all_age_topics_complete = (
                len(age_topics) > 0
                and all(mastery_data.get(t.id, {}).get("mastered", False) for t in age_topics)
            )

        # ── 13. Topic advancement — skip for mastery_achieved/praise_and_advance ─
        # Child chooses via the mastery dialog; session_id stays so the dialog
        # can call /advance when the child picks the next topic.
        next_topic_id = bdi_decision.next_topic_id
        advance_session = (
            next_topic_id
            and next_topic_id != session.topic
            and bdi_decision.action not in ("mastery_achieved", "praise_and_advance")
        )
        if advance_session:
            self.session_repo.close_session(session.id)
            new_session = self.session_repo.create_session(
                student_id=student_id, topic=next_topic_id
            )
            self.student_repo.increment_sessions(student_id)
            response_session_id = new_session.id
        else:
            response_session_id = session.id

        final_next_topic = (
            next_topic_id if advance_session
            else (next_topic_id if bdi_decision.action in ("mastery_achieved", "praise_and_advance") else None)
        )

        yield {
            "type": "final",
            "session_id": response_session_id,
            "agent_response": final_response,
            "shield_triggered": shield_triggered,
            "detected_intent": intent.name,
            "current_beliefs": updated_beliefs,
            "is_correct": bdi_decision.is_correct,
            "next_topic_id": final_next_topic,
            "current_topic_id": current_topic.id if current_topic else None,
            "bdi_action": bdi_decision.action,
            "free_drawing_subject": bdi_decision.free_drawing_subject,
            "all_age_topics_complete": all_age_topics_complete,
            "assessment_complete": False,
            "assigned_level": None,
        }

    def _get_or_create_session(
        self,
        student_id: int,
        session_id: int | None,
        student_beliefs: dict,
        student_age: int = 4,
    ) -> SessionModel:
        """
        Returns an existing active session or creates a new one.

        When creating a new session, the topic is auto-selected by
        CurriculumEngine.get_next_topic(beliefs), which implements ZDP-aware
        topic selection:
            1. Topics currently in ZDP (partially mastered, not yet done)
            2. Easiest unstarted topic whose prerequisites are met
            3. Review of the most-recently-mastered topic (spaced repetition)

        This mirrors the Jason plan:
            +!select_topic(StudentId) : ... <- !get_next_topic(T); +current_topic(T).
        """
        if session_id:
            session = self.session_repo.get_by_id(session_id)
            if session and session.is_active:
                return session

        # Auto-select topic using CurriculumEngine (age-filtered)
        next_topic = _curriculum.get_next_topic(student_beliefs, student_age)
        topic_id = next_topic.id if next_topic else "general"

        session = self.session_repo.create_session(
            student_id=student_id,
            topic=topic_id,
        )
        self.student_repo.increment_sessions(student_id)
        return session

    def _build_history(self, session_id: int) -> list[dict]:
        """Converts stored messages into the format expected by the LLM."""
        messages = self.session_repo.get_session_messages(session_id)
        return [
            {"role": msg.role if msg.role == "user" else "assistant", "content": msg.content}
            for msg in messages
        ]