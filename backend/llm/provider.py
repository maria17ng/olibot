"""
LLM Provider abstraction — lets OLIBOT switch between Ollama, Groq and Gemini
without changing any calling code.

Usage (factory):
    from backend.llm.provider import get_llm_provider
    provider = get_llm_provider()
    text = await provider.chat(messages, system_prompt)
    async for token in provider.chat_stream(messages, system_prompt):
        ...

Provider selection is driven by settings.llm_provider:
    "ollama"  → OllamaProvider (local, default)
    "groq"    → GroqProvider   (Groq Cloud, OpenAI-compatible, ~200 tok/s)
    "gemini"  → GeminiProvider (Google Gemini Flash, OpenAI-compatible)

Both Groq and Gemini are accessed via the `openai` library pointing at their
respective OpenAI-compatible base URLs — no extra SDK is needed.
"""
from __future__ import annotations

import logging
from abc import ABC, abstractmethod
from typing import AsyncIterator

log = logging.getLogger(__name__)


# ── Abstract base ─────────────────────────────────────────────────────────────

class LLMProvider(ABC):
    """Common interface for all LLM backends."""

    @abstractmethod
    async def chat(self, messages: list[dict], system_prompt: str = "") -> str:
        """Return the full assistant reply as a string."""

    @abstractmethod
    async def chat_stream(
        self, messages: list[dict], system_prompt: str = ""
    ) -> AsyncIterator[str]:
        """Yield text tokens as they arrive from the model."""

    @abstractmethod
    async def is_available(self) -> bool:
        """Return True if the provider is reachable."""


# ── Ollama ────────────────────────────────────────────────────────────────────

class OllamaProvider(LLMProvider):
    """Thin wrapper around the existing OllamaClient."""

    def __init__(self):
        from backend.llm.ollama_client import OllamaClient
        self._client = OllamaClient()

    async def chat(self, messages: list[dict], system_prompt: str = "") -> str:
        return await self._client.chat(messages, system_prompt)

    async def chat_stream(
        self, messages: list[dict], system_prompt: str = ""
    ) -> AsyncIterator[str]:
        async for token in self._client.chat_stream(messages, system_prompt):
            yield token

    async def is_available(self) -> bool:
        return await self._client.is_available()


# ── Groq (OpenAI-compatible) ──────────────────────────────────────────────────

class GroqProvider(LLMProvider):
    """
    Groq Cloud — ultra-fast inference (~200 tok/s) via OpenAI-compatible API.

    Requires:
        pip install openai
        GROQ_API_KEY=gsk_... in .env
    """

    _BASE_URL = "https://api.groq.com/openai/v1"

    def __init__(self):
        from backend.config.settings import get_settings
        settings = get_settings()
        if not settings.groq_api_key:
            raise ValueError(
                "GROQ_API_KEY is not set. Add it to .env or set llm_provider=ollama."
            )
        try:
            from openai import AsyncOpenAI
        except ImportError:
            raise ImportError("Run: pip install openai")

        from openai import AsyncOpenAI
        self._client = AsyncOpenAI(
            api_key=settings.groq_api_key,
            base_url=self._BASE_URL,
        )
        self._model = settings.groq_model
        log.info("[GroqProvider] Using model=%s", self._model)

    def _build_messages(self, messages: list[dict], system_prompt: str) -> list[dict]:
        full = []
        if system_prompt:
            full.append({"role": "system", "content": system_prompt})
        full.extend(messages)
        return full

    async def chat(self, messages: list[dict], system_prompt: str = "") -> str:
        resp = await self._client.chat.completions.create(
            model=self._model,
            messages=self._build_messages(messages, system_prompt),
            stream=False,
        )
        return resp.choices[0].message.content.strip()

    async def chat_stream(
        self, messages: list[dict], system_prompt: str = ""
    ) -> AsyncIterator[str]:
        stream = await self._client.chat.completions.create(
            model=self._model,
            messages=self._build_messages(messages, system_prompt),
            stream=True,
        )
        async for chunk in stream:
            delta = chunk.choices[0].delta.content
            if delta:
                yield delta

    async def is_available(self) -> bool:
        try:
            await self._client.models.list()
            return True
        except Exception:
            return False


# ── Gemini Flash (OpenAI-compatible) ─────────────────────────────────────────

class GeminiProvider(LLMProvider):
    """
    Google Gemini 1.5 Flash via the OpenAI-compatible REST endpoint.

    Requires:
        pip install openai
        GEMINI_API_KEY=AIza... in .env
    """

    _BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai/"

    def __init__(self):
        from backend.config.settings import get_settings
        settings = get_settings()
        if not settings.gemini_api_key:
            raise ValueError(
                "GEMINI_API_KEY is not set. Add it to .env or set llm_provider=ollama."
            )
        try:
            from openai import AsyncOpenAI
        except ImportError:
            raise ImportError("Run: pip install openai")

        from openai import AsyncOpenAI
        self._client = AsyncOpenAI(
            api_key=settings.gemini_api_key,
            base_url=self._BASE_URL,
        )
        self._model = settings.gemini_model
        log.info("[GeminiProvider] Using model=%s", self._model)

    def _build_messages(self, messages: list[dict], system_prompt: str) -> list[dict]:
        full = []
        if system_prompt:
            full.append({"role": "system", "content": system_prompt})
        full.extend(messages)
        return full

    async def chat(self, messages: list[dict], system_prompt: str = "") -> str:
        resp = await self._client.chat.completions.create(
            model=self._model,
            messages=self._build_messages(messages, system_prompt),
            stream=False,
        )
        return resp.choices[0].message.content.strip()

    async def chat_stream(
        self, messages: list[dict], system_prompt: str = ""
    ) -> AsyncIterator[str]:
        stream = await self._client.chat.completions.create(
            model=self._model,
            messages=self._build_messages(messages, system_prompt),
            stream=True,
        )
        async for chunk in stream:
            delta = chunk.choices[0].delta.content
            if delta:
                yield delta

    async def is_available(self) -> bool:
        try:
            await self._client.models.list()
            return True
        except Exception:
            return False


# ── Factory ───────────────────────────────────────────────────────────────────

_provider_cache: LLMProvider | None = None


def get_llm_provider() -> LLMProvider:
    """
    Returns the singleton LLM provider selected by settings.llm_provider.
    Raises ValueError / ImportError with a clear message if misconfigured.
    """
    global _provider_cache
    if _provider_cache is not None:
        return _provider_cache

    from backend.config.settings import get_settings
    settings = get_settings()
    name = (settings.llm_provider or "ollama").lower()

    if name == "groq":
        _provider_cache = GroqProvider()
    elif name == "gemini":
        _provider_cache = GeminiProvider()
    else:
        if name != "ollama":
            log.warning("[provider] Unknown llm_provider=%r — falling back to Ollama", name)
        _provider_cache = OllamaProvider()

    log.info("[provider] Active LLM provider: %s", type(_provider_cache).__name__)
    return _provider_cache
