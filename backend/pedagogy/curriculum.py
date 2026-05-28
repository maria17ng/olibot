"""
Curriculum Module — OLIBOT Pedagogical Ontology.

Defines the formal curriculum for Spanish Educación Infantil (ages 3-6),
aligned with Decreto 36/2022 (Comunidad de Madrid) and the synthetic-phonics
method (método sintético-fonético) predominant in Madrid schools.

Topic progression by age (Decreto 36/2022, Área III Bloque D):
  - 3 años: Pre-graphomotricity strokes + vowel sound recognition
  - 4 años: Vowel tracing (upper/lower case) + consonants phase 1 (m,l,s,p) + numbers 1-10
  - 5 años: Consonants phase 2 (t,n,d,f,r) + syllables + bisyllabic words

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
            "¡Empieza aquí y ve recto! ➡️",
            "¡Como un tren en sus raíles! 🚂",
            "¡De aquí a aquí, sin torcer! 🎯",
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
            "¡Empieza arriba y baja despacito! ⬇️",
            "¡Como la lluvia que cae! 🌧️",
            "¡Del cielo al suelo, recto! ☁️",
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
            "¡Sube, baja, sube, baja... como las olas! 🌊",
            "¡Suavecito, sin prisa! 🐌",
            "¡Arriba y abajo, como un columpio! 🎠",
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
            "¡Arriba, abajo, arriba, abajo... como un rayo! ⚡",
            "¡Sube al pico y baja rápido! 🏔️",
            "¡Como los dientes de un tiburón! 🦈",
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
            "¡Empieza arriba y gira sin levantar el lápiz! ⭕",
            "¡Como una pelota o el sol! ☀️",
            "¡Da la vuelta y vuelve al principio! 🔄",
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
            "¡Sube hasta el pico y baja por el otro lado! 🏔️",
            "¡Como el tejado de una casa! 🏠",
            "¡Al pico y de vuelta abajo! ⛰️",
        ],
        expected_answers=["ángulo", "montaña", "pico", "tejado"],
        example_questions=["¿Puedes trazar una montaña?"],
    ),

    # ── VOCALES MAYÚSCULAS — 4 años ───────────────────────────────────────────

    "vocal_a": CurriculumTopic(
        id="vocal_a", display_name="La vocal A", emoji="🅰️",
        category=CurriculumCategory.LECTOESCRITURA,
        difficulty=1, prerequisites=["trazo_angulo", "trazo_linea_h"], min_age=4,
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
        difficulty=1, prerequisites=["trazo_linea_h", "trazo_linea_v"], min_age=4,
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
        difficulty=1, prerequisites=["trazo_linea_v"], min_age=4,
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
        difficulty=1, prerequisites=["trazo_circulo"], min_age=4,
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
        difficulty=1, prerequisites=["trazo_curva"], min_age=4,
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
        difficulty=1, prerequisites=["vocal_a"], min_age=4,
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
        difficulty=1, prerequisites=["vocal_e"], min_age=4,
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
        difficulty=1, prerequisites=["vocal_i"], min_age=4,
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
        difficulty=1, prerequisites=["vocal_o"], min_age=4,
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
        difficulty=1, prerequisites=["vocal_u"], min_age=4,
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
        difficulty=2, prerequisites=["numero_5"], min_age=4,
        description_for_student="¡El 6! Es el 5 con uno más.",
        hints=["5 caramelos y uno más... 🍬", "Viene después del 5...", "Cinco más uno es..."],
        expected_answers=["6", "seis", "el 6", "el seis"],
        example_questions=["¿Qué número viene después del 5?"],
    ),

    "numero_7": CurriculumTopic(
        id="numero_7", display_name="El número 7", emoji="7️⃣",
        category=CurriculumCategory.NUMERACION,
        difficulty=2, prerequisites=["numero_6"], min_age=4,
        description_for_student="¡El 7! Los días de la semana.",
        hints=["¿Cuántos días tiene una semana? 📅", "Viene después del 6...", "Lunes, martes, miércoles... ¿cuántos son?"],
        expected_answers=["7", "siete", "el 7", "el siete"],
        example_questions=["¿Cuántos días tiene la semana?"],
    ),

    "numero_8": CurriculumTopic(
        id="numero_8", display_name="El número 8", emoji="8️⃣",
        category=CurriculumCategory.NUMERACION,
        difficulty=2, prerequisites=["numero_7"], min_age=4,
        description_for_student="¡El 8! Como dos círculos.",
        hints=["¿Cuántas patas tiene una araña? 🕷️", "Viene después del 7...", "Una araña tiene... ¿cuántas patas?"],
        expected_answers=["8", "ocho", "el 8", "el ocho"],
        example_questions=["¿Cuántas patas tiene una araña?"],
    ),

    "numero_9": CurriculumTopic(
        id="numero_9", display_name="El número 9", emoji="9️⃣",
        category=CurriculumCategory.NUMERACION,
        difficulty=2, prerequisites=["numero_8"], min_age=4,
        description_for_student="¡Casi llegamos al 10! Solo falta el 9.",
        hints=["7, 8, ... ¿qué sigue?", "Viene después del 8...", "Ocho globos y uno más 🎈"],
        expected_answers=["9", "nueve", "el 9", "el nueve"],
        example_questions=["¿Qué número viene después del 8?"],
    ),

    "numero_10": CurriculumTopic(
        id="numero_10", display_name="El número 10", emoji="🔟",
        category=CurriculumCategory.NUMERACION,
        difficulty=2, prerequisites=["numero_9"], min_age=4,
        description_for_student="¡El 10! Los dedos de las dos manos.",
        hints=["¿Cuántos dedos tienes en las dos manos? 🙌", "Viene después del 9...", "Cinco más cinco es..."],
        expected_answers=["10", "diez", "el 10", "el diez"],
        example_questions=["¿Cuántos dedos tienes en total?"],
    ),

    # ── CONSONANTES FASE 1 — 4 años (m, l, s, p) ────────────────────────────

    "consonante_m": CurriculumTopic(
        id="consonante_m", display_name="La letra M", emoji="🌙",
        category=CurriculumCategory.LECTOESCRITURA,
        difficulty=2,
        prerequisites=["vocal_a", "vocal_e", "vocal_i", "vocal_o", "vocal_u"],
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
        difficulty=2,
        prerequisites=["vocal_a", "vocal_e", "vocal_i", "vocal_o", "vocal_u"],
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
        difficulty=2,
        prerequisites=["vocal_a", "vocal_e", "vocal_i", "vocal_o", "vocal_u"],
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
        difficulty=2,
        prerequisites=["vocal_a", "vocal_e", "vocal_i", "vocal_o", "vocal_u"],
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
        prerequisites=["consonante_m", "consonante_l", "consonante_s", "consonante_p"],
        min_age=5,
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
        prerequisites=["consonante_m", "consonante_l", "consonante_s", "consonante_p"],
        min_age=5,
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
        prerequisites=["consonante_m", "consonante_l", "consonante_s", "consonante_p"],
        min_age=5,
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
        prerequisites=["consonante_m", "consonante_l", "consonante_s", "consonante_p"],
        min_age=5,
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
        prerequisites=["consonante_t", "consonante_n", "consonante_d", "consonante_f"],
        min_age=5,
        description_for_student="¡La R! Hace vibrar la lengua.",
        hints=[
            "Haz vibrar la lengua: 'rrr'... 👅",
            "Es la letra de 'rana', 'ratón' y 'rojo' 🔴",
            "La rana empieza con esta letra... ¿cuál es? 🐸",
        ],
        expected_answers=["r", "la r", "consonante r", "letra r", "la letra r"],
        example_questions=["¿Con qué letra empieza 'rana'?"],
    ),

    # ── SÍLABAS — 5 años ─────────────────────────────────────────────────────
    # Activity type: phonics (no canvas). BDI guides tracing M then A then asks "ma".

    "silaba_ma": CurriculumTopic(
        id="silaba_ma", display_name="La sílaba MA", emoji="🌟",
        category=CurriculumCategory.SILABAS,
        difficulty=3,
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
        difficulty=3,
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
        difficulty=3,
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
        difficulty=3,
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
        difficulty=3,
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
        difficulty=4,
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
        difficulty=4,
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
        difficulty=4,
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
        difficulty=4,
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
}


class CurriculumEngine:
    """
    Manages curriculum navigation for a student based on their belief base and age.

    Age-based topic filtering (Decreto 36/2022):
        age=3 → only min_age <= 3 topics (pre-writing strokes)
        age=4 → only min_age <= 4 topics (strokes + vowels + consonants phase 1 + numbers)
        age=5 → all topics (+ consonants phase 2 + syllables + words)
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

    def prerequisites_met(self, beliefs: dict, topic: CurriculumTopic) -> bool:
        return all(self.is_mastered(beliefs, prereq) for prereq in topic.prerequisites)

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
        eligible  = [t for t in available if self.prerequisites_met(beliefs, t)]

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
        return available[0] if available else CURRICULUM["trazo_linea_h"]

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
            if self.prerequisites_met(beliefs, t) and t.id != current_topic_id
        ]
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
        topic = CURRICULUM.get(topic_id)
        if not topic or not topic.hints:
            return "¿Qué crees tú? Piénsalo un momento... 🤔"
        idx = max(0, min(hint_level - 1, len(topic.hints) - 1))
        return topic.hints[idx]

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
