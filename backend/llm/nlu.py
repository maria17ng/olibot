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
    "numero_6, numero_7, numero_8, numero_9, numero_10, "
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
