"""
Repository pattern for Student database operations.
Keeps all DB queries isolated from business logic.
"""
from sqlalchemy.orm import Session
from backend.db.models import StudentModel
from backend.api.schemas.student import StudentCreate, StudentUpdate


class StudentRepository:

    def __init__(self, db: Session):
        self.db = db

    def get_all(self) -> list[StudentModel]:
        return self.db.query(StudentModel).all()

    def get_by_id(self, student_id: int) -> StudentModel | None:
        return self.db.query(StudentModel).filter(StudentModel.id == student_id).first()

    def create(self, data: StudentCreate) -> StudentModel:
        student = StudentModel(
            name=data.name,
            age=data.age,
            level=data.level,
        )
        self.db.add(student)
        self.db.commit()
        self.db.refresh(student)
        return student

    def update_beliefs(self, student_id: int, beliefs: dict) -> StudentModel | None:
        student = self.get_by_id(student_id)
        if not student:
            return None
        student.beliefs = beliefs
        self.db.commit()
        self.db.refresh(student)
        return student

    def update(self, student_id: int, data: StudentUpdate) -> StudentModel | None:
        student = self.get_by_id(student_id)
        if not student:
            return None
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(student, field, value)
        self.db.commit()
        self.db.refresh(student)
        return student

    def delete(self, student_id: int) -> bool:
        student = self.get_by_id(student_id)
        if not student:
            return False
        self.db.delete(student)
        self.db.commit()
        return True
