"""
Pydantic schemas for Student API request/response validation.
"""
from datetime import datetime
from pydantic import BaseModel, Field


class StudentCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    age: int = Field(..., ge=3, le=7)  # 6 = advanced level (sílabas complejas, frases)
    level: str = Field(default="beginner", pattern="^(beginner|intermediate|advanced)$")
    avatar_id: str = Field(default="robot", max_length=20)


class StudentUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    age: int | None = Field(default=None, ge=3, le=7)
    level: str | None = Field(default=None, pattern="^(beginner|intermediate|advanced)$")
    avatar_id: str | None = Field(default=None, max_length=20)


class BeliefsUpdate(BaseModel):
    beliefs: dict


class EmotionalCheckpointCreate(BaseModel):
    context: str = Field(..., pattern="^(session_start|post_levelup|coloring_start|tracing_resume)$")
    emotion: str | None = Field(default=None, pattern="^(happy|sad|tired|angry)$")


class EmotionalCheckpointResponse(BaseModel):
    id: int
    student_id: int
    emotion: str | None
    context: str
    timestamp: datetime

    class Config:
        from_attributes = True


class StudentResponse(BaseModel):
    id: int
    name: str
    age: int
    level: str
    avatar_id: str | None = "robot"
    beliefs: dict
    total_sessions: int
    overall_success_rate: float
    created_at: datetime

    class Config:
        from_attributes = True
