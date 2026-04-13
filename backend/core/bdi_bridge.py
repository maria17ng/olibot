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
    ) -> BDIDecision:
        """
        Main entry point: given an intent from the NLU, the BDI agent decides
        what pedagogical action to take next.

        Args:
            intent:               Classified student intent from NLU
            student:              Student ORM object (includes beliefs)
            session_success_rate: Overall success rate for the current session
            current_topic:        Active curriculum topic (Fase 2)
        """
        if self.enabled:
            return await self._call_jacamo(intent, student, session_success_rate, current_topic)
        return self._fallback.decide(intent, student, session_success_rate, current_topic)

    async def _call_jacamo(
        self,
        intent: Intent,
        student: StudentModel,
        session_success_rate: float,
        current_topic: CurriculumTopic | None,
    ) -> BDIDecision:
        """
        Two-step communication with JaCaMo:
          1. POST /percept  → OlibotEnv updates observable properties,
                              Jason agent fires +percept_count(N) plan.
          2. GET  /decision → blocks until the Jason agent calls
                              postDecision(...) on the artifact (≤8s).

        The is_correct field is pre-evaluated here (Python has the curriculum)
        and sent in the percept payload so Jason can use it in its plans
        without needing its own answer-evaluation logic.
        """
        # Pre-evaluate correctness so the Jason agent can reason about it
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
            "is_correct": is_correct_for_percept,   # pre-evaluated; Jason reads this
        }

        try:
            # Step 1 — send percept (OlibotEnv returns {"status":"received"} immediately)
            async with httpx.AsyncClient(timeout=5) as client:
                ack = await client.post(f"{self.base_url}/percept", json=percept_payload)
                ack.raise_for_status()

            # Step 2 — wait for the agent's decision (OlibotEnv blocks up to 8s)
            async with httpx.AsyncClient(timeout=12) as client:
                response = await client.get(f"{self.base_url}/decision")

            if response.status_code == 408:
                # Agent timed out → graceful fallback
                return self._fallback.decide(intent, student, session_success_rate, current_topic)

            response.raise_for_status()
            data = response.json()

            # The Jason agent does not update beliefs (it has no DB access).
            # Belief updates (mastery, etc.) are always done by PythonBDIFallback
            # or SessionManager.  Here we re-run the fallback purely to get
            # updated_beliefs, then override action/instruction from JaCaMo.
            fallback = self._fallback.decide(intent, student, session_success_rate, current_topic)

            return BDIDecision(
                action=data.get("action", fallback.action),
                instruction=data.get("instruction", fallback.instruction),
                updated_beliefs=fallback.updated_beliefs,   # always from Python
                hint_level=data.get("hint_level", fallback.hint_level),
                is_correct=fallback.is_correct,             # evaluated by Python
                next_topic_id=fallback.next_topic_id,       # computed by Python
            )

        except (httpx.ConnectError, httpx.TimeoutException, httpx.HTTPStatusError):
            # JaCaMo is unreachable → fall back gracefully
            return self._fallback.decide(intent, student, session_success_rate, current_topic)


class PythonBDIFallback:
    """
    Pure-Python simulation of the JaCaMo BDI reasoning loop.
    Implements the same pedagogical rules as the Jason agent plans.

    This is intentionally a mirror of the Jason plans in olibot.asl.
    Replace with real JaCaMo calls by setting JACAMO_ENABLED=true.

    Implemented plans (from olibot.asl):
        +!respond(ask_for_answer, ...)  → give_hint
        +!respond(attempt_answer, ...)  → evaluate_and_encourage
        +!respond(ask_for_hint, ...)    → give_hint
        +!respond(greet, ...)           → greet_and_start
        +!respond(_, ...)               → redirect  (catch-all)
        +!select_next_topic(...)        → present_activity (Fase 2)
    """

    def decide(
        self,
        intent: Intent,
        student: StudentModel,
        session_success_rate: float,
        current_topic: CurriculumTopic | None = None,
    ) -> BDIDecision:
        """
        Simulates Jason plan selection based on intent, beliefs and topic.

        Jason equivalent:
            +!respond(Intent) : intent(ask_for_answer) <- give_hint(HintLevel).
            +!respond(Intent) : intent(attempt_answer) & correct <- praise_and_advance.
            +!respond(Intent) : topic_mastered(Topic) <- select_next_topic.
        """
        beliefs = dict(student.beliefs)
        topic_id = current_topic.id if current_topic else "general"
        hint_level = _scaffolding.get_hint_level(beliefs, topic_id)

        # ── Plan: student asks for the answer directly ─────────────────────
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

        # ── Plan: student attempts an answer ───────────────────────────────
        # Jason: +!respond(attempt_answer, SR, Beliefs) <- evaluate_and_encourage.
        if intent.name == "attempt_answer":
            answer = intent.entities.get("answer", "")
            is_correct = (
                _curriculum.evaluate_answer(topic_id, answer)
                if current_topic and answer else None
            )

            if is_correct:
                # Update mastery beliefs
                beliefs = _scaffolding.record_attempt(beliefs, topic_id, True)
                # Check if the topic is now mastered → suggest advancing
                next_topic_id = None
                if _scaffolding.should_advance_topic(beliefs, topic_id):
                    next_topic = _curriculum.get_next_topic(beliefs)
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
                # Wrong or unevaluated attempt
                if is_correct is False:
                    beliefs = _scaffolding.record_attempt(beliefs, topic_id, False)
                    # Escalate hint level after wrong answer
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

        # ── Plan: student asks for a hint ──────────────────────────────────
        # Jason: +!respond(ask_for_hint, SR, _) <- !calculate_hint_level(SR, HL); give_hint(HL).
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

        # ── Plan: greeting ─────────────────────────────────────────────────
        # Jason: +!respond(greet, _, _) <- greet_and_start.
        if intent.name == "greet":
            topic_intro = (
                f"Introduce today's topic: {current_topic.display_name}. "
                f"{current_topic.description_for_student}"
                if current_topic else
                "Greet the student warmly and introduce today's activity."
            )
            return BDIDecision(
                action="greet_and_start",
                instruction=f"Greet the student warmly. {topic_intro}",
                updated_beliefs=beliefs,
            )

        # ── Plan: student expresses emotion ────────────────────────────────
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

        # ── Plan: off-topic / unknown → redirect (catch-all) ──────────────
        # Jason: +!respond(_, _, _) <- redirect.
        return BDIDecision(
            action="redirect",
            instruction=(
                "The student went off-topic. Gently redirect them back to the lesson "
                + (f"about {current_topic.display_name}." if current_topic else ".")
            ),
            updated_beliefs=beliefs,
        )