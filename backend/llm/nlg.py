"""
Natural Language Generation (NLG) module.
Generates child-friendly, age-appropriate responses using the LLM.

Response cache (#11): Common (intent, category, age) combinations are served
from a pre-written JSON cache to reduce Ollama latency for frequent turns.
The Safety Shield layer reviews all output before it reaches the student.
"""
import json
import random
from pathlib import Path
from backend.llm.ollama_client import OllamaClient
from backend.llm.provider import get_llm_provider, LLMProvider
from backend.db.models import StudentModel

# ── Response cache ─────────────────────────────────────────────────────────
_CACHE_PATH = Path(__file__).parent.parent / "data" / "response_cache.json"
_RESPONSE_CACHE: dict[str, list[str]] = {}

try:
    with _CACHE_PATH.open(encoding="utf-8") as _f:
        _raw = json.load(_f)
    _RESPONSE_CACHE = {k: v for k, v in _raw.items() if not k.startswith("_") and isinstance(v, list)}
except Exception:
    pass  # cache unavailable — fall through to LLM always

# Map CurriculumCategory.value → cache key used in response_cache.json
# Values must match exactly the category segment in cache JSON keys.
_CATEGORY_MAP = {
    "pregrafomotricidad": "pregrafomotricidad",
    "lectoescritura":     "lectoescritura",
    "numeracion":         "numeracion",
    "fonologia":          "any",
    "silabas":            "silabas",
    "palabras":           "silabas",
    "any":                "any",
}

def _get_cached_response(
    intent: str,
    topic_category: str,
    age: int,
    is_correct: bool | None,
) -> str | None:
    """Returns a random pre-written response if a cache entry exists, else None."""
    cat = _CATEGORY_MAP.get(topic_category, "any")
    age_g = str(min(max(age, 3), 5))
    # Try specific key first, then category=any fallback
    for category in (cat, "any"):
        if is_correct is not None:
            key = f"{intent}:{category}:{age_g}:{str(is_correct).lower()}"
            if key in _RESPONSE_CACHE:
                return random.choice(_RESPONSE_CACHE[key])
        key = f"{intent}:{category}:{age_g}"
        if key in _RESPONSE_CACHE:
            return random.choice(_RESPONSE_CACHE[key])
    return None

AGE_COMMUNICATION_RULES: dict[int, str] = {
    3: (
        "STRICT RULES FOR A 3-YEAR-OLD:\n"
        "- Maximum 3 words + 1 emoji per response. Example: '¡Muy bien! 🌟'\n"
        "- NEVER ask questions. NEVER use complex words.\n"
        "- NEVER mention 'escribir', 'letra', 'mayúscula', 'minúscula', 'cursiva', 'leer'.\n"
        "- NEVER speak English. NEVER compare with 'el cole'.\n"
        "- Use only familiar concepts: colors, animals, simple shapes the child knows."
    ),
    4: (
        "STRICT RULES FOR A 4-YEAR-OLD:\n"
        "- Maximum 1 short sentence + 1 yes/no question per response.\n"
        "- Example: '¡La A dice AAA! ¿Trazamos la E? 🐘'\n"
        "- NEVER use abstract vocabulary or multi-part questions.\n"
        "- NEVER speak English. NEVER say 'mayúscula', 'minúscula', 'cursiva'.\n"
        "- NEVER ask more than one question at a time."
    ),
    5: (
        "STRICT RULES FOR A 5-YEAR-OLD:\n"
        "- Maximum 1-2 short sentences per response.\n"
        "- Example: '¡Genial! La M de mamá. ¿Qué más empieza por M?'\n"
        "- Can mention simple words. Can ask about letters in words.\n"
        "- NEVER speak English. NEVER compare with 'el cole'.\n"
        "- NEVER ask more than one question at a time."
    ),
}

OLIBOT_PERSONA_PROMPT = """You are OLIBOT, a friendly and patient tutoring robot for children aged 3-6 in Spain.
Your personality:
- Speak ONLY in Spanish. Short sentences only.
- Never give direct answers. Always guide with questions and hints (Socratic method).
- Use encouragement and emojis to keep the child engaged.
- Current student: {student_name}, age {student_age}, level {student_level}.
- Current topic: {topic}.

{age_rules}

PROHIBICIONES (todas las edades):
- NUNCA hablar en inglés ni usar palabras inglesas.
- NUNCA decir 'mayúscula', 'minúscula' o 'cursiva' a niños de 3-4 años.
- NUNCA comparar con 'el cole' o 'el colegio'.
- NUNCA hacer preguntas con más de una parte.
- NUNCA dar la respuesta directamente.
- NUNCA mencionar colores específicos en actividades de trazado (el trazo siempre es azul en pantalla).

Beliefs about this student (their known knowledge):
{beliefs_summary}
"""


class NLGProcessor:
    """
    Generates the final agent response using the LLM with OLIBOT's persona.

    Accepts an explicit OllamaClient for backwards compatibility, but defaults
    to the provider selected by settings.llm_provider (Ollama / Groq / Gemini).
    """

    def __init__(self, ollama_client: OllamaClient | None = None):
        # Prefer the injected client (backwards-compat) wrapped as a provider;
        # otherwise use the configured provider from settings.
        if ollama_client is not None:
            from backend.llm.provider import OllamaProvider
            self.llm: LLMProvider = OllamaProvider()
        else:
            self.llm = get_llm_provider()

    async def generate_response(
        self,
        student: StudentModel,
        topic: str,
        conversation_history: list[dict],
        agent_instruction: str,
        cache_hint: tuple[str, str, bool | None] | None = None,
    ) -> str:
        """
        Generates a response following the instruction from the BDI agent.

        Args:
            student: The student ORM object (provides name, age, beliefs).
            topic: Current learning topic (e.g. "letra_A").
            conversation_history: Prior messages as [{"role": ..., "content": ...}].
            agent_instruction: The BDI plan's directive (e.g. "give a hint", "praise the student").
            cache_hint: Optional (intent, topic_category, is_correct) tuple for cache lookup.
        """
        # ── Cache lookup ───────────────────────────────────────────────────
        if cache_hint:
            intent, category, is_correct = cache_hint
            age = min(max(int(student.age or 4), 3), 5)
            cached = _get_cached_response(intent, category, age, is_correct)
            if cached:
                return cached

        beliefs_summary = self._format_beliefs(student.beliefs)
        age_key = min(max(int(student.age or 4), 3), 5)
        age_rules = AGE_COMMUNICATION_RULES.get(age_key, AGE_COMMUNICATION_RULES[5])
        system_prompt = OLIBOT_PERSONA_PROMPT.format(
            student_name=student.name,
            student_age=student.age,
            student_level=student.level,
            topic=topic,
            age_rules=age_rules,
            beliefs_summary=beliefs_summary,
        )

        # Append the BDI instruction as a hidden system cue
        instruction_cue = f"\n[INSTRUCTION FROM BDI AGENT]: {agent_instruction}"
        augmented_system = system_prompt + instruction_cue

        return await self.llm.chat(
            messages=conversation_history,
            system_prompt=augmented_system,
        )


    async def generate_response_stream(
        self,
        student: StudentModel,
        topic: str,
        conversation_history: list[dict],
        agent_instruction: str,
        cache_hint: tuple[str, str, bool | None] | None = None,
    ):
        """
        Same as generate_response but yields tokens as they arrive from Ollama.
        Cache hits are yielded as a single token so the streaming protocol still works.
        """
        # ── Cache lookup ───────────────────────────────────────────────────
        if cache_hint:
            intent, category, is_correct = cache_hint
            age = min(max(int(student.age or 4), 3), 5)
            cached = _get_cached_response(intent, category, age, is_correct)
            if cached:
                yield cached
                return

        beliefs_summary = self._format_beliefs(student.beliefs)
        age_key = min(max(int(student.age or 4), 3), 5)
        age_rules = AGE_COMMUNICATION_RULES.get(age_key, AGE_COMMUNICATION_RULES[5])
        system_prompt = OLIBOT_PERSONA_PROMPT.format(
            student_name=student.name,
            student_age=student.age,
            student_level=student.level,
            topic=topic,
            age_rules=age_rules,
            beliefs_summary=beliefs_summary,
        )
        instruction_cue = f"\n[INSTRUCTION FROM BDI AGENT]: {agent_instruction}"
        augmented_system = system_prompt + instruction_cue

        async for token in self.llm.chat_stream(
            messages=conversation_history,
            system_prompt=augmented_system,
        ):
            yield token


    async def generate_hint(self, student: StudentModel, topic: str, hint_level: int = 1) -> str:
        """
        Generates a Socratic scaffolding hint scaled to the hint level.
        hint_level 1 = very subtle clue, hint_level 3 = near-direct guidance.
        """
        prompt = (
            f"The child needs a level-{hint_level} hint about '{topic}'. "
            f"Do NOT reveal the answer. Guide them with a question."
        )
        return await self.generate_response(
            student=student,
            topic=topic,
            conversation_history=[{"role": "user", "content": prompt}],
            agent_instruction=f"Provide a level-{hint_level} scaffolding hint",
        )

    def _format_beliefs(self, beliefs: dict) -> str:
        if not beliefs:
            return "No prior knowledge recorded yet."
        lines = [f"  - {k}: {v}" for k, v in beliefs.items()]
        return "\n".join(lines)
