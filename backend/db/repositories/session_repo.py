"""
Repository pattern for Session and Message database operations.
"""
from datetime import datetime
from sqlalchemy.orm import Session
from backend.db.models import SessionModel, MessageModel


class SessionRepository:

    def __init__(self, db: Session):
        self.db = db

    def create_session(self, student_id: int, topic: str = "general") -> SessionModel:
        session = SessionModel(student_id=student_id, topic=topic)
        self.db.add(session)
        self.db.commit()
        self.db.refresh(session)
        return session

    def get_active_session(self, student_id: int) -> SessionModel | None:
        return (
            self.db.query(SessionModel)
            .filter(SessionModel.student_id == student_id, SessionModel.is_active == True)
            .order_by(SessionModel.started_at.desc())
            .first()
        )

    def get_by_id(self, session_id: int) -> SessionModel | None:
        return self.db.query(SessionModel).filter(SessionModel.id == session_id).first()

    def close_session(self, session_id: int) -> SessionModel | None:
        session = self.get_by_id(session_id)
        if not session:
            return None
        session.is_active = False
        session.ended_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(session)
        return session

    def increment_correct(self, session_id: int):
        session = self.get_by_id(session_id)
        if session:
            session.correct_answers += 1
            self.db.commit()

    def increment_incorrect(self, session_id: int):
        session = self.get_by_id(session_id)
        if session:
            session.incorrect_answers += 1
            self.db.commit()

    def add_message(
        self,
        session_id: int,
        role: str,
        content: str,
        shield_triggered: bool = False,
        original_llm_response: str | None = None,
        detected_intent: str | None = None,
    ) -> MessageModel:
        msg = MessageModel(
            session_id=session_id,
            role=role,
            content=content,
            shield_triggered=shield_triggered,
            original_llm_response=original_llm_response,
            detected_intent=detected_intent,
        )
        self.db.add(msg)

        # Update session message count
        session = self.get_by_id(session_id)
        if session:
            session.messages_count += 1

        self.db.commit()
        self.db.refresh(msg)
        return msg

    def get_session_messages(self, session_id: int) -> list[MessageModel]:
        return (
            self.db.query(MessageModel)
            .filter(MessageModel.session_id == session_id)
            .order_by(MessageModel.timestamp.asc())
            .all()
        )
