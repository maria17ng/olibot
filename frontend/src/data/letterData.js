/**
 * letterData.js — Datos de trazado para letras, dígitos y grafemas de OLIBOT.
 *
 * Coordenadas normalizadas 0.0–1.0 (independientes del tamaño del canvas).
 *
 * Estructura de cada carácter:
 *   tutorial:    string     — instrucción en voz del tutor
 *   strokes:     stroke[]   — NIVEL MEDIO (predeterminado, level=1)
 *   strokesEasy: stroke[]   — NIVEL FÁCIL (level=0, más puntos guía). Opcional; si falta se usa strokes.
 *   NIVEL DIFÍCIL (level=2) → automático: solo primer y último punto de cada trazo.
 *                             En formas cerradas (inicio≈fin) se añade el punto central.
 *
 * Cada stroke: { points: [{x,y}] }
 * La flecha de inicio se calcula automáticamente desde points[0] → points[1].
 */

// ── Utilidades internas ────────────────────────────────────────────────────

function _strokesToHard(strokes) {
  return strokes.map(s => {
    const pts = s.points;
    if (pts.length <= 2) return s;
    const first = pts[0];
    const last  = pts[pts.length - 1];
    const dist  = Math.hypot(first.x - last.x, first.y - last.y);
    if (dist < 0.06) {
      // Forma cerrada: añadir punto intermedio para guiar al niño
      const mid = pts[Math.floor(pts.length / 2)];
      return { points: [first, mid, last] };
    }
    return { points: [first, last] };
  });
}

// Genera strokesEasy automático interpolando un punto a mitad entre cada par.
// Usado como fallback cuando un carácter no tiene strokesEasy explícito.
function _strokesToEasy(strokes) {
  return strokes.map(s => {
    const pts = s.points;
    if (pts.length <= 1) return s;
    const out = [];
    for (let i = 0; i < pts.length - 1; i++) {
      out.push(pts[i]);
      out.push({ x: (pts[i].x + pts[i + 1].x) / 2, y: (pts[i].y + pts[i + 1].y) / 2 });
    }
    out.push(pts[pts.length - 1]);
    return { points: out };
  });
}

// ── Datos ──────────────────────────────────────────────────────────────────

export const LETTER_DATA = {

  // ══════════════════════════════════════════════════════════════════════════
  // TRAZOS PREGRÁFICOS (edad 3)
  // ══════════════════════════════════════════════════════════════════════════

  LINEA_H: {
    tutorial: "Vamos a trazar una línea recta. Mueve el dedo de izquierda a derecha siguiendo los puntitos.",
    strokes: [
      { points: [{x:0.10,y:0.50},{x:0.37,y:0.50},{x:0.63,y:0.50},{x:0.90,y:0.50}] },
    ],
    strokesEasy: [
      { points: [{x:0.10,y:0.50},{x:0.23,y:0.50},{x:0.37,y:0.50},{x:0.50,y:0.50},{x:0.63,y:0.50},{x:0.77,y:0.50},{x:0.90,y:0.50}] },
    ],
  },

  LINEA_V: {
    tutorial: "Vamos a trazar una línea hacia abajo. Pon el dedo en el punto azul y baja despacito sin torcerte.",
    strokes: [
      { points: [{x:0.50,y:0.10},{x:0.50,y:0.37},{x:0.50,y:0.63},{x:0.50,y:0.90}] },
    ],
    strokesEasy: [
      { points: [{x:0.50,y:0.10},{x:0.50,y:0.23},{x:0.50,y:0.37},{x:0.50,y:0.50},{x:0.50,y:0.63},{x:0.50,y:0.77},{x:0.50,y:0.90}] },
    ],
  },

  // Curva suave — OLAS: puntos siguen y = 0.50 - 0.22·sin(2π·(x-0.10)/0.80)
  CURVA: {
    tutorial: "Vamos a trazar olas del mar. El dedo sube y baja suavemente como las olas, siguiendo todos los puntitos.",
    strokes: [
      { points: [
        {x:0.10,y:0.50},{x:0.20,y:0.34},{x:0.30,y:0.28},{x:0.40,y:0.34},
        {x:0.50,y:0.50},{x:0.60,y:0.66},{x:0.70,y:0.72},{x:0.80,y:0.66},{x:0.90,y:0.50},
      ]},
    ],
    strokesEasy: [
      { points: [
        {x:0.10,y:0.50},{x:0.15,y:0.42},{x:0.20,y:0.34},{x:0.25,y:0.30},{x:0.30,y:0.28},
        {x:0.35,y:0.30},{x:0.40,y:0.34},{x:0.45,y:0.42},{x:0.50,y:0.50},
        {x:0.55,y:0.58},{x:0.60,y:0.66},{x:0.65,y:0.70},{x:0.70,y:0.72},
        {x:0.75,y:0.70},{x:0.80,y:0.66},{x:0.85,y:0.58},{x:0.90,y:0.50},
      ]},
    ],
  },

  // Zigzag — PICOS AGUDOS: mucho más pronunciado que la curva
  ZIGZAG: {
    tutorial: "Vamos a trazar un zigzag. El dedo sube muy arriba y baja muy abajo, haciendo picos afilados.",
    strokes: [
      { points: [
        {x:0.10,y:0.82},{x:0.28,y:0.18},{x:0.46,y:0.82},{x:0.64,y:0.18},{x:0.82,y:0.82},
      ]},
    ],
    strokesEasy: [
      { points: [
        {x:0.10,y:0.82},{x:0.19,y:0.50},{x:0.28,y:0.18},
        {x:0.37,y:0.50},{x:0.46,y:0.82},
        {x:0.55,y:0.50},{x:0.64,y:0.18},
        {x:0.73,y:0.50},{x:0.82,y:0.82},
      ]},
    ],
  },

  // Círculo — 16 segmentos para un aspecto realmente circular (sentido antihorario en pantalla)
  CIRCULO: {
    tutorial: "Vamos a hacer un círculo. Empieza en el punto azul de arriba, ve hacia la izquierda y rodea todo con el dedo hasta volver al inicio.",
    strokes: [
      { points: [
        {x:0.50,y:0.10},{x:0.30,y:0.15},{x:0.15,y:0.30},{x:0.10,y:0.50},
        {x:0.15,y:0.70},{x:0.30,y:0.85},{x:0.50,y:0.90},{x:0.70,y:0.85},
        {x:0.85,y:0.70},{x:0.90,y:0.50},{x:0.85,y:0.30},{x:0.70,y:0.15},{x:0.50,y:0.10},
      ]},
    ],
    strokesEasy: [
      { points: [
        {x:0.50,y:0.10},{x:0.35,y:0.13},{x:0.22,y:0.22},{x:0.13,y:0.35},
        {x:0.10,y:0.50},{x:0.13,y:0.65},{x:0.22,y:0.78},{x:0.35,y:0.87},
        {x:0.50,y:0.90},{x:0.65,y:0.87},{x:0.78,y:0.78},{x:0.87,y:0.65},
        {x:0.90,y:0.50},{x:0.87,y:0.35},{x:0.78,y:0.22},{x:0.65,y:0.13},{x:0.50,y:0.10},
      ]},
    ],
  },

  ANGULO: {
    tutorial: "Vamos a trazar una montaña. Sube el dedo hasta la punta y luego baja por el otro lado.",
    strokes: [
      { points: [
        {x:0.10,y:0.85},{x:0.25,y:0.60},{x:0.40,y:0.38},{x:0.50,y:0.18},{x:0.60,y:0.38},{x:0.75,y:0.60},{x:0.90,y:0.85},
      ]},
    ],
    strokesEasy: [
      { points: [
        {x:0.10,y:0.85},{x:0.17,y:0.72},{x:0.25,y:0.60},{x:0.33,y:0.48},{x:0.40,y:0.38},
        {x:0.45,y:0.28},{x:0.50,y:0.18},{x:0.55,y:0.28},{x:0.60,y:0.38},{x:0.67,y:0.48},
        {x:0.75,y:0.60},{x:0.83,y:0.72},{x:0.90,y:0.85},
      ]},
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // VOCALES MAYÚSCULAS (edad 4)
  // ══════════════════════════════════════════════════════════════════════════

  A: {
    tutorial: "Vamos a trazar la letra A. Tiene tres trazos. Primero bajamos por la izquierda, luego por la derecha, y por último la rayita del medio.",
    strokes: [
      { points: [{x:0.50,y:0.06},{x:0.38,y:0.38},{x:0.25,y:0.70},{x:0.18,y:0.93}] },
      { points: [{x:0.50,y:0.06},{x:0.62,y:0.38},{x:0.75,y:0.70},{x:0.82,y:0.93}] },
      { points: [{x:0.30,y:0.57},{x:0.50,y:0.57},{x:0.70,y:0.57}] },
    ],
    strokesEasy: [
      { points: [{x:0.50,y:0.06},{x:0.44,y:0.22},{x:0.38,y:0.38},{x:0.31,y:0.55},{x:0.25,y:0.70},{x:0.21,y:0.82},{x:0.18,y:0.93}] },
      { points: [{x:0.50,y:0.06},{x:0.56,y:0.22},{x:0.62,y:0.38},{x:0.69,y:0.55},{x:0.75,y:0.70},{x:0.79,y:0.82},{x:0.82,y:0.93}] },
      { points: [{x:0.30,y:0.57},{x:0.40,y:0.57},{x:0.50,y:0.57},{x:0.60,y:0.57},{x:0.70,y:0.57}] },
    ],
  },

  E: {
    tutorial: "Vamos a trazar la letra E. Tiene cuatro trazos: primero bajamos, y luego tres rayitas hacia la derecha.",
    strokes: [
      { points: [{x:0.27,y:0.08},{x:0.27,y:0.50},{x:0.27,y:0.92}] },
      { points: [{x:0.27,y:0.08},{x:0.52,y:0.08},{x:0.78,y:0.08}] },
      { points: [{x:0.27,y:0.50},{x:0.52,y:0.50},{x:0.72,y:0.50}] },
      { points: [{x:0.27,y:0.92},{x:0.52,y:0.92},{x:0.78,y:0.92}] },
    ],
  },

  I: {
    tutorial: "Vamos a trazar la letra I. Una sola línea recta hacia abajo.",
    strokes: [
      { points: [{x:0.50,y:0.08},{x:0.50,y:0.50},{x:0.50,y:0.92}] },
    ],
    strokesEasy: [
      { points: [{x:0.50,y:0.08},{x:0.50,y:0.30},{x:0.50,y:0.50},{x:0.50,y:0.70},{x:0.50,y:0.92}] },
    ],
  },

  // O — 16 segmentos suaves (antihorario en pantalla = izquierda desde arriba)
  O: {
    tutorial: "Vamos a trazar la letra O. Empieza arriba y rodea con el dedo haciendo un óvalo, sin levantarlo.",
    strokes: [
      { points: [
        {x:0.50,y:0.04},{x:0.27,y:0.10},{x:0.10,y:0.27},{x:0.04,y:0.50},
        {x:0.10,y:0.73},{x:0.27,y:0.90},{x:0.50,y:0.96},{x:0.73,y:0.90},
        {x:0.90,y:0.73},{x:0.96,y:0.50},{x:0.90,y:0.27},{x:0.73,y:0.10},{x:0.50,y:0.04},
      ]},
    ],
    strokesEasy: [
      { points: [
        {x:0.50,y:0.04},{x:0.34,y:0.08},{x:0.20,y:0.18},{x:0.10,y:0.32},
        {x:0.07,y:0.50},{x:0.10,y:0.68},{x:0.20,y:0.83},{x:0.34,y:0.93},
        {x:0.50,y:0.96},{x:0.66,y:0.93},{x:0.80,y:0.83},{x:0.90,y:0.68},
        {x:0.93,y:0.50},{x:0.90,y:0.32},{x:0.80,y:0.18},{x:0.66,y:0.08},{x:0.50,y:0.04},
      ]},
    ],
  },

  U: {
    tutorial: "Vamos a trazar la letra U. El dedo baja, se curva por abajo y vuelve a subir.",
    strokes: [
      { points: [
        {x:0.25,y:0.08},{x:0.25,y:0.40},{x:0.25,y:0.65},
        {x:0.30,y:0.82},{x:0.42,y:0.93},{x:0.55,y:0.95},
        {x:0.68,y:0.93},{x:0.75,y:0.82},{x:0.78,y:0.65},
        {x:0.78,y:0.40},{x:0.78,y:0.08},
      ]},
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // VOCALES MINÚSCULAS (edad 4)
  // ══════════════════════════════════════════════════════════════════════════

  a: {
    tutorial: "Empieza en el punto azul, haz un círculo y luego baja el dedo por el lado derecho.",
    strokes: [
      { points: [
        {x:0.72,y:0.40},{x:0.67,y:0.30},{x:0.60,y:0.22},{x:0.42,y:0.20},{x:0.34,y:0.24},
        {x:0.26,y:0.32},{x:0.22,y:0.50},{x:0.28,y:0.67},{x:0.37,y:0.73},{x:0.46,y:0.76},{x:0.64,y:0.72},{x:0.69,y:0.65},{x:0.72,y:0.58},
      ]},
      { points: [{x:0.72,y:0.22},{x:0.72,y:0.50},{x:0.72,y:0.78}] },
    ],
    strokesEasy: [
      { points: [
        {x:0.72,y:0.40},{x:0.66,y:0.28},{x:0.56,y:0.20},{x:0.44,y:0.19},{x:0.32,y:0.24},
        {x:0.22,y:0.38},{x:0.20,y:0.52},{x:0.26,y:0.66},{x:0.38,y:0.75},{x:0.54,y:0.78},{x:0.68,y:0.72},{x:0.74,y:0.60},
      ]},
      { points: [{x:0.72,y:0.22},{x:0.72,y:0.40},{x:0.72,y:0.58},{x:0.72,y:0.78}] },
    ],
  },

  // e — corregida: empieza en el centro-izquierda, traza rayita a la derecha
  //      y rodea en sentido horario. La abertura queda a la derecha.
  e: {
    tutorial: "Empieza en el punto azul, dibuja la rayita hacia la derecha y rodea la letra. La abertura queda a la derecha.",
    strokes: [
      { points: [
        {x:0.38,y:0.47},{x:0.56,y:0.47},{x:0.76,y:0.47},
        {x:0.82,y:0.40},{x:0.83,y:0.30},
        {x:0.74,y:0.19},{x:0.50,y:0.16},{x:0.27,y:0.19},
        {x:0.18,y:0.30},{x:0.18,y:0.42},
        {x:0.20,y:0.56},{x:0.28,y:0.68},
        {x:0.43,y:0.77},{x:0.62,y:0.77},{x:0.78,y:0.67},
      ]},
    ],
    strokesEasy: [
      { points: [
        {x:0.38,y:0.47},{x:0.48,y:0.47},{x:0.58,y:0.47},{x:0.68,y:0.47},{x:0.76,y:0.47},
        {x:0.81,y:0.43},{x:0.83,y:0.36},{x:0.83,y:0.28},
        {x:0.78,y:0.22},{x:0.66,y:0.17},{x:0.50,y:0.15},{x:0.34,y:0.17},{x:0.23,y:0.22},
        {x:0.17,y:0.30},{x:0.17,y:0.40},{x:0.17,y:0.48},
        {x:0.19,y:0.56},{x:0.24,y:0.64},{x:0.32,y:0.72},
        {x:0.43,y:0.78},{x:0.56,y:0.79},{x:0.68,y:0.76},{x:0.78,y:0.68},
      ]},
    ],
  },

  i: {
    tutorial: "Baja el dedo desde el punto azul. Luego marca el puntito de arriba.",
    strokes: [
      { points: [{x:0.50,y:0.33},{x:0.50,y:0.56},{x:0.50,y:0.78}] },
      { points: [{x:0.44,y:0.16},{x:0.56,y:0.16}] },
    ],
  },

  o: {
    tutorial: "Empieza arriba y rodea con el dedo haciendo un óvalo cerrado.",
    strokes: [
      { points: [
        {x:0.50,y:0.20},{x:0.28,y:0.28},{x:0.18,y:0.48},
        {x:0.20,y:0.66},{x:0.36,y:0.78},{x:0.50,y:0.80},
        {x:0.64,y:0.78},{x:0.80,y:0.66},{x:0.82,y:0.48},
        {x:0.72,y:0.28},{x:0.50,y:0.20},
      ]},
    ],
    strokesEasy: [
      { points: [
        {x:0.50,y:0.18},{x:0.36,y:0.20},{x:0.24,y:0.28},{x:0.16,y:0.40},
        {x:0.14,y:0.54},{x:0.18,y:0.66},{x:0.28,y:0.76},{x:0.42,y:0.82},{x:0.50,y:0.82},
        {x:0.58,y:0.82},{x:0.72,y:0.76},{x:0.82,y:0.66},{x:0.86,y:0.54},
        {x:0.84,y:0.40},{x:0.76,y:0.28},{x:0.64,y:0.20},{x:0.50,y:0.18},
      ]},
    ],
  },

  u: {
    tutorial: "Empieza en el punto azul, baja el dedo, curva abajo y sube por el otro lado.",
    strokes: [
      { points: [
        {x:0.28,y:0.22},{x:0.28,y:0.45},{x:0.28,y:0.60},
        {x:0.33,y:0.73},{x:0.50,y:0.80},{x:0.67,y:0.73},
        {x:0.72,y:0.60},{x:0.72,y:0.45},{x:0.72,y:0.22},
      ]},
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // CONSONANTES MAYÚSCULAS
  // ══════════════════════════════════════════════════════════════════════════

  B: {
    tutorial: "Baja el dedo desde el punto azul. Luego traza las dos curvas hacia la derecha.",
    strokes: [
      { points: [{x:0.25,y:0.08},{x:0.25,y:0.50},{x:0.25,y:0.92}] },
      { points: [{x:0.25,y:0.08},{x:0.55,y:0.10},{x:0.72,y:0.22},{x:0.72,y:0.40},{x:0.55,y:0.52},{x:0.25,y:0.52}] },
      { points: [{x:0.25,y:0.52},{x:0.58,y:0.55},{x:0.78,y:0.68},{x:0.78,y:0.80},{x:0.58,y:0.92},{x:0.25,y:0.92}] },
    ],
  },

  C: {
    tutorial: "Empieza en el punto azul y curva el dedo hacia abajo rodeando la letra.",
    strokes: [
      { points: [
        {x:0.78,y:0.22},{x:0.60,y:0.08},{x:0.38,y:0.08},
        {x:0.18,y:0.22},{x:0.10,y:0.45},{x:0.10,y:0.60},
        {x:0.20,y:0.80},{x:0.42,y:0.93},{x:0.62,y:0.92},{x:0.78,y:0.80},
      ]},
    ],
  },

  D: {
    tutorial: "Baja el dedo desde el punto azul. Luego traza la curva grande hacia la derecha.",
    strokes: [
      { points: [{x:0.25,y:0.08},{x:0.25,y:0.50},{x:0.25,y:0.92}] },
      { points: [
        {x:0.25,y:0.08},{x:0.55,y:0.12},{x:0.78,y:0.30},
        {x:0.85,y:0.52},{x:0.78,y:0.72},{x:0.55,y:0.90},{x:0.25,y:0.92},
      ]},
    ],
  },

  F: {
    tutorial: "Baja el dedo desde el punto azul. Traza la rayita de arriba y la del medio.",
    strokes: [
      { points: [{x:0.25,y:0.08},{x:0.25,y:0.50},{x:0.25,y:0.92}] },
      { points: [{x:0.25,y:0.08},{x:0.52,y:0.08},{x:0.78,y:0.08}] },
      { points: [{x:0.25,y:0.50},{x:0.50,y:0.50},{x:0.70,y:0.50}] },
    ],
  },

  G: {
    tutorial: "Empieza en el punto azul, curva el dedo rodeando y entra hacia el centro.",
    strokes: [
      { points: [
        {x:0.80,y:0.22},{x:0.60,y:0.08},{x:0.38,y:0.08},
        {x:0.18,y:0.22},{x:0.10,y:0.45},{x:0.10,y:0.62},
        {x:0.20,y:0.80},{x:0.42,y:0.93},{x:0.65,y:0.92},
        {x:0.80,y:0.78},{x:0.85,y:0.60},{x:0.85,y:0.52},{x:0.62,y:0.52},
      ]},
    ],
  },

  H: {
    tutorial: "Baja el dedo dos veces, una por cada lado. Luego traza la rayita del medio.",
    strokes: [
      { points: [{x:0.22,y:0.08},{x:0.22,y:0.50},{x:0.22,y:0.92}] },
      { points: [{x:0.78,y:0.08},{x:0.78,y:0.50},{x:0.78,y:0.92}] },
      { points: [{x:0.22,y:0.50},{x:0.50,y:0.50},{x:0.78,y:0.50}] },
    ],
  },

  J: {
    tutorial: "Empieza en el punto azul, baja el dedo y curva hacia la izquierda abajo.",
    strokes: [
      { points: [
        {x:0.65,y:0.08},{x:0.65,y:0.40},{x:0.65,y:0.68},
        {x:0.60,y:0.83},{x:0.50,y:0.93},{x:0.35,y:0.93},{x:0.22,y:0.82},{x:0.18,y:0.68},
      ]},
    ],
  },

  K: {
    tutorial: "Baja el dedo desde el punto azul. Luego traza las dos rayitas diagonales.",
    strokes: [
      { points: [{x:0.25,y:0.08},{x:0.25,y:0.50},{x:0.25,y:0.92}] },
      { points: [{x:0.80,y:0.08},{x:0.55,y:0.35},{x:0.25,y:0.52}] },
      { points: [{x:0.25,y:0.52},{x:0.52,y:0.70},{x:0.80,y:0.92}] },
    ],
  },

  L: {
    tutorial: "Baja el dedo desde el punto azul y luego arrastra hacia la derecha.",
    strokes: [
      { points: [{x:0.30,y:0.08},{x:0.30,y:0.50},{x:0.30,y:0.92}] },
      { points: [{x:0.30,y:0.92},{x:0.55,y:0.92},{x:0.80,y:0.92}] },
    ],
  },

  // M — con más puntos intermedios en las diagonales
  M: {
    tutorial: "Sube el dedo desde el punto azul, baja al centro y vuelve a subir y bajar.",
    strokes: [
      { points: [
        {x:0.15,y:0.92},{x:0.15,y:0.60},{x:0.15,y:0.08},
        {x:0.25,y:0.22},{x:0.35,y:0.38},{x:0.43,y:0.48},{x:0.50,y:0.58},
        {x:0.57,y:0.48},{x:0.65,y:0.38},{x:0.75,y:0.22},{x:0.85,y:0.08},
        {x:0.85,y:0.60},{x:0.85,y:0.92},
      ]},
    ],
    strokesEasy: [
      { points: [
        {x:0.15,y:0.92},{x:0.15,y:0.70},{x:0.15,y:0.50},{x:0.15,y:0.30},{x:0.15,y:0.08},
        {x:0.20,y:0.15},{x:0.25,y:0.22},{x:0.30,y:0.30},{x:0.35,y:0.38},{x:0.39,y:0.44},{x:0.43,y:0.48},{x:0.47,y:0.53},{x:0.50,y:0.58},
        {x:0.53,y:0.53},{x:0.57,y:0.48},{x:0.61,y:0.44},{x:0.65,y:0.38},{x:0.70,y:0.30},{x:0.75,y:0.22},{x:0.80,y:0.15},{x:0.85,y:0.08},
        {x:0.85,y:0.30},{x:0.85,y:0.50},{x:0.85,y:0.70},{x:0.85,y:0.92},
      ]},
    ],
  },

  N: {
    tutorial: "Sube el dedo, baja en diagonal y sube de nuevo por el otro lado.",
    strokes: [
      { points: [{x:0.22,y:0.92},{x:0.22,y:0.50},{x:0.22,y:0.08}] },
      { points: [{x:0.22,y:0.08},{x:0.50,y:0.50},{x:0.78,y:0.92}] },
      { points: [{x:0.78,y:0.92},{x:0.78,y:0.50},{x:0.78,y:0.08}] },
    ],
  },

  P: {
    tutorial: "Baja el dedo desde el punto azul. Luego traza la curva de arriba a la derecha.",
    strokes: [
      { points: [{x:0.25,y:0.08},{x:0.25,y:0.50},{x:0.25,y:0.92}] },
      { points: [
        {x:0.25,y:0.08},{x:0.55,y:0.10},{x:0.75,y:0.22},
        {x:0.78,y:0.38},{x:0.68,y:0.50},{x:0.45,y:0.55},{x:0.25,y:0.52},
      ]},
    ],
  },

  Q: {
    tutorial: "Haz un óvalo desde el punto azul. Luego traza el rabito abajo a la derecha.",
    strokes: [
      { points: [
        {x:0.50,y:0.05},{x:0.20,y:0.18},{x:0.07,y:0.50},{x:0.20,y:0.83},
        {x:0.50,y:0.95},{x:0.80,y:0.83},{x:0.93,y:0.50},{x:0.80,y:0.18},{x:0.50,y:0.05},
      ]},
      { points: [{x:0.58,y:0.72},{x:0.78,y:0.92}] },
    ],
  },

  R: {
    tutorial: "Baja el dedo, traza la curva de arriba y luego la patita diagonal abajo.",
    strokes: [
      { points: [{x:0.25,y:0.08},{x:0.25,y:0.50},{x:0.25,y:0.92}] },
      { points: [
        {x:0.25,y:0.08},{x:0.55,y:0.10},{x:0.75,y:0.22},
        {x:0.78,y:0.38},{x:0.68,y:0.50},{x:0.45,y:0.55},{x:0.25,y:0.52},
      ]},
      { points: [{x:0.25,y:0.52},{x:0.52,y:0.70},{x:0.80,y:0.92}] },
    ],
  },

  // S — la dirección de la flecha se calcula automáticamente de points[0]→points[1]
  S: {
    tutorial: "Empieza en el punto azul arriba a la derecha, curva a la izquierda y luego a la derecha abajo.",
    strokes: [
      { points: [
        {x:0.78,y:0.22},{x:0.60,y:0.08},{x:0.38,y:0.08},
        {x:0.20,y:0.22},{x:0.18,y:0.38},{x:0.32,y:0.48},
        {x:0.50,y:0.52},{x:0.68,y:0.57},{x:0.82,y:0.68},
        {x:0.80,y:0.82},{x:0.62,y:0.93},{x:0.38,y:0.93},{x:0.22,y:0.82},
      ]},
    ],
    strokesEasy: [
      { points: [
        {x:0.78,y:0.22},{x:0.70,y:0.14},{x:0.60,y:0.08},{x:0.48,y:0.07},{x:0.38,y:0.08},
        {x:0.28,y:0.13},{x:0.20,y:0.22},{x:0.17,y:0.32},{x:0.18,y:0.38},{x:0.25,y:0.44},
        {x:0.32,y:0.48},{x:0.42,y:0.50},{x:0.50,y:0.52},{x:0.60,y:0.55},{x:0.68,y:0.57},
        {x:0.76,y:0.63},{x:0.82,y:0.68},{x:0.83,y:0.76},{x:0.80,y:0.82},
        {x:0.72,y:0.90},{x:0.62,y:0.93},{x:0.50,y:0.93},{x:0.38,y:0.93},{x:0.28,y:0.88},{x:0.22,y:0.82},
      ]},
    ],
  },

  T: {
    tutorial: "Traza la rayita de arriba con el dedo. Luego baja desde el centro.",
    strokes: [
      { points: [{x:0.15,y:0.08},{x:0.50,y:0.08},{x:0.85,y:0.08}] },
      { points: [{x:0.50,y:0.08},{x:0.50,y:0.50},{x:0.50,y:0.92}] },
    ],
  },

  V: {
    tutorial: "Baja el dedo desde el punto azul hasta la punta y luego sube al otro lado.",
    strokes: [
      { points: [{x:0.18,y:0.08},{x:0.38,y:0.50},{x:0.50,y:0.92}] },
      { points: [{x:0.50,y:0.92},{x:0.62,y:0.50},{x:0.82,y:0.08}] },
    ],
  },

  W: {
    tutorial: "Empieza en el punto azul y baja y sube el dedo cuatro veces seguidas.",
    strokes: [
      { points: [
        {x:0.10,y:0.08},{x:0.22,y:0.50},{x:0.30,y:0.92},
        {x:0.42,y:0.58},{x:0.50,y:0.35},
        {x:0.58,y:0.58},{x:0.70,y:0.92},
        {x:0.78,y:0.50},{x:0.90,y:0.08},
      ]},
    ],
  },

  X: {
    tutorial: "Empieza en el punto azul y cruza el dedo en diagonal. Luego cruza al otro lado.",
    strokes: [
      { points: [{x:0.18,y:0.08},{x:0.50,y:0.50},{x:0.82,y:0.92}] },
      { points: [{x:0.82,y:0.08},{x:0.50,y:0.50},{x:0.18,y:0.92}] },
    ],
  },

  Y: {
    tutorial: "Baja los dos brazos desde arriba hasta el centro. Luego baja el palito.",
    strokes: [
      { points: [{x:0.18,y:0.08},{x:0.35,y:0.32},{x:0.50,y:0.52}] },
      { points: [{x:0.82,y:0.08},{x:0.65,y:0.32},{x:0.50,y:0.52}] },
      { points: [{x:0.50,y:0.52},{x:0.50,y:0.72},{x:0.50,y:0.92}] },
    ],
  },

  Z: {
    tutorial: "Traza la rayita de arriba, baja en diagonal y traza la rayita de abajo.",
    strokes: [
      { points: [{x:0.18,y:0.08},{x:0.50,y:0.08},{x:0.82,y:0.08}] },
      { points: [{x:0.82,y:0.08},{x:0.50,y:0.50},{x:0.18,y:0.92}] },
      { points: [{x:0.18,y:0.92},{x:0.50,y:0.92},{x:0.82,y:0.92}] },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // CONSONANTES MINÚSCULAS
  // ══════════════════════════════════════════════════════════════════════════

  // m — 3 trazos: barra izquierda + 1ª joroba + 2ª joroba
  m: {
    tutorial: "La m tiene tres partes. Primero el palo de la izquierda, luego la primera joroba y luego la segunda.",
    strokes: [
      { points: [{x:0.18,y:0.22},{x:0.18,y:0.50},{x:0.18,y:0.78}] },
      { points: [{x:0.18,y:0.22},{x:0.40,y:0.20},{x:0.50,y:0.32},{x:0.50,y:0.54},{x:0.50,y:0.78}] },
      { points: [{x:0.50,y:0.22},{x:0.72,y:0.20},{x:0.82,y:0.32},{x:0.82,y:0.54},{x:0.82,y:0.78}] },
    ],
    strokesEasy: [
      { points: [{x:0.18,y:0.22},{x:0.18,y:0.38},{x:0.18,y:0.54},{x:0.18,y:0.70},{x:0.18,y:0.78}] },
      { points: [{x:0.18,y:0.22},{x:0.28,y:0.19},{x:0.40,y:0.18},{x:0.48,y:0.24},{x:0.52,y:0.34},{x:0.52,y:0.46},{x:0.52,y:0.58},{x:0.52,y:0.70},{x:0.52,y:0.78}] },
      { points: [{x:0.52,y:0.22},{x:0.60,y:0.19},{x:0.72,y:0.18},{x:0.80,y:0.24},{x:0.84,y:0.34},{x:0.84,y:0.46},{x:0.84,y:0.58},{x:0.84,y:0.70},{x:0.84,y:0.78}] },
    ],
  },

  // p — 2 trazos: palo descendente + protuberancia derecha
  p: {
    tutorial: "La p tiene un palo que baja y una barriguita a la derecha arriba.",
    strokes: [
      { points: [{x:0.32,y:0.22},{x:0.32,y:0.50},{x:0.32,y:0.78},{x:0.32,y:0.92}] },
      { points: [
        {x:0.32,y:0.22},{x:0.46,y:0.18},{x:0.60,y:0.20},{x:0.70,y:0.30},
        {x:0.74,y:0.44},{x:0.70,y:0.58},{x:0.58,y:0.68},{x:0.44,y:0.72},{x:0.34,y:0.68},{x:0.32,y:0.62},
      ]},
    ],
    strokesEasy: [
      { points: [{x:0.32,y:0.22},{x:0.32,y:0.36},{x:0.32,y:0.50},{x:0.32,y:0.64},{x:0.32,y:0.78},{x:0.32,y:0.92}] },
      { points: [
        {x:0.32,y:0.22},{x:0.44,y:0.19},{x:0.56,y:0.20},{x:0.66,y:0.28},{x:0.72,y:0.38},
        {x:0.73,y:0.50},{x:0.68,y:0.61},{x:0.58,y:0.68},{x:0.46,y:0.72},{x:0.36,y:0.69},{x:0.32,y:0.62},
      ]},
    ],
  },

  // t — 2 trazos: palo vertical + trazo cruzado
  t: {
    tutorial: "La t tiene un palo que baja y una rayita cruzada por la mitad.",
    strokes: [
      { points: [{x:0.50,y:0.14},{x:0.50,y:0.45},{x:0.50,y:0.82}] },
      { points: [{x:0.25,y:0.38},{x:0.50,y:0.38},{x:0.75,y:0.38}] },
    ],
    strokesEasy: [
      { points: [{x:0.50,y:0.14},{x:0.50,y:0.28},{x:0.50,y:0.44},{x:0.50,y:0.60},{x:0.50,y:0.82}] },
      { points: [{x:0.25,y:0.38},{x:0.38,y:0.38},{x:0.50,y:0.38},{x:0.62,y:0.38},{x:0.75,y:0.38}] },
    ],
  },

  // s — igual que S pero en zona x-height
  s: {
    tutorial: "La s pequeña se dibuja igual que la S grande pero más pequeñita. Empieza arriba a la derecha.",
    strokes: [
      { points: [
        {x:0.72,y:0.30},{x:0.56,y:0.22},{x:0.38,y:0.22},
        {x:0.22,y:0.32},{x:0.22,y:0.46},{x:0.42,y:0.52},
        {x:0.58,y:0.58},{x:0.78,y:0.68},{x:0.78,y:0.72},
        {x:0.64,y:0.78},{x:0.38,y:0.78},{x:0.22,y:0.72},
      ]},
    ],
    strokesEasy: [
      { points: [
        {x:0.72,y:0.30},{x:0.64,y:0.24},{x:0.56,y:0.20},{x:0.46,y:0.19},{x:0.38,y:0.20},
        {x:0.29,y:0.25},{x:0.22,y:0.32},{x:0.20,y:0.40},{x:0.22,y:0.46},{x:0.30,y:0.50},
        {x:0.42,y:0.52},{x:0.52,y:0.56},{x:0.58,y:0.58},{x:0.70,y:0.64},{x:0.78,y:0.68},
        {x:0.80,y:0.72},{x:0.75,y:0.77},{x:0.64,y:0.80},{x:0.50,y:0.80},{x:0.38,y:0.78},{x:0.28,y:0.74},{x:0.22,y:0.70},
      ]},
    ],
  },

  // l — palo vertical simple (ascendente)
  l: {
    tutorial: "La l es un palo recto que baja. Muy fácil, solo hay que ir de arriba abajo.",
    strokes: [
      { points: [{x:0.50,y:0.10},{x:0.50,y:0.45},{x:0.50,y:0.78},{x:0.50,y:0.92}] },
    ],
    strokesEasy: [
      { points: [{x:0.50,y:0.10},{x:0.50,y:0.28},{x:0.50,y:0.46},{x:0.50,y:0.64},{x:0.50,y:0.82},{x:0.50,y:0.92}] },
    ],
  },

  // n — 2 trazos: palo izquierdo + arco derecho
  n: {
    tutorial: "La n tiene un palo izquierdo y luego un arco que cae a la derecha.",
    strokes: [
      { points: [{x:0.22,y:0.22},{x:0.22,y:0.50},{x:0.22,y:0.78}] },
      { points: [{x:0.22,y:0.22},{x:0.50,y:0.20},{x:0.66,y:0.32},{x:0.70,y:0.50},{x:0.70,y:0.78}] },
    ],
    strokesEasy: [
      { points: [{x:0.22,y:0.22},{x:0.22,y:0.38},{x:0.22,y:0.54},{x:0.22,y:0.70},{x:0.22,y:0.78}] },
      { points: [{x:0.22,y:0.22},{x:0.34,y:0.19},{x:0.50,y:0.18},{x:0.62,y:0.24},{x:0.70,y:0.34},{x:0.72,y:0.46},{x:0.72,y:0.58},{x:0.72,y:0.70},{x:0.72,y:0.78}] },
    ],
  },

  // d — 2 trazos: palo ascendente derecho + círculo izquierdo
  d: {
    tutorial: "La d tiene un palo alto a la derecha y un círculo a la izquierda.",
    strokes: [
      { points: [{x:0.68,y:0.10},{x:0.68,y:0.40},{x:0.68,y:0.64},{x:0.68,y:0.78}] },
      { points: [
        {x:0.68,y:0.46},{x:0.62,y:0.32},{x:0.50,y:0.22},{x:0.34,y:0.22},
        {x:0.20,y:0.32},{x:0.16,y:0.48},{x:0.18,y:0.64},{x:0.30,y:0.76},
        {x:0.48,y:0.80},{x:0.62,y:0.76},{x:0.68,y:0.66},
      ]},
    ],
    strokesEasy: [
      { points: [{x:0.68,y:0.10},{x:0.68,y:0.24},{x:0.68,y:0.38},{x:0.68,y:0.52},{x:0.68,y:0.66},{x:0.68,y:0.78}] },
      { points: [
        {x:0.68,y:0.46},{x:0.62,y:0.32},{x:0.52,y:0.22},{x:0.40,y:0.22},{x:0.30,y:0.26},
        {x:0.22,y:0.36},{x:0.18,y:0.48},{x:0.18,y:0.62},{x:0.24,y:0.72},{x:0.36,y:0.78},
        {x:0.50,y:0.80},{x:0.62,y:0.76},{x:0.70,y:0.66},
      ]},
    ],
  },

  // f — 2 trazos: gancho superior + bajada + trazo cruzado
  f: {
    tutorial: "La f tiene una parte que se curva arriba, baja recta y tiene una rayita cruzada.",
    strokes: [
      { points: [
        {x:0.68,y:0.16},{x:0.55,y:0.10},{x:0.40,y:0.12},
        {x:0.35,y:0.24},{x:0.35,y:0.50},{x:0.35,y:0.78},{x:0.35,y:0.92},
      ]},
      { points: [{x:0.18,y:0.42},{x:0.35,y:0.42},{x:0.58,y:0.42}] },
    ],
    strokesEasy: [
      { points: [
        {x:0.68,y:0.16},{x:0.62,y:0.12},{x:0.55,y:0.10},{x:0.46,y:0.10},{x:0.40,y:0.12},
        {x:0.35,y:0.16},{x:0.34,y:0.22},{x:0.34,y:0.30},{x:0.34,y:0.40},{x:0.34,y:0.52},
        {x:0.34,y:0.64},{x:0.34,y:0.76},{x:0.34,y:0.92},
      ]},
      { points: [{x:0.18,y:0.42},{x:0.28,y:0.42},{x:0.38,y:0.42},{x:0.50,y:0.42},{x:0.60,y:0.42}] },
    ],
  },

  // r — 2 trazos: palo izquierdo + pequeña curva en la punta
  r: {
    tutorial: "La r tiene un palo que baja y una pequeña curvita arriba a la derecha.",
    strokes: [
      { points: [{x:0.25,y:0.22},{x:0.25,y:0.50},{x:0.25,y:0.78}] },
      { points: [{x:0.25,y:0.22},{x:0.44,y:0.20},{x:0.58,y:0.30},{x:0.64,y:0.44}] },
    ],
    strokesEasy: [
      { points: [{x:0.25,y:0.22},{x:0.25,y:0.38},{x:0.25,y:0.54},{x:0.25,y:0.70},{x:0.25,y:0.78}] },
      { points: [{x:0.25,y:0.22},{x:0.34,y:0.19},{x:0.44,y:0.18},{x:0.54,y:0.22},{x:0.62,y:0.32},{x:0.66,y:0.44}] },
    ],
  },

  // b — palo ascendente izquierdo + barriguita a la derecha (espejo de la d)
  b: {
    tutorial: "La b tiene un palo alto a la izquierda y una barriguita a la derecha abajo.",
    strokes: [
      { points: [{x:0.30,y:0.10},{x:0.30,y:0.40},{x:0.30,y:0.64},{x:0.30,y:0.80}] },
      { points: [
        {x:0.30,y:0.46},{x:0.40,y:0.34},{x:0.52,y:0.30},{x:0.66,y:0.32},
        {x:0.78,y:0.42},{x:0.82,y:0.56},{x:0.78,y:0.70},{x:0.64,y:0.80},
        {x:0.48,y:0.82},{x:0.36,y:0.78},{x:0.30,y:0.68},
      ]},
    ],
    strokesEasy: [
      { points: [{x:0.30,y:0.10},{x:0.30,y:0.24},{x:0.30,y:0.38},{x:0.30,y:0.52},{x:0.30,y:0.66},{x:0.30,y:0.80}] },
      { points: [
        {x:0.30,y:0.46},{x:0.38,y:0.36},{x:0.48,y:0.30},{x:0.60,y:0.30},{x:0.70,y:0.36},
        {x:0.78,y:0.46},{x:0.80,y:0.58},{x:0.76,y:0.70},{x:0.66,y:0.78},{x:0.52,y:0.82},
        {x:0.40,y:0.80},{x:0.32,y:0.72},{x:0.30,y:0.64},
      ]},
    ],
  },

  // c — necesaria para palabras (casa, etc.)
  c: {
    tutorial: "La c es como una o pero abierta por la derecha. Empieza a la derecha y rodea hacia la izquierda.",
    strokes: [
      { points: [
        {x:0.78,y:0.30},{x:0.62,y:0.20},{x:0.40,y:0.20},
        {x:0.22,y:0.34},{x:0.18,y:0.50},{x:0.22,y:0.66},
        {x:0.42,y:0.78},{x:0.62,y:0.78},{x:0.78,y:0.70},
      ]},
    ],
    strokesEasy: [
      { points: [
        {x:0.78,y:0.30},{x:0.70,y:0.23},{x:0.62,y:0.18},{x:0.50,y:0.16},{x:0.40,y:0.18},
        {x:0.30,y:0.24},{x:0.22,y:0.34},{x:0.18,y:0.44},{x:0.17,y:0.54},
        {x:0.20,y:0.64},{x:0.28,y:0.73},{x:0.40,y:0.80},{x:0.52,y:0.82},
        {x:0.62,y:0.80},{x:0.72,y:0.74},{x:0.78,y:0.68},
      ]},
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // DÍGITOS (edad 4)
  // ══════════════════════════════════════════════════════════════════════════

  "0": {
    tutorial: "El 0 es un óvalo. Empieza arriba y rodea con el dedo hasta cerrar el círculo.",
    strokes: [
      { points: [
        {x:0.50,y:0.05},{x:0.27,y:0.11},{x:0.10,y:0.28},{x:0.04,y:0.50},
        {x:0.10,y:0.72},{x:0.27,y:0.89},{x:0.50,y:0.95},{x:0.73,y:0.89},
        {x:0.90,y:0.72},{x:0.96,y:0.50},{x:0.90,y:0.28},{x:0.73,y:0.11},{x:0.50,y:0.05},
      ]},
    ],
    strokesEasy: [
      { points: [
        {x:0.50,y:0.05},{x:0.34,y:0.08},{x:0.20,y:0.18},{x:0.10,y:0.32},
        {x:0.07,y:0.50},{x:0.10,y:0.68},{x:0.20,y:0.83},{x:0.34,y:0.93},
        {x:0.50,y:0.95},{x:0.66,y:0.93},{x:0.80,y:0.83},{x:0.90,y:0.68},
        {x:0.93,y:0.50},{x:0.90,y:0.32},{x:0.80,y:0.18},{x:0.66,y:0.08},{x:0.50,y:0.05},
      ]},
    ],
  },

  "1": {
    tutorial: "El 1: empieza en el punto azul y baja recto.",
    strokes: [
      { points: [
        {x:0.38,y:0.30},{x:0.45,y:0.18},{x:0.52,y:0.08},
        {x:0.52,y:0.40},{x:0.52,y:0.70},{x:0.52,y:0.92},
      ]},
    ],
  },

  "2": {
    tutorial: "El 2: empieza arriba a la derecha, curva y baja en diagonal hasta la rayita.",
    strokes: [
      { points: [
        {x:0.25,y:0.30},{x:0.32,y:0.12},{x:0.50,y:0.08},
        {x:0.72,y:0.12},{x:0.80,y:0.30},{x:0.75,y:0.48},
        {x:0.55,y:0.62},{x:0.30,y:0.78},{x:0.20,y:0.92},
        {x:0.50,y:0.92},{x:0.80,y:0.92},
      ]},
    ],
  },

  // 3 — dos arcos suaves sin ángulo en V
  "3": {
    tutorial: "El 3: empieza arriba a la izquierda, curva a la derecha dos veces.",
    strokes: [
      { points: [
        {x:0.28,y:0.15},{x:0.50,y:0.08},{x:0.72,y:0.12},
        {x:0.82,y:0.28},{x:0.80,y:0.46},{x:0.60,y:0.52},
        {x:0.80,y:0.57},{x:0.83,y:0.72},{x:0.72,y:0.90},
        {x:0.50,y:0.95},{x:0.28,y:0.90},
      ]},
    ],
    strokesEasy: [
      { points: [
        {x:0.28,y:0.15},{x:0.40,y:0.09},{x:0.55,y:0.07},{x:0.68,y:0.10},{x:0.78,y:0.20},
        {x:0.83,y:0.32},{x:0.82,y:0.44},{x:0.74,y:0.51},{x:0.62,y:0.52},
        {x:0.74,y:0.54},{x:0.83,y:0.62},{x:0.84,y:0.74},{x:0.78,y:0.86},
        {x:0.66,y:0.93},{x:0.52,y:0.96},{x:0.38,y:0.94},{x:0.28,y:0.88},
      ]},
    ],
  },

  // 4 — orden de trazos: diagonal → barra horizontal → vertical
  "4": {
    tutorial: "El 4: primero baja en diagonal, luego traza la rayita cruzada, y por último el palo de la derecha.",
    strokes: [
      { points: [{x:0.65,y:0.08},{x:0.42,y:0.38},{x:0.16,y:0.66}] },
      { points: [{x:0.16,y:0.66},{x:0.45,y:0.66},{x:0.85,y:0.66}] },
      { points: [{x:0.65,y:0.08},{x:0.65,y:0.40},{x:0.65,y:0.92}] },
    ],
    strokesEasy: [
      { points: [{x:0.65,y:0.08},{x:0.56,y:0.22},{x:0.46,y:0.36},{x:0.36,y:0.50},{x:0.26,y:0.58},{x:0.16,y:0.66}] },
      { points: [{x:0.16,y:0.66},{x:0.32,y:0.66},{x:0.50,y:0.66},{x:0.68,y:0.66},{x:0.85,y:0.66}] },
      { points: [{x:0.65,y:0.08},{x:0.65,y:0.28},{x:0.65,y:0.50},{x:0.65,y:0.70},{x:0.65,y:0.92}] },
    ],
  },

  // 5 — arco inferior con más puntos
  "5": {
    tutorial: "El 5: primero la rayita de arriba hacia la izquierda, luego baja y curva a la derecha.",
    strokes: [
      { points: [
        {x:0.78,y:0.08},{x:0.50,y:0.08},{x:0.25,y:0.08},
        {x:0.25,y:0.30},{x:0.25,y:0.50},
        {x:0.42,y:0.52},{x:0.65,y:0.52},
        {x:0.82,y:0.62},{x:0.82,y:0.76},
        {x:0.72,y:0.90},{x:0.50,y:0.95},{x:0.28,y:0.92},{x:0.18,y:0.78},
      ]},
    ],
    strokesEasy: [
      { points: [
        {x:0.78,y:0.08},{x:0.62,y:0.08},{x:0.50,y:0.08},{x:0.36,y:0.08},{x:0.25,y:0.08},
        {x:0.24,y:0.18},{x:0.24,y:0.30},{x:0.24,y:0.42},{x:0.24,y:0.50},
        {x:0.34,y:0.52},{x:0.46,y:0.52},{x:0.58,y:0.52},{x:0.70,y:0.54},
        {x:0.80,y:0.60},{x:0.83,y:0.70},{x:0.82,y:0.80},
        {x:0.76,y:0.88},{x:0.64,y:0.93},{x:0.50,y:0.95},{x:0.36,y:0.93},{x:0.24,y:0.87},{x:0.18,y:0.78},
      ]},
    ],
  },

  "6": {
    tutorial: "El 6: empieza arriba, baja y cierra el círculo de abajo.",
    strokes: [
      { points: [
        {x:0.75,y:0.15},{x:0.55,y:0.08},{x:0.32,y:0.15},
        {x:0.18,y:0.35},{x:0.15,y:0.58},{x:0.22,y:0.78},
        {x:0.42,y:0.93},{x:0.65,y:0.92},{x:0.82,y:0.78},
        {x:0.85,y:0.60},{x:0.75,y:0.45},{x:0.55,y:0.42},
        {x:0.30,y:0.48},{x:0.18,y:0.62},
      ]},
    ],
  },

  "7": {
    tutorial: "El 7: traza la rayita de arriba y luego baja en diagonal.",
    strokes: [
      { points: [
        {x:0.20,y:0.08},{x:0.50,y:0.08},{x:0.82,y:0.08},
        {x:0.65,y:0.38},{x:0.50,y:0.65},{x:0.40,y:0.92},
      ]},
    ],
  },

  // 8 — 2 trazos circulares
  "8": {
    tutorial: "El 8 tiene dos círculos. Primero el de arriba empezando desde arriba, luego el de abajo.",
    strokes: [
      { points: [
        {x:0.50,y:0.08},{x:0.61,y:0.11},{x:0.69,y:0.19},{x:0.72,y:0.30},
        {x:0.69,y:0.41},{x:0.61,y:0.49},{x:0.50,y:0.52},
        {x:0.39,y:0.49},{x:0.31,y:0.41},{x:0.28,y:0.30},
        {x:0.31,y:0.19},{x:0.39,y:0.11},{x:0.50,y:0.08},
      ]},
      { points: [
        {x:0.50,y:0.52},{x:0.61,y:0.55},{x:0.69,y:0.63},{x:0.72,y:0.73},
        {x:0.69,y:0.83},{x:0.61,y:0.91},{x:0.50,y:0.94},
        {x:0.39,y:0.91},{x:0.31,y:0.83},{x:0.28,y:0.73},
        {x:0.31,y:0.63},{x:0.39,y:0.55},{x:0.50,y:0.52},
      ]},
    ],
    strokesEasy: [
      { points: [
        {x:0.50,y:0.08},{x:0.62,y:0.09},{x:0.73,y:0.14},{x:0.80,y:0.24},{x:0.83,y:0.34},
        {x:0.80,y:0.44},{x:0.72,y:0.50},{x:0.62,y:0.52},{x:0.50,y:0.52},
        {x:0.38,y:0.52},{x:0.28,y:0.50},{x:0.20,y:0.44},{x:0.17,y:0.34},
        {x:0.20,y:0.24},{x:0.27,y:0.14},{x:0.38,y:0.09},{x:0.50,y:0.08},
      ]},
      { points: [
        {x:0.50,y:0.52},{x:0.62,y:0.53},{x:0.74,y:0.57},{x:0.81,y:0.66},{x:0.83,y:0.76},
        {x:0.79,y:0.86},{x:0.70,y:0.92},{x:0.60,y:0.94},{x:0.50,y:0.94},
        {x:0.40,y:0.94},{x:0.30,y:0.92},{x:0.21,y:0.86},{x:0.17,y:0.76},
        {x:0.19,y:0.66},{x:0.26,y:0.57},{x:0.38,y:0.53},{x:0.50,y:0.52},
      ]},
    ],
  },

  // 9 — 2 trazos: círculo superior + cola descendente
  "9": {
    tutorial: "El 9 tiene un círculo arriba. Primero el círculo, luego baja la cola.",
    strokes: [
      { points: [
        {x:0.50,y:0.08},{x:0.65,y:0.12},{x:0.76,y:0.23},{x:0.80,y:0.38},
        {x:0.76,y:0.53},{x:0.65,y:0.64},{x:0.50,y:0.68},
        {x:0.35,y:0.64},{x:0.24,y:0.53},{x:0.20,y:0.38},
        {x:0.24,y:0.23},{x:0.35,y:0.12},{x:0.50,y:0.08},
      ]},
      { points: [{x:0.82,y:0.38},{x:0.82,y:0.62},{x:0.74,y:0.82},{x:0.55,y:0.92},{x:0.38,y:0.90}] },
    ],
    strokesEasy: [
      { points: [
        {x:0.50,y:0.08},{x:0.62,y:0.09},{x:0.73,y:0.14},{x:0.80,y:0.24},{x:0.83,y:0.34},
        {x:0.82,y:0.44},{x:0.78,y:0.54},{x:0.70,y:0.62},{x:0.60,y:0.67},{x:0.50,y:0.68},
        {x:0.40,y:0.67},{x:0.30,y:0.62},{x:0.22,y:0.54},{x:0.18,y:0.44},
        {x:0.18,y:0.34},{x:0.21,y:0.24},{x:0.28,y:0.14},{x:0.38,y:0.09},{x:0.50,y:0.08},
      ]},
      { points: [{x:0.82,y:0.38},{x:0.82,y:0.50},{x:0.82,y:0.62},{x:0.78,y:0.74},{x:0.70,y:0.84},{x:0.58,y:0.91},{x:0.45,y:0.92},{x:0.38,y:0.90}] },
    ],
  },
};

// ══════════════════════════════════════════════════════════════════════════════
// NIVELES — selección de puntos según dificultad
// ══════════════════════════════════════════════════════════════════════════════
//
//  level=0  fácil   → strokesEasy (o strokes si no hay strokesEasy)
//  level=1  medio   → strokes  (predeterminado)
//  level=2  difícil → solo primer + último punto de cada trazo
//                     (en formas cerradas se añade el punto central)

function _getStrokesForLevel(char, level) {
  if (level === 0) return char.strokesEasy ?? _strokesToEasy(char.strokes);
  // Level 2 (hard): guide dots are reduced to start+end by the hook (hintLevel=1),
  // but strokes must stay complete so evaluation expects the real letter shape.
  return char.strokes;
}

// ══════════════════════════════════════════════════════════════════════════════
// SÍLABAS Y PALABRAS — secuencias de letras
// ══════════════════════════════════════════════════════════════════════════════

const SYLLABLE_LETTERS = {
  // Sílabas (edad 5) — siempre en minúscula
  silaba_ma: ["m", "a"],
  silaba_mi: ["m", "i"],
  silaba_sa: ["s", "a"],
  silaba_la: ["l", "a"],
  silaba_pa: ["p", "a"],
  // Sílabas minúsculas (edad 5)
  silaba_ma_min: ["m", "a"],
  silaba_mi_min: ["m", "i"],
  silaba_sa_min: ["s", "a"],
  silaba_la_min: ["l", "a"],
  silaba_pa_min: ["p", "a"],
  silaba_ta_min: ["t", "a"],
  silaba_na_min: ["n", "a"],
  // Sílabas inversas VC (edad 6 · nivel Rojo) — minúsculas, trazadas juntas
  silaba_inv_as: ["a", "s"],
  silaba_inv_es: ["e", "s"],
  silaba_inv_al: ["a", "l"],
  silaba_inv_ar: ["a", "r"],
  silaba_inv_an: ["a", "n"],
  // Sílabas complejas CCV (edad 6 · nivel Rojo) — minúsculas, trazadas juntas
  silaba_bra: ["b", "r", "a"],
  silaba_tra: ["t", "r", "a"],
  silaba_pla: ["p", "l", "a"],
  silaba_cla: ["c", "l", "a"],
  // Palabras (trazado letra a letra)
  palabra_mama_traz: ["m", "a", "m", "a"],
  palabra_papa_traz: ["p", "a", "p", "a"],
  palabra_casa_traz: ["c", "a", "s", "a"],
  palabra_sala_traz: ["s", "a", "l", "a"],
  palabra_misa_traz: ["m", "i", "s", "a"],
};

/**
 * Devuelve las letras a trazar para un topic de sílaba/palabra, o null.
 */
export function getSyllableLetters(topicId) {
  return SYLLABLE_LETTERS[topicId] ?? null;
}

// Compone varias letras en un único glifo unido (de izquierda a derecha, con
// línea base compartida). Así las sílabas/palabras se trazan como una sola unión
// de letras seguidas en vez de letra por letra. Escala de forma uniforme para no
// deformar las letras y las ajusta a una banda de escritura común.
function _composeStrokes(letterKeys, level) {
  const letters = letterKeys
    .filter(k => LETTER_DATA[k])
    .map(key => {
      const strokes = _getStrokesForLevel(LETTER_DATA[key], level);
      let minX = 1, maxX = 0, minY = 1, maxY = 0;
      for (const s of strokes) for (const p of s.points) {
        if (p.x < minX) minX = p.x;
        if (p.x > maxX) maxX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.y > maxY) maxY = p.y;
      }
      return { strokes, minX, maxX, minY, maxY, w: maxX - minX, h: maxY - minY };
    });
  const n = letters.length;
  if (n === 0) return null;

  const TOP = 0.24, BOTTOM = 0.80, GAP = 0.20, USABLE = 0.72;
  const tallest = Math.max(...letters.map(l => l.h)) || 1;
  const sumW    = letters.reduce((a, l) => a + l.w, 0) || 1;
  const sV = (BOTTOM - TOP) / tallest;                 // escala que cabe en altura
  const sH = (USABLE - GAP * (n - 1)) / sumW;          // escala que cabe en ancho
  const S  = Math.min(sV, sH);                          // uniforme → sin deformar

  const totalW = letters.reduce((a, l) => a + l.w * S, 0) + GAP * (n - 1);
  let cursorX  = (1 - totalW) / 2;                      // centrar horizontalmente

  const out = [];
  for (const l of letters) {
    const offX = cursorX - l.minX * S;
    const offY = BOTTOM - l.maxY * S;                   // alinear bases a la línea base
    for (const s of l.strokes) {
      out.push({ points: s.points.map(p => ({ x: offX + p.x * S, y: offY + p.y * S })) });
    }
    cursorX += l.w * S + GAP;
  }
  return out;
}

/**
 * Devuelve los datos de trazado de una sílaba/palabra como un único glifo unido
 * (todas las letras juntas en una línea), o null si el topic no es de sílaba.
 * @param {string} topicId
 * @param {0|1|2} level
 */
export function getSyllableCharData(topicId, level = 1) {
  const letters = SYLLABLE_LETTERS[topicId];
  if (!letters) return null;
  const strokes = _composeStrokes(letters, level);
  if (!strokes) return null;
  const text = letters.join("");
  return {
    key: text,
    tutorial: `¡Vamos a trazar ${text}! Sigue los puntitos y traza todas las letras juntas, una detrás de otra.`,
    strokes,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// MAPEO topicId → clave de LETTER_DATA
// ══════════════════════════════════════════════════════════════════════════════

const TOPIC_MAP = {
  // Trazos pregráficos
  trazo_linea_h: "LINEA_H", trazo_linea_v: "LINEA_V",
  trazo_curva:   "CURVA",   trazo_zigzag:  "ZIGZAG",
  trazo_circulo: "CIRCULO", trazo_angulo:  "ANGULO",
  // Vocales mayúsculas
  vocal_a: "A", vocal_e: "E", vocal_i: "I", vocal_o: "O", vocal_u: "U",
  // Vocales minúsculas
  vocal_a_min: "a", vocal_e_min: "e", vocal_i_min: "i",
  vocal_o_min: "o", vocal_u_min: "u",
  // Números
  numero_0: "0", numero_1: "1", numero_2: "2", numero_3: "3",
  numero_4: "4", numero_5: "5", numero_6: "6", numero_7: "7",
  numero_8: "8", numero_9: "9",
  // Consonantes mayúsculas — fase 1 (edad 4)
  consonante_m: "M", consonante_p: "P", consonante_t: "T",
  consonante_s: "S", consonante_l: "L",
  // Consonantes mayúsculas — fase 2 (edad 5)
  consonante_n: "N", consonante_d: "D",
  consonante_f: "F", consonante_r: "R",
  // Consonantes minúsculas — fase 1 (edad 4)
  consonante_m_min: "m", consonante_p_min: "p", consonante_t_min: "t",
  consonante_s_min: "s", consonante_l_min: "l",
  // Consonantes minúsculas — fase 2 (edad 5)
  consonante_n_min: "n", consonante_d_min: "d",
  consonante_f_min: "f", consonante_r_min: "r",
};

/**
 * Devuelve los datos de trazado para un topicId.
 * @param {string} topicId
 * @param {0|1|2} level  0=fácil, 1=medio, 2=difícil  (predeterminado: 1)
 */
export function getCharData(topicId, level = 1) {
  const key = TOPIC_MAP[topicId];
  if (!key) return null;
  return getCharDataByKey(key, level);
}

/**
 * Devuelve los datos de trazado directamente por clave de LETTER_DATA.
 * @param {string} key   p.ej. "M", "a", "LINEA_H"
 * @param {0|1|2} level
 */
export function getCharDataByKey(key, level = 1) {
  if (!key || !LETTER_DATA[key]) return null;
  const char = LETTER_DATA[key];
  const result = {
    key,
    tutorial: char.tutorial,
    strokes: _getStrokesForLevel(char, level),
  };
  return result;
}
