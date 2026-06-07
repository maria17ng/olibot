"""
SQLite database connection and session management using SQLAlchemy.
"""
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool
from backend.config.settings import get_settings

settings = get_settings()

# NullPool: SQLite does not benefit from connection pooling.
# Using the default QueuePool causes exhaustion when async routes hold
# connections open across LLM calls (several seconds per turn).
# NullPool opens/closes a fresh connection per request, which SQLite
# handles fine and avoids "QueuePool limit reached" errors.
engine = create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False},
    poolclass=NullPool,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """FastAPI dependency: yields a database session and closes it after use."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Creates all tables on startup if they don't exist."""
    from backend.db import models  # noqa: F401 - import triggers table registration
    Base.metadata.create_all(bind=engine)
    # Migrate existing DBs: add avatar_id column if missing (SQLite-safe)
    from sqlalchemy import text
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE students ADD COLUMN avatar_id VARCHAR(20) DEFAULT 'robot'"))
            conn.commit()
        except Exception:
            pass  # Column already exists
