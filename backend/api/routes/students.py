"""
Student management API routes (CRUD).
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.db.database import get_db
from backend.db.repositories.student_repo import StudentRepository
from backend.api.schemas.student import StudentCreate, StudentUpdate, StudentResponse

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


@router.delete("/{student_id}", status_code=204)
def delete_student(student_id: int, db: Session = Depends(get_db)):
    deleted = StudentRepository(db).delete(student_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Student not found")
