"""
Pydantic schemas for Student API request/response validation.
"""
from datetime import datetime
from pydantic import BaseModel, Field


class StudentCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    age: int = Field(..., ge=3, le=6)
    level: str = Field(default="beginner", pattern="^(beginner|intermediate|advanced)$")


class StudentUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    age: int | None = Field(default=None, ge=3, le=6)
    level: str | None = Field(default=None, pattern="^(beginner|intermediate|advanced)$")


class StudentResponse(BaseModel):
    id: int
    name: str
    age: int
    level: str
    beliefs: dict
    total_sessions: int
    overall_success_rate: float
    created_at: datetime

    class Config:
        from_attributes = True
