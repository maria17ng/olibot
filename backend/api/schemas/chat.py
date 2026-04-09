"""
Pydantic schemas for Chat API request/response validation.
"""
from datetime import datetime
from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    student_id: int
    message: str = Field(..., min_length=1, max_length=1000)
    session_id: int | None = None  # If None, a new session is started


class MessageOut(BaseModel):
    role: str
    content: str
    shield_triggered: bool
    detected_intent: str | None
    timestamp: datetime

    class Config:
        from_attributes = True


class ChatResponse(BaseModel):
    session_id: int
    agent_response: str
    shield_triggered: bool       # Whether the safety shield modified the LLM output
    detected_intent: str | None  # What intent the NLU detected in the student's message
    current_beliefs: dict        # Snapshot of the student's belief base after the turn
