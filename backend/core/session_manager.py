"""
Session Manager — orchestrates the full conversational turn pipeline.

Turn pipeline:
    1. Student message arrives
    2. NLU extracts the intent
    3. BDI Bridge decides the pedagogical action
    4. NLG generates the LLM response (following BDI instruction)
    5. Safety Shield validates/modifies the response
    6. Response + metadata are persisted to DB
    7. Final response returned to the API layer
"""
from sqlalchemy.orm import Session
from backend.core.bdi_bridge import BDIBridge
from backend.core.safety_shield import SafetyShield
from backend.llm.nlu import NLUProcessor
from backend.llm.nlg import NLGProcessor
from backend.llm.ollama_client import OllamaClient
from backend.db.repositories.student_repo import StudentRepository
from backend.db.repositories.session_repo import SessionRepository
from backend.db.models import SessionModel
from backend.api.schemas.chat import ChatResponse


class SessionManager:
    """Coordinates all modules to process a single conversational turn."""

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
        """
        # 1. Load student
        student = self.student_repo.get_by_id(student_id)
        if not student:
            raise ValueError(f"Student {student_id} not found")

        # 2. Get or create session
        session = self._get_or_create_session(student_id, session_id)

        # 3. NLU: classify the student's message
        intent = await self.nlu.extract_intent(user_message)

        # 4. BDI: decide the pedagogical action
        bdi_decision = await self.bdi.process_turn(
            intent=intent,
            student=student,
            session_success_rate=session.success_rate,
        )

        # 5. NLG: generate LLM response following BDI instruction
        conversation_history = self._build_history(session.id)
        conversation_history.append({"role": "user", "content": user_message})

        raw_llm_response = await self.nlg.generate_response(
            student=student,
            topic=session.topic,
            conversation_history=conversation_history,
            agent_instruction=bdi_decision.instruction,
        )

        # 6. Safety Shield: validate/modify the LLM response
        shield_result = self.shield.evaluate(raw_llm_response, intent, student)
        final_response = self.shield.get_final_response(shield_result, raw_llm_response)

        # 7. Persist: save student message
        self.session_repo.add_message(
            session_id=session.id,
            role="user",
            content=user_message,
            detected_intent=intent.name,
        )

        # 8. Persist: save agent message
        self.session_repo.add_message(
            session_id=session.id,
            role="agent",
            content=final_response,
            shield_triggered=shield_result.triggered,
            original_llm_response=raw_llm_response if shield_result.triggered else None,
            detected_intent=intent.name,
        )

        # 9. Update student beliefs from BDI decision
        updated_beliefs = bdi_decision.updated_beliefs
        self.student_repo.update_beliefs(student_id, updated_beliefs)

        return ChatResponse(
            session_id=session.id,
            agent_response=final_response,
            shield_triggered=shield_result.triggered,
            detected_intent=intent.name,
            current_beliefs=updated_beliefs,
        )

    def _get_or_create_session(self, student_id: int, session_id: int | None) -> SessionModel:
        if session_id:
            session = self.session_repo.get_by_id(session_id)
            if session and session.is_active:
                return session
        # Create a new session
        return self.session_repo.create_session(student_id=student_id)

    def _build_history(self, session_id: int) -> list[dict]:
        """Converts stored messages into the format expected by the LLM."""
        messages = self.session_repo.get_session_messages(session_id)
        return [
            {"role": msg.role if msg.role == "user" else "assistant", "content": msg.content}
            for msg in messages
        ]
