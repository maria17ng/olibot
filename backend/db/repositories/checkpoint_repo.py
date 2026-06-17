"""
Repository for EmotionalCheckpoint CRUD operations.
"""
from datetime import datetime
from sqlalchemy.orm import Session
from backend.db.models import EmotionalCheckpointModel


class CheckpointRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, student_id: int, context: str, emotion: str | None = None) -> EmotionalCheckpointModel:
        checkpoint = EmotionalCheckpointModel(
            student_id=student_id,
            emotion=emotion,
            context=context,
        )
        self.db.add(checkpoint)
        self.db.commit()
        self.db.refresh(checkpoint)
        return checkpoint

    def get_for_student(
        self,
        student_id: int,
        limit: int = 200,
        since: datetime | None = None,
    ) -> list[EmotionalCheckpointModel]:
        q = (
            self.db.query(EmotionalCheckpointModel)
            .filter(EmotionalCheckpointModel.student_id == student_id)
        )
        if since:
            q = q.filter(EmotionalCheckpointModel.timestamp >= since)
        return q.order_by(EmotionalCheckpointModel.timestamp.asc()).limit(limit).all()
