"""
Chat API routes — the primary conversational endpoint.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.db.database import get_db
from backend.core.session_manager import SessionManager
from backend.api.schemas.chat import ChatRequest, ChatResponse

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


@router.post("/session/{session_id}/end")
async def end_session(session_id: int, db: Session = Depends(get_db)):
    """Closes an active session."""
    from backend.db.repositories.session_repo import SessionRepository
    repo = SessionRepository(db)
    session = repo.close_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"message": "Session closed", "session_id": session_id}


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
