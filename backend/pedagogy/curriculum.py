"""
Curriculum Module — OLIBOT Pedagogical Ontology.

Defines the formal curriculum for Spanish Educación Infantil (ages 3-6),
aligned with Decreto 36/2022 (Comunidad de Madrid) and the synthetic-phonics
method (método sintético-fonético) predominant in Madrid schools.

Topic progression by age (Decreto 36/2022, Área III Bloque D):
  - 3 años: Pre-graphomotricity strokes + vowel sound recognition
  - 4 años: Numbers 1-10, then vowels (upper+lower case), then consonants b-z (excl. h,k,q,w,x) alphabetically
  - 5 años: Consonants h,k,q,w,x + syllables + bisyllabic words

Each CurriculumTopic maps to a BDI concept:
  - beliefs: student mastery per topic
  - desires: student masters all age-appropriate topics
  - intentions: select next topic in ZDP, scaffold accordingly
"""
from __future__ import annotations
from dataclasses import dataclass, field
from enum import Enum


class CurriculumCategory(str, Enum):
    PREGRAFOMOTRICIDAD = "pregrafomotricidad"  # Pre-writing strokes (age 3)
    LECTOESCRITURA     = "lectoescritura"      # Letter reading/writing readiness
    NUMERACION         = "numeracion"          # Numbers and counting
    FONOLOGIA          = "fonologia"           # Phonics / letter-sound mapping
    SILABAS            = "silabas"             # Syllable decoding (age 5)
    PALABRAS           = "palabras"            # Word recognition (age 5)
    SILABAS_COMPLEJAS  = "silabas_complejas"   # Inverse/complex syllables (age 6)
    PALABRAS_AVANZADAS = "palabras_avanzadas"  # Trisyllabic words + inverse-syllable words (age 6)
    FRASES             = "frases"              # Simple sentence reading (age 6)


@dataclass
class CurriculumTopic:
    id: str
    display_name: str
    category: CurriculumCategory
    difficulty: int                  # 1–5
    prerequisites: list[str]
    description_for_student: str
    hints: list[str]
    expected_answers: list[str]
    example_questions: list[str]
    emoji: str = "📚"
    min_age: int = 4                 # Minimum student age for this topic


# ============================================================
# CURRICULUM DEFINITION
# ============================================================

CURRICULUM: dict[str, CurriculumTopic] = {

    # ── TRAZOS PREGRÁFICOS — 3 años ───────────────────────────────────────────
    # No canvas tracing of letters yet — motor preparation only.

    "trazo_linea_h": CurriculumTopic(
        id="trazo_linea_h", display_name="Línea recta →", emoji="➡️",
        category=CurriculumCategory.PREGRAFOMOTRICIDAD,
        difficulty=1, prerequisites=[], min_age=3,
        description_for_student="¡Vamos a trazar una línea recta!",
        hints=[
            "Sigue la línea roja de ejemplo 🖊️",
            "Sigue los puntos de guía 🔴",
            "¡Mira el tutorial otra vez! ▶️",
        ],
        expected_answers=["línea", "raya", "trazo"],
        example_questions=["¿Puedes trazar una línea recta?"],
    ),

    "trazo_linea_v": CurriculumTopic(
        id="trazo_linea_v", display_name="Línea recta ↓", emoji="⬇️",
        category=CurriculumCategory.PREGRAFOMOTRICIDAD,
        difficulty=1, prerequisites=["trazo_linea_h"], min_age=3,
        description_for_student="¡Ahora trazamos hacia abajo!",
        hints=[
            "Sigue la línea roja de ejemplo 🖊️",
            "Sigue los puntos de guía 🔴",
            "¡Mira el tutorial otra vez! ▶️",
        ],
        expected_answers=["línea", "raya", "trazo"],
        example_questions=["¿Puedes trazar una línea hacia abajo?"],
    ),

    "trazo_curva": CurriculumTopic(
        id="trazo_curva", display_name="Curva suave ~", emoji="🌊",
        category=CurriculumCategory.PREGRAFOMOTRICIDAD,
        difficulty=1, prerequisites=["trazo_linea_h"], min_age=3,
        description_for_student="¡Trazamos una ola del mar!",
        hints=[
            "Sigue la línea roja de ejemplo 🖊️",
            "Sigue los puntos de guía 🔴",
            "¡Mira el tutorial otra vez! ▶️",
        ],
        expected_answers=["curva", "ola", "onda"],
        example_questions=["¿Puedes hacer una ola con el lápiz?"],
    ),

    "trazo_zigzag": CurriculumTopic(
        id="trazo_zigzag", display_name="Zigzag ∧∨", emoji="⚡",
        category=CurriculumCategory.PREGRAFOMOTRICIDAD,
        difficulty=2, prerequisites=["trazo_curva"], min_age=3,
        description_for_student="¡Trazamos un rayo! ⚡",
        hints=[
            "Sigue la línea roja de ejemplo 🖊️",
            "Sigue los puntos de guía 🔴",
            "¡Mira el tutorial otra vez! ▶️",
        ],
        expected_answers=["zigzag", "rayo", "picos"],
        example_questions=["¿Puedes hacer un zigzag?"],
    ),

    "trazo_circulo": CurriculumTopic(
        id="trazo_circulo", display_name="Círculo ○", emoji="⭕",
        category=CurriculumCategory.PREGRAFOMOTRICIDAD,
        difficulty=2, prerequisites=["trazo_curva"], min_age=3,
        description_for_student="¡Dibujamos una pelota redonda!",
        hints=[
            "Sigue la línea roja de ejemplo 🖊️",
            "Sigue los puntos de guía 🔴",
            "¡Mira el tutorial otra vez! ▶️",
        ],
        expected_answers=["círculo", "pelota", "redondo"],
        example_questions=["¿Puedes dibujar un círculo?"],
    ),

    "trazo_angulo": CurriculumTopic(
        id="trazo_angulo", display_name="Ángulo ∧", emoji="🏔️",
        category=CurriculumCategory.PREGRAFOMOTRICIDAD,
        difficulty=2, prerequisites=["trazo_linea_v"], min_age=3,
        description_for_student="¡Trazamos una montaña!",
        hints=[
            "Sigue la línea roja de ejemplo 🖊️",
            "Sigue los puntos de guía 🔴",
            "¡Mira el tutorial otra vez! ▶️",
        ],
        expected_answers=["ángulo", "montaña", "pico", "tejado"],
        example_questions=["¿Puedes trazar una montaña?"],
    ),

    # ── VOCALES MAYÚSCULAS — 4 años ───────────────────────────────────────────

    "vocal_a": CurriculumTopic(
        id="vocal_a", display_name="La vocal A", emoji="🅰️",
        category=CurriculumCategory.LECTOESCRITURA,
        difficulty=2, prerequisites=["trazo_angulo", "trazo_linea_h"], min_age=4,
        description_for_student="¡Hoy aprendemos la A! Es la primera vocal.",
        hints=[
            "¿Qué sonido hacemos cuando decimos 'aaa' muy fuerte? 🎵",
            "Es la primera letra del abecedario y la primera de 'abeja' 🐝",
            "Piensa en 'árbol', 'avión' o 'amigo'... ¿qué letra tienen al principio? 🌳",
        ],
        expected_answers=["a", "la a", "vocal a", "letra a", "la letra a"],
        example_questions=[
            "¿Cuál es la primera vocal?",
            "¿Qué letra hace el sonido 'aaa'?",
            "¿Con qué letra empieza 'árbol'?",
        ],
    ),

    "vocal_e": CurriculumTopic(
        id="vocal_e", display_name="La vocal E", emoji="🐘",
        category=CurriculumCategory.LECTOESCRITURA,
        difficulty=2, prerequisites=["trazo_linea_h", "trazo_linea_v"], min_age=4,
        description_for_student="¡La vocal E! Se escucha en muchas palabras.",
        hints=[
            "¿Cómo suena cuando dices 'eee'? Como cuando el médico dice 'di eee' 🩺",
            "Es la vocal de 'elefante' 🐘 y de 'estrella' ⭐",
            "El elefante empieza con esta vocal... ¿cuál es? 🐘",
        ],
        expected_answers=["e", "la e", "vocal e", "letra e", "la letra e"],
        example_questions=[
            "¿Con qué vocal empieza 'elefante'?",
            "¿Qué vocal hace el sonido 'eee'?",
        ],
    ),

    "vocal_i": CurriculumTopic(
        id="vocal_i", display_name="La vocal I", emoji="🦔",
        category=CurriculumCategory.LECTOESCRITURA,
        difficulty=2, prerequisites=["trazo_linea_v"], min_age=4,
        description_for_student="¡La vocal I! Es pequeñita pero muy importante.",
        hints=[
            "Es el sonido que hacemos cuando algo nos duele un poquito: 'iii' 😣",
            "Piensa en 'iglú' o 'iguana'... ¿qué vocal tienen al principio? 🦎",
            "El iglú empieza con esta vocal... ¿cuál es? 🏔️",
        ],
        expected_answers=["i", "la i", "vocal i", "letra i", "la letra i"],
        example_questions=[
            "¿Con qué vocal empieza 'iglú'?",
            "¿Cuál es la tercera vocal?",
        ],
    ),

    "vocal_o": CurriculumTopic(
        id="vocal_o", display_name="La vocal O", emoji="🐙",
        category=CurriculumCategory.LECTOESCRITURA,
        difficulty=2, prerequisites=["trazo_circulo"], min_age=4,
        description_for_student="¡La vocal O! Es redondita como una pelota.",
        hints=[
            "Es redonda como una pelota ⚽ y suena 'ooo'",
            "Piensa en 'oso' o en 'oveja'... ¿con qué vocal empiezan? 🐑",
            "El oso empieza con esta vocal... ¿cuál es? 🐻",
        ],
        expected_answers=["o", "la o", "vocal o", "letra o", "la letra o"],
        example_questions=[
            "¿Con qué vocal empieza 'oso'?",
            "¿Qué vocal parece una pelota redonda?",
        ],
    ),

    "vocal_u": CurriculumTopic(
        id="vocal_u", display_name="La vocal U", emoji="🦄",
        category=CurriculumCategory.LECTOESCRITURA,
        difficulty=2, prerequisites=["trazo_curva"], min_age=4,
        description_for_student="¡La U! Es la última vocal.",
        hints=[
            "Suena como cuando soplas una vela: 'uuu' 🕯️",
            "Piensa en 'uva' o 'unicornio'... ¿con qué vocal empiezan? 🍇",
            "El unicornio empieza con esta vocal... ¿cuál es? 🦄",
        ],
        expected_answers=["u", "la u", "vocal u", "letra u", "la letra u"],
        example_questions=[
            "¿Con qué vocal empieza 'uva'?",
            "¿Cuál es la última vocal?",
        ],
    ),

    # ── VOCALES MINÚSCULAS — 4 años ───────────────────────────────────────────

    "vocal_a_min": CurriculumTopic(
        id="vocal_a_min", display_name="La vocal a", emoji="🐜",
        category=CurriculumCategory.LECTOESCRITURA,
        difficulty=2, prerequisites=["vocal_a"], min_age=4,
        description_for_student="¡La a pequeña! Se escribe diferente a la grande.",
        hints=[
            "La 'a' pequeña tiene un círculo y una patita 🐌",
            "¿Recuerdas la A grande? La pequeña es más redondita 🔵",
            "Una pelotita con un palito al lado... ¡eso es la a! 🎈",
        ],
        expected_answers=["a", "la a", "vocal a", "letra a", "la letra a"],
        example_questions=["¿Cómo se escribe la a pequeña?"],
    ),

    "vocal_e_min": CurriculumTopic(
        id="vocal_e_min", display_name="La vocal e", emoji="🐘",
        category=CurriculumCategory.LECTOESCRITURA,
        difficulty=2, prerequisites=["vocal_e"], min_age=4,
        description_for_student="¡La e pequeña! Es como dibujar una curva especial.",
        hints=[
            "La 'e' pequeña empieza con una línea que luego se curva ✏️",
            "Imagina una 'c' con un palito en el medio 🐍",
            "El elefante tiene una 'e'... ¿cómo la dibujas pequeña? 🐘",
        ],
        expected_answers=["e", "la e", "vocal e", "letra e", "la letra e"],
        example_questions=["¿Cómo se escribe la e pequeña?"],
    ),

    "vocal_i_min": CurriculumTopic(
        id="vocal_i_min", display_name="La vocal i", emoji="🦔",
        category=CurriculumCategory.LECTOESCRITURA,
        difficulty=2, prerequisites=["vocal_i"], min_age=4,
        description_for_student="¡La i pequeña! Tiene un palito y un punto arriba.",
        hints=[
            "La 'i' pequeña es un palito con un puntito encima 👆",
            "Primero el palito hacia abajo y luego el punto arriba ⬇️",
            "¡Un palito y un punto: ¿cuál es? 🎯",
        ],
        expected_answers=["i", "la i", "vocal i", "letra i", "la letra i"],
        example_questions=["¿Qué vocal tiene un puntito encima?"],
    ),

    "vocal_o_min": CurriculumTopic(
        id="vocal_o_min", display_name="La vocal o", emoji="🐙",
        category=CurriculumCategory.LECTOESCRITURA,
        difficulty=2, prerequisites=["vocal_o"], min_age=4,
        description_for_student="¡La o pequeña! Es un círculo.",
        hints=[
            "La 'o' pequeña es un círculo, igual que la O grande! ⭕",
            "Empieza por arriba y dibuja una pelotita 🔵",
            "¡Redondita como una pelota! ¿Qué letra es? ⚽",
        ],
        expected_answers=["o", "la o", "vocal o", "letra o", "la letra o"],
        example_questions=["¿Qué vocal tiene forma de círculo?"],
    ),

    "vocal_u_min": CurriculumTopic(
        id="vocal_u_min", display_name="La vocal u", emoji="🦄",
        category=CurriculumCategory.LECTOESCRITURA,
        difficulty=2, prerequisites=["vocal_u"], min_age=4,
        description_for_student="¡La u pequeña! Es como una taza.",
        hints=[
            "La 'u' pequeña baja, se curva y vuelve a subir 🏊",
            "Imagina una taza: baja, curva en el fondo y sube ☕",
            "¡Como una hamaca... ¿qué letra es? 🌙",
        ],
        expected_answers=["u", "la u", "vocal u", "letra u", "la letra u"],
        example_questions=["¿Qué vocal parece una hamaca?"],
    ),

    # ── NÚMEROS 1-10 — 4 años ────────────────────────────────────────────────

    "numero_1": CurriculumTopic(
        id="numero_1", display_name="El número 1", emoji="1️⃣",
        category=CurriculumCategory.NUMERACION,
        difficulty=1, prerequisites=["trazo_linea_v"], min_age=4,
        description_for_student="¡El primer número es el 1!",
        hints=[
            "¿Cuántos soles hay en el cielo durante el día? ☀️",
            "Es el número con el que empezamos a contar...",
            "Uno, un solo dedito levantado 👆 ¿qué número es?",
        ],
        expected_answers=["1", "uno", "el 1", "el uno"],
        example_questions=["¿Cuántas lunas tiene la Tierra?"],
    ),

    "numero_2": CurriculumTopic(
        id="numero_2", display_name="El número 2", emoji="2️⃣",
        category=CurriculumCategory.NUMERACION,
        difficulty=1, prerequisites=["numero_1"], min_age=4,
        description_for_student="¡Después del 1 viene el 2!",
        hints=["¿Cuántas manos tienes? 🙌", "Viene después del 1...", "Dos ojos, dos orejas 👀"],
        expected_answers=["2", "dos", "el 2", "el dos"],
        example_questions=["¿Cuántas orejas tienes?"],
    ),

    "numero_3": CurriculumTopic(
        id="numero_3", display_name="El número 3", emoji="3️⃣",
        category=CurriculumCategory.NUMERACION,
        difficulty=1, prerequisites=["numero_2"], min_age=4,
        description_for_student="¡El 3 es especial! Piensa en los cuentos.",
        hints=["¿Cuántos cerditos había en el cuento? 🐷🐷🐷", "Viene después del 2...", "Uno, dos... ¿y después?"],
        expected_answers=["3", "tres", "el 3", "el tres"],
        example_questions=["¿Cuántos cerditos hay en el cuento?"],
    ),

    "numero_4": CurriculumTopic(
        id="numero_4", display_name="El número 4", emoji="4️⃣",
        category=CurriculumCategory.NUMERACION,
        difficulty=1, prerequisites=["numero_3"], min_age=4,
        description_for_student="¡El 4! Cuenta las patas de un perro.",
        hints=["¿Cuántas patas tiene un perro? 🐶", "Viene después del 3...", "Un gato tiene... ¿cuántas patas?"],
        expected_answers=["4", "cuatro", "el 4", "el cuatro"],
        example_questions=["¿Cuántas patas tiene un gato?"],
    ),

    "numero_5": CurriculumTopic(
        id="numero_5", display_name="El número 5", emoji="5️⃣",
        category=CurriculumCategory.NUMERACION,
        difficulty=1, prerequisites=["numero_4"], min_age=4,
        description_for_student="¡El 5! Mira tu mano.",
        hints=["¿Cuántos dedos tiene una mano? 🖐️", "Viene después del 4...", "Una mano entera 🖐️"],
        expected_answers=["5", "cinco", "el 5", "el cinco"],
        example_questions=["¿Cuántos dedos tiene una mano?"],
    ),

    "numero_6": CurriculumTopic(
        id="numero_6", display_name="El número 6", emoji="6️⃣",
        category=CurriculumCategory.NUMERACION,
        difficulty=1, prerequisites=["numero_5"], min_age=4,
        description_for_student="¡El 6! Es el 5 con uno más.",
        hints=["5 caramelos y uno más... 🍬", "Viene después del 5...", "Cinco más uno es..."],
        expected_answers=["6", "seis", "el 6", "el seis"],
        example_questions=["¿Qué número viene después del 5?"],
    ),

    "numero_7": CurriculumTopic(
        id="numero_7", display_name="El número 7", emoji="7️⃣",
        category=CurriculumCategory.NUMERACION,
        difficulty=1, prerequisites=["numero_6"], min_age=4,
        description_for_student="¡El 7! Los días de la semana.",
        hints=["¿Cuántos días tiene una semana? 📅", "Viene después del 6...", "Lunes, martes, miércoles... ¿cuántos son?"],
        expected_answers=["7", "siete", "el 7", "el siete"],
        example_questions=["¿Cuántos días tiene la semana?"],
    ),

    "numero_8": CurriculumTopic(
        id="numero_8", display_name="El número 8", emoji="8️⃣",
        category=CurriculumCategory.NUMERACION,
        difficulty=1, prerequisites=["numero_7"], min_age=4,
        description_for_student="¡El 8! Como dos círculos.",
        hints=["¿Cuántas patas tiene una araña? 🕷️", "Viene después del 7...", "Una araña tiene... ¿cuántas patas?"],
        expected_answers=["8", "ocho", "el 8", "el ocho"],
        example_questions=["¿Cuántas patas tiene una araña?"],
    ),

    "numero_9": CurriculumTopic(
        id="numero_9", display_name="El número 9", emoji="9️⃣",
        category=CurriculumCategory.NUMERACION,
        difficulty=1, prerequisites=["numero_8"], min_age=4,
        description_for_student="¡Casi llegamos al 10! Solo falta el 9.",
        hints=["7, 8, ... ¿qué sigue?", "Viene después del 8...", "Ocho globos y uno más 🎈"],
        expected_answers=["9", "nueve", "el 9", "el nueve"],
        example_questions=["¿Qué número viene después del 8?"],
    ),

    "numero_10": CurriculumTopic(
        id="numero_10", display_name="El número 10", emoji="🔟",
        category=CurriculumCategory.NUMERACION,
        difficulty=1, prerequisites=["numero_9"], min_age=4,
        description_for_student="¡El 10! Los dedos de las dos manos.",
        hints=["¿Cuántos dedos tienes en las dos manos? 🙌", "Viene después del 9...", "Cinco más cinco es..."],
        expected_answers=["10", "diez", "el 10", "el diez"],
        example_questions=["¿Cuántos dedos tienes en total?"],
    ),

    # ── CONSONANTES FASE 1 — 4 años (m, l, s, p) ────────────────────────────

    "consonante_m": CurriculumTopic(
        id="consonante_m", display_name="La letra M", emoji="🌙",
        category=CurriculumCategory.LECTOESCRITURA,
        difficulty=3,
        prerequisites=["consonante_l"],
        min_age=4,
        description_for_student="¡La M! La letra de mamá.",
        hints=[
            "¿Cómo suena cuando tienes la boca cerrada y haces 'mmm'? 🤔",
            "Es la letra de 'mamá', 'manzana' y 'mariposa' 🦋",
            "Mamá empieza con esta letra... ¿cuál es? 👩",
        ],
        expected_answers=["m", "la m", "consonante m", "letra m", "la letra m"],
        example_questions=["¿Con qué letra empieza 'mamá'?"],
    ),

    "consonante_l": CurriculumTopic(
        id="consonante_l", display_name="La letra L", emoji="🦁",
        category=CurriculumCategory.LECTOESCRITURA,
        difficulty=3,
        prerequisites=["consonante_j"],
        min_age=4,
        description_for_student="¡La L! Una letra suavecita.",
        hints=[
            "Sube la lengua al paladar y di 'lll'... 👅",
            "Es la letra de 'luna', 'leche' y 'lobo' 🌕",
            "La luna empieza con esta letra... ¿cuál es? 🌙",
        ],
        expected_answers=["l", "la l", "consonante l", "letra l", "la letra l"],
        example_questions=["¿Con qué letra empieza 'luna'?"],
    ),

    "consonante_s": CurriculumTopic(
        id="consonante_s", display_name="La letra S", emoji="🐍",
        category=CurriculumCategory.LECTOESCRITURA,
        difficulty=3,
        prerequisites=["consonante_r"],
        min_age=4,
        description_for_student="¡La S! Suena como una serpiente.",
        hints=[
            "¿Cómo suena una serpiente? Ssss... 🐍",
            "Es la letra de 'sol', 'sopa' y 'sapo' 🐸",
            "La serpiente empieza con esta letra... ¿cuál es? 🐍",
        ],
        expected_answers=["s", "la s", "consonante s", "letra s", "la letra s"],
        example_questions=["¿Con qué letra empieza 'sol'?"],
    ),

    "consonante_p": CurriculumTopic(
        id="consonante_p", display_name="La letra P", emoji="🦜",
        category=CurriculumCategory.LECTOESCRITURA,
        difficulty=3,
        prerequisites=["consonante_ñ"],
        min_age=4,
        description_for_student="¡La P! Una letra que sopla.",
        hints=[
            "Pon la mano delante y di 'ppp'... ¿sientes el aire? 💨",
            "Es la letra de 'papá', 'pelota' y 'pato' 🦆",
            "El pato empieza con esta letra... ¿cuál es? 🦆",
        ],
        expected_answers=["p", "la p", "consonante p", "letra p", "la letra p"],
        example_questions=["¿Con qué letra empieza 'papá'?"],
    ),

    # ── CONSONANTES FASE 2 — 5 años (t, n, d, f, r) ─────────────────────────

    "consonante_t": CurriculumTopic(
        id="consonante_t", display_name="La letra T", emoji="🐢",
        category=CurriculumCategory.LECTOESCRITURA,
        difficulty=3,
        prerequisites=["consonante_s"],
        min_age=4,
        description_for_student="¡La T! La lengua golpea suavito.",
        hints=[
            "Pon la punta de la lengua arriba y di 'ttt'... 👅",
            "Es la letra de 'tortuga', 'tren' y 'tigre' 🐅",
            "La tortuga empieza con esta letra... ¿cuál es? 🐢",
        ],
        expected_answers=["t", "la t", "consonante t", "letra t", "la letra t"],
        example_questions=["¿Con qué letra empieza 'tortuga'?"],
    ),

    "consonante_n": CurriculumTopic(
        id="consonante_n", display_name="La letra N", emoji="🌙",
        category=CurriculumCategory.LECTOESCRITURA,
        difficulty=3,
        prerequisites=["consonante_m"],
        min_age=4,
        description_for_student="¡La N! Suena como cuando dices 'no'.",
        hints=[
            "Pon la lengua arriba y di 'nnn'...",
            "Es la letra de 'nube', 'niño' y 'naranja' 🍊",
            "La naranja empieza con esta letra... ¿cuál es? 🍊",
        ],
        expected_answers=["n", "la n", "consonante n", "letra n", "la letra n"],
        example_questions=["¿Con qué letra empieza 'nube'?"],
    ),

    "consonante_d": CurriculumTopic(
        id="consonante_d", display_name="La letra D", emoji="🦌",
        category=CurriculumCategory.LECTOESCRITURA,
        difficulty=3,
        prerequisites=["consonante_c"],
        min_age=4,
        description_for_student="¡La D! La lengua toca los dientes.",
        hints=[
            "Pon la lengua en los dientes y di 'ddd'...",
            "Es la letra de 'dado', 'dedo' y 'dinosaurio' 🦕",
            "El dinosaurio empieza con esta letra... ¿cuál es? 🦕",
        ],
        expected_answers=["d", "la d", "consonante d", "letra d", "la letra d"],
        example_questions=["¿Con qué letra empieza 'dado'?"],
    ),

    "consonante_f": CurriculumTopic(
        id="consonante_f", display_name="La letra F", emoji="🌸",
        category=CurriculumCategory.LECTOESCRITURA,
        difficulty=3,
        prerequisites=["consonante_d"],
        min_age=4,
        description_for_student="¡La F! Los dientes tocan el labio.",
        hints=[
            "Muerde el labio de abajo suavito y di 'fff'... 💨",
            "Es la letra de 'foca', 'flor' y 'fresa' 🍓",
            "La foca empieza con esta letra... ¿cuál es? 🦭",
        ],
        expected_answers=["f", "la f", "consonante f", "letra f", "la letra f"],
        example_questions=["¿Con qué letra empieza 'foca'?"],
    ),

    "consonante_r": CurriculumTopic(
        id="consonante_r", display_name="La letra R", emoji="🐸",
        category=CurriculumCategory.LECTOESCRITURA,
        difficulty=3,
        prerequisites=["consonante_p"],
        min_age=4,
        description_for_student="¡La R! Hace vibrar la lengua.",
        hints=[
            "Haz vibrar la lengua: 'rrr'... 👅",
            "Es la letra de 'rana', 'ratón' y 'rojo' 🔴",
            "La rana empieza con esta letra... ¿cuál es? 🐸",
        ],
        expected_answers=["r", "la r", "consonante r", "letra r", "la letra r"],
        example_questions=["¿Con qué letra empieza 'rana'?"],
    ),

    # ── CONSONANTES FASE 3 — 4 años (b, c, g, j, ñ, v, y, z) ───────────────

    "consonante_b": CurriculumTopic(
        id="consonante_b", display_name="La letra B", emoji="🐋",
        category=CurriculumCategory.LECTOESCRITURA,
        difficulty=3,
        prerequisites=["vocal_a", "vocal_e", "vocal_i", "vocal_o", "vocal_u"],
        min_age=4,
        description_for_student="¡La B! Cierra los labios y suelta el aire.",
        hints=[
            "Cierra los labios y di 'bbb'... 👄",
            "Es la letra de 'boca', 'ballena' y 'burro' 🐋",
            "La ballena empieza con esta letra... ¿cuál es? 🐋",
        ],
        expected_answers=["b", "la b", "consonante b", "letra b", "la letra b"],
        example_questions=["¿Con qué letra empieza 'boca'?"],
    ),

    "consonante_c": CurriculumTopic(
        id="consonante_c", display_name="La letra C", emoji="🏠",
        category=CurriculumCategory.LECTOESCRITURA,
        difficulty=3,
        prerequisites=["consonante_b"],
        min_age=4,
        description_for_student="¡La C! Como un círculo abierto.",
        hints=[
            "La C es como un círculo al que le falta un trocito 🌙",
            "Es la letra de 'casa', 'cama' y 'coco' 🏠",
            "La casa empieza con esta letra... ¿cuál es? 🏠",
        ],
        expected_answers=["c", "la c", "consonante c", "letra c", "la letra c"],
        example_questions=["¿Con qué letra empieza 'casa'?"],
    ),

    "consonante_g": CurriculumTopic(
        id="consonante_g", display_name="La letra G", emoji="🐱",
        category=CurriculumCategory.LECTOESCRITURA,
        difficulty=3,
        prerequisites=["consonante_f"],
        min_age=4,
        description_for_student="¡La G! Viene del fondo de la garganta.",
        hints=[
            "Abre la boca y di 'ggg' desde la garganta 👄",
            "Es la letra de 'gato', 'globo' y 'gorila' 🐱",
            "El gato empieza con esta letra... ¿cuál es? 🐱",
        ],
        expected_answers=["g", "la g", "consonante g", "letra g", "la letra g"],
        example_questions=["¿Con qué letra empieza 'gato'?"],
    ),

    "consonante_j": CurriculumTopic(
        id="consonante_j", display_name="La letra J", emoji="🦒",
        category=CurriculumCategory.LECTOESCRITURA,
        difficulty=3,
        prerequisites=["consonante_g"],
        min_age=4,
        description_for_student="¡La J! Como un soplo de aire.",
        hints=[
            "Pon la lengua atrás y di 'jjj'... como soplar fuerte 💨",
            "Es la letra de 'jirafa', 'jabón' y 'juguete' 🦒",
            "La jirafa empieza con esta letra... ¿cuál es? 🦒",
        ],
        expected_answers=["j", "la j", "consonante j", "letra j", "la letra j"],
        example_questions=["¿Con qué letra empieza 'jirafa'?"],
    ),

    "consonante_ñ": CurriculumTopic(
        id="consonante_ñ", display_name="La letra Ñ", emoji="👦",
        category=CurriculumCategory.LECTOESCRITURA,
        difficulty=3,
        prerequisites=["consonante_n"],
        min_age=4,
        description_for_student="¡La Ñ! La letra española especial.",
        hints=[
            "La Ñ es como la N pero con una rayita encima: ñ 🎩",
            "Es la letra de 'niño', 'piñata' y 'muñeca' 👦",
            "Niño empieza con esta letra... ¿cuál es? 👦",
        ],
        expected_answers=["ñ", "la ñ", "consonante ñ", "letra ñ", "la letra ñ"],
        example_questions=["¿Con qué letra empieza 'niño'?"],
    ),

    "consonante_v": CurriculumTopic(
        id="consonante_v", display_name="La letra V", emoji="🐄",
        category=CurriculumCategory.LECTOESCRITURA,
        difficulty=3,
        prerequisites=["consonante_t"],
        min_age=4,
        description_for_student="¡La V! Suena igual que la B.",
        hints=[
            "Muerde el labio de abajo suavito y di 'vvv'... 😄",
            "Es la letra de 'vaca', 'ventana' y 'verde' 🐄",
            "La vaca empieza con esta letra... ¿cuál es? 🐄",
        ],
        expected_answers=["v", "la v", "consonante v", "letra v", "la letra v"],
        example_questions=["¿Con qué letra empieza 'vaca'?"],
    ),

    "consonante_y": CurriculumTopic(
        id="consonante_y", display_name="La letra Y", emoji="🪀",
        category=CurriculumCategory.LECTOESCRITURA,
        difficulty=3,
        prerequisites=["consonante_v"],
        min_age=4,
        description_for_student="¡La Y! También puede ser vocal.",
        hints=[
            "La Y suena 'yy' como en 'yema' 🥚",
            "Es la letra de 'yema', 'yogur' y 'yoyo' 🥚",
            "El yoyo empieza con esta letra... ¿cuál es? 🪀",
        ],
        expected_answers=["y", "la y", "consonante y", "letra y", "la letra y"],
        example_questions=["¿Con qué letra empieza 'yoyo'?"],
    ),

    "consonante_z": CurriculumTopic(
        id="consonante_z", display_name="La letra Z", emoji="🦓",
        category=CurriculumCategory.LECTOESCRITURA,
        difficulty=3,
        prerequisites=["consonante_y"],
        min_age=4,
        description_for_student="¡La Z! La lengua toca los dientes.",
        hints=[
            "Pon la punta de la lengua entre los dientes y di 'zzz' 😬",
            "Es la letra de 'zapato', 'zorro' y 'cebra' 🦓",
            "La cebra empieza con esta letra... ¿cuál es? 🦓",
        ],
        expected_answers=["z", "la z", "consonante z", "letra z", "la letra z"],
        example_questions=["¿Con qué letra empieza 'zapato'?"],
    ),

    # ── CONSONANTES FASE 4 — 5 años (h, k, q, w, x) ─────────────────────────

    "consonante_h": CurriculumTopic(
        id="consonante_h", display_name="La letra H", emoji="🥚",
        category=CurriculumCategory.LECTOESCRITURA,
        difficulty=3,
        prerequisites=["consonante_g"],
        min_age=5,
        description_for_student="¡La H! Esta letra es silenciosa.",
        hints=[
            "La H es especial: ¡no suena! Es una letra silenciosa 🤫",
            "Es la letra de 'huevo', 'hola' y 'helado' 🥚",
            "El helado empieza con una letra silenciosa... ¿cuál es? 🍦",
        ],
        expected_answers=["h", "la h", "consonante h", "letra h", "la letra h"],
        example_questions=["¿Con qué letra empieza 'huevo'?"],
    ),

    "consonante_k": CurriculumTopic(
        id="consonante_k", display_name="La letra K", emoji="🐨",
        category=CurriculumCategory.LECTOESCRITURA,
        difficulty=3,
        prerequisites=["consonante_j"],
        min_age=5,
        description_for_student="¡La K! Es parecida a la C.",
        hints=[
            "La K es de palabras extranjeras y hace el sonido 'k' 🌍",
            "Es la letra de 'koala', 'kilo' y 'kárate' 🐨",
            "El koala empieza con esta letra... ¿cuál es? 🐨",
        ],
        expected_answers=["k", "la k", "consonante k", "letra k", "la letra k"],
        example_questions=["¿Con qué letra empieza 'koala'?"],
    ),

    "consonante_q": CurriculumTopic(
        id="consonante_q", display_name="La letra Q", emoji="🧀",
        category=CurriculumCategory.LECTOESCRITURA,
        difficulty=3,
        prerequisites=["consonante_p"],
        min_age=5,
        description_for_student="¡La Q! Siempre va con la U.",
        hints=[
            "La Q casi siempre va con la U: 'qu'... 🧀",
            "Es la letra de 'queso', 'quiero' y 'quince' 🧀",
            "El queso empieza con esta letra... ¿cuál es? 🧀",
        ],
        expected_answers=["q", "la q", "consonante q", "letra q", "la letra q"],
        example_questions=["¿Con qué letra empieza 'queso'?"],
    ),

    "consonante_w": CurriculumTopic(
        id="consonante_w", display_name="La letra W", emoji="🚰",
        category=CurriculumCategory.LECTOESCRITURA,
        difficulty=3,
        prerequisites=["consonante_v"],
        min_age=5,
        description_for_student="¡La W! Es una letra de otros idiomas.",
        hints=[
            "La W es de palabras extranjeras, como 'wáter' 🌍",
            "Es la letra de 'wáter' y 'wifi' 🚰",
            "El wáter empieza con esta letra... ¿cuál es? 🚰",
        ],
        expected_answers=["w", "la w", "consonante w", "letra w", "la letra w"],
        example_questions=["¿Con qué letra empieza 'wáter'?"],
    ),

    "consonante_x": CurriculumTopic(
        id="consonante_x", display_name="La letra X", emoji="🎸",
        category=CurriculumCategory.LECTOESCRITURA,
        difficulty=3,
        prerequisites=["consonante_w"],
        min_age=5,
        description_for_student="¡La X! A veces suena 'ks'.",
        hints=[
            "La X puede sonar 'ks' como en 'taxi' 🚕",
            "Es la letra de 'xilófono' y 'taxi' 🎸",
            "El xilófono empieza con esta letra... ¿cuál es? 🎸",
        ],
        expected_answers=["x", "la x", "consonante x", "letra x", "la letra x"],
        example_questions=["¿Con qué letra empieza 'xilófono'?"],
    ),

    # ── SÍLABAS — 5 años ─────────────────────────────────────────────────────
    # Activity type: phonics (no canvas). BDI guides tracing M then A then asks "ma".

    "silaba_ma": CurriculumTopic(
        id="silaba_ma", display_name="La sílaba MA", emoji="🌟",
        category=CurriculumCategory.SILABAS,
        difficulty=4,
        prerequisites=["consonante_m", "vocal_a"],
        min_age=5,
        description_for_student="¡Juntamos M y A y hacen 'ma'!",
        hints=[
            "La M dice 'mmm' y la A dice 'aaa'... ¿qué dicen juntas? 🤔",
            "M... A... ¡Júntalas! 👏",
            "M + A = 'ma', como en 'mamá' 👩",
        ],
        expected_answers=["ma", "la ma", "sílaba ma"],
        example_questions=["¿Qué dicen la M y la A juntas?"],
    ),

    "silaba_mi": CurriculumTopic(
        id="silaba_mi", display_name="La sílaba MI", emoji="🌟",
        category=CurriculumCategory.SILABAS,
        difficulty=4,
        prerequisites=["consonante_m", "vocal_i"],
        min_age=5,
        description_for_student="¡M con I hacen 'mi'!",
        hints=[
            "La M dice 'mmm' y la I dice 'iii'... ¿qué hacen juntas? 🤔",
            "M... I... ¡Júntalas! 👏",
            "M + I = 'mi', como en 'miel' 🍯",
        ],
        expected_answers=["mi", "la mi", "sílaba mi"],
        example_questions=["¿Qué dicen la M y la I juntas?"],
    ),

    "silaba_sa": CurriculumTopic(
        id="silaba_sa", display_name="La sílaba SA", emoji="🌟",
        category=CurriculumCategory.SILABAS,
        difficulty=4,
        prerequisites=["consonante_s", "vocal_a"],
        min_age=5,
        description_for_student="¡S con A hacen 'sa'!",
        hints=[
            "La S dice 'sss' y la A dice 'aaa'... ¿qué hacen juntas? 🤔",
            "S... A... ¡Júntalas! 👏",
            "S + A = 'sa', como en 'sapo' 🐸",
        ],
        expected_answers=["sa", "la sa", "sílaba sa"],
        example_questions=["¿Qué dicen la S y la A juntas?"],
    ),

    "silaba_la": CurriculumTopic(
        id="silaba_la", display_name="La sílaba LA", emoji="🌟",
        category=CurriculumCategory.SILABAS,
        difficulty=4,
        prerequisites=["consonante_l", "vocal_a"],
        min_age=5,
        description_for_student="¡L con A hacen 'la'!",
        hints=[
            "La L dice 'lll' y la A dice 'aaa'... ¿qué hacen juntas? 🤔",
            "L... A... ¡Júntalas! 👏",
            "L + A = 'la', como en 'lata' 🥫",
        ],
        expected_answers=["la", "la la", "sílaba la"],
        example_questions=["¿Qué dicen la L y la A juntas?"],
    ),

    "silaba_pa": CurriculumTopic(
        id="silaba_pa", display_name="La sílaba PA", emoji="🌟",
        category=CurriculumCategory.SILABAS,
        difficulty=4,
        prerequisites=["consonante_p", "vocal_a"],
        min_age=5,
        description_for_student="¡P con A hacen 'pa'!",
        hints=[
            "La P dice 'ppp' y la A dice 'aaa'... ¿qué hacen juntas? 🤔",
            "P... A... ¡Júntalas! 👏",
            "P + A = 'pa', como en 'papá' 👨",
        ],
        expected_answers=["pa", "la pa", "sílaba pa"],
        example_questions=["¿Qué dicen la P y la A juntas?"],
    ),

    # ── PALABRAS BISÍLABAS — 5 años ───────────────────────────────────────────
    # Activity type: global word recognition (no canvas). OLIBOT shows emoji + word.

    "palabra_mama": CurriculumTopic(
        id="palabra_mama", display_name="La palabra MAMÁ", emoji="👩",
        category=CurriculumCategory.PALABRAS,
        difficulty=5,
        prerequisites=["silaba_ma"],
        min_age=5,
        description_for_student="¡Leemos la palabra 'mamá'!",
        hints=[
            "¿Quién te cuida en casa? 👩",
            "Ma... má... ¡MA-MÁ! 👩",
            "Tiene dos sílabas: MA y MÁ. ¿Qué dice? 👩",
        ],
        expected_answers=["mamá", "mama", "la mamá"],
        example_questions=["¿Qué pone aquí? 👩 m-a-m-á"],
    ),

    "palabra_mesa": CurriculumTopic(
        id="palabra_mesa", display_name="La palabra MESA", emoji="🪑",
        category=CurriculumCategory.PALABRAS,
        difficulty=5,
        prerequisites=["silaba_ma", "silaba_sa"],
        min_age=5,
        description_for_student="¡Leemos la palabra 'mesa'!",
        hints=[
            "¿Dónde comes? 🍽️",
            "Me... sa... ¡ME-SA! 🪑",
            "Tiene dos sílabas: ME y SA. ¿Qué dice? 🪑",
        ],
        expected_answers=["mesa", "la mesa"],
        example_questions=["¿Qué pone aquí? 🪑 m-e-s-a"],
    ),

    "palabra_pato": CurriculumTopic(
        id="palabra_pato", display_name="La palabra PATO", emoji="🦆",
        category=CurriculumCategory.PALABRAS,
        difficulty=5,
        prerequisites=["silaba_pa"],
        min_age=5,
        description_for_student="¡Leemos la palabra 'pato'!",
        hints=[
            "¿Qué animal va 'cuac cuac'? 🦆",
            "Pa... to... ¡PA-TO! 🦆",
            "Tiene dos sílabas: PA y TO. ¿Qué dice? 🦆",
        ],
        expected_answers=["pato", "el pato"],
        example_questions=["¿Qué pone aquí? 🦆 p-a-t-o"],
    ),

    "palabra_luna": CurriculumTopic(
        id="palabra_luna", display_name="La palabra LUNA", emoji="🌙",
        category=CurriculumCategory.PALABRAS,
        difficulty=5,
        prerequisites=["silaba_la"],
        min_age=5,
        description_for_student="¡Leemos la palabra 'luna'!",
        hints=[
            "¿Qué ves en el cielo de noche? 🌙",
            "Lu... na... ¡LU-NA! 🌙",
            "Tiene dos sílabas: LU y NA. ¿Qué dice? 🌙",
        ],
        expected_answers=["luna", "la luna"],
        example_questions=["¿Qué pone aquí? 🌙 l-u-n-a"],
    ),

    # ── CONSONANTES MINÚSCULAS — fase 1 (edad 4) ─────────────────────────────
    # Activity type: tracing. Misma fonética que la mayúscula, escritura minúscula.

    "consonante_m_min": CurriculumTopic(
        id="consonante_m_min", display_name="La m minúscula", emoji="🍄",
        category=CurriculumCategory.LECTOESCRITURA,
        difficulty=3,
        prerequisites=["consonante_m"],
        min_age=4,
        description_for_student="¡Vamos a escribir la m pequeñita!",
        hints=[
            "La m pequeña tiene tres palos. ¡Como tres patas! 🍄",
            "Mmm... como en 'mamá' pero chiquitita 👩",
            "¿Puedes trazar la m minúscula? 🖊️",
        ],
        expected_answers=["m", "la m", "m minúscula", "m pequeña"],
        example_questions=["¿Cómo se escribe la m minúscula?"],
    ),

    "consonante_l_min": CurriculumTopic(
        id="consonante_l_min", display_name="La l minúscula", emoji="🦁",
        category=CurriculumCategory.LECTOESCRITURA,
        difficulty=3,
        prerequisites=["consonante_l"],
        min_age=4,
        description_for_student="¡Vamos a escribir la l pequeñita!",
        hints=[
            "La l es un palo recto que baja. ¡Muy fácil! 🦁",
            "Llll... como en 'luna' pero chiquitita 🌙",
            "¿Puedes trazar la l minúscula? 🖊️",
        ],
        expected_answers=["l", "la l", "l minúscula", "l pequeña"],
        example_questions=["¿Cómo se escribe la l minúscula?"],
    ),

    "consonante_s_min": CurriculumTopic(
        id="consonante_s_min", display_name="La s minúscula", emoji="🐍",
        category=CurriculumCategory.LECTOESCRITURA,
        difficulty=3,
        prerequisites=["consonante_s"],
        min_age=4,
        description_for_student="¡Vamos a escribir la s pequeñita!",
        hints=[
            "La s pequeña se retuerce como una serpiente 🐍",
            "Ssss... como en 'sol' pero chiquitita ☀️",
            "¿Puedes trazar la s minúscula? 🖊️",
        ],
        expected_answers=["s", "la s", "s minúscula", "s pequeña"],
        example_questions=["¿Cómo se escribe la s minúscula?"],
    ),

    "consonante_p_min": CurriculumTopic(
        id="consonante_p_min", display_name="La p minúscula", emoji="🐟",
        category=CurriculumCategory.LECTOESCRITURA,
        difficulty=3,
        prerequisites=["consonante_p"],
        min_age=4,
        description_for_student="¡Vamos a escribir la p pequeñita!",
        hints=[
            "La p tiene un palo que baja y una barriguita a la derecha 🐟",
            "Ppp... como en 'papá' pero chiquitita 👨",
            "¿Puedes trazar la p minúscula? 🖊️",
        ],
        expected_answers=["p", "la p", "p minúscula", "p pequeña"],
        example_questions=["¿Cómo se escribe la p minúscula?"],
    ),

    "consonante_t_min": CurriculumTopic(
        id="consonante_t_min", display_name="La t minúscula", emoji="🌷",
        category=CurriculumCategory.LECTOESCRITURA,
        difficulty=3,
        prerequisites=["consonante_t"],
        min_age=4,
        description_for_student="¡Vamos a escribir la t pequeñita!",
        hints=[
            "La t tiene un palo con una rayita cruzada 🌷",
            "Ttt... como en 'tomate' pero chiquitita 🍅",
            "¿Puedes trazar la t minúscula? 🖊️",
        ],
        expected_answers=["t", "la t", "t minúscula", "t pequeña"],
        example_questions=["¿Cómo se escribe la t minúscula?"],
    ),

    # ── CONSONANTES MINÚSCULAS — fase 2 (edad 4) ─────────────────────────────

    "consonante_n_min": CurriculumTopic(
        id="consonante_n_min", display_name="La n minúscula", emoji="🦋",
        category=CurriculumCategory.LECTOESCRITURA,
        difficulty=3,
        prerequisites=["consonante_n", "consonante_m_min"],
        min_age=4,
        description_for_student="¡Vamos a escribir la n pequeñita!",
        hints=[
            "La n tiene un palo y un arco a la derecha 🦋",
            "Nnn... como en 'nido' pero chiquitita 🐣",
            "¿Puedes trazar la n minúscula? 🖊️",
        ],
        expected_answers=["n", "la n", "n minúscula", "n pequeña"],
        example_questions=["¿Cómo se escribe la n minúscula?"],
    ),

    "consonante_d_min": CurriculumTopic(
        id="consonante_d_min", display_name="La d minúscula", emoji="🦌",
        category=CurriculumCategory.LECTOESCRITURA,
        difficulty=3,
        prerequisites=["consonante_d", "vocal_a_min"],
        min_age=4,
        description_for_student="¡Vamos a escribir la d pequeñita!",
        hints=[
            "La d tiene un palo alto y un círculo a la izquierda 🦌",
            "Ddd... como en 'dedo' pero chiquitita 👆",
            "¿Puedes trazar la d minúscula? 🖊️",
        ],
        expected_answers=["d", "la d", "d minúscula", "d pequeña"],
        example_questions=["¿Cómo se escribe la d minúscula?"],
    ),

    "consonante_f_min": CurriculumTopic(
        id="consonante_f_min", display_name="La f minúscula", emoji="🌸",
        category=CurriculumCategory.LECTOESCRITURA,
        difficulty=3,
        prerequisites=["consonante_f"],
        min_age=4,
        description_for_student="¡Vamos a escribir la f pequeñita!",
        hints=[
            "La f tiene una curva arriba y una rayita cruzada 🌸",
            "Fff... como en 'foca' pero chiquitita 🦭",
            "¿Puedes trazar la f minúscula? 🖊️",
        ],
        expected_answers=["f", "la f", "f minúscula", "f pequeña"],
        example_questions=["¿Cómo se escribe la f minúscula?"],
    ),

    "consonante_r_min": CurriculumTopic(
        id="consonante_r_min", display_name="La r minúscula", emoji="🐸",
        category=CurriculumCategory.LECTOESCRITURA,
        difficulty=3,
        prerequisites=["consonante_r"],
        min_age=4,
        description_for_student="¡Vamos a escribir la r pequeñita!",
        hints=[
            "La r tiene un palo y una curvita arriba 🐸",
            "Rrr... como en 'rana' pero chiquitita 🐸",
            "¿Puedes trazar la r minúscula? 🖊️",
        ],
        expected_answers=["r", "la r", "r minúscula", "r pequeña"],
        example_questions=["¿Cómo se escribe la r minúscula?"],
    ),

    # ── CONSONANTES MINÚSCULAS — fase 3 (edad 4) ─────────────────────────────

    "consonante_b_min": CurriculumTopic(
        id="consonante_b_min", display_name="La b minúscula", emoji="🐋",
        category=CurriculumCategory.LECTOESCRITURA,
        difficulty=3,
        prerequisites=["consonante_b"],
        min_age=4,
        description_for_student="¡Vamos a escribir la b pequeñita!",
        hints=[
            "La b tiene un palo alto y una barriguita a la derecha 🐋",
            "Bbb... como en 'boca' pero chiquitita 👄",
            "¿Puedes trazar la b minúscula? 🖊️",
        ],
        expected_answers=["b", "la b", "b minúscula", "b pequeña"],
        example_questions=["¿Cómo se escribe la b minúscula?"],
    ),

    "consonante_c_min": CurriculumTopic(
        id="consonante_c_min", display_name="La c minúscula", emoji="🏠",
        category=CurriculumCategory.LECTOESCRITURA,
        difficulty=3,
        prerequisites=["consonante_c"],
        min_age=4,
        description_for_student="¡Vamos a escribir la c pequeñita!",
        hints=[
            "La c pequeña es un arco abierto a la derecha 🏠",
            "Ccc... como en 'casa' pero chiquitita 🏠",
            "¿Puedes trazar la c minúscula? 🖊️",
        ],
        expected_answers=["c", "la c", "c minúscula", "c pequeña"],
        example_questions=["¿Cómo se escribe la c minúscula?"],
    ),

    "consonante_g_min": CurriculumTopic(
        id="consonante_g_min", display_name="La g minúscula", emoji="🐱",
        category=CurriculumCategory.LECTOESCRITURA,
        difficulty=3,
        prerequisites=["consonante_g"],
        min_age=4,
        description_for_student="¡Vamos a escribir la g pequeñita!",
        hints=[
            "La g tiene un círculo y una colita que baja 🐱",
            "Ggg... como en 'gato' pero chiquitita 🐱",
            "¿Puedes trazar la g minúscula? 🖊️",
        ],
        expected_answers=["g", "la g", "g minúscula", "g pequeña"],
        example_questions=["¿Cómo se escribe la g minúscula?"],
    ),

    "consonante_j_min": CurriculumTopic(
        id="consonante_j_min", display_name="La j minúscula", emoji="🦒",
        category=CurriculumCategory.LECTOESCRITURA,
        difficulty=3,
        prerequisites=["consonante_j"],
        min_age=4,
        description_for_student="¡Vamos a escribir la j pequeñita!",
        hints=[
            "La j tiene un palo con un punto arriba y una curvita abajo 🦒",
            "Jjj... como en 'jirafa' pero chiquitita 🦒",
            "¿Puedes trazar la j minúscula? 🖊️",
        ],
        expected_answers=["j", "la j", "j minúscula", "j pequeña"],
        example_questions=["¿Cómo se escribe la j minúscula?"],
    ),

    "consonante_ñ_min": CurriculumTopic(
        id="consonante_ñ_min", display_name="La ñ minúscula", emoji="👦",
        category=CurriculumCategory.LECTOESCRITURA,
        difficulty=3,
        prerequisites=["consonante_ñ", "consonante_n_min"],
        min_age=4,
        description_for_student="¡Vamos a escribir la ñ pequeñita!",
        hints=[
            "La ñ es como la n pero con una rayita encima 👦",
            "Ññ... como en 'niño' pero chiquitita 👦",
            "¿Puedes trazar la ñ minúscula? 🖊️",
        ],
        expected_answers=["ñ", "la ñ", "ñ minúscula", "ñ pequeña"],
        example_questions=["¿Cómo se escribe la ñ minúscula?"],
    ),

    "consonante_v_min": CurriculumTopic(
        id="consonante_v_min", display_name="La v minúscula", emoji="🐄",
        category=CurriculumCategory.LECTOESCRITURA,
        difficulty=3,
        prerequisites=["consonante_v"],
        min_age=4,
        description_for_student="¡Vamos a escribir la v pequeñita!",
        hints=[
            "La v tiene dos palitos que se juntan abajo en punta 🐄",
            "Vvv... como en 'vaca' pero chiquitita 🐄",
            "¿Puedes trazar la v minúscula? 🖊️",
        ],
        expected_answers=["v", "la v", "v minúscula", "v pequeña"],
        example_questions=["¿Cómo se escribe la v minúscula?"],
    ),

    "consonante_y_min": CurriculumTopic(
        id="consonante_y_min", display_name="La y minúscula", emoji="🪀",
        category=CurriculumCategory.LECTOESCRITURA,
        difficulty=3,
        prerequisites=["consonante_y"],
        min_age=4,
        description_for_student="¡Vamos a escribir la y pequeñita!",
        hints=[
            "La y tiene dos palitos que se unen y luego bajan 🪀",
            "Yyy... como en 'yoyo' pero chiquitita 🪀",
            "¿Puedes trazar la y minúscula? 🖊️",
        ],
        expected_answers=["y", "la y", "y minúscula", "y pequeña"],
        example_questions=["¿Cómo se escribe la y minúscula?"],
    ),

    "consonante_z_min": CurriculumTopic(
        id="consonante_z_min", display_name="La z minúscula", emoji="🦓",
        category=CurriculumCategory.LECTOESCRITURA,
        difficulty=3,
        prerequisites=["consonante_z"],
        min_age=4,
        description_for_student="¡Vamos a escribir la z pequeñita!",
        hints=[
            "La z tiene tres líneas: una arriba, una diagonal y una abajo 🦓",
            "Zzz... como en 'zapato' pero chiquitita 👟",
            "¿Puedes trazar la z minúscula? 🖊️",
        ],
        expected_answers=["z", "la z", "z minúscula", "z pequeña"],
        example_questions=["¿Cómo se escribe la z minúscula?"],
    ),

    # ── CONSONANTES MINÚSCULAS — fase 4 (edad 5) ─────────────────────────────

    "consonante_h_min": CurriculumTopic(
        id="consonante_h_min", display_name="La h minúscula", emoji="🥚",
        category=CurriculumCategory.LECTOESCRITURA,
        difficulty=3,
        prerequisites=["consonante_h"],
        min_age=5,
        description_for_student="¡Vamos a escribir la h pequeñita!",
        hints=[
            "La h tiene un palo alto y un arco a la derecha 🥚",
            "La h es silenciosa... pero hay que escribirla bien 🤫",
            "¿Puedes trazar la h minúscula? 🖊️",
        ],
        expected_answers=["h", "la h", "h minúscula", "h pequeña"],
        example_questions=["¿Cómo se escribe la h minúscula?"],
    ),

    "consonante_k_min": CurriculumTopic(
        id="consonante_k_min", display_name="La k minúscula", emoji="🐨",
        category=CurriculumCategory.LECTOESCRITURA,
        difficulty=3,
        prerequisites=["consonante_k"],
        min_age=5,
        description_for_student="¡Vamos a escribir la k pequeñita!",
        hints=[
            "La k tiene un palo y dos patitas que salen 🐨",
            "Kkk... como en 'koala' pero chiquitita 🐨",
            "¿Puedes trazar la k minúscula? 🖊️",
        ],
        expected_answers=["k", "la k", "k minúscula", "k pequeña"],
        example_questions=["¿Cómo se escribe la k minúscula?"],
    ),

    "consonante_q_min": CurriculumTopic(
        id="consonante_q_min", display_name="La q minúscula", emoji="🧀",
        category=CurriculumCategory.LECTOESCRITURA,
        difficulty=3,
        prerequisites=["consonante_q"],
        min_age=5,
        description_for_student="¡Vamos a escribir la q pequeñita!",
        hints=[
            "La q tiene un círculo y un palo que baja a la derecha 🧀",
            "La q va con la u para hacer 'qu'... 🧀",
            "¿Puedes trazar la q minúscula? 🖊️",
        ],
        expected_answers=["q", "la q", "q minúscula", "q pequeña"],
        example_questions=["¿Cómo se escribe la q minúscula?"],
    ),

    "consonante_w_min": CurriculumTopic(
        id="consonante_w_min", display_name="La w minúscula", emoji="🚰",
        category=CurriculumCategory.LECTOESCRITURA,
        difficulty=3,
        prerequisites=["consonante_w"],
        min_age=5,
        description_for_student="¡Vamos a escribir la w pequeñita!",
        hints=[
            "La w tiene cuatro puntitas hacia abajo 🚰",
            "Www... como en 'wáter' pero chiquitita 🚰",
            "¿Puedes trazar la w minúscula? 🖊️",
        ],
        expected_answers=["w", "la w", "w minúscula", "w pequeña"],
        example_questions=["¿Cómo se escribe la w minúscula?"],
    ),

    "consonante_x_min": CurriculumTopic(
        id="consonante_x_min", display_name="La x minúscula", emoji="🎸",
        category=CurriculumCategory.LECTOESCRITURA,
        difficulty=3,
        prerequisites=["consonante_x"],
        min_age=5,
        description_for_student="¡Vamos a escribir la x pequeñita!",
        hints=[
            "La x son dos líneas cruzadas 🎸",
            "Xxx... como en 'taxi' pero chiquitita 🚕",
            "¿Puedes trazar la x minúscula? 🖊️",
        ],
        expected_answers=["x", "la x", "x minúscula", "x pequeña"],
        example_questions=["¿Cómo se escribe la x minúscula?"],
    ),

    # ── SÍLABAS MINÚSCULAS — 5 años ───────────────────────────────────────────

    "silaba_ma_min": CurriculumTopic(
        id="silaba_ma_min", display_name="La sílaba ma (minúscula)", emoji="🌟",
        category=CurriculumCategory.SILABAS,
        difficulty=4,
        prerequisites=["silaba_ma", "consonante_m_min", "vocal_a_min"],
        min_age=4,
        description_for_student="¡Juntamos m y a y hacen 'ma'!",
        hints=[
            "La m dice 'mmm' y la a dice 'aaa'... ¿qué dicen juntas? 🤔",
            "m... a... ¡ma! 👏",
            "m + a = 'ma', como en 'mamá' 👩",
        ],
        expected_answers=["ma", "la ma", "sílaba ma"],
        example_questions=["¿Qué dicen la m y la a juntas?"],
    ),

    "silaba_pa_min": CurriculumTopic(
        id="silaba_pa_min", display_name="La sílaba pa (minúscula)", emoji="🌟",
        category=CurriculumCategory.SILABAS,
        difficulty=4,
        prerequisites=["silaba_pa", "consonante_p_min", "vocal_a_min"],
        min_age=4,
        description_for_student="¡Juntamos p y a y hacen 'pa'!",
        hints=[
            "La p dice 'ppp' y la a dice 'aaa'... ¿qué hacen juntas? 🤔",
            "p... a... ¡pa! 👏",
            "p + a = 'pa', como en 'papá' 👨",
        ],
        expected_answers=["pa", "la pa", "sílaba pa"],
        example_questions=["¿Qué dicen la p y la a juntas?"],
    ),

    "silaba_sa_min": CurriculumTopic(
        id="silaba_sa_min", display_name="La sílaba sa (minúscula)", emoji="🌟",
        category=CurriculumCategory.SILABAS,
        difficulty=4,
        prerequisites=["silaba_sa", "consonante_s_min", "vocal_a_min"],
        min_age=5,
        description_for_student="¡Juntamos s y a y hacen 'sa'!",
        hints=[
            "La s dice 'sss' y la a dice 'aaa'... ¿qué hacen juntas? 🤔",
            "s... a... ¡sa! 👏",
            "s + a = 'sa', como en 'sala' 🏠",
        ],
        expected_answers=["sa", "la sa", "sílaba sa"],
        example_questions=["¿Qué dicen la s y la a juntas?"],
    ),

    "silaba_la_min": CurriculumTopic(
        id="silaba_la_min", display_name="La sílaba la (minúscula)", emoji="🌟",
        category=CurriculumCategory.SILABAS,
        difficulty=4,
        prerequisites=["silaba_la", "consonante_l_min", "vocal_a_min"],
        min_age=5,
        description_for_student="¡Juntamos l y a y hacen 'la'!",
        hints=[
            "La l dice 'lll' y la a dice 'aaa'... ¿qué hacen juntas? 🤔",
            "l... a... ¡la! 👏",
            "l + a = 'la', como en 'luna' 🌙",
        ],
        expected_answers=["la", "la sílaba la", "sílaba la"],
        example_questions=["¿Qué dicen la l y la a juntas?"],
    ),

    # ── PALABRAS — trazado letra a letra (edad 5) ─────────────────────────────

    "palabra_mama_traz": CurriculumTopic(
        id="palabra_mama_traz", display_name="Trazar 'mamá'", emoji="👩",
        category=CurriculumCategory.PALABRAS,
        difficulty=5,
        prerequisites=["silaba_ma_min"],
        min_age=5,
        description_for_student="¡Vamos a trazar la palabra 'mamá' letra a letra!",
        hints=[
            "m - a - m - a... ¿puedes trazarlas todas? 👩",
            "Cuatro letras: m, a, m, a 🖊️",
            "¡Escribe 'mamá' con el dedo! 👩",
        ],
        expected_answers=["mamá", "mama"],
        example_questions=["¿Puedes trazar 'mamá'?"],
    ),

    "palabra_papa_traz": CurriculumTopic(
        id="palabra_papa_traz", display_name="Trazar 'papá'", emoji="👨",
        category=CurriculumCategory.PALABRAS,
        difficulty=5,
        prerequisites=["silaba_pa_min"],
        min_age=5,
        description_for_student="¡Vamos a trazar la palabra 'papá' letra a letra!",
        hints=[
            "p - a - p - a... ¿puedes trazarlas todas? 👨",
            "Cuatro letras: p, a, p, a 🖊️",
            "¡Escribe 'papá' con el dedo! 👨",
        ],
        expected_answers=["papá", "papa"],
        example_questions=["¿Puedes trazar 'papá'?"],
    ),

    "palabra_casa_traz": CurriculumTopic(
        id="palabra_casa_traz", display_name="Trazar 'casa'", emoji="🏠",
        category=CurriculumCategory.PALABRAS,
        difficulty=5,
        prerequisites=["consonante_s_min", "vocal_a_min"],
        min_age=5,
        description_for_student="¡Vamos a trazar la palabra 'casa' letra a letra!",
        hints=[
            "c - a - s - a... ¿puedes trazarlas todas? 🏠",
            "Cuatro letras: c, a, s, a 🖊️",
            "¡Escribe 'casa' con el dedo! 🏠",
        ],
        expected_answers=["casa", "la casa"],
        example_questions=["¿Puedes trazar 'casa'?"],
    ),

    # ══════════════════════════════════════════════════════════════════════════
    # NIVEL 6 AÑOS — Sílabas complejas, palabras avanzadas y frases simples
    # Prerequisito: dominio de todas las palabras bisílabas del nivel 5
    # ══════════════════════════════════════════════════════════════════════════

    # ── SÍLABAS INVERSAS — 6 años ─────────────────────────────────────────────
    # Vocal seguida de consonante (estructura VC). OLIBOT guía con tracing.

    "silaba_inv_as": CurriculumTopic(
        id="silaba_inv_as", display_name="La sílaba AS", emoji="🌟",
        category=CurriculumCategory.SILABAS_COMPLEJAS,
        difficulty=6, min_age=6,
        prerequisites=["palabra_mama", "palabra_mesa", "palabra_pato", "palabra_luna"],
        description_for_student="¡La A y la S juntas hacen 'as'!",
        hints=["A... S... 'as', como en 'asco' o 'as de oros' 🃏", "A + S = 'as' 👏", "'as' como cuando dices 'por las mañanas' 🌅"],
        expected_answers=["as", "la as", "sílaba as"],
        example_questions=["¿Qué dicen la A y la S juntas al revés?"],
    ),

    "silaba_inv_es": CurriculumTopic(
        id="silaba_inv_es", display_name="La sílaba ES", emoji="⭐",
        category=CurriculumCategory.SILABAS_COMPLEJAS,
        difficulty=6, min_age=6,
        prerequisites=["silaba_inv_as"],
        description_for_student="¡E con S hacen 'es'!",
        hints=["E... S... 'es', como en 'España' 🇪🇸", "E + S = 'es' 👏", "'es' como cuando preguntas '¿qué es?' 🤔"],
        expected_answers=["es", "la es", "sílaba es"],
        example_questions=["¿Qué dicen la E y la S juntas?"],
    ),

    "silaba_inv_al": CurriculumTopic(
        id="silaba_inv_al", display_name="La sílaba AL", emoji="🦅",
        category=CurriculumCategory.SILABAS_COMPLEJAS,
        difficulty=6, min_age=6,
        prerequisites=["silaba_inv_as"],
        description_for_student="¡A con L hacen 'al'!",
        hints=["A... L... 'al', como en 'al final' 🏁", "A + L = 'al' 👏", "'al' como en 'animal' 🦁"],
        expected_answers=["al", "la al", "sílaba al"],
        example_questions=["¿Qué dicen la A y la L juntas?"],
    ),

    "silaba_inv_ar": CurriculumTopic(
        id="silaba_inv_ar", display_name="La sílaba AR", emoji="🌳",
        category=CurriculumCategory.SILABAS_COMPLEJAS,
        difficulty=6, min_age=6,
        prerequisites=["silaba_inv_al"],
        description_for_student="¡A con R hacen 'ar'!",
        hints=["A... R... 'ar', como en 'árbol' 🌳", "A + R = 'ar' 👏", "'ar' como en 'árbol' o 'arco' 🌈"],
        expected_answers=["ar", "la ar", "sílaba ar"],
        example_questions=["¿Qué dicen la A y la R juntas?"],
    ),

    "silaba_inv_an": CurriculumTopic(
        id="silaba_inv_an", display_name="La sílaba AN", emoji="🦢",
        category=CurriculumCategory.SILABAS_COMPLEJAS,
        difficulty=6, min_age=6,
        prerequisites=["silaba_inv_ar"],
        description_for_student="¡A con N hacen 'an'!",
        hints=["A... N... 'an', como en 'antes' ⏳", "A + N = 'an' 👏", "'an' como en 'ancla' ⚓"],
        expected_answers=["an", "la an", "sílaba an"],
        example_questions=["¿Qué dicen la A y la N juntas?"],
    ),

    # ── SÍLABAS COMPLEJAS (CCV) — 6 años ─────────────────────────────────────
    # Dos consonantes + vocal. OLIBOT usa tracing de la sílaba como bloque.

    "silaba_bra": CurriculumTopic(
        id="silaba_bra", display_name="La sílaba BRA", emoji="💪",
        category=CurriculumCategory.SILABAS_COMPLEJAS,
        difficulty=6, min_age=6,
        prerequisites=["silaba_inv_as"],
        description_for_student="¡B, R y A juntas hacen 'bra'!",
        hints=["B + R + A = 'bra' 💪", "'bra' como en 'brazo' 💪", "B, R, A... ¡BRA! ¿Lo puedes decir deprisa?"],
        expected_answers=["bra", "la bra", "sílaba bra"],
        example_questions=["¿Qué dicen B, R y A juntas?"],
    ),

    "silaba_tra": CurriculumTopic(
        id="silaba_tra", display_name="La sílaba TRA", emoji="🚂",
        category=CurriculumCategory.SILABAS_COMPLEJAS,
        difficulty=6, min_age=6,
        prerequisites=["silaba_inv_as"],
        description_for_student="¡T, R y A juntas hacen 'tra'!",
        hints=["T + R + A = 'tra' 🚂", "'tra' como en 'tren' 🚂", "T, R, A... ¡TRA! Como el tren que va traca-traca 🚂"],
        expected_answers=["tra", "la tra", "sílaba tra"],
        example_questions=["¿Qué dicen T, R y A juntas?"],
    ),

    "silaba_pla": CurriculumTopic(
        id="silaba_pla", display_name="La sílaba PLA", emoji="🏖️",
        category=CurriculumCategory.SILABAS_COMPLEJAS,
        difficulty=6, min_age=6,
        prerequisites=["silaba_inv_as"],
        description_for_student="¡P, L y A juntas hacen 'pla'!",
        hints=["P + L + A = 'pla' 🏖️", "'pla' como en 'playa' 🏖️", "P, L, A... ¡PLA! ¿Puedes decirlo rápido?"],
        expected_answers=["pla", "la pla", "sílaba pla"],
        example_questions=["¿Qué dicen P, L y A juntas?"],
    ),

    "silaba_cla": CurriculumTopic(
        id="silaba_cla", display_name="La sílaba CLA", emoji="🔑",
        category=CurriculumCategory.SILABAS_COMPLEJAS,
        difficulty=6, min_age=6,
        prerequisites=["silaba_bra"],
        description_for_student="¡C, L y A juntas hacen 'cla'!",
        hints=["C + L + A = 'cla' 🔑", "'cla' como en 'claro' o 'clase' 🏫", "C, L, A... ¡CLA! Como 'clase' en el colegio 🏫"],
        expected_answers=["cla", "la cla", "sílaba cla"],
        example_questions=["¿Qué dicen C, L y A juntas?"],
    ),

    # ── PALABRAS TRISÍLABAS — 6 años ─────────────────────────────────────────
    # Reconocimiento auditivo/visual (sin trazado letra a letra).

    "palabra_pelota": CurriculumTopic(
        id="palabra_pelota", display_name="La palabra PELOTA", emoji="⚽",
        category=CurriculumCategory.PALABRAS_AVANZADAS,
        difficulty=7, min_age=6,
        prerequisites=["silaba_bra", "silaba_tra"],
        description_for_student="¡Leemos la palabra 'pelota'!",
        hints=["¿Con qué juegas en el parque? ⚽", "pe-lo-ta... ¡PE-LO-TA! ⚽", "Tiene tres sílabas: PE, LO, TA. ¿Qué dice? ⚽"],
        expected_answers=["pelota", "la pelota"],
        example_questions=["¿Qué pone aquí? ⚽ p-e-l-o-t-a"],
    ),

    "palabra_tomate": CurriculumTopic(
        id="palabra_tomate", display_name="La palabra TOMATE", emoji="🍅",
        category=CurriculumCategory.PALABRAS_AVANZADAS,
        difficulty=7, min_age=6,
        prerequisites=["silaba_bra", "silaba_tra"],
        description_for_student="¡Leemos la palabra 'tomate'!",
        hints=["¿Qué fruta roja va en la ensalada? 🍅", "to-ma-te... ¡TO-MA-TE! 🍅", "Tiene tres sílabas: TO, MA, TE. ¿Qué dice? 🍅"],
        expected_answers=["tomate", "el tomate"],
        example_questions=["¿Qué pone aquí? 🍅 t-o-m-a-t-e"],
    ),

    "palabra_camion": CurriculumTopic(
        id="palabra_camion", display_name="La palabra CAMIÓN", emoji="🚛",
        category=CurriculumCategory.PALABRAS_AVANZADAS,
        difficulty=7, min_age=6,
        prerequisites=["silaba_bra", "silaba_tra"],
        description_for_student="¡Leemos la palabra 'camión'!",
        hints=["¿Qué vehículo grande lleva cosas? 🚛", "ca-mión... ¡CA-MIÓN! 🚛", "Tiene dos sílabas: CA, MIÓN. ¿Qué dice? 🚛"],
        expected_answers=["camión", "el camión", "camion"],
        example_questions=["¿Qué pone aquí? 🚛 c-a-m-i-ó-n"],
    ),

    "palabra_animal": CurriculumTopic(
        id="palabra_animal", display_name="La palabra ANIMAL", emoji="🦁",
        category=CurriculumCategory.PALABRAS_AVANZADAS,
        difficulty=7, min_age=6,
        prerequisites=["silaba_inv_al", "silaba_inv_an"],
        description_for_student="¡Leemos la palabra 'animal'!",
        hints=["¿Qué son el perro, el gato y el león? 🦁", "a-ni-mal... ¡A-NI-MAL! 🦁", "Tiene tres sílabas: A, NI, MAL. ¿Qué dice? 🦁"],
        expected_answers=["animal", "el animal"],
        example_questions=["¿Qué pone aquí? 🦁 a-n-i-m-a-l"],
    ),

    "palabra_arbol": CurriculumTopic(
        id="palabra_arbol", display_name="La palabra ÁRBOL", emoji="🌳",
        category=CurriculumCategory.PALABRAS_AVANZADAS,
        difficulty=7, min_age=6,
        prerequisites=["silaba_inv_ar"],
        description_for_student="¡Leemos la palabra 'árbol'!",
        hints=["¿Qué planta grande tiene tronco y ramas? 🌳", "ár-bol... ¡ÁR-BOL! 🌳", "Tiene dos sílabas: ÁR, BOL. ¿Qué dice? 🌳"],
        expected_answers=["árbol", "el árbol", "arbol"],
        example_questions=["¿Qué pone aquí? 🌳 á-r-b-o-l"],
    ),

    "palabra_isla": CurriculumTopic(
        id="palabra_isla", display_name="La palabra ISLA", emoji="🏝️",
        category=CurriculumCategory.PALABRAS_AVANZADAS,
        difficulty=7, min_age=6,
        prerequisites=["silaba_inv_es"],
        description_for_student="¡Leemos la palabra 'isla'!",
        hints=["¿Qué tierra está rodeada de agua? 🏝️", "is-la... ¡IS-LA! 🏝️", "Tiene dos sílabas: IS, LA. ¿Qué dice? 🏝️"],
        expected_answers=["isla", "la isla"],
        example_questions=["¿Qué pone aquí? 🏝️ i-s-l-a"],
    ),

    "palabra_espada": CurriculumTopic(
        id="palabra_espada", display_name="La palabra ESPADA", emoji="⚔️",
        category=CurriculumCategory.PALABRAS_AVANZADAS,
        difficulty=7, min_age=6,
        prerequisites=["silaba_inv_es", "silaba_inv_as"],
        description_for_student="¡Leemos la palabra 'espada'!",
        hints=["¿Qué arma larga usan los caballeros? ⚔️", "es-pa-da... ¡ES-PA-DA! ⚔️", "Tiene tres sílabas: ES, PA, DA. ¿Qué dice? ⚔️"],
        expected_answers=["espada", "la espada"],
        example_questions=["¿Qué pone aquí? ⚔️ e-s-p-a-d-a"],
    ),

    # ── FRASES SIMPLES — 6 años ────────────────────────────────────────────────
    # Reconocimiento y lectura de frases cortas de 2-3 palabras.

    "frase_el_sol_sale": CurriculumTopic(
        id="frase_el_sol_sale", display_name="Frase: El sol sale", emoji="☀️",
        category=CurriculumCategory.FRASES,
        difficulty=8, min_age=6,
        prerequisites=["palabra_pelota", "palabra_tomate"],
        description_for_student="¡Leemos una frase entera!",
        hints=["Tres palabras: EL · SOL · SALE ☀️", "El sol... sale... ¿qué dice la frase? ☀️", "¿Qué hace el sol por la mañana? ☀️"],
        expected_answers=["el sol sale", "sale el sol"],
        example_questions=["¿Qué dice esta frase? ☀️ 'El sol sale'"],
    ),

    "frase_mi_mama_me_mima": CurriculumTopic(
        id="frase_mi_mama_me_mima", display_name="Frase: Mi mamá me mima", emoji="👩‍👦",
        category=CurriculumCategory.FRASES,
        difficulty=8, min_age=6,
        prerequisites=["palabra_pelota", "palabra_tomate"],
        description_for_student="¡Leemos una frase corta!",
        hints=["Cuatro palabras: MI · MAMÁ · ME · MIMA 👩‍👦", "Mi mamá... me mima... ¿qué dice? 👩‍👦", "¿Qué hace tu mamá cuando te cuida mucho? 👩‍👦"],
        expected_answers=["mi mamá me mima", "mamá me mima"],
        example_questions=["¿Qué dice esta frase? 👩‍👦 'Mi mamá me mima'"],
    ),

    "frase_la_luna_sale": CurriculumTopic(
        id="frase_la_luna_sale", display_name="Frase: La luna sale", emoji="🌙",
        category=CurriculumCategory.FRASES,
        difficulty=8, min_age=6,
        prerequisites=["frase_el_sol_sale"],
        description_for_student="¡Otra frase! Esta es de noche.",
        hints=["Tres palabras: LA · LUNA · SALE 🌙", "La luna... sale... ¿qué dice la frase? 🌙", "¿Qué ves en el cielo de noche? 🌙"],
        expected_answers=["la luna sale", "sale la luna"],
        example_questions=["¿Qué dice esta frase? 🌙 'La luna sale'"],
    ),

    "frase_el_pato_nada": CurriculumTopic(
        id="frase_el_pato_nada", display_name="Frase: El pato nada", emoji="🦆",
        category=CurriculumCategory.FRASES,
        difficulty=8, min_age=6,
        prerequisites=["frase_el_sol_sale"],
        description_for_student="¡Leemos una frase sobre el pato!",
        hints=["Tres palabras: EL · PATO · NADA 🦆", "El pato... nada... ¿qué hace el pato? 🦆", "El pato va al agua y... ¿qué hace? 🦆"],
        expected_answers=["el pato nada", "el pato"],
        example_questions=["¿Qué dice esta frase? 🦆 'El pato nada'"],
    ),
}



class CurriculumEngine:
    """
    Manages curriculum navigation for a student based on their belief base and age.

    Age-based topic filtering (Decreto 36/2022 + extensión nivel 6):
        age=3 → only min_age <= 3 topics (pre-writing strokes)
        age=4 → min_age <= 4 topics: strokes→numbers(d=1)→vowels(d=2)→consonants b-z(d=3)
        age=5 → all of above + consonants h,k,q,w,x(d=3) + syllables(d=4) + bisyllabic words(d=5)
        age=6 → all of above + inverse syllables, complex syllables (d=6) + trisyllabic words (d=7) + sentences (d=8)
    """

    ZDP_MIN_RATE       = 0.20
    ZDP_MAX_RATE       = 0.65
    MASTERY_THRESHOLD  = 0.65
    MIN_ATTEMPTS       = 3

    def get_topic(self, topic_id: str) -> CurriculumTopic | None:
        return CURRICULUM.get(topic_id)

    def get_all_topics(self) -> list[CurriculumTopic]:
        return list(CURRICULUM.values())

    def get_topics_for_age(self, student_age: int) -> list[CurriculumTopic]:
        """Returns topics available for a given student age."""
        return [t for t in CURRICULUM.values() if t.min_age <= student_age]

    def get_topics_by_category(self, category: CurriculumCategory) -> list[CurriculumTopic]:
        return [t for t in CURRICULUM.values() if t.category == category]

    def is_mastered(self, beliefs: dict, topic_id: str) -> bool:
        mastery = beliefs.get("mastery", {}).get(topic_id, {})
        attempts = mastery.get("attempts", 0)
        correct  = mastery.get("correct", 0)
        if attempts < self.MIN_ATTEMPTS:
            return False
        return (correct / attempts) >= self.MASTERY_THRESHOLD

    def get_success_rate(self, beliefs: dict, topic_id: str) -> float:
        mastery   = beliefs.get("mastery", {}).get(topic_id, {})
        attempts  = mastery.get("attempts", 0)
        correct   = mastery.get("correct", 0)
        return correct / attempts if attempts > 0 else 0.0

    def prerequisites_met(self, beliefs: dict, topic: CurriculumTopic, student_age: int = 4) -> bool:
        """Check prerequisites. For age 5, min_age=3 topics are auto-considered mastered."""
        for prereq_id in topic.prerequisites:
            if self.is_mastered(beliefs, prereq_id):
                continue
            if student_age >= 5:
                prereq = CURRICULUM.get(prereq_id)
                if prereq and prereq.min_age <= 3:
                    continue  # age 5 students skip age-3 prerequisites
            return False
        return True

    def in_zdp(self, beliefs: dict, topic_id: str) -> bool:
        mastery  = beliefs.get("mastery", {}).get(topic_id, {})
        attempts = mastery.get("attempts", 0)
        if attempts == 0:
            return False
        return not self.is_mastered(beliefs, topic_id)

    def get_next_topic(self, beliefs: dict, student_age: int = 4) -> CurriculumTopic:
        """
        Selects the next topic using ZDP logic, filtered by student age.

        Priority:
            1. Topics in ZDP (started, not mastered)
            2. Easiest unstarted eligible topic
            3. Review topic with lowest success rate
        """
        available = self.get_topics_for_age(student_age)
        eligible  = [t for t in available if self.prerequisites_met(beliefs, t, student_age)]
        # Age 5: skip age-3 topics (assumed already learned), start directly from age 4
        if student_age >= 5:
            eligible = [t for t in eligible if t.min_age >= 4]

        zdp_topics = [t for t in eligible if self.in_zdp(beliefs, t.id)]
        if zdp_topics:
            return max(
                zdp_topics,
                key=lambda t: beliefs.get("mastery", {}).get(t.id, {}).get("attempts", 0),
            )

        unstarted = [
            t for t in eligible
            if beliefs.get("mastery", {}).get(t.id, {}).get("attempts", 0) == 0
        ]
        if unstarted:
            return min(unstarted, key=lambda t: (t.difficulty, t.min_age))

        mastered_eligible = [t for t in eligible if self.is_mastered(beliefs, t.id)]
        if mastered_eligible:
            return min(mastered_eligible, key=lambda t: self.get_success_rate(beliefs, t.id))

        # Fallback: first age-appropriate topic
        fallback = [t for t in available if t.min_age >= 4] if student_age >= 5 else available
        return fallback[0] if fallback else CURRICULUM["trazo_linea_h"]

    def get_alternatives(
        self,
        beliefs: dict,
        current_topic_id: str,
        student_age: int = 4,
        n: int = 3,
    ) -> list[CurriculumTopic]:
        """Returns up to n alternative topics for the student to choose from."""
        available = self.get_topics_for_age(student_age)
        eligible  = [
            t for t in available
            if self.prerequisites_met(beliefs, t, student_age) and t.id != current_topic_id
        ]
        # Age 5: exclude age-3 topics from alternatives
        if student_age >= 5:
            eligible = [t for t in eligible if t.min_age >= 4]
        zdp      = [t for t in eligible if self.in_zdp(beliefs, t.id)]
        unstarted = [
            t for t in eligible
            if beliefs.get("mastery", {}).get(t.id, {}).get("attempts", 0) == 0
        ]
        mastered  = [t for t in eligible if self.is_mastered(beliefs, t.id)]
        ordered   = zdp + unstarted + mastered

        seen: set[str] = set()
        result: list[CurriculumTopic] = []
        for t in ordered:
            if t.id not in seen:
                seen.add(t.id)
                result.append(t)
            if len(result) >= n:
                break
        return result

    def get_hint(self, topic_id: str, hint_level: int) -> str:
        # Standard tracing hints — same for every topic.
        # The activity is always canvas tracing, so guidance is always the same.
        hints = [
            "Sigue los puntos 🔵",
            "Dale al botón de repetir 🔄",
            "¡Mira el tutorial otra vez! ▶️",
        ]
        idx = max(0, min(hint_level - 1, len(hints) - 1))
        return hints[idx]

    def evaluate_answer(self, topic_id: str, student_answer: str) -> bool:
        topic = CURRICULUM.get(topic_id)
        if not topic:
            return False
        normalized = student_answer.strip().lower()
        return any(normalized == expected.lower() for expected in topic.expected_answers)

    def mark_as_mastered(self, beliefs: dict, topic_id: str) -> dict:
        """
        Force-marks a topic as mastered (used by placement test).
        Sets attempts=3, correct=3 to meet MIN_ATTEMPTS threshold.
        """
        updated = dict(beliefs)
        mastery = dict(updated.get("mastery", {}))
        mastery[topic_id] = {"attempts": 3, "correct": 3, "mastered": True}
        updated["mastery"] = mastery
        return updated
