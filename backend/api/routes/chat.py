"""
Chat API routes — the primary conversational endpoint.
"""
import json
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
from backend.db.database import get_db
from backend.core.session_manager import SessionManager
from backend.api.schemas.chat import ChatRequest, ChatResponse


class AdvanceTopicRequest(BaseModel):
    topic_id: str

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("/message", response_model=ChatResponse)
async def send_message(request: ChatRequest, db: Session = Depends(get_db)):
    """
    Processes a student's message through the full OLIBOT pipeline:
    NLU → BDI → NLG → Safety Shield → Response.
    """
    manager = SessionManager(db)
    try:
        return await manager.process_message(
            student_id=request.student_id,
            user_message=request.message,
            session_id=request.session_id,
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Pipeline error: {str(e)}")


@router.post("/stream")
async def stream_message(request: ChatRequest, db: Session = Depends(get_db)):
    """
    Streaming variant of /message. Returns Server-Sent Events (SSE).

    Event sequence:
      data: {"type": "meta",  "session_id": N, "current_topic_id": "...", ...}
      data: {"type": "token", "text": "<token>"}   (one per LLM token)
      ...
      data: {"type": "final", "agent_response": "...", "session_id": N, ...}

    The frontend should display tokens as they arrive and replace with
    agent_response from "final" if the Safety Shield modified the output.
    """
    manager = SessionManager(db)

    async def event_generator():
        try:
            async for event in manager.process_message_stream(
                student_id=request.student_id,
                user_message=request.message,
                session_id=request.session_id,
                current_screen=request.current_screen,
            ):
                yield f"data: {json.dumps(event, ensure_ascii=False)}\n\n"
        except ValueError as e:
            yield f"data: {json.dumps({'type': 'error', 'detail': str(e)})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'detail': f'Pipeline error: {str(e)}'})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.post("/session/{session_id}/end")
async def end_session(session_id: int, db: Session = Depends(get_db)):
    """Closes an active session."""
    from backend.db.repositories.session_repo import SessionRepository
    repo = SessionRepository(db)
    session = repo.close_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"message": "Session closed", "session_id": session_id}


@router.post("/session/{session_id}/advance")
async def advance_session_topic(
    session_id: int, body: AdvanceTopicRequest, db: Session = Depends(get_db)
):
    """Close the current session and open a new one on the given topic.
    Called from the mastery dialog or topic picker when the child advances."""
    from backend.db.repositories.session_repo import SessionRepository
    from backend.db.repositories.student_repo import StudentRepository
    repo = SessionRepository(db)
    student_repo = StudentRepository(db)
    session = repo.get_by_id(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    repo.close_session(session_id)
    new_session = repo.create_session(student_id=session.student_id, topic=body.topic_id)
    student_repo.increment_sessions(session.student_id)
    return {"session_id": new_session.id, "topic_id": body.topic_id}


@router.get("/student/{student_id}/topics")
async def get_accessible_topics(student_id: int, db: Session = Depends(get_db)):
    """Returns ALL topics for this student's age with a 'locked' flag for blocked ones."""
    from backend.db.repositories.student_repo import StudentRepository
    from backend.pedagogy.curriculum import CurriculumEngine
    student_repo = StudentRepository(db)
    student = student_repo.get_by_id(student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    beliefs = student.beliefs or {}
    age = int(student.age or 4)
    curriculum = CurriculumEngine()
    topics = curriculum.get_topics_for_age(age)
    mastery_data = beliefs.get("mastery", {})
    result = []
    for t in topics:
        m = mastery_data.get(t.id, {})
        attempts = m.get("attempts", 0)
        correct  = m.get("correct",  0)
        mastered = m.get("mastered", False)
        sr = round(correct / attempts, 2) if attempts > 0 else 0.0
        locked = not curriculum.prerequisites_met(beliefs, t, age)
        result.append({
            "id":           t.id,
            "display_name": t.display_name,
            "emoji":        t.emoji,
            "category":     t.category.value,
            "attempts":     attempts,
            "correct":      correct,
            "success_rate": sr,
            "mastered":     mastered,
            "locked":       locked,
        })
    return result


@router.get("/session/{session_id}/history")
async def get_history(session_id: int, db: Session = Depends(get_db)):
    """Returns the full message history for a session."""
    from backend.db.repositories.session_repo import SessionRepository
    repo = SessionRepository(db)
    messages = repo.get_session_messages(session_id)
    return [
        {
            "role": m.role,
            "content": m.content,
            "shield_triggered": m.shield_triggered,
            "detected_intent": m.detected_intent,
            "timestamp": m.timestamp,
        }
        for m in messages
    ]
