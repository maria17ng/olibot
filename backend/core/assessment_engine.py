"""
Deterministic placement-assessment engine.

The initial placement test must be reproducible and rubric-based: two children
who perform the same way MUST be assigned the same level. Delegating the decision
to the LLM proved unreliable (it skipped steps, ignored the rubric and sometimes
never decided), so the level is computed entirely by this engine in code.

OLIBOT only voices the fixed, child-friendly prompts produced here; it never
decides the level. The child is never told it is a test nor which level was
assigned (privacy requirement).

Staircase (easy → hard); the test stops at the first clear failure or give-up.
It mixes READING (recognition) steps — which decide the level — with WRITING
(tracing) steps — which let the child show they can form strokes/letters. Only
reading steps are SCORED; writing steps are observational and always advance:

    1. Trace a free line     (write, warm-up)
    2. Read a VOWEL  (A)     (score)
    3. Trace the VOWEL (A)   (write)
    4. Read a CONSONANT (M)  (score)
    5. Read a NUMBER (3)     (score)
    6. Read a LETTER (S)     (score)
    7. Trace the LETTER (S)  (write)
    8. Read a SYLLABLE (MA)  (score)

Level (color) from the number of SCORED reading steps passed (0..5):
    0    → amarillo (age 3)   draws/traces but recognises nothing
    1-2  → verde    (age 4)   knows a vowel / a consonant
    3-4  → azul     (age 5)   reads numbers and letters
     5   → rojo     (age 6)   blends a syllable
"""
from __future__ import annotations

import re
import unicodedata

# Beliefs key under which the running assessment state is persisted.
STATE_KEY = "assessment_state"

# color → age mapping used by the caller to assign the level silently.
LEVEL_TO_AGE = {"amarillo": 3, "verde": 4, "azul": 5, "rojo": 6}


# ── Staircase definition ──────────────────────────────────────────────────────
# Interaction is fully TOUCH/VISUAL (no microphone needed). Each step declares a
# "kind" so the frontend knows what to render:
#   - "draw"   → a blank canvas; the child draws a free line (warm-up).
#   - "trace"  → the LetterTracing canvas for `char`; the child writes that glyph.
#   - "choice" → big tappable cards (`options`); the child taps the right glyph.
#
# Only "choice" steps are SCORED (they decide the level). "draw"/"trace" steps are
# observational writing checks: any completion advances and they never end the
# staircase. The correct option position is varied so the child can't just always
# tap the same place.
_STEPS: list[dict] = [
    {
        "key": "linea",
        "kind": "draw",
        "scored": False,
        "say": "¡Hola! Vamos a jugar un ratito juntos. Primero, dibuja una rayita "
               "o una línea en la pantalla con el dedo. ¡Tú puedes! ✏️",
        "accept": [],
    },
    {
        "key": "vocal",
        "kind": "choice",
        "scored": True,
        "say": "¡Genial! ¿Cuál de estas es la letra A? ¡Tócala!",
        "retry": "No pasa nada, mira otra vez sin prisa y toca la letra A.",
        "options": ["E", "A", "O"],
        "accept": ["a"],
    },
    {
        "key": "escribe_vocal",
        "kind": "trace",
        "scored": False,
        "char": "A",
        "say": "¡Muy bien! Ahora escribe tú la letra A. Sigue los puntitos con el dedo. ✏️",
        "accept": [],
    },
    {
        "key": "consonante",
        "kind": "choice",
        "scored": True,
        "say": "¡Genial! Ahora busca la letra M. ¡Tócala!",
        "retry": "Vamos a mirarlas otra vez: toca la letra M.",
        "options": ["N", "P", "M"],
        "accept": ["m", "eme"],
    },
    {
        "key": "numero",
        "kind": "choice",
        "scored": True,
        "say": "¡Perfecto! ¿Cuál es el número 3? ¡Tócalo!",
        "retry": "Míralos otra vez tranquilo y toca el número 3.",
        "options": ["3", "5", "2"],
        "accept": ["3", "tres"],
    },
    {
        "key": "letra",
        "kind": "choice",
        "scored": True,
        "say": "¡Estupendo! ¿Dónde está la letra S? ¡Tócala!",
        "retry": "Sin prisa, míralas de nuevo y toca la letra S.",
        "options": ["R", "S", "L"],
        "accept": ["s", "ese"],
    },
    {
        "key": "escribe_letra",
        "kind": "trace",
        "scored": False,
        "char": "S",
        "say": "¡Qué bien! Ahora escribe tú la letra S. Sigue los puntitos. ✏️",
        "accept": [],
    },
    {
        "key": "silaba",
        "kind": "choice",
        "scored": True,
        "say": "¡Increíble! La última: ¿cuál dice MA? ¡Tócala!",
        "retry": "Inténtalo otra vez: toca la que dice MA.",
        "options": ["ME", "MI", "MA"],
        "accept": ["ma"],
    },
]

# Number of SCORED (reading) steps in the staircase — used for the level rubric.
_SCORED_TOTAL = sum(1 for s in _STEPS if s.get("scored"))


def _ui_for(step: dict) -> dict:
    """UI descriptor the frontend uses to render a step (canvas / trace / cards)."""
    return {
        "kind": step["kind"],
        "options": list(step.get("options", [])),
        "char": step.get("char"),
    }


# Final farewell — never mentions levels, colors or ages.
_FAREWELL = "¡Lo has hecho genial! Ya podemos jugar y aprender muchas cosas juntos. 🌟"

# Give-up phrases (normalised, no accents). A clear give-up ends the staircase.
_GIVEUP = (
    "no se", "no lo se", "no me acuerdo", "no se cual", "no puedo",
    "no quiero", "ni idea", "no sabe", "no la se", "no lo recuerdo",
)


def _normalize(text: str) -> str:
    """Lowercase, strip accents, keep alphanumerics as space-separated words."""
    text = (text or "").lower()
    text = unicodedata.normalize("NFD", text)
    text = "".join(c for c in text if unicodedata.category(c) != "Mn")
    return text


def _words(text: str) -> list[str]:
    return re.findall(r"[a-z0-9]+", _normalize(text))


def _is_giveup(text: str) -> bool:
    norm = " ".join(_words(text))
    return any(phrase in norm for phrase in _GIVEUP)


def _matches(text: str, accept: list[str]) -> bool:
    words = set(_words(text))
    return any(tok in words for tok in accept)


def _level_from_passed(passed: int) -> str:
    """Map the number of SCORED reading steps passed (0..5) to a level/color."""
    if passed <= 0:
        return "amarillo"
    if passed <= 2:
        return "verde"
    if passed <= 4:
        return "azul"
    return "rojo"


def initial_state() -> dict:
    return {"awaiting": 0, "passed": 0, "retried": False}


def step(state: dict | None, user_message: str) -> dict:
    """
    Advance the deterministic assessment by one turn.

    Args:
        state: previous assessment state from beliefs (or None to start).
        user_message: the child's latest message (the answer to `awaiting`).

    Returns a dict with:
        say:        OLIBOT's next line (already child-safe, no level leak)
        complete:   True when the level has been decided
        level:      assigned color when complete, else None
        state:      new state to persist in beliefs
        ui:         render descriptor {kind: "draw"|"choice"|"done", options: [...]}
    """
    if not state or int(state.get("awaiting", 0)) <= 0:
        # First turn: greet + present the first step (the line). Nothing to grade.
        first = _STEPS[0]
        return {
            "say": first["say"],
            "complete": False,
            "level": None,
            "state": {"awaiting": 1, "passed": 0, "retried": False},
            "ui": _ui_for(first),
        }

    awaiting = int(state["awaiting"])          # 1-based index into _STEPS
    passed = int(state.get("passed", 0))       # count of SCORED steps passed
    retried = bool(state.get("retried", False))
    current = _STEPS[awaiting - 1]
    scored = current.get("scored", False)

    def _advance(new_passed: int) -> dict:
        """Move to the next step, or finish if this was the last one."""
        if awaiting >= len(_STEPS):
            return {
                "say": _FAREWELL,
                "complete": True,
                "level": _level_from_passed(new_passed),
                "state": {"awaiting": awaiting, "passed": new_passed, "retried": False},
                "ui": {"kind": "done", "options": [], "char": None},
            }
        nxt = _STEPS[awaiting]                  # next step (0-based = awaiting)
        return {
            "say": nxt["say"],
            "complete": False,
            "level": None,
            "state": {"awaiting": awaiting + 1, "passed": new_passed, "retried": False},
            "ui": _ui_for(nxt),
        }

    # Observational steps (draw / trace a glyph): any completion advances. They
    # are never failed and never end the staircase — they only let us see the
    # child write. Their result does not affect the level.
    if not scored:
        return _advance(passed)

    # Scored reading step: grade the tapped answer.
    if _matches(user_message, current["accept"]):
        return _advance(passed + 1)

    # A clear give-up ends the staircase immediately.
    if _is_giveup(user_message):
        return {
            "say": _FAREWELL,
            "complete": True,
            "level": _level_from_passed(passed),
            "state": {"awaiting": awaiting, "passed": passed, "retried": False},
            "ui": {"kind": "done", "options": [], "char": None},
        }

    # Unrecognised / wrong answer: give ONE gentle retry (absorbs noisy input),
    # then end if it fails again.
    if not retried:
        return {
            "say": current.get("retry", current["say"]),
            "complete": False,
            "level": None,
            "state": {"awaiting": awaiting, "passed": passed, "retried": True},
            "ui": _ui_for(current),
        }

    return {
        "say": _FAREWELL,
        "complete": True,
        "level": _level_from_passed(passed),
        "state": {"awaiting": awaiting, "passed": passed, "retried": False},
        "ui": {"kind": "done", "options": [], "char": None},
    }
