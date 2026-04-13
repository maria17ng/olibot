"""
SQLAlchemy ORM models for OLIBOT.
Represents the persistent state of students, sessions, and messages.
"""
import json
from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from backend.db.database import Base


class StudentModel(Base):
    """Persistent student profile. Maps to the BDI 'Beliefs' about a student."""
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    age = Column(Integer, nullable=False)
    level = Column(String(50), default="beginner")  # beginner / intermediate / advanced

    # Serialized belief base (JSON string) - mirrors the JaCaMo belief base
    beliefs_json = Column(Text, default="{}")

    # Aggregate progress metrics
    total_sessions = Column(Integer, default=0)
    overall_success_rate = Column(Float, default=0.0)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    sessions = relationship("SessionModel", back_populates="student", cascade="all, delete")

    @property
    def beliefs(self) -> dict:
        return json.loads(self.beliefs_json or "{}")

    @beliefs.setter
    def beliefs(self, value: dict):
        self.beliefs_json = json.dumps(value)

    def __repr__(self):
        return f"<Student(id={self.id}, name='{self.name}', age={self.age})>"


class SessionModel(Base):
    """A single tutoring session between OLIBOT and a student."""
    __tablename__ = "sessions"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)

    # The topic covered in this session (e.g., "letra_A", "numero_5")
    topic = Column(String(100), nullable=False, default="general")

    started_at = Column(DateTime, default=datetime.utcnow)
    ended_at = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True)

    # Session-level metrics
    messages_count = Column(Integer, default=0)
    hints_given = Column(Integer, default=0)
    correct_answers = Column(Integer, default=0)
    incorrect_answers = Column(Integer, default=0)

    student = relationship("StudentModel", back_populates="sessions")
    messages = relationship("MessageModel", back_populates="session", cascade="all, delete")
    activities = relationship("ActivityModel", back_populates="session", cascade="all, delete")

    @property
    def success_rate(self) -> float:
        total = self.correct_answers + self.incorrect_answers
        return self.correct_answers / total if total > 0 else 0.0

    def __repr__(self):
        return f"<Session(id={self.id}, student_id={self.student_id}, topic='{self.topic}')>"


class MessageModel(Base):
    """Individual message within a session (both user and agent)."""
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("sessions.id"), nullable=False)

    role = Column(String(20), nullable=False)  # "user" | "agent"
    content = Column(Text, nullable=False)

    # Safety shield metadata
    shield_triggered = Column(Boolean, default=False)  # True if shield modified the response
    original_llm_response = Column(Text, nullable=True)  # Raw LLM output before shielding

    # Detected intent from NLU
    detected_intent = Column(String(100), nullable=True)

    timestamp = Column(DateTime, default=datetime.utcnow)

    session = relationship("SessionModel", back_populates="messages")

    def __repr__(self):
        return f"<Message(id={self.id}, role='{self.role}', session_id={self.session_id})>"


class ActivityModel(Base):
    """
    Records a single structured activity attempt by a student.

    An activity is distinct from a chat message: it captures the
    pedagogical outcome of a turn (correct/incorrect) for a specific
    curriculum topic.

    BDI belief update trigger:
        When is_correct is set, the BDI bridge calls:
            ScaffoldingEngine.record_attempt(beliefs, topic_id, is_correct)
        which updates:
            mastery(TopicId, Attempts+1, Correct+delta, IsMastered)

    Used for:
        - Parent reports (progress per topic)
        - Scaffolding level computation
        - BDI belief base updates
    """
    __tablename__ = "activities"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("sessions.id"), nullable=False)

    # Curriculum topic being practiced (e.g. "vocal_a", "numero_3")
    topic_id = Column(String(100), nullable=False)

    # The text the student produced as their answer (may be None for hint requests)
    student_response = Column(Text, nullable=True)

    # Evaluation result (None = not evaluated, e.g. hint requests)
    is_correct = Column(Boolean, nullable=True)

    # Scaffolding level that was active during this activity (1-3)
    hint_level_used = Column(Integer, default=1)

    timestamp = Column(DateTime, default=datetime.utcnow)

    session = relationship("SessionModel", back_populates="activities")

    def __repr__(self):
        return (
            f"<Activity(id={self.id}, topic='{self.topic_id}', "
            f"correct={self.is_correct}, session_id={self.session_id})>"
        )
