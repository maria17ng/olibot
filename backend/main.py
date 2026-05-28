"""
OLIBOT FastAPI Application Entry Point.

Startup sequence:
  1. Configure logging (file + console)
  2. Initialize SQLite database (create tables if needed)
  3. Register API routers
  4. Configure CORS for the React frontend
"""
import logging
import logging.handlers
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.config.settings import get_settings
from backend.db.database import init_db
from backend.api.routes import chat, students, reports
from backend.api.routes import voice

settings = get_settings()

# ── Logging setup ─────────────────────────────────────────────────────────────
_LOGS_DIR = Path(__file__).parent.parent / "logs"
_LOGS_DIR.mkdir(parents=True, exist_ok=True)

_log_format = "%(asctime)s [%(name)s] %(levelname)s: %(message)s"
_date_fmt   = "%Y-%m-%d %H:%M:%S"

_file_handler = logging.handlers.RotatingFileHandler(
    _LOGS_DIR / "olibot.log",
    maxBytes=5 * 1024 * 1024,   # 5 MB
    backupCount=3,
    encoding="utf-8",
)
_file_handler.setFormatter(logging.Formatter(_log_format, datefmt=_date_fmt))

_console_handler = logging.StreamHandler()
_console_handler.setFormatter(logging.Formatter(_log_format, datefmt=_date_fmt))

logging.basicConfig(level=logging.INFO, handlers=[_file_handler, _console_handler])
# Suppress noisy third-party loggers
for _noisy in ("httpx", "httpcore", "uvicorn.access"):
    logging.getLogger(_noisy).setLevel(logging.WARNING)

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="Hybrid BDI-LLM Pedagogical Agent for Early Education",
)

# Allow the React dev server to call the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(chat.router,     prefix="/api/v1")
app.include_router(students.router, prefix="/api/v1")
app.include_router(reports.router,  prefix="/api/v1")
app.include_router(voice.router,    prefix="/api/v1")


@app.on_event("startup")
async def on_startup():
    init_db()


@app.get("/health")
async def health_check():
    return {
        "status": "ok",
        "version": settings.app_version,
        "jacamo_enabled": settings.jacamo_enabled,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=5050, reload=True)
