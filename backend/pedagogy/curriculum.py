"""
Curriculum Module — OLIBOT Pedagogical Ontology.

Defines the formal curriculum for Spanish Educación Infantil (ages 3-6),
aligned with Real Decreto 95/2022 (Área 3: Comunicación y representación
de la realidad).

This module acts as the **curriculum ontology** of OLIBOT's BDI belief base.
Each CurriculumTopic is a concept the agent can reason about:
  - beliefs: student mastery per topic
  - desires: student masters all topics
  - intentions: select next topic in ZDP, scaffold accordingly

From Andrés Camacho's TFG pattern:
    Ontología → Conceptos + Acciones + Predicados
    Here: CurriculumTopic (concept) + CurriculumEngine (actions)
    Predicates: dominado(Alumno, Tema), en_zdp(Alumno, Tema)

Categories covered:
  - LECTOESCRITURA: Recognition of vowels and simple consonants (letters A-Z subset)
  - NUMERACION:     Number recognition and counting (1-10)
  - FONOLOGIA:      Letter-sound correspondence (phonics)
"""
from __future__ import annotations
from dataclasses import dataclass, field
from enum import Enum


class CurriculumCategory(str, Enum):
    """High-level curriculum areas aligned with Spanish Infantil Área 3."""
    LECTOESCRITURA = "lectoescritura"   # Reading/writing readiness
    NUMERACION     = "numeracion"        # Numbers and counting
    FONOLOGIA      = "fonologia"         # Phonics / letter-sound mapping


@dataclass
class CurriculumTopic:
    """
    Represents a single learnable concept in the OLIBOT curriculum.

    BDI mapping:
        - id              → belief key  (e.g. mastery(alumno, vocal_a, ...))
        - prerequisites   → precondition for the BDI plan !select_topic
        - hints           → resources for the BDI plan !give_hint(Level)
        - expected_answers→ condition used to evaluate attempt_answer percepts
    """
    id: str                          # Unique identifier, e.g. "vocal_a"
    display_name: str                # Human-readable name, e.g. "La letra A"
    category: CurriculumCategory
    difficulty: int                  # 1 (easiest) – 5 (hardest)
    prerequisites: list[str]         # Topic IDs that must be mastered first
    description_for_student: str     # Brief intro OLIBOT says when starting
    hints: list[str]                 # hints[0]=subtle, [1]=moderate, [2]=near-direct
    expected_answers: list[str]      # Acceptable student answers (lowercase)
    example_questions: list[str]     # Questions OLIBOT can ask
    emoji: str = "📚"                # UI decoration


# ============================================================
# CURRICULUM DEFINITION
# Complete Spanish Infantil curriculum subset (20 topics)
# ============================================================

CURRICULUM: dict[str, CurriculumTopic] = {

    # ── VOCALES (Category: LECTOESCRITURA, Difficulty: 1) ──────────────────

    "vocal_a": CurriculumTopic(
        id="vocal_a", display_name="La vocal A", emoji="🅰️",
        category=CurriculumCategory.LECTOESCRITURA,
        difficulty=1, prerequisites=[],
        description_for_student="¡Hoy vamos a aprender la primera vocal! Es la más importante.",
        hints=[
            "¿Qué sonido hacemos cuando decimos 'aaa' muy fuerte? 🎵",
            "Es la primera letra del abecedario y también la primera de 'abeja' 🐝",
            "Piensa en 'árbol', 'avión' o 'amigo'... ¿qué letra tienen al principio? 🌳",
        ],
        expected_answers=["a", "la a", "vocal a", "letra a", "la letra a"],
        example_questions=[
            "¿Cuál es la primera vocal del abecedario?",
            "¿Qué letra hace el sonido 'aaa'?",
            "¿Con qué letra empieza 'árbol'?",
        ],
    ),

    "vocal_e": CurriculumTopic(
        id="vocal_e", display_name="La vocal E", emoji="🦘",
        category=CurriculumCategory.LECTOESCRITURA,
        difficulty=1, prerequisites=[],
        description_for_student="¡Es el turno de la vocal E! Se escucha en muchas palabras.",
        hints=[
            "¿Cómo suena cuando dices 'eee'? Como cuando el médico dice 'di eee' 🩺",
            "Es la vocal de 'elefante' 🐘 y de 'estrella' ⭐",
            "El elefante empieza con esta vocal... ¿cuál es? 🐘",
        ],
        expected_answers=["e", "la e", "vocal e", "letra e", "la letra e"],
        example_questions=[
            "¿Con qué vocal empieza 'elefante'?",
            "¿Qué vocal hace el sonido 'eee'?",
            "¿Cuál es la vocal de 'estrella'?",
        ],
    ),

    "vocal_i": CurriculumTopic(
        id="vocal_i", display_name="La vocal I", emoji="🦔",
        category=CurriculumCategory.LECTOESCRITURA,
        difficulty=1, prerequisites=[],
        description_for_student="¡Aprendamos la vocal I! Es pequeñita pero muy importante.",
        hints=[
            "Es el sonido que hacemos cuando algo nos duele un poquito: 'iii' 😣",
            "Piensa en 'iglú' o 'iguana'... ¿qué vocal tienen al principio? 🦎",
            "El iglú empieza con esta vocal... ¿cuál es? 🏔️",
        ],
        expected_answers=["i", "la i", "vocal i", "letra i", "la letra i"],
        example_questions=[
            "¿Con qué vocal empieza 'iglú'?",
            "¿Qué vocal hace el sonido 'iii'?",
            "¿Cuál es la tercera vocal del abecedario?",
        ],
    ),

    "vocal_o": CurriculumTopic(
        id="vocal_o", display_name="La vocal O", emoji="🐙",
        category=CurriculumCategory.LECTOESCRITURA,
        difficulty=1, prerequisites=[],
        description_for_student="¡Ahora toca la vocal O! Es redondita como una pelota.",
        hints=[
            "Es redonda como una pelota ⚽ y suena 'ooo'",
            "Piensa en 'oso' o en 'oveja'... ¿con qué vocal empiezan? 🐑",
            "El oso empieza con esta vocal... ¿cuál es? 🐻",
        ],
        expected_answers=["o", "la o", "vocal o", "letra o", "la letra o"],
        example_questions=[
            "¿Con qué vocal empieza 'oso'?",
            "¿Qué vocal parece una pelota redonda?",
            "¿Cuál es la vocal de 'oveja'?",
        ],
    ),

    "vocal_u": CurriculumTopic(
        id="vocal_u", display_name="La vocal U", emoji="🦄",
        category=CurriculumCategory.LECTOESCRITURA,
        difficulty=1, prerequisites=[],
        description_for_student="¡La última vocal es la U! La que cierra el grupo de vocales.",
        hints=[
            "Suena como cuando soplas una vela: 'uuu' 🕯️",
            "Piensa en 'uva' o 'unicornio'... ¿con qué vocal empiezan? 🍇",
            "El unicornio empieza con esta vocal... ¿cuál es? 🦄",
        ],
        expected_answers=["u", "la u", "vocal u", "letra u", "la letra u"],
        example_questions=[
            "¿Con qué vocal empieza 'uva'?",
            "¿Qué vocal hace el sonido 'uuu'?",
            "¿Cuál es la última vocal del abecedario?",
        ],
    ),

    # ── NÚMEROS 1-5 (Category: NUMERACION, Difficulty: 1) ──────────────────

    "numero_1": CurriculumTopic(
        id="numero_1", display_name="El número 1", emoji="1️⃣",
        category=CurriculumCategory.NUMERACION,
        difficulty=1, prerequisites=[],
        description_for_student="¡Empezamos a contar! El primer número es el 1.",
        hints=[
            "¿Cuántos soles hay en el cielo durante el día? ☀️",
            "Es el número con el que empezamos a contar...",
            "Uno, un solo dedito levantado 👆 ¿qué número es?",
        ],
        expected_answers=["1", "uno", "el 1", "el uno"],
        example_questions=[
            "¿Cuántas lunas tiene la Tierra?",
            "¿Qué número viene primero cuando contamos?",
        ],
    ),

    "numero_2": CurriculumTopic(
        id="numero_2", display_name="El número 2", emoji="2️⃣",
        category=CurriculumCategory.NUMERACION,
        difficulty=1, prerequisites=["numero_1"],
        description_for_student="¡Seguimos contando! Después del 1 viene el 2.",
        hints=[
            "¿Cuántas manos tienes? 🙌",
            "Es el número que viene después del 1...",
            "Dos manitas, dos ojos, dos orejas 👀 ¿qué número es?",
        ],
        expected_answers=["2", "dos", "el 2", "el dos"],
        example_questions=[
            "¿Cuántas orejas tienes?",
            "¿Qué número viene después del 1?",
        ],
    ),

    "numero_3": CurriculumTopic(
        id="numero_3", display_name="El número 3", emoji="3️⃣",
        category=CurriculumCategory.NUMERACION,
        difficulty=1, prerequisites=["numero_2"],
        description_for_student="¡El 3 es un número muy especial! Piensa en los cuentos.",
        hints=[
            "¿Cuántos cerditos había en el cuento? 🐷🐷🐷",
            "Es el número que viene después del 2...",
            "Uno, dos... ¿y después? 1️⃣2️⃣...?",
        ],
        expected_answers=["3", "tres", "el 3", "el tres"],
        example_questions=[
            "¿Cuántos cerditos hay en el cuento de los tres cerditos?",
            "¿Qué número viene después del 2?",
        ],
    ),

    "numero_4": CurriculumTopic(
        id="numero_4", display_name="El número 4", emoji="4️⃣",
        category=CurriculumCategory.NUMERACION,
        difficulty=1, prerequisites=["numero_3"],
        description_for_student="¡Vamos al 4! Cuenta las patas de un perro.",
        hints=[
            "¿Cuántas patas tiene un perro? 🐶",
            "Es el número que viene después del 3...",
            "Uno, dos, tres... ¿y después? 1️⃣2️⃣3️⃣...?",
        ],
        expected_answers=["4", "cuatro", "el 4", "el cuatro"],
        example_questions=[
            "¿Cuántas patas tiene un gato?",
            "¿Qué número viene después del 3?",
        ],
    ),

    "numero_5": CurriculumTopic(
        id="numero_5", display_name="El número 5", emoji="5️⃣",
        category=CurriculumCategory.NUMERACION,
        difficulty=1, prerequisites=["numero_4"],
        description_for_student="¡El 5! Mira tu mano y cuenta los dedos.",
        hints=[
            "¿Cuántos dedos tiene una mano? 🖐️",
            "Es el número que viene después del 4...",
            "Una mano entera de dedos 🖐️ ¿qué número es?",
        ],
        expected_answers=["5", "cinco", "el 5", "el cinco"],
        example_questions=[
            "¿Cuántos dedos tiene una mano?",
            "¿Qué número viene después del 4?",
        ],
    ),

    "numero_6": CurriculumTopic(
        id="numero_6", display_name="El número 6", emoji="6️⃣",
        category=CurriculumCategory.NUMERACION,
        difficulty=2, prerequisites=["numero_5"],
        description_for_student="¡Ahora el 6! Es como el 5 pero con uno más.",
        hints=[
            "Si tienes 5 caramelos y te dan uno más, ¿cuántos tienes? 🍬🍬🍬🍬🍬🍬",
            "Es el número que viene después del 5...",
            "Cinco más uno es... ¿cuánto?",
        ],
        expected_answers=["6", "seis", "el 6", "el seis"],
        example_questions=[
            "¿Qué número viene después del 5?",
            "¿Cuánto es 5 + 1?",
        ],
    ),

    "numero_7": CurriculumTopic(
        id="numero_7", display_name="El número 7", emoji="7️⃣",
        category=CurriculumCategory.NUMERACION,
        difficulty=2, prerequisites=["numero_6"],
        description_for_student="¡El 7! El número de los días de la semana.",
        hints=[
            "¿Cuántos días tiene una semana? 📅",
            "Es el número que viene después del 6...",
            "Lunes, martes, miércoles, jueves, viernes, sábado, domingo... ¿cuántos son?",
        ],
        expected_answers=["7", "siete", "el 7", "el siete"],
        example_questions=[
            "¿Cuántos días tiene la semana?",
            "¿Qué número viene después del 6?",
        ],
    ),

    "numero_8": CurriculumTopic(
        id="numero_8", display_name="El número 8", emoji="8️⃣",
        category=CurriculumCategory.NUMERACION,
        difficulty=2, prerequisites=["numero_7"],
        description_for_student="¡El 8! Tiene una forma muy especial, como dos círculos.",
        hints=[
            "¿Cuántas patas tiene una araña? 🕷️",
            "Es el número que viene después del 7...",
            "Una araña tiene... ¿cuántas patas?",
        ],
        expected_answers=["8", "ocho", "el 8", "el ocho"],
        example_questions=[
            "¿Cuántas patas tiene una araña?",
            "¿Qué número viene después del 7?",
        ],
    ),

    "numero_9": CurriculumTopic(
        id="numero_9", display_name="El número 9", emoji="9️⃣",
        category=CurriculumCategory.NUMERACION,
        difficulty=2, prerequisites=["numero_8"],
        description_for_student="¡Casi llegamos al 10! Solo falta el 9.",
        hints=[
            "Cuenta conmigo hasta el final: 7, 8, ... ¿qué sigue?",
            "Es el número que viene después del 8...",
            "Si tuvieras 8 globos y te dieran uno más, ¿cuántos tendrías? 🎈",
        ],
        expected_answers=["9", "nueve", "el 9", "el nueve"],
        example_questions=[
            "¿Qué número viene después del 8?",
            "¿Cuánto es 8 + 1?",
        ],
    ),

    "numero_10": CurriculumTopic(
        id="numero_10", display_name="El número 10", emoji="🔟",
        category=CurriculumCategory.NUMERACION,
        difficulty=2, prerequisites=["numero_9"],
        description_for_student="¡El 10! El número de los dos dedos de todas las manos.",
        hints=[
            "¿Cuántos dedos tienes en las dos manos juntas? 🙌",
            "Es el número que viene después del 9, el último de los que contamos primero...",
            "Cinco más cinco es... ¿cuánto?",
        ],
        expected_answers=["10", "diez", "el 10", "el diez"],
        example_questions=[
            "¿Cuántos dedos tienes en total (las dos manos)?",
            "¿Qué número viene después del 9?",
        ],
    ),

    # ── CONSONANTES SIMPLES (Category: LECTOESCRITURA, Difficulty: 2) ───────
    # Prerequisites: all vowels must be mastered

    "consonante_m": CurriculumTopic(
        id="consonante_m", display_name="La consonante M", emoji="🌙",
        category=CurriculumCategory.LECTOESCRITURA,
        difficulty=2,
        prerequisites=["vocal_a", "vocal_e", "vocal_i", "vocal_o", "vocal_u"],
        description_for_student="¡Ya sabes las vocales! Ahora aprenderemos consonantes. Empezamos con la M.",
        hints=[
            "¿Cómo suena cuando tienes la boca cerrada y haces 'mmm'? 🤔",
            "Es la letra de 'mamá', 'manzana' y 'mariposa' 🦋",
            "Mamá empieza con esta letra... ¿cuál es? 👩",
        ],
        expected_answers=["m", "la m", "consonante m", "letra m", "la letra m"],
        example_questions=[
            "¿Con qué letra empieza 'mamá'?",
            "¿Qué letra hace el sonido 'mmm'?",
            "¿Con qué letra empieza 'manzana'?",
        ],
    ),

    "consonante_p": CurriculumTopic(
        id="consonante_p", display_name="La consonante P", emoji="🦜",
        category=CurriculumCategory.LECTOESCRITURA,
        difficulty=2,
        prerequisites=["vocal_a", "vocal_e", "vocal_i", "vocal_o", "vocal_u"],
        description_for_student="¡La consonante P! Una letra que sopla.",
        hints=[
            "Pon la mano delante de la boca y di 'ppp'... ¿sientes el airecillo? 💨",
            "Es la letra de 'papá', 'pelota' y 'pato' 🦆",
            "El pato empieza con esta letra... ¿cuál es? 🦆",
        ],
        expected_answers=["p", "la p", "consonante p", "letra p", "la letra p"],
        example_questions=[
            "¿Con qué letra empieza 'papá'?",
            "¿Qué letra hace el sonido explosivo 'p'?",
            "¿Con qué letra empieza 'pelota'?",
        ],
    ),

    "consonante_t": CurriculumTopic(
        id="consonante_t", display_name="La consonante T", emoji="🐢",
        category=CurriculumCategory.LECTOESCRITURA,
        difficulty=2,
        prerequisites=["vocal_a", "vocal_e", "vocal_i", "vocal_o", "vocal_u"],
        description_for_student="¡La T! Una letra que golpea suavemente con la lengua.",
        hints=[
            "Pon la punta de la lengua arriba y di 'ttt'... ¿cómo suena? 👅",
            "Es la letra de 'tortuga', 'tren' y 'tigre' 🐅",
            "La tortuga empieza con esta letra... ¿cuál es? 🐢",
        ],
        expected_answers=["t", "la t", "consonante t", "letra t", "la letra t"],
        example_questions=[
            "¿Con qué letra empieza 'tortuga'?",
            "¿Qué letra hace el sonido 'ttt'?",
            "¿Con qué letra empieza 'tren'?",
        ],
    ),

    "consonante_s": CurriculumTopic(
        id="consonante_s", display_name="La consonante S", emoji="🐍",
        category=CurriculumCategory.LECTOESCRITURA,
        difficulty=2,
        prerequisites=["vocal_a", "vocal_e", "vocal_i", "vocal_o", "vocal_u"],
        description_for_student="¡La S! Suena como una serpiente.",
        hints=[
            "¿Cómo suena una serpiente? Ssss... 🐍",
            "Es la letra de 'sol', 'sopa' y 'sapo' 🐸",
            "La serpiente empieza con esta letra... ¿cuál es? 🐍",
        ],
        expected_answers=["s", "la s", "consonante s", "letra s", "la letra s"],
        example_questions=[
            "¿Con qué letra empieza 'sol'?",
            "¿Qué letra suena como una serpiente?",
            "¿Con qué letra empieza 'sapo'?",
        ],
    ),

    "consonante_l": CurriculumTopic(
        id="consonante_l", display_name="La consonante L", emoji="🦁",
        category=CurriculumCategory.LECTOESCRITURA,
        difficulty=2,
        prerequisites=["vocal_a", "vocal_e", "vocal_i", "vocal_o", "vocal_u"],
        description_for_student="¡La L! Una letra suavecita.",
        hints=[
            "Sube la lengua al paladar y di 'lll'... ¿qué suena? 👅",
            "Es la letra de 'luna', 'leche' y 'lobo' 🌕",
            "La luna empieza con esta letra... ¿cuál es? 🌙",
        ],
        expected_answers=["l", "la l", "consonante l", "letra l", "la letra l"],
        example_questions=[
            "¿Con qué letra empieza 'luna'?",
            "¿Qué letra hace el sonido suave 'l'?",
            "¿Con qué letra empieza 'leche'?",
        ],
    ),
}


class CurriculumEngine:
    """
    Manages curriculum navigation for a student based on their belief base.

    BDI predicate equivalents:
        dominado(Alumno, Tema)  → is_mastered(beliefs, topic_id)
        en_zdp(Alumno, Tema)    → in_zdp(beliefs, topic_id)
        prereqs_ok(Tema)        → prerequisites_met(beliefs, topic_id)

    Topic selection algorithm (mirrors Jason plan !select_topic):
        1. Find eligible topics (prerequisites met)
        2. Prefer ZDP topics (started but not mastered)
        3. Fallback to the easiest unstarted eligible topic
        4. If all mastered → cycle back for review
    """

    # ZDP range: topics where success rate is in this range are "just right"
    ZDP_MIN_RATE = 0.20   # Below this → too hard (not in ZDP)
    ZDP_MAX_RATE = 0.75   # Above this → mastered (exit ZDP)
    MASTERY_THRESHOLD = 0.75
    MIN_ATTEMPTS = 3

    def get_topic(self, topic_id: str) -> CurriculumTopic | None:
        return CURRICULUM.get(topic_id)

    def get_all_topics(self) -> list[CurriculumTopic]:
        return list(CURRICULUM.values())

    def get_topics_by_category(self, category: CurriculumCategory) -> list[CurriculumTopic]:
        return [t for t in CURRICULUM.values() if t.category == category]

    def is_mastered(self, beliefs: dict, topic_id: str) -> bool:
        """
        Checks if a topic is mastered.
        Jason equivalent: mastered(StudentId, TopicId)
        """
        mastery = beliefs.get("mastery", {}).get(topic_id, {})
        attempts = mastery.get("attempts", 0)
        correct = mastery.get("correct", 0)
        if attempts < self.MIN_ATTEMPTS:
            return False
        return (correct / attempts) >= self.MASTERY_THRESHOLD

    def get_success_rate(self, beliefs: dict, topic_id: str) -> float:
        """Returns success rate for a topic, 0.0 if never attempted."""
        mastery = beliefs.get("mastery", {}).get(topic_id, {})
        attempts = mastery.get("attempts", 0)
        correct = mastery.get("correct", 0)
        if attempts == 0:
            return 0.0
        return correct / attempts

    def prerequisites_met(self, beliefs: dict, topic: CurriculumTopic) -> bool:
        """
        Checks if all prerequisites for a topic are mastered.
        Jason equivalent: prereqs_ok(TopicId) condition in !select_topic
        """
        return all(self.is_mastered(beliefs, prereq) for prereq in topic.prerequisites)

    def in_zdp(self, beliefs: dict, topic_id: str) -> bool:
        """
        Checks if a topic is in the student's Zone of Proximal Development.
        A topic is in ZDP if: it has been attempted AND is not yet mastered.
        Jason equivalent: en_zdp(StudentId, TopicId)
        """
        mastery = beliefs.get("mastery", {}).get(topic_id, {})
        attempts = mastery.get("attempts", 0)
        if attempts == 0:
            return False  # Never tried → not in ZDP yet
        return not self.is_mastered(beliefs, topic_id)

    def get_next_topic(self, beliefs: dict) -> CurriculumTopic:
        """
        Selects the next topic for the student using ZDP logic.
        This mirrors the Jason plan: +!select_topic(StudentId)

        Priority order:
            1. Topics in ZDP (being worked on, not yet mastered)
            2. Easiest unstarted topic with prerequisites met
            3. First topic for review (if all mastered)
        """
        eligible = [
            t for t in CURRICULUM.values()
            if self.prerequisites_met(beliefs, t)
        ]

        # Priority 1: Topics actively in ZDP
        zdp_topics = [t for t in eligible if self.in_zdp(beliefs, t.id)]
        if zdp_topics:
            # Among ZDP topics, pick the one with most attempts (deepest engagement)
            return max(zdp_topics, key=lambda t: beliefs.get("mastery", {}).get(t.id, {}).get("attempts", 0))

        # Priority 2: Easiest unstarted eligible topic
        unstarted = [
            t for t in eligible
            if beliefs.get("mastery", {}).get(t.id, {}).get("attempts", 0) == 0
        ]
        if unstarted:
            return min(unstarted, key=lambda t: t.difficulty)

        # Priority 3: All eligible topics mastered → review the one with lowest success rate
        mastered_eligible = [t for t in eligible if self.is_mastered(beliefs, t.id)]
        if mastered_eligible:
            return min(mastered_eligible, key=lambda t: self.get_success_rate(beliefs, t.id))

        # Fallback: start from the very beginning
        return CURRICULUM["vocal_a"]

    def get_hint(self, topic_id: str, hint_level: int) -> str:
        """
        Returns the appropriate hint for a topic and scaffolding level.
        hint_level: 1 (subtle), 2 (moderate), 3 (near-direct)
        """
        topic = CURRICULUM.get(topic_id)
        if not topic or not topic.hints:
            return "¿Qué crees tú? Piénsalo un momento... 🤔"
        idx = max(0, min(hint_level - 1, len(topic.hints) - 1))
        return topic.hints[idx]

    def evaluate_answer(self, topic_id: str, student_answer: str) -> bool:
        """
        Evaluates whether a student's answer is correct for a given topic.
        Used by the BDI bridge to update mastery beliefs.
        """
        topic = CURRICULUM.get(topic_id)
        if not topic:
            return False
        normalized = student_answer.strip().lower()
        return any(normalized == expected.lower() for expected in topic.expected_answers)