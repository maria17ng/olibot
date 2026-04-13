"""
OLIBOT FastAPI Application Entry Point.

Startup sequence:
  1. Initialize SQLite database (create tables if needed)
  2. Register API routers
  3. Configure CORS for the React frontend
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.config.settings import get_settings
from backend.db.database import init_db
from backend.api.routes import chat, students, reports

settings = get_settings()

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
app.include_router(chat.router, prefix="/api/v1")
app.include_router(students.router, prefix="/api/v1")
app.include_router(reports.router, prefix="/api/v1")


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
