"""
OLIBOT Backend Configuration
Centralizes all environment variables and runtime settings.
"""
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Application
    app_name: str = "OLIBOT API"
    app_version: str = "0.1.0"
    debug: bool = True

    # Database
    database_url: str = "sqlite:///./olibot.db"

    # Ollama (Local LLM)
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "llama3.1:8b"           # NLG model (response generation)
    ollama_nlu_model: str = "llama3.2:1b"       # NLU model (intent classification) — pull: ollama pull llama3.2:1b
    ollama_embed_model: str = "nomic-embed-text" # Embedding model for semantic NLU — pull: ollama pull nomic-embed-text
    ollama_timeout: int = 60

    # JaCaMo BDI Agent (REST bridge)
    jacamo_base_url: str = "http://localhost:8080"
    jacamo_enabled: bool = True  # Set True when JaCaMo is running

    # Safety Shield
    safety_shield_strict: bool = True  # Enforces scaffolding, no direct answers

    # Pedagogy
    default_student_age: int = 5
    zdp_hint_threshold: float = 0.6  # Below this success rate → provide hint

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    return Settings()