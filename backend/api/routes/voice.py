"""
Voice pipeline endpoints — server-side STT and TTS.

STT  POST /api/v1/voice/stt
     Accepts a multipart audio file (WebM/WAV/MP3), transcribes with
     faster-whisper, and returns {"transcript": "...", "language": "es"}.

TTS  POST /api/v1/voice/tts/stream
     Accepts {"text": "...", "voice_id": "(optional)"} and streams back
     audio/mpeg using ElevenLabs or OpenAI TTS-1 (chunked response).

Provider selection is driven by settings:
    voice_stt_provider = "whisper"      → faster-whisper (local GPU/CPU)
    voice_tts_provider = "elevenlabs"   → ElevenLabs Turbo v2.5
    voice_tts_provider = "openai"       → OpenAI TTS-1

Both endpoints return graceful errors when the provider is not configured
or its dependencies are not installed, so the frontend can fall back to
the browser's Web Speech API without crashing.

Install dependencies when needed:
    pip install faster-whisper          # STT
    pip install elevenlabs              # TTS (ElevenLabs)
    pip install openai                  # TTS (OpenAI) / already needed for Groq
"""
import io
import logging
import tempfile
from pathlib import Path

from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from backend.config.settings import get_settings

router = APIRouter(prefix="/voice", tags=["voice"])
settings = get_settings()
log = logging.getLogger(__name__)


# ── Whisper model singleton ───────────────────────────────────────────────────

_whisper_model = None


def _get_whisper_model():
    global _whisper_model
    if _whisper_model is not None:
        return _whisper_model
    try:
        from faster_whisper import WhisperModel
    except ImportError:
        raise HTTPException(
            status_code=501,
            detail="faster-whisper is not installed. Run: pip install faster-whisper",
        )
    device = settings.whisper_device
    if device == "auto":
        try:
            import torch
            device = "cuda" if torch.cuda.is_available() else "cpu"
        except ImportError:
            device = "cpu"
    compute = "float16" if device == "cuda" else "int8"
    log.info("[STT] Loading faster-whisper model=%s device=%s compute=%s",
             settings.whisper_model_size, device, compute)
    _whisper_model = WhisperModel(
        settings.whisper_model_size,
        device=device,
        compute_type=compute,
    )
    return _whisper_model


# ── STT endpoint ──────────────────────────────────────────────────────────────

@router.post("/stt")
async def speech_to_text(audio: UploadFile = File(...)):
    """
    Transcribe an audio file using faster-whisper.

    The frontend should send the raw audio blob from MediaRecorder
    (typically WebM/Opus or WAV) as multipart/form-data with field name "audio".

    Returns:
        {"transcript": "...", "language": "es", "duration_s": 1.23}
    """
    if settings.voice_stt_provider != "whisper":
        raise HTTPException(
            status_code=400,
            detail="voice_stt_provider is not 'whisper'. Set it in .env to enable this endpoint.",
        )

    audio_bytes = await audio.read()
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="Empty audio file")

    # Write to a temp file — faster-whisper needs a file path
    suffix = Path(audio.filename or "audio.webm").suffix or ".webm"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(audio_bytes)
        tmp_path = tmp.name

    try:
        model = _get_whisper_model()
        segments, info = model.transcribe(
            tmp_path,
            language=settings.whisper_language,
            beam_size=5,
            vad_filter=True,        # remove silence / noise
            vad_parameters={"min_silence_duration_ms": 500},
        )
        transcript = " ".join(seg.text.strip() for seg in segments).strip()
        log.info("[STT] transcript=%r lang=%s dur=%.1fs",
                 transcript, info.language, info.duration)
        return {
            "transcript": transcript,
            "language": info.language,
            "duration_s": round(info.duration, 2),
        }
    except Exception as e:
        log.error("[STT] faster-whisper failed: %s", e)
        raise HTTPException(status_code=500, detail=f"Transcription failed: {e}")
    finally:
        Path(tmp_path).unlink(missing_ok=True)


# ── TTS endpoint ──────────────────────────────────────────────────────────────

class TTSRequest(BaseModel):
    text: str
    voice_id: str | None = None   # overrides settings default when provided


@router.post("/tts/stream")
async def text_to_speech_stream(request: TTSRequest):
    """
    Stream synthesised speech as audio/mpeg.

    The frontend should create an <audio> element and set its src to an
    object URL created from the streamed binary response, or pipe it to
    the Web Audio API for gapless playback.

    Supported providers (voice_tts_provider in .env):
        "elevenlabs"  → ElevenLabs Turbo v2.5 (low latency, ~400 ms TTFB)
        "openai"      → OpenAI TTS-1 (fast, ~600 ms TTFB)
    """
    provider = settings.voice_tts_provider
    if provider == "elevenlabs":
        return await _tts_elevenlabs(request)
    elif provider == "openai":
        return await _tts_openai(request)
    else:
        raise HTTPException(
            status_code=400,
            detail=(
                f"voice_tts_provider='{provider}' is not a server TTS provider. "
                "Set it to 'elevenlabs' or 'openai' in .env."
            ),
        )


async def _tts_elevenlabs(request: TTSRequest) -> StreamingResponse:
    try:
        from elevenlabs.client import AsyncElevenLabs
        from elevenlabs import VoiceSettings
    except ImportError:
        raise HTTPException(
            status_code=501,
            detail="elevenlabs is not installed. Run: pip install elevenlabs",
        )
    if not settings.elevenlabs_api_key:
        raise HTTPException(status_code=500, detail="ELEVENLABS_API_KEY not configured")

    voice_id = request.voice_id or settings.elevenlabs_voice_id
    client = AsyncElevenLabs(api_key=settings.elevenlabs_api_key)

    async def audio_generator():
        try:
            async for chunk in await client.text_to_speech.convert_as_stream(
                text=request.text,
                voice_id=voice_id,
                model_id=settings.elevenlabs_model_id,
                voice_settings=VoiceSettings(stability=0.5, similarity_boost=0.8),
                output_format="mp3_44100_128",
            ):
                yield chunk
        except Exception as e:
            log.error("[TTS/ElevenLabs] streaming error: %s", e)

    return StreamingResponse(
        audio_generator(),
        media_type="audio/mpeg",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


async def _tts_openai(request: TTSRequest) -> StreamingResponse:
    try:
        from openai import AsyncOpenAI
    except ImportError:
        raise HTTPException(
            status_code=501,
            detail="openai is not installed. Run: pip install openai",
        )
    if not settings.openai_api_key:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY not configured")

    client = AsyncOpenAI(api_key=settings.openai_api_key)

    async def audio_generator():
        try:
            async with client.audio.speech.with_streaming_response.create(
                model=settings.openai_tts_model,
                voice=settings.openai_tts_voice,
                input=request.text,
                response_format="mp3",
            ) as response:
                async for chunk in response.iter_bytes(chunk_size=4096):
                    yield chunk
        except Exception as e:
            log.error("[TTS/OpenAI] streaming error: %s", e)

    return StreamingResponse(
        audio_generator(),
        media_type="audio/mpeg",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


# ── Provider info endpoint ────────────────────────────────────────────────────

@router.get("/info")
async def voice_provider_info():
    """Returns which voice providers are currently configured (no secrets exposed)."""
    return {
        "stt_provider": settings.voice_stt_provider,
        "tts_provider": settings.voice_tts_provider,
        "whisper_model": settings.whisper_model_size if settings.voice_stt_provider == "whisper" else None,
        "elevenlabs_configured": bool(settings.elevenlabs_api_key),
        "openai_configured": bool(settings.openai_api_key),
    }
