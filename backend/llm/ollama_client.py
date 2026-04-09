"""
Ollama REST API client.
Provides a clean interface to generate text from a locally running LLM.

Prerequisite:
    1. Install Ollama: https://ollama.com/download
    2. Pull the model: `ollama pull llama3.1:8b`
    3. Ollama server starts automatically on localhost:11434
"""
import httpx
from backend.config.settings import get_settings

settings = get_settings()


class OllamaClient:
    """Low-level client for the Ollama REST API."""

    def __init__(self):
        self.base_url = settings.ollama_base_url
        self.model = settings.ollama_model
        self.timeout = settings.ollama_timeout

    async def generate(self, prompt: str, system_prompt: str = "") -> str:
        """
        Sends a single prompt to Ollama and returns the raw text response.
        Uses the /api/generate endpoint (no message history).
        """
        payload = {
            "model": self.model,
            "prompt": prompt,
            "system": system_prompt,
            "stream": False,
        }
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.post(f"{self.base_url}/api/generate", json=payload)
            response.raise_for_status()
            return response.json()["response"].strip()

    async def chat(self, messages: list[dict], system_prompt: str = "") -> str:
        """
        Sends a conversation history to Ollama and returns the assistant reply.
        Uses the /api/chat endpoint (with message history for context).

        Args:
            messages: List of {"role": "user"|"assistant", "content": "..."} dicts.
            system_prompt: Injected as the system message.
        """
        full_messages = []
        if system_prompt:
            full_messages.append({"role": "system", "content": system_prompt})
        full_messages.extend(messages)

        payload = {
            "model": self.model,
            "messages": full_messages,
            "stream": False,
        }
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.post(f"{self.base_url}/api/chat", json=payload)
            response.raise_for_status()
            return response.json()["message"]["content"].strip()

    async def is_available(self) -> bool:
        """Checks if the Ollama server is running and the model is loaded."""
        try:
            async with httpx.AsyncClient(timeout=5) as client:
                response = await client.get(f"{self.base_url}/api/tags")
                models = [m["name"] for m in response.json().get("models", [])]
                return any(self.model in m for m in models)
        except (httpx.ConnectError, httpx.TimeoutException):
            return False
