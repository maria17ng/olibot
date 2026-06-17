"""
Pydantic schemas for the Parent Reports API endpoint.

The report gives parents/teachers a structured summary of a student's
progress, mastery per topic, and pedagogical recommendations.

This maps to the BDI belief base query:
    .findall(mastery(T, Att, Cor, Mas), MasteryList)

Multi-level BDI Explainability (ref. Dennis & Oren 2022 [2], Yan et al. 2023 [27]):
    Level 1 — Intention:  current goal the agent is pursuing
    Level 2 — Plan:       which plan was selected and why
    Level 3 — Beliefs:    mastery evidence that drove the decision
"""
from datetime import datetime
from pydantic import BaseModel


class MessageRecord(BaseModel):
    """A single message exchanged between child and OLIBOT in a session."""
    message_id: int
    role: str            # "user" | "agent"
    content: str
    detected_intent: str | None
    shield_triggered: bool
    timestamp: datetime


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


class BDIExplanation(BaseModel):
    """
    Multi-level explainability for BDI agent decisions.

    Implements the framework proposed in:
    - [2] Dennis & Oren (2022): Explaining BDI Behaviour through Dialogue
    - [27] Yan, Burattini et al. (2023): Multi-Level Explainability for BDI Agents

    Three levels:
        L1 – Intention: what goal the agent is currently pursuing
        L2 – Plan: which plan was selected and why (pedagogical rationale)
        L3 – Beliefs: the mastery evidence in the belief base that drove L1+L2
    """
    # L1 — Intention
    current_desire: str           # "Enseñar vocal A" / "Evaluar nivel inicial"
    agent_status: str             # "Práctica activa" / "Test de nivel" / etc.

    # L2 — Plan
    topic_selection_reason: str   # Why this topic was chosen (ZDP, prerequisites, SR)
    hint_strategy: str            # Current scaffolding level and justification
    next_topic_preview: str       # What comes next and why

    # L3 — Beliefs
    mastery_evidence: list[str]   # Bullet list: "emoji topic: N intentos, X% aciertos"
    belief_summary: str           # Human-readable summary of belief base state


class AgeGroupReport(BaseModel):
    """Summary of curriculum topics for a specific age bracket."""
    age: int                         # 3, 4, or 5
    total_topics: int
    mastered_topics: int
    in_progress_topics: int
    not_started_topics: int
    all_mastered: bool               # True when child has completed all age-level topics
    completion_pct: float            # 0.0 – 1.0
    advance_message: str             # Message shown when all_mastered=True
    topics: list[TopicMasteryReport] # Per-topic details for this age group


class StudentProgressReport(BaseModel):
    """
    Full progress report for a student.
    Intended for parents or teachers.

    Fields align with the informes de progreso described in OLIBOT's
    technical specification:
        - Progreso por tema (topic mastery)
        - Tasa de éxito global (overall_success_rate)
        - Recomendaciones para casa (recommended_focus)
        - Explicabilidad BDI (bdi_explanation) — Fase 8, medium priority
        - Actividades por edad (age_groups) — Fase 9
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

    # Age-group breakdown (Fase 9)
    age_groups: list[AgeGroupReport]

    # Pedagogical recommendations
    recommended_focus: list[str]             # topic_ids to reinforce at home
    recommended_display_names: list[str]     # human-readable names for the same

    # Session history (most recent first)
    recent_sessions: list[SessionSummary]

    # BDI explainability (Fase 8 — medium priority)
    bdi_explanation: BDIExplanation