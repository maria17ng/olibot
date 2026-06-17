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

    # ── LLM Provider ──────────────────────────────────────────────────────
    # Set llm_provider to switch between backends without code changes.
    # "ollama"  → local Ollama server (default, no API key needed)
    # "groq"    → Groq Cloud (llama-3.1-8b-instant, ~200 tok/s, free tier available)
    # "gemini"  → Google Gemini Flash (fast, cheap, OpenAI-compatible endpoint)
    llm_provider: str = "ollama"   # "ollama" | "groq" | "gemini"

    # Ollama (Local LLM)
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "qwen2.5:7b-instruct"    # NLG model (GPU, gran calidad ES)
    ollama_nlu_model: str = "llama3.2:1b"        # NLU intent classification
    ollama_embed_model: str = "nomic-embed-text"  # Semantic NLU embeddings
    ollama_timeout: int = 60

    # Groq Cloud (fast inference, OpenAI-compatible)
    # Get API key at: https://console.groq.com/keys
    groq_api_key: str = ""
    groq_model: str = "llama-3.1-8b-instant"     # ~200 tok/s on Groq

    # Google Gemini (via OpenAI-compatible REST endpoint)
    # Get API key at: https://aistudio.google.com/app/apikey
    gemini_api_key: str = ""
    gemini_model: str = "gemini-1.5-flash"        # Fast and cheap

    # JaCaMo BDI Agent (REST bridge)
    jacamo_base_url: str = "http://localhost:8080"
    jacamo_enabled: bool = True   # Set True when JaCaMo is running

    # Safety Shield
    safety_shield_strict: bool = True   # Enforces scaffolding, no direct answers

    # Pedagogy
    default_student_age: int = 5
    zdp_hint_threshold: float = 0.6   # Below this success rate → provide hint

    # ── Voice pipeline ────────────────────────────────────────────────────
    # STT provider: "webapi" uses browser Web Speech API (no server needed).
    # "whisper" routes audio to the /api/v1/voice/stt endpoint (faster-whisper).
    voice_stt_provider: str = "webapi"     # "webapi" | "whisper"

    # TTS provider: "webapi" uses browser SpeechSynthesis.
    # "elevenlabs" / "openai" stream audio from the /api/v1/voice/tts endpoint.
    voice_tts_provider: str = "webapi"     # "webapi" | "elevenlabs" | "openai"

    # ElevenLabs TTS
    # Get API key at: https://elevenlabs.io/app/settings/api-keys
    elevenlabs_api_key: str = ""
    # "Bella" (EXAVITQu4vr4xnSDxMaL) — female Spanish voice
    elevenlabs_voice_id: str = "EXAVITQu4vr4xnSDxMaL"
    elevenlabs_model_id: str = "eleven_turbo_v2_5"   # low-latency model

    # OpenAI TTS-1 (fast, cheaper than HD)
    # Also used as base_url for Groq if llm_provider="groq"
    openai_api_key: str = ""
    openai_tts_model: str = "tts-1"      # "tts-1" | "tts-1-hd"
    openai_tts_voice: str = "shimmer"    # shimmer = female, warm tone

    # faster-whisper STT (runs locally)
    # Model sizes: tiny (~40 MB), base (~80 MB), small (~250 MB),
    #              medium (~800 MB), large-v3 (~3 GB)
    whisper_model_size: str = "medium"
    whisper_language: str = "es"         # Force Spanish for children's speech
    whisper_device: str = "auto"         # "auto" | "cpu" | "cuda"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
