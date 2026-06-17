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

    def __init__(self, model: str | None = None):
        self.base_url = settings.ollama_base_url
        self.model = model or settings.ollama_model
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
            "keep_alive": "30m",
            "options": {"num_predict": 120},
        }
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.post(f"{self.base_url}/api/chat", json=payload)
            response.raise_for_status()
            return response.json()["message"]["content"].strip()

    async def chat_stream(self, messages: list[dict], system_prompt: str = ""):
        """
        Streams the assistant reply token by token.
        Yields each text token as it arrives from Ollama.
        """
        import json as _json
        full_messages = []
        if system_prompt:
            full_messages.append({"role": "system", "content": system_prompt})
        full_messages.extend(messages)

        payload = {
            "model": self.model,
            "messages": full_messages,
            "stream": True,
            "keep_alive": "30m",
            "options": {"num_predict": 120},
        }

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            async with client.stream("POST", f"{self.base_url}/api/chat", json=payload) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if not line.strip():
                        continue
                    try:
                        chunk = _json.loads(line)
                        token = chunk.get("message", {}).get("content", "")
                        if token:
                            yield token
                        if chunk.get("done"):
                            break
                    except _json.JSONDecodeError:
                        continue

    async def embed(self, text: str) -> list[float]:
        """
        Returns a dense embedding vector for the given text.
        Uses the /api/embed endpoint (Ollama ≥ 0.5).
        Intended for semantic intent classification (nomic-embed-text).
        """
        payload = {"model": self.model, "input": text}
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(f"{self.base_url}/api/embed", json=payload)
            response.raise_for_status()
            return response.json()["embeddings"][0]

    async def is_available(self) -> bool:
        """Checks if the Ollama server is running and the model is loaded."""
        try:
            async with httpx.AsyncClient(timeout=5) as client:
                response = await client.get(f"{self.base_url}/api/tags")
                models = [m["name"] for m in response.json().get("models", [])]
                return any(self.model in m for m in models)
        except (httpx.ConnectError, httpx.TimeoutException):
            return False
