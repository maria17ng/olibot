"""
Student management API routes (CRUD).
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.db.database import get_db
from backend.db.repositories.student_repo import StudentRepository
from backend.db.repositories.checkpoint_repo import CheckpointRepository
from backend.api.schemas.student import (
    StudentCreate, StudentUpdate, StudentResponse, BeliefsUpdate,
    EmotionalCheckpointCreate, EmotionalCheckpointResponse,
)

router = APIRouter(prefix="/students", tags=["students"])


@router.get("/", response_model=list[StudentResponse])
def list_students(db: Session = Depends(get_db)):
    return StudentRepository(db).get_all()


@router.get("/{student_id}", response_model=StudentResponse)
def get_student(student_id: int, db: Session = Depends(get_db)):
    student = StudentRepository(db).get_by_id(student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    return student


@router.post("/", response_model=StudentResponse, status_code=201)
def create_student(data: StudentCreate, db: Session = Depends(get_db)):
    return StudentRepository(db).create(data)


@router.patch("/{student_id}", response_model=StudentResponse)
def update_student(student_id: int, data: StudentUpdate, db: Session = Depends(get_db)):
    student = StudentRepository(db).update(student_id, data)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    return student


@router.patch("/{student_id}/beliefs", response_model=StudentResponse)
def update_student_beliefs(student_id: int, data: BeliefsUpdate, db: Session = Depends(get_db)):
    """Persist the student's full beliefs object (includes topics_progress for subnivel persistence)."""
    student = StudentRepository(db).update_beliefs(student_id, data.beliefs)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    return student


@router.delete("/{student_id}", status_code=204)
def delete_student(student_id: int, db: Session = Depends(get_db)):
    deleted = StudentRepository(db).delete(student_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Student not found")


@router.post(
    "/{student_id}/request-assessment",
    response_model=StudentResponse,
    summary="Request initial assessment",
)
def request_initial_assessment(student_id: int, db: Session = Depends(get_db)):
    """Set needs_assessment flag so the next session starts in assessment mode."""
    repo = StudentRepository(db)
    student = repo.get_by_id(student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    beliefs = dict(student.beliefs)
    beliefs["needs_assessment"] = True
    return repo.update_beliefs(student_id, beliefs)


@router.post(
    "/{student_id}/emotional-checkpoints",
    response_model=EmotionalCheckpointResponse,
    status_code=201,
    summary="Record emotional checkpoint",
)
def create_emotional_checkpoint(
    student_id: int,
    data: EmotionalCheckpointCreate,
    db: Session = Depends(get_db),
):
    """Save an emotional checkpoint for a student (post-levelup, session start, activity change)."""
    student = StudentRepository(db).get_by_id(student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    return CheckpointRepository(db).create(
        student_id=student_id,
        context=data.context,
        emotion=data.emotion,
    )


@router.get(
    "/{student_id}/emotional-checkpoints",
    response_model=list[EmotionalCheckpointResponse],
    summary="Get emotional history",
)
def get_emotional_checkpoints(
    student_id: int,
    limit: int = 200,
    db: Session = Depends(get_db),
):
    """Return emotional checkpoint history for a student (chronological, newest last)."""
    student = StudentRepository(db).get_by_id(student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    return CheckpointRepository(db).get_for_student(student_id, limit=limit)
