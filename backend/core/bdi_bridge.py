"""
BDI Bridge — communicates with the JaCaMo agent via REST API.

Architecture:
    Python Backend  ──REST──►  JaCaMo HTTP Server  ──►  Jason BDI Agent
                    ◄──REST──                       ◄──

When JaCaMo is not running (jacamo_enabled=False in settings), the bridge
uses a PythonBDIFallback that simulates the BDI reasoning in pure Python.
This allows the project to run and be tested before JaCaMo is configured.

JaCaMo REST endpoints (when running):
    POST /percept           → Send a new perception to the agent
    GET  /belief/{key}      → Query a belief value
    POST /goal              → Add a new goal to the agent
    GET  /intentions        → List current active intentions
"""
import httpx
from dataclasses import dataclass
from backend.config.settings import get_settings
from backend.llm.nlu import Intent
from backend.db.models import StudentModel

settings = get_settings()


@dataclass
class BDIDecision:
    """The BDI agent's output: what action OLIBOT should take next."""
    action: str           # e.g. "give_hint", "praise", "ask_question", "redirect"
    instruction: str      # Human-readable instruction for the NLG module
    updated_beliefs: dict  # New/updated beliefs after this interaction turn
    hint_level: int = 1   # Scaffolding level (1=subtle, 3=near-direct)


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
    ) -> BDIDecision:
        """
        Main entry point: given an intent from the NLU, the BDI agent decides
        what pedagogical action to take next.
        """
        if self.enabled:
            return await self._call_jacamo(intent, student, session_success_rate)
        return self._fallback.decide(intent, student, session_success_rate)

    async def _call_jacamo(
        self,
        intent: Intent,
        student: StudentModel,
        session_success_rate: float,
    ) -> BDIDecision:
        """Sends a percept to JaCaMo and waits for the agent's decision."""
        percept_payload = {
            "student_id": student.id,
            "intent": intent.name,
            "entities": intent.entities,
            "success_rate": session_success_rate,
            "current_beliefs": student.beliefs,
        }
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                response = await client.post(
                    f"{self.base_url}/percept",
                    json=percept_payload,
                )
                response.raise_for_status()
                data = response.json()
                return BDIDecision(
                    action=data["action"],
                    instruction=data["instruction"],
                    updated_beliefs=data.get("updated_beliefs", student.beliefs),
                    hint_level=data.get("hint_level", 1),
                )
        except (httpx.ConnectError, httpx.TimeoutException, httpx.HTTPStatusError):
            # JaCaMo is unreachable → fall back gracefully
            return self._fallback.decide(intent, student, session_success_rate)


class PythonBDIFallback:
    """
    Pure-Python simulation of the JaCaMo BDI reasoning loop.
    Implements the same pedagogical rules as the Jason agent plans.

    This is intentionally simple: it encodes the core BDI logic as
    Python if/else to mirror the Jason plan selection rules.
    Replace this with real JaCaMo calls once the Java agent is set up.
    """

    ZDP_THRESHOLD = 0.6  # Below this success rate → student needs more support

    def decide(
        self,
        intent: Intent,
        student: StudentModel,
        session_success_rate: float,
    ) -> BDIDecision:
        """
        Simulates Jason plan selection based on the current intent and beliefs.

        Jason equivalent:
            +!respond(Intent) : intent(ask_for_answer) <- give_hint(1).
            +!respond(Intent) : intent(attempt_answer) & correct <- praise_and_advance.
        """
        beliefs = dict(student.beliefs)  # Work on a copy

        # Plan: student is asking for the answer directly
        if intent.name == "ask_for_answer":
            hint_level = self._calculate_hint_level(session_success_rate)
            return BDIDecision(
                action="give_hint",
                instruction=f"The student asked for the answer directly. Do NOT give it. "
                             f"Provide a level-{hint_level} Socratic hint instead.",
                updated_beliefs=beliefs,
                hint_level=hint_level,
            )

        # Plan: student is attempting an answer
        if intent.name == "attempt_answer":
            topic = intent.entities.get("topic", "current topic")
            # Mark that student has attempted this topic
            beliefs[f"attempted_{topic}"] = True
            return BDIDecision(
                action="evaluate_and_encourage",
                instruction="Evaluate the student's attempt kindly. If correct, celebrate. "
                             "If wrong, give a gentle hint and try again.",
                updated_beliefs=beliefs,
                hint_level=1,
            )

        # Plan: student is asking for a hint
        if intent.name == "ask_for_hint":
            hint_level = self._calculate_hint_level(session_success_rate)
            return BDIDecision(
                action="give_hint",
                instruction=f"Student wants a hint. Give a level-{hint_level} clue "
                             f"without revealing the answer.",
                updated_beliefs=beliefs,
                hint_level=hint_level,
            )

        # Plan: greeting
        if intent.name == "greet":
            return BDIDecision(
                action="greet_and_start",
                instruction="Greet the student warmly and introduce today's activity.",
                updated_beliefs=beliefs,
            )

        # Plan: off-topic or unknown → redirect to the lesson
        return BDIDecision(
            action="redirect",
            instruction="The student went off-topic. Gently redirect them back to the lesson.",
            updated_beliefs=beliefs,
        )

    def _calculate_hint_level(self, success_rate: float) -> int:
        """
        Maps session success rate to scaffolding hint level.
        Low performance → stronger hints (closer to direct guidance).
        """
        if success_rate < 0.3:
            return 3  # Student is struggling → near-direct guidance
        if success_rate < self.ZDP_THRESHOLD:
            return 2  # Student needs moderate support
        return 1       # Student is doing well → subtle nudge
