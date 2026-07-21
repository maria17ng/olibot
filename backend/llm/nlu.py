"""
Natural Language Understanding (NLU) module.
Translates a child's free-text message into a structured Intent
that the BDI agent can reason about.

Classification pipeline (in order of priority):
  1. Embedding-based nearest-neighbour (nomic-embed-text) — fastest, ~50-100 ms
     Requires: ollama pull nomic-embed-text + run generate_nlu_embeddings.py
  2. Lightweight LLM (llama3.2:1b) — medium, ~400 ms
     Requires: ollama pull llama3.2:1b
  3. Main LLM (llama3.1:8b) fallback — slowest, ~1-3 s

Reference for embedding approach: [18] Nussbaum et al. — Nomic Embed (2024)
"""
import json
import math
import re
from pathlib import Path
from dataclasses import dataclass, field
from backend.llm.ollama_client import OllamaClient
from backend.config.settings import get_settings

_settings = get_settings()

# ── Embedding-based classifier ─────────────────────────────────────────────
_EMBEDDINGS_PATH = Path(__file__).parent.parent / "data" / "nlu_embeddings.json"
_INTENT_EMBEDDINGS: dict[str, list[list[float]]] = {}

try:
    with _EMBEDDINGS_PATH.open(encoding="utf-8") as _f:
        _INTENT_EMBEDDINGS = json.load(_f)
except Exception:
    pass  # not generated yet — fall through to LLM

_EMBED_CONFIDENCE_THRESHOLD = 0.72  # cosine similarity threshold for embedding classification


def _cosine_similarity(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(x * x for x in b))
    return dot / (norm_a * norm_b + 1e-9)


def _classify_by_embedding(
    message_embedding: list[float],
) -> tuple[str, float] | None:
    """Returns (intent_name, confidence) if above threshold, else None."""
    if not _INTENT_EMBEDDINGS:
        return None
    best_intent, best_sim = "unknown", 0.0
    for intent, examples in _INTENT_EMBEDDINGS.items():
        sim = max(_cosine_similarity(message_embedding, ex) for ex in examples)
        if sim > best_sim:
            best_sim = sim
            best_intent = intent
    if best_sim >= _EMBED_CONFIDENCE_THRESHOLD:
        return best_intent, best_sim
    return None


@dataclass
class Intent:
    """Structured representation of what the student is trying to do."""
    name: str                         # e.g. "ask_for_answer", "ask_for_hint", "attempt_answer"
    confidence: float = 1.0
    entities: dict = field(default_factory=dict)  # e.g. {"letter": "A", "answer": "sol"}
    raw_text: str = ""


# ── Deterministic tracing-completion parser ────────────────────────────────
# The frontend reports canvas-tracing results using fixed message templates
# (see ChatWindow.handleTracingComplete). Relying on the LLM to re-extract the
# {passed, score} fields it already knows is fragile: when the LLM returns an
# empty entities dict, `passed` defaults to False and the child gets an
# "encourage_retry" instead of the celebration/mastery they earned. We parse
# these templates deterministically with a regex so the pipeline is reliable
# (and faster — no LLM round-trip for these turns).
_TRACING_RE = re.compile(r"he\s+(?:trazado|intentado\s+trazar)", re.IGNORECASE)
_TRACING_SCORE_RE = re.compile(r"(\d{1,3})\s*%")
_TRACING_SUBJECT_RE = re.compile(
    r"(?:la\s+s[ií]laba|la\s+letra|el\s+trazo|el\s+n[úu]mero)\s+([^\s(]+)",
    re.IGNORECASE,
)


def _parse_tracing_message(message: str) -> "Intent | None":
    """Returns a tracing_complete Intent if the message matches a frontend
    tracing-report template, else None."""
    if not message or not _TRACING_RE.search(message):
        return None
    low = message.lower()
    # "me ha salido bien" → passed; "necesito practicar más" → not passed
    if "salido bien" in low:
        passed = True
    elif "practicar" in low:
        passed = False
    else:
        return None  # not a recognised tracing-report template
    score_m = _TRACING_SCORE_RE.search(message)
    score = int(score_m.group(1)) if score_m else (100 if passed else 0)
    subject_m = _TRACING_SUBJECT_RE.search(message)
    letter = subject_m.group(1) if subject_m else ""
    return Intent(
        name="tracing_complete",
        confidence=1.0,
        entities={"letter": letter, "passed": passed, "score": score},
        raw_text=message,
    )


# Intents the BDI Safety Shield cares about
KNOWN_INTENTS = [
    "ask_for_answer",        # Student directly asks for the solution → Shield must intercept
    "ask_for_hint",          # Student asks for a clue → Provide Socratic hint
    "attempt_answer",        # Student tries to answer → Evaluate and give feedback
    "tracing_complete",      # Canvas tracing finished → entities: letter, passed, score
    "placement_answer",      # Response to a placement test question
    "greet",                 # Hello / Hi
    "express_emotion",       # Student expresses frustration / happiness
    "request_topic_change",  # Student wants to practice something different ("quiero otra cosa")
    "request_specific_topic",# Student asks for a specific letter/number ("quiero la B", "quiero el 3")
    "off_topic",             # Unrelated to the current learning activity
    "unknown",
]

# Curriculum topic IDs the NLU can map to for request_specific_topic
_CURRICULUM_TOPIC_IDS = (
    "trazo_linea_h, trazo_linea_v, trazo_curva, trazo_zigzag, trazo_circulo, trazo_angulo, "
    "vocal_a, vocal_a_min, vocal_e, vocal_e_min, vocal_i, vocal_i_min, "
    "vocal_o, vocal_o_min, vocal_u, vocal_u_min, "
    "numero_1, numero_2, numero_3, numero_4, numero_5, "
    "numero_6, numero_7, numero_8, numero_9, "
    "consonante_m, consonante_p, consonante_t, consonante_s, consonante_l, "
    "consonante_n, consonante_d, consonante_f, consonante_r, "
    "silaba_ma, silaba_mi, silaba_sa, silaba_la, silaba_pa, "
    "palabra_mama, palabra_mesa, palabra_pato, palabra_luna"
)

NLU_SYSTEM_PROMPT = """You are a Natural Language Understanding classifier for OLIBOT,
a tutoring AI for children aged 3-6. Your job is to classify the child's message
into one of the following intents and extract any relevant entities.

Available intents: {intents}

Entity extraction rules:
- "attempt_answer":        extract {{"answer": "<student's answer text>"}}
- "tracing_complete":      Recognize messages like "He trazado la letra A y me ha salido bien (100% de acierto)"
    or "He intentado trazar el trazo LINEA_H pero necesito practicar más (42%)"
    Extract: {{"letter": "<letter_or_stroke_key>", "passed": <true/false>, "score": <integer 0-100>}}
    - "letter" = the identifier shown in the message (e.g. "A", "M", "LINEA_H")
    - "passed" = true if message says "salido bien", false if "necesito practicar más"
    - "score" = the percentage number found in the message
- "placement_answer":      Answer to a placement test question (when OLIBOT asked a test question).
    Extract: {{"answer": "<student's answer text>"}}
- "request_specific_topic": extract {{"requested_topic_id": "<topic_id>"}} using these IDs:
    {topic_ids}
    Mapping guide: "la a" or "vocal A" → vocal_a (uppercase), "la a pequeña/minúscula" → vocal_a_min,
    "la B" → consonante_b (if available), "el 3" / "tres" → numero_3, etc.
    For lowercase: if the student says "pequeña", "minúscula", "chiquita" → use the _min variant.
    For strokes: "línea", "trazar línea" → trazo_linea_h, "círculo" → trazo_circulo, etc.
- "request_topic_change":  extract {{"reason": "<optional reason>"}}

Respond ONLY with a valid JSON object, no extra text:
{{
  "intent": "<intent_name>",
  "confidence": <float between 0.0 and 1.0>,
  "entities": {{<key>: <value>}}
}}
""".format(intents=", ".join(KNOWN_INTENTS), topic_ids=_CURRICULUM_TOPIC_IDS)


class NLUProcessor:
    """
    Classifies student messages into structured intents using a 3-tier pipeline:
      1. Semantic embeddings (nomic-embed-text) — fastest
      2. Lightweight LLM (llama3.2:1b) — medium
      3. Main LLM (llama3.1:8b) fallback — slowest

    The embedding path classifies by cosine similarity against pre-computed
    example embeddings.  Entity extraction always uses the LLM path because
    embeddings cannot extract structured fields like {answer, letter, score}.

    Reference: [18] Nussbaum et al. — Nomic Embed (2024)
    """

    def __init__(self, ollama_client: OllamaClient):
        # Embedding client (nomic-embed-text) — optional, silently disabled if unavailable
        embed_model = _settings.ollama_embed_model
        self._embed_client: OllamaClient | None = (
            OllamaClient(model=embed_model) if embed_model else None
        )
        # Lightweight LLM for entity extraction + fallback intent classification
        nlu_model = _settings.ollama_nlu_model
        if nlu_model and nlu_model != _settings.ollama_model:
            self.llm = OllamaClient(model=nlu_model)
            self._fallback_llm = ollama_client
        else:
            self.llm = ollama_client
            self._fallback_llm = None

    async def extract_intent(self, student_message: str) -> Intent:
        """
        Classifies the student's message into a structured Intent.

        For intents that require entity extraction (attempt_answer, tracing_complete,
        request_specific_topic, placement_answer) the LLM path is always used
        because embeddings cannot extract structured fields.
        For other intents, embedding classification is tried first.
        """
        # ── Step 0: Deterministic tracing-completion parsing ────────────────
        # The frontend's tracing-report templates carry {passed, score} that the
        # LLM would otherwise re-extract unreliably (often returning {}). Parse
        # them directly so celebrations/mastery fire correctly.
        tracing_intent = _parse_tracing_message(student_message)
        if tracing_intent is not None:
            return tracing_intent

        # ── Step 1: Embedding-based intent classification ──────────────────
        intent_from_embedding: str | None = None
        embed_confidence: float = 0.0

        if self._embed_client and _INTENT_EMBEDDINGS:
            try:
                msg_embedding = await self._embed_client.embed(student_message)
                result = _classify_by_embedding(msg_embedding)
                if result:
                    intent_from_embedding, embed_confidence = result
            except Exception:
                pass  # embedding model unavailable — fall through to LLM

        # Intents that need entity extraction always go through LLM
        _needs_entities = {
            "attempt_answer", "tracing_complete",
            "request_specific_topic", "placement_answer",
        }

        if intent_from_embedding and intent_from_embedding not in _needs_entities:
            return Intent(
                name=intent_from_embedding,
                confidence=round(embed_confidence, 3),
                entities={},
                raw_text=student_message,
            )

        # ── Step 2: LLM-based classification (with entity extraction) ─────
        prompt = f"Child's message: \"{student_message}\""

        try:
            raw_response = await self.llm.generate(
                prompt=prompt,
                system_prompt=NLU_SYSTEM_PROMPT,
            )
            parsed = json.loads(raw_response)
            return Intent(
                name=parsed.get("intent", "unknown"),
                confidence=float(parsed.get("confidence", 0.5)),
                entities=parsed.get("entities", {}),
                raw_text=student_message,
            )
        except Exception:
            # ── Step 3: Main LLM fallback ──────────────────────────────────
            if self._fallback_llm:
                try:
                    raw_response = await self._fallback_llm.generate(
                        prompt=prompt,
                        system_prompt=NLU_SYSTEM_PROMPT,
                    )
                    parsed = json.loads(raw_response)
                    return Intent(
                        name=parsed.get("intent", "unknown"),
                        confidence=float(parsed.get("confidence", 0.5)),
                        entities=parsed.get("entities", {}),
                        raw_text=student_message,
                    )
                except Exception:
                    pass
            # If embedding gave a result (even for an entity-needing intent), use it
            if intent_from_embedding:
                return Intent(
                    name=intent_from_embedding,
                    confidence=round(embed_confidence, 3),
                    entities={},
                    raw_text=student_message,
                )
            return Intent(name="unknown", confidence=0.0, raw_text=student_message)
