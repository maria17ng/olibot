"""
Natural Language Understanding (NLU) module.
Translates a child's free-text message into a structured Intent
that the BDI agent can reason about.
"""
import json
from dataclasses import dataclass, field
from backend.llm.ollama_client import OllamaClient


@dataclass
class Intent:
    """Structured representation of what the student is trying to do."""
    name: str                         # e.g. "ask_for_answer", "ask_for_hint", "attempt_answer"
    confidence: float = 1.0
    entities: dict = field(default_factory=dict)  # e.g. {"letter": "A", "answer": "sol"}
    raw_text: str = ""


# Intents the BDI Safety Shield cares about
KNOWN_INTENTS = [
    "ask_for_answer",     # Student directly asks for the solution → Shield must intercept
    "ask_for_hint",       # Student asks for a clue → Provide Socratic hint
    "attempt_answer",     # Student tries to answer → Evaluate and give feedback
    "greet",              # Hello / Hi
    "express_emotion",    # Student expresses frustration / happiness
    "off_topic",          # Unrelated to the current learning activity
    "unknown",
]

NLU_SYSTEM_PROMPT = """You are a Natural Language Understanding classifier for OLIBOT,
a tutoring AI for children aged 3-6. Your job is to classify the child's message
into one of the following intents and extract any relevant entities.

Available intents: {intents}

Respond ONLY with a valid JSON object, no extra text:
{{
  "intent": "<intent_name>",
  "confidence": <float between 0.0 and 1.0>,
  "entities": {{<key>: <value>}}
}}
""".format(intents=", ".join(KNOWN_INTENTS))


class NLUProcessor:
    """Uses the LLM to classify student messages into structured intents."""

    def __init__(self, ollama_client: OllamaClient):
        self.llm = ollama_client

    async def extract_intent(self, student_message: str) -> Intent:
        """
        Sends the student message to the LLM and parses the returned JSON intent.
        Falls back to 'unknown' if parsing fails.
        """
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
        except (json.JSONDecodeError, ValueError, KeyError):
            # LLM returned malformed JSON → safe fallback
            return Intent(name="unknown", confidence=0.0, raw_text=student_message)
