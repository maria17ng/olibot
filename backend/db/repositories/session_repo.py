"""
Repository pattern for Session and Message database operations.
"""
from datetime import datetime
from sqlalchemy.orm import Session
from backend.db.models import SessionModel, MessageModel, ActivityModel


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

    def get_sessions_for_student(self, student_id: int) -> list[SessionModel]:
        return (
            self.db.query(SessionModel)
            .filter(SessionModel.student_id == student_id)
            .order_by(SessionModel.started_at.desc())
            .all()
        )

    def log_activity(
        self,
        session_id: int,
        topic_id: str,
        student_response: str | None,
        is_correct: bool | None,
        hint_level_used: int = 1,
    ) -> ActivityModel:
        """
        Records a structured activity attempt.
        Called whenever the BDI evaluates an attempt_answer intent.
        Also increments the session's correct/incorrect counters.
        """
        activity = ActivityModel(
            session_id=session_id,
            topic_id=topic_id,
            student_response=student_response,
            is_correct=is_correct,
            hint_level_used=hint_level_used,
        )
        self.db.add(activity)

        if is_correct is not None:
            session = self.get_by_id(session_id)
            if session:
                if is_correct:
                    session.correct_answers += 1
                else:
                    session.incorrect_answers += 1

        self.db.commit()
        self.db.refresh(activity)
        return activity

    def increment_hints(self, session_id: int):
        session = self.get_by_id(session_id)
        if session:
            session.hints_given += 1
            self.db.commit()
