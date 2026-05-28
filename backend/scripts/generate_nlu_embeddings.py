"""
Script to pre-compute NLU intent embeddings using nomic-embed-text.

Run once (or when intent examples change):
    cd /path/to/olibot
    python -m backend.scripts.generate_nlu_embeddings

Requirements:
    - Ollama running: ollama serve
    - Model pulled:   ollama pull nomic-embed-text

Output:
    backend/data/nlu_embeddings.json  — used by NLUProcessor at startup

Reference: [18] Nussbaum et al. — Nomic Embed (2024)
"""
import asyncio
import json
from pathlib import Path

import httpx

from backend.config.settings import get_settings
from backend.data.nlu_intent_examples import INTENT_EXAMPLES

_settings = get_settings()
_OUTPUT = Path(__file__).parent.parent / "data" / "nlu_embeddings.json"


async def embed(text: str, model: str, base_url: str) -> list[float]:
    # Ollama ≥ 0.5 uses /api/embed with {"input": ...} and returns {"embeddings": [[...]]}
    payload = {"model": model, "input": text}
    async with httpx.AsyncClient(timeout=60) as client:
        response = await client.post(f"{base_url}/api/embed", json=payload)
        response.raise_for_status()
        data = response.json()
        # /api/embed returns list of embeddings (one per input); take the first
        return data["embeddings"][0]


async def main() -> None:
    model = _settings.ollama_embed_model
    base_url = _settings.ollama_base_url
    print(f"Using model: {model}  (Ollama at {base_url})")

    result: dict[str, list[list[float]]] = {}
    total = sum(len(phrases) for phrases in INTENT_EXAMPLES.values())
    done = 0

    for intent, phrases in INTENT_EXAMPLES.items():
        print(f"\n[{intent}] {len(phrases)} examples")
        embeddings: list[list[float]] = []
        for phrase in phrases:
            try:
                emb = await embed(phrase, model, base_url)
                embeddings.append(emb)
                done += 1
                print(f"  ({done}/{total}) ✓ {phrase[:60]}")
            except Exception as exc:
                print(f"  ✗ '{phrase[:60]}' — {exc}")
        result[intent] = embeddings

    _OUTPUT.write_text(json.dumps(result, separators=(",", ":")), encoding="utf-8")
    print(f"\nSaved {sum(len(v) for v in result.values())} embeddings → {_OUTPUT}")


if __name__ == "__main__":
    asyncio.run(main())