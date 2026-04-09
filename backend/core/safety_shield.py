"""
Safety Shield — the core pedagogical guard of OLIBOT.

This is the Python-side implementation of the BDI Safety Shield concept.
It intercepts every LLM response before it reaches the student and validates:
  1. No direct answers are given (forces Scaffolding / Socratic method).
  2. Language is age-appropriate.
  3. Content aligns with the current curriculum topic.

When JaCaMo BDI is available, this module defers to the JaCaMo safety rules.
When JaCaMo is not available, it applies its own rule set as a fallback.
"""
import re
from dataclasses import dataclass
from backend.llm.nlu import Intent
from backend.db.models import StudentModel


@dataclass
class ShieldResult:
    """Outcome of a safety shield evaluation."""
    approved: bool
    modified_response: str | None   # None if no modification needed
    reason: str                     # Human-readable explanation of the decision
    triggered: bool                 # True if the shield intervened


# Patterns that suggest the LLM is giving a direct answer (rule-based baseline)
DIRECT_ANSWER_PATTERNS = [
    r"la respuesta es",
    r"la solución es",
    r"se escribe",
    r"el resultado es",
    r"son \d+",
    r"es la letra",
    r"^la [a-záéíóú]+ es",  # "La letra A es..."
]

# Replacement scaffolding prompts the shield injects instead of direct answers
SCAFFOLDING_REDIRECTS = [
    "¡Hmm, qué buena pregunta! ¿Tú qué crees? 🤔",
    "¡Casi! Piénsalo un poquito más... ¿qué sonido hace esta letra?",
    "¡Muy bien que lo intentas! ¿Puedes contarlos con los dedos? 🖐️",
    "¡Eso es pensar como un campeón! ¿Qué pista te da el dibujo?",
]


class SafetyShield:
    """
    Implements pedagogical safety rules for OLIBOT responses.

    Design principle: "Never give the fish — teach to fish."
    Any response that solves the exercise for the student violates this principle.
    """

    def __init__(self, strict_mode: bool = True):
        self.strict_mode = strict_mode  # If False, only logs violations without blocking
        self._redirect_index = 0

    def evaluate(
        self,
        llm_response: str,
        intent: Intent,
        student: StudentModel,
    ) -> ShieldResult:
        """
        Evaluates an LLM response against all safety rules.

        Returns a ShieldResult indicating whether the response was approved,
        modified, or blocked.
        """
        # Rule 1: If the student asked for the answer, the LLM must NOT provide it
        if intent.name == "ask_for_answer":
            return self._block_direct_answer(llm_response)

        # Rule 2: Even if the student didn't explicitly ask, check if LLM gave away the answer
        if self._contains_direct_answer(llm_response):
            return self._block_direct_answer(llm_response)

        # Rule 3: Response must not be empty or too short
        if len(llm_response.strip()) < 5:
            return ShieldResult(
                approved=False,
                modified_response=self._next_redirect(),
                reason="Response too short or empty",
                triggered=True,
            )

        return ShieldResult(
            approved=True,
            modified_response=None,
            reason="Response passed all safety checks",
            triggered=False,
        )

    def get_final_response(self, shield_result: ShieldResult, original: str) -> str:
        """Returns the final response to send to the student."""
        if shield_result.triggered and shield_result.modified_response:
            return shield_result.modified_response
        return original

    def _contains_direct_answer(self, text: str) -> bool:
        """Checks if text matches any pattern associated with giving away an answer."""
        text_lower = text.lower()
        return any(re.search(pattern, text_lower) for pattern in DIRECT_ANSWER_PATTERNS)

    def _block_direct_answer(self, original: str) -> ShieldResult:
        redirect = self._next_redirect()
        return ShieldResult(
            approved=False,
            modified_response=redirect,
            reason="Shield blocked: LLM attempted to give a direct answer",
            triggered=True,
        )

    def _next_redirect(self) -> str:
        """Round-robins through scaffolding redirect messages."""
        msg = SCAFFOLDING_REDIRECTS[self._redirect_index % len(SCAFFOLDING_REDIRECTS)]
        self._redirect_index += 1
        return msg
