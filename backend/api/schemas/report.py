"""
Pydantic schemas for the Parent Reports API endpoint.

The report gives parents/teachers a structured summary of a student's
progress, mastery per topic, and pedagogical recommendations.

This maps to the BDI belief base query:
    .findall(mastery(T, Att, Cor, Mas), MasteryList)
"""
from datetime import datetime
from pydantic import BaseModel


class TopicMasteryReport(BaseModel):
    """Progress data for a single curriculum topic."""
    topic_id: str
    display_name: str
    category: str
    emoji: str
    attempts: int
    correct: int
    success_rate: float        # 0.0 – 1.0
    mastered: bool
    hint_level_needed: int     # 1-3, reflects how much support was needed


class SessionSummary(BaseModel):
    """High-level summary of a single tutoring session."""
    session_id: int
    topic_id: str
    topic_display_name: str
    started_at: datetime
    messages_count: int
    correct_answers: int
    incorrect_answers: int
    hints_given: int
    success_rate: float
    shield_triggered_count: int


class StudentProgressReport(BaseModel):
    """
    Full progress report for a student.
    Intended for parents or teachers.

    Fields align with the informes de progreso described in OLIBOT's
    technical specification:
        - Progreso por tema (topic mastery)
        - Tasa de éxito global (overall_success_rate)
        - Recomendaciones para casa (recommended_focus)
    """
    student_id: int
    student_name: str
    student_age: int
    generated_at: datetime

    # Aggregate stats
    total_sessions: int
    total_messages: int
    overall_success_rate: float

    # Per-topic breakdown
    topics_mastered: int
    topics_in_progress: int
    topics_not_started: int
    mastery_by_topic: list[TopicMasteryReport]

    # Pedagogical recommendations
    recommended_focus: list[str]       # topic_ids to reinforce at home
    recommended_display_names: list[str]  # human-readable names for the same

    # Session history (most recent first)
    recent_sessions: list[SessionSummary]