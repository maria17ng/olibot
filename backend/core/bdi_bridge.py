"""
BDI Bridge — communicates with the JaCaMo agent via REST API.

Architecture:
    Python Backend  ──REST──►  JaCaMo HTTP Server  ──►  Jason BDI Agent
                    ◄──REST──                       ◄──

When JaCaMo is not running (jacamo_enabled=False in settings), the bridge
uses a PythonBDIFallback that simulates the BDI reasoning in pure Python.
This allows the project to run and be tested before JaCaMo is configured.

Fase 2 additions:
    - BDIDecision now includes topic-aware fields (next_topic_id, is_correct)
    - PythonBDIFallback uses CurriculumEngine + ScaffoldingEngine
    - Percept payload sent to JaCaMo includes current topic and mastery

Fase 7 additions:
    - student_age parameter filters curriculum topics by age
    - tracing_complete plan: celebrates or encourages retry after canvas tracing
    - placement test plan: runs 3-4 questions at start of first session (age >= 4)
    - CURRICULUM.get() bug fixed → _curriculum.get_topic()

JaCaMo REST endpoints (when running):
    POST /percept           → Send a new perception to the agent
    GET  /belief/{key}      → Query a belief value
    POST /goal              → Add a new goal to the agent
    GET  /intentions        → List current active intentions
"""
import httpx
import asyncio
from dataclasses import dataclass, field
from backend.config.settings import get_settings
from backend.llm.nlu import Intent
from backend.db.models import StudentModel
from backend.pedagogy.curriculum import CurriculumEngine, CurriculumTopic
from backend.pedagogy.scaffolding import ScaffoldingEngine

settings = get_settings()
_curriculum = CurriculumEngine()
_scaffolding = ScaffoldingEngine()

# Placement test questions per age
# Each entry: {question, answers (lowercase), topic_to_mark_mastered}
_PLACEMENT_QUESTIONS: dict[int, list[dict]] = {
    4: [
        {
            "question": "¡Vamos a ver lo que sabes! Mira esta letra: [A]. ¿Qué letra es? 🅰️",
            "answers": ["a", "la a", "vocal a", "letra a", "la letra a"],
            "topic": "vocal_a",
        },
        {
            "question": "¡Muy bien! Ahora... mira mis dedos: [✋]. ¿Cuántos dedos hay?",
            "answers": ["5", "cinco", "el cinco", "el 5"],
            "topic": "numero_5",
        },
        {
            "question": "¡Una más! Mira esta letra: [M]. ¿Qué letra es? 🌙",
            "answers": ["m", "la m", "letra m", "la letra m"],
            "topic": "consonante_m",
        },
    ],
    5: [
        {
            "question": "¡Vamos a ver lo que sabes! Mira esta letra: [A]. ¿Qué letra es? 🅰️",
            "answers": ["a", "la a", "vocal a", "letra a", "la letra a"],
            "topic": "vocal_a",
        },
        {
            "question": "¡Muy bien! Ahora... mira mis dedos: [✋]. ¿Cuántos dedos hay?",
            "answers": ["5", "cinco", "el cinco", "el 5"],
            "topic": "numero_5",
        },
        {
            "question": "¡Una más! Mira esta letra: [M]. ¿Qué letra es? 🌙",
            "answers": ["m", "la m", "letra m", "la letra m"],
            "topic": "consonante_m",
        },
        {
            "question": "¡Genial! Última: ¿qué dicen estas letras juntas? [MA] 🤔",
            "answers": ["ma", "la ma", "sílaba ma"],
            "topic": "silaba_ma",
        },
    ],
}


@dataclass
class BDIDecision:
    """
    The BDI agent's output: what action OLIBOT should take next.

    BDI mapping:
        action          → the selected plan's consequent
        instruction     → NLG prompt injection
        updated_beliefs → revised belief base after this turn
        hint_level      → scaffolding level computed by !calculate_hint_level
        is_correct      → evaluation of attempt_answer (None if not applicable)
        next_topic_id   → set by the agent when !select_topic fires
    """
    action: str            # e.g. "give_hint", "praise", "ask_question", "redirect"
    instruction: str       # Human-readable instruction for the NLG module
    updated_beliefs: dict  # New/updated beliefs after this interaction turn
    hint_level: int = 1    # Scaffolding level (1=subtle, 3=near-direct)
    is_correct: bool | None = None   # For attempt_answer: was it right?
    next_topic_id: str | None = None  # If set, the session should switch topics


class BDIBridge:
    """
    Facade for communicating with the JaCaMo BDI agent.
    Automatically falls back to PythonBDIFallback when JaCaMo is unavailable.
    """

    def __init__(self):
        self.base_url = settings.jacamo_base_url
        self.enabled = settings.jacamo_enabled
        self._fallback = PythonBDIFallback()

    async def process_turn(
        self,
        intent: Intent,
        student: StudentModel,
        session_success_rate: float,
        current_topic: CurriculumTopic | None = None,
        student_age: int = 4,
    ) -> BDIDecision:
        """
        Main entry point: given an intent from the NLU, the BDI agent decides
        what pedagogical action to take next.

        Args:
            intent:               Classified student intent from NLU
            student:              Student ORM object (includes beliefs)
            session_success_rate: Overall success rate for the current session
            current_topic:        Active curriculum topic (Fase 2)
            student_age:          Student age for curriculum filtering (Fase 7)
        """
        if self.enabled:
            return await self._call_jacamo(intent, student, session_success_rate, current_topic, student_age)
        return self._fallback.decide(intent, student, session_success_rate, current_topic, student_age)

    async def _call_jacamo(
        self,
        intent: Intent,
        student: StudentModel,
        session_success_rate: float,
        current_topic: CurriculumTopic | None,
        student_age: int,
    ) -> BDIDecision:
        """
        Two-step communication with JaCaMo:
          1. POST /percept  → OlibotEnv updates observable properties,
                              Jason agent fires +percept_count(N) plan.
          2. GET  /decision → blocks until the Jason agent calls
                              postDecision(...) on the artifact (≤8s).
        """
        is_correct_for_percept = None
        if intent.name == "attempt_answer" and current_topic:
            answer = intent.entities.get("answer", "")
            if answer:
                is_correct_for_percept = _curriculum.evaluate_answer(
                    current_topic.id, answer
                )

        percept_payload = {
            "student_id": student.id,
            "intent": intent.name,
            "entities": intent.entities,
            "success_rate": session_success_rate,
            "current_beliefs": student.beliefs,
            "current_topic": current_topic.id if current_topic else "general",
            "is_correct": is_correct_for_percept,
            "requested_topic": intent.entities.get("requested_topic_id", ""),
            "student_age": student_age,
        }

        try:
            async with httpx.AsyncClient(timeout=5) as client:
                ack = await client.post(f"{self.base_url}/percept", json=percept_payload)
                ack.raise_for_status()

            async with httpx.AsyncClient(timeout=12) as client:
                response = await client.get(f"{self.base_url}/decision")

            if response.status_code == 408:
                return self._fallback.decide(intent, student, session_success_rate, current_topic, student_age)

            response.raise_for_status()
            data = response.json()

            fallback = self._fallback.decide(intent, student, session_success_rate, current_topic, student_age)

            return BDIDecision(
                action=data.get("action", fallback.action),
                instruction=data.get("instruction", fallback.instruction),
                updated_beliefs=fallback.updated_beliefs,
                hint_level=data.get("hint_level", fallback.hint_level),
                is_correct=fallback.is_correct,
                next_topic_id=fallback.next_topic_id,
            )

        except (httpx.ConnectError, httpx.TimeoutException, httpx.HTTPStatusError):
            return self._fallback.decide(intent, student, session_success_rate, current_topic, student_age)


class PythonBDIFallback:
    """
    Pure-Python simulation of the JaCaMo BDI reasoning loop.
    Implements the same pedagogical rules as the Jason agent plans.

    This is intentionally a mirror of the Jason plans in olibot.asl.
    Replace with real JaCaMo calls by setting JACAMO_ENABLED=true.

    Implemented plans (from olibot.asl):
        +!respond(ask_for_answer, ...)  → give_hint
        +!respond(attempt_answer, ...)  → evaluate_and_encourage
        +!respond(tracing_complete, ...)→ celebrate_tracing / encourage_retry
        +!respond(ask_for_hint, ...)    → give_hint
        +!respond(greet, ...)           → greet_and_start (+ placement test for age>=4)
        +!respond(placement_answer, ...)→ placement_test_continue / complete
        +!respond(_, ...)               → redirect  (catch-all)
        +!select_next_topic(...)        → present_activity (Fase 2)
    """

    @staticmethod
    def _age3_wrap(instruction: str, student_age: int) -> str:
        """Appends a hard constraint for age-3 students: no questions, max 3 words."""
        if student_age <= 3:
            return (
                instruction
                + "\nCRITICAL — student is 3 years old: respond with MAX 3 words + 1 emoji. "
                "DO NOT ask any question. DO NOT use complex vocabulary."
            )
        return instruction

    def decide(
        self,
        intent: Intent,
        student: StudentModel,
        session_success_rate: float,
        current_topic: CurriculumTopic | None = None,
        student_age: int = 4,
    ) -> BDIDecision:
        """
        Simulates Jason plan selection based on intent, beliefs and topic.

        Jason equivalent:
            +!respond(Intent) : intent(ask_for_answer) <- give_hint(HintLevel).
            +!respond(Intent) : intent(attempt_answer) & correct <- praise_and_advance.
            +!respond(Intent) : topic_mastered(Topic) <- select_next_topic.
        """
        decision = self._decide_inner(intent, student, session_success_rate, current_topic, student_age)
        # Enforce age-3 constraints on the NLG instruction regardless of which plan fired
        decision.instruction = self._age3_wrap(decision.instruction, student_age)
        return decision

    def _decide_inner(
        self,
        intent: Intent,
        student: StudentModel,
        session_success_rate: float,
        current_topic: CurriculumTopic | None = None,
        student_age: int = 4,
    ) -> BDIDecision:
        beliefs = dict(student.beliefs)
        topic_id = current_topic.id if current_topic else "general"
        hint_level = _scaffolding.get_hint_level(beliefs, topic_id)

        # ── Placement test override ────────────────────────────────────────────
        # When placement is in progress, any answer intent is treated as a placement response.
        if beliefs.get("placement_in_progress", False) and intent.name in (
            "attempt_answer", "placement_answer", "unknown", "greet"
        ) and intent.name != "greet":
            return self._handle_placement_answer(intent, beliefs, student_age)

        # ── Plan: student asks for the answer directly ─────────────────────────
        # Jason: +!respond(ask_for_answer, SR, _) <- !calculate_hint_level(SR, HL); give_hint(HL).
        if intent.name == "ask_for_answer":
            hint_text = _curriculum.get_hint(topic_id, hint_level) if current_topic else ""
            instruction = (
                f"The student asked for the answer directly. "
                f"NEVER give it. Use this Socratic level-{hint_level} hint: \"{hint_text}\""
                if hint_text else
                f"The student asked for the answer. Do NOT provide it. "
                f"Give a level-{hint_level} Socratic hint to make them think."
            )
            return BDIDecision(
                action="give_hint",
                instruction=instruction,
                updated_beliefs=beliefs,
                hint_level=hint_level,
            )

        # ── Plan: canvas tracing completed ────────────────────────────────────
        # Jason: +!respond(tracing_complete, Passed, Score) <- celebrate / retry.
        if intent.name == "tracing_complete":
            letter = intent.entities.get("letter", "")
            passed = intent.entities.get("passed", False)
            score  = intent.entities.get("score", 0)

            if passed:
                beliefs = _scaffolding.record_attempt(beliefs, topic_id, True)
                next_topic_id = None
                if _scaffolding.should_advance_topic(beliefs, topic_id):
                    next_topic = _curriculum.get_next_topic(beliefs, student_age)
                    next_topic_id = next_topic.id if next_topic.id != topic_id else None

                instruction = (
                    f"The child completed tracing '{letter}' with {score}% accuracy! "
                    "Celebrate enthusiastically. "
                    + (f"They've mastered this topic! Introduce '{next_topic_id}' warmly."
                       if next_topic_id else
                       "Encourage them to keep practicing this shape.")
                )
                return BDIDecision(
                    action="celebrate_tracing",
                    instruction=instruction,
                    updated_beliefs=beliefs,
                    hint_level=1,
                    is_correct=True,
                    next_topic_id=next_topic_id,
                )
            else:
                beliefs = _scaffolding.record_attempt(beliefs, topic_id, False)
                hint_level = _scaffolding.get_hint_level(beliefs, topic_id)
                hint_text = _curriculum.get_hint(topic_id, hint_level) if current_topic else ""
                instruction = (
                    f"The child attempted tracing '{letter}' but scored {score}% — needs practice. "
                    f"Encourage kindly to try again. Level-{hint_level} hint: \"{hint_text}\""
                )
                return BDIDecision(
                    action="encourage_retry_tracing",
                    instruction=instruction,
                    updated_beliefs=beliefs,
                    hint_level=hint_level,
                    is_correct=False,
                )

        # ── Plan: student attempts an answer ───────────────────────────────────
        # Jason: +!respond(attempt_answer, SR, Beliefs) <- evaluate_and_encourage.
        if intent.name == "attempt_answer":
            answer = intent.entities.get("answer", "")
            is_correct = (
                _curriculum.evaluate_answer(topic_id, answer)
                if current_topic and answer else None
            )

            if is_correct:
                beliefs = _scaffolding.record_attempt(beliefs, topic_id, True)
                next_topic_id = None
                if _scaffolding.should_advance_topic(beliefs, topic_id):
                    next_topic = _curriculum.get_next_topic(beliefs, student_age)
                    next_topic_id = next_topic.id if next_topic.id != topic_id else None

                return BDIDecision(
                    action="praise_and_advance" if next_topic_id else "praise",
                    instruction=(
                        "The student answered CORRECTLY! Celebrate enthusiastically. "
                        + (f"They have mastered '{current_topic.display_name}'! "
                           f"Introduce the next topic warmly."
                           if next_topic_id else
                           "Encourage them to keep going.")
                    ),
                    updated_beliefs=beliefs,
                    hint_level=1,
                    is_correct=True,
                    next_topic_id=next_topic_id,
                )
            else:
                if is_correct is False:
                    beliefs = _scaffolding.record_attempt(beliefs, topic_id, False)
                    hint_level = _scaffolding.get_hint_level(beliefs, topic_id)

                instruction = (
                    "The student attempted an answer but it was INCORRECT. "
                    f"React kindly and provide a level-{hint_level} hint to guide them."
                    if is_correct is False else
                    "The student is attempting an answer. Evaluate it kindly. "
                    "If correct, celebrate. If wrong, give a gentle hint."
                )
                return BDIDecision(
                    action="evaluate_and_encourage",
                    instruction=instruction,
                    updated_beliefs=beliefs,
                    hint_level=hint_level,
                    is_correct=is_correct,
                )

        # ── Plan: student asks for a hint ──────────────────────────────────────
        if intent.name == "ask_for_hint":
            hint_text = _curriculum.get_hint(topic_id, hint_level) if current_topic else ""
            instruction = (
                f"The student wants a hint. Give this level-{hint_level} clue: \"{hint_text}\""
                if hint_text else
                f"Give a level-{hint_level} Socratic clue without revealing the answer."
            )
            return BDIDecision(
                action="give_hint",
                instruction=instruction,
                updated_beliefs=beliefs,
                hint_level=hint_level,
            )

        # ── Plan: greeting — placement test for age≥4, proactive topic for others ──
        # Jason: +!respond(greet, _, _) <- greet_and_propose_topic.
        if intent.name == "greet":
            # Check if placement test is needed (age >= 4, first session, no mastery yet)
            needs_placement = (
                student_age >= 4
                and not beliefs.get("placement_done", False)
                and not beliefs.get("mastery")
            )

            if needs_placement:
                questions = _PLACEMENT_QUESTIONS.get(min(student_age, 5), _PLACEMENT_QUESTIONS[4])
                first_q = questions[0]
                beliefs["placement_in_progress"] = True
                beliefs["placement_question"] = 1
                beliefs["placement_age"] = student_age
                instruction = (
                    "Greet the child warmly and tell them you want to see what they already know. "
                    f"Ask: '{first_q['question']}' Use emojis. Wait for their answer."
                )
                return BDIDecision(
                    action="placement_test_start",
                    instruction=instruction,
                    updated_beliefs=beliefs,
                )

            # Normal greet: propose today's topic
            if current_topic:
                alternatives = _curriculum.get_alternatives(beliefs, topic_id, student_age, 3)
                alt_names = ", ".join(
                    f"'{t.display_name}'" for t in alternatives
                ) if alternatives else "otros temas disponibles"
                instruction = (
                    f"Greet the student warmly and enthusiastically PROPOSE today's activity: "
                    f"'{current_topic.display_name}'. {current_topic.description_for_student} "
                    f"Then ask: '¿Empezamos con esto o prefieres otra cosa? También podemos "
                    f"practicar {alt_names}.' Make it exciting and child-friendly!"
                )
            else:
                instruction = (
                    "Greet the student warmly. Ask what they want to practice today. "
                    "Be enthusiastic and child-friendly!"
                )
            return BDIDecision(
                action="greet_and_propose",
                instruction=instruction,
                updated_beliefs=beliefs,
            )

        # ── Plan: placement test answer ────────────────────────────────────────
        if intent.name == "placement_answer":
            return self._handle_placement_answer(intent, beliefs, student_age)

        # ── Plan: student wants to change topic ───────────────────────────────
        if intent.name == "request_topic_change":
            alternatives = _curriculum.get_alternatives(beliefs, topic_id, student_age, 3)
            if alternatives:
                names = ", ".join(f"'{t.display_name}'" for t in alternatives)
                instruction = (
                    f"The student wants to practice something different. "
                    f"Offer these alternatives enthusiastically: {names}. "
                    f"Let them choose. Be encouraging!"
                )
            else:
                instruction = (
                    "The student wants to change topic but they've covered all available topics! "
                    "Congratulate them and suggest reviewing the current topic to improve their score."
                )
            return BDIDecision(
                action="offer_alternatives",
                instruction=instruction,
                updated_beliefs=beliefs,
            )

        # ── Plan: student requests a specific topic ───────────────────────────
        if intent.name == "request_specific_topic":
            requested_id = intent.entities.get("requested_topic_id", "")
            # Fix: use _curriculum.get_topic() instead of the undefined CURRICULUM dict
            requested_topic = _curriculum.get_topic(requested_id) if requested_id else None

            if requested_topic and _curriculum.prerequisites_met(beliefs, requested_topic):
                instruction = (
                    f"The student wants to practice '{requested_topic.display_name}'. "
                    f"Accept enthusiastically! {requested_topic.description_for_student}"
                )
                return BDIDecision(
                    action="accept_topic_change",
                    instruction=instruction,
                    updated_beliefs=beliefs,
                    next_topic_id=requested_topic.id,
                )
            elif requested_topic:
                alternatives = _curriculum.get_alternatives(beliefs, topic_id, student_age, 2)
                alt_names = ", ".join(f"'{t.display_name}'" for t in alternatives)
                instruction = (
                    f"The student asked for '{requested_topic.display_name}' but they "
                    f"need to master the prerequisites first. Explain kindly that they need "
                    f"to practice a bit more before that. Suggest: {alt_names or 'the current topic'}."
                )
                return BDIDecision(
                    action="redirect",
                    instruction=instruction,
                    updated_beliefs=beliefs,
                )
            else:
                alternatives = _curriculum.get_alternatives(beliefs, topic_id, student_age, 3)
                names = ", ".join(f"'{t.display_name}'" for t in alternatives) if alternatives else "los temas disponibles"
                instruction = (
                    f"The student asked for something OLIBOT can't teach yet. "
                    f"Apologize kindly and offer what IS available: {names}."
                )
                return BDIDecision(
                    action="offer_alternatives",
                    instruction=instruction,
                    updated_beliefs=beliefs,
                )

        # ── Plan: student expresses emotion ────────────────────────────────────
        if intent.name == "express_emotion":
            return BDIDecision(
                action="acknowledge_emotion",
                instruction=(
                    "The student expressed an emotion. Acknowledge it with empathy. "
                    "If frustrated, reassure them. If happy, celebrate with them. "
                    "Then gently return to the activity."
                ),
                updated_beliefs=beliefs,
            )

        # ── Plan: off-topic / unknown → redirect (catch-all) ──────────────────
        return BDIDecision(
            action="redirect",
            instruction=(
                "The student went off-topic. Gently redirect them back to the lesson "
                + (f"about {current_topic.display_name}." if current_topic else ".")
            ),
            updated_beliefs=beliefs,
        )

    def _handle_placement_answer(
        self,
        intent: Intent,
        beliefs: dict,
        student_age: int,
    ) -> BDIDecision:
        """
        Handles a child's answer during the placement test.
        Evaluates the answer, updates mastery if correct, and advances to the next question.
        """
        q_num   = beliefs.get("placement_question", 1)
        age_key = min(beliefs.get("placement_age", student_age), 5)
        questions = _PLACEMENT_QUESTIONS.get(age_key, _PLACEMENT_QUESTIONS[4])

        # Evaluate the current placement question
        current_q = questions[q_num - 1]
        answer = intent.entities.get("answer", intent.raw_text or "").strip().lower()
        is_correct = any(answer == a.lower() for a in current_q["answers"])

        if is_correct:
            beliefs = _curriculum.mark_as_mastered(beliefs, current_q["topic"])
            result_text = f"¡Perfecto! Ya sé que conoces esto 🌟."
        else:
            result_text = "No importa, lo aprenderemos juntos 😊."

        next_q_num = q_num + 1
        if next_q_num <= len(questions):
            # Still more placement questions to ask
            beliefs["placement_question"] = next_q_num
            next_q = questions[next_q_num - 1]
            instruction = (
                f"{result_text} Ask the next placement question: '{next_q['question']}'"
            )
            return BDIDecision(
                action="placement_test_continue",
                instruction=instruction,
                updated_beliefs=beliefs,
            )
        else:
            # Placement test complete — mark done and pick first topic
            beliefs["placement_done"] = True
            beliefs.pop("placement_in_progress", None)
            beliefs.pop("placement_question", None)
            beliefs.pop("placement_age", None)

            next_topic = _curriculum.get_next_topic(beliefs, student_age)
            instruction = (
                f"{result_text} Placement test is complete! Celebrate with the child. "
                f"Tell them excitedly that now you'll start with '{next_topic.display_name}'. "
                f"{next_topic.description_for_student}"
            )
            return BDIDecision(
                action="placement_test_complete",
                instruction=instruction,
                updated_beliefs=beliefs,
                next_topic_id=next_topic.id,
            )
