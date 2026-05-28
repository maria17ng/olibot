/**
 * letterData.js — Datos de trazado para todas las letras del abecedario y dígitos 0-9.
 *
 * Coordenadas normalizadas en espacio 0.0–1.0 (independientes del tamaño del canvas).
 * Para dibujar: multiplicar x e y por el tamaño del canvas en píxeles.
 *
 * Cada letra tiene:
 *   strokes: array de trazos ordenados (el niño los hace en este orden)
 *     points: waypoints que el niño debe cubrir con su trazo
 *     arrowAngle: dirección de la flecha de inicio en grados
 *                 (0=derecha, 90=abajo, 180=izquierda, 270=arriba)
 *
 * Mapeo de topicIds del currículo → clave de letra:
 *   vocal_a → "A" (mayúscula), vocal_a_min → "a" (minúscula)
 *   numero_1 → "1", consonante_m → "M", etc.
 */

export const LETTER_DATA = {

  // ── TRAZOS PREGRÁFICOS (edad 3) ───────────────────────────────────────────
  // Formas simples de grafomotricidad. Sin letra — solo el trazo.

  LINEA_H: {
    tutorial: "Vamos a hacer líneas horizontales, de un lado al otro. Hay que mover el dedo desde el punto azul hasta el otro extremo sin levantarlo ni salirse de los puntitos.",
    strokes: [
      { points: [{x:0.10,y:0.50},{x:0.35,y:0.50},{x:0.60,y:0.50},{x:0.90,y:0.50}], arrowAngle:0 },
    ],
  },
  LINEA_V: {
    tutorial: "Vamos a hacer líneas verticales, de arriba hacia abajo. Hay que poner el dedo en el punto azul de arriba y bajarlo despacito hasta abajo sin levantarlo ni salirse.",
    strokes: [
      { points: [{x:0.50,y:0.10},{x:0.50,y:0.35},{x:0.50,y:0.65},{x:0.50,y:0.90}], arrowAngle:90 },
    ],
  },
  CURVA: {
    tutorial: "Vamos a hacer curvas, como olas del mar. El dedo sube y baja suavemente siguiendo todos los puntitos, sin salirse.",
    strokes: [
      { points: [
        {x:0.10,y:0.50},{x:0.22,y:0.28},{x:0.38,y:0.50},
        {x:0.54,y:0.72},{x:0.70,y:0.50},{x:0.82,y:0.28},{x:0.90,y:0.50},
      ], arrowAngle:0 },
    ],
  },
  ZIGZAG: {
    tutorial: "Vamos a hacer zigzag. El dedo va arriba, luego abajo, luego arriba otra vez, siguiendo los puntitos en zigzag.",
    strokes: [
      { points: [
        {x:0.10,y:0.72},{x:0.28,y:0.28},{x:0.46,y:0.72},
        {x:0.64,y:0.28},{x:0.82,y:0.72},{x:0.90,y:0.72},
      ], arrowAngle:315 },
    ],
  },
  CIRCULO: {
    tutorial: "Vamos a hacer un círculo. Empieza en el punto azul y rodea todo con el dedo sin levantarlo, hasta volver al punto de inicio.",
    strokes: [
      { points: [
        {x:0.50,y:0.10},{x:0.78,y:0.18},{x:0.90,y:0.44},{x:0.90,y:0.58},
        {x:0.78,y:0.82},{x:0.50,y:0.90},{x:0.22,y:0.82},
        {x:0.10,y:0.58},{x:0.10,y:0.44},{x:0.22,y:0.18},{x:0.50,y:0.10},
      ], arrowAngle:315 },
    ],
  },
  ANGULO: {
    tutorial: "Vamos a hacer un ángulo, como una montaña. Hay que bajar el dedo hasta la punta y luego subir por el otro lado.",
    strokes: [
      { points: [
        {x:0.10,y:0.85},{x:0.28,y:0.55},{x:0.50,y:0.18},{x:0.72,y:0.55},{x:0.90,y:0.85},
      ], arrowAngle:315 },
    ],
  },

  // ── VOCALES ───────────────────────────────────────────────────────────────
  A: {
    tutorial: "Vamos a trazar la letra A. Tiene tres trazos. Primero bajamos por la izquierda, luego por la derecha, y por último trazamos la rayita del medio.",
    strokes: [
      { points: [{x:0.50,y:0.06},{x:0.38,y:0.38},{x:0.25,y:0.70},{x:0.18,y:0.93}], arrowAngle:135 },
      { points: [{x:0.50,y:0.06},{x:0.62,y:0.38},{x:0.75,y:0.70},{x:0.82,y:0.93}], arrowAngle:45  },
      { points: [{x:0.30,y:0.57},{x:0.50,y:0.57},{x:0.70,y:0.57}], arrowAngle:0   },
    ],
  },
  E: {
    tutorial: "Vamos a trazar la letra E. Tiene cuatro trazos: primero bajamos, y luego hacemos tres rayitas hacia la derecha, de arriba abajo.",
    strokes: [
      { points: [{x:0.27,y:0.08},{x:0.27,y:0.50},{x:0.27,y:0.92}], arrowAngle:90 },
      { points: [{x:0.27,y:0.08},{x:0.53,y:0.08},{x:0.78,y:0.08}], arrowAngle:0  },
      { points: [{x:0.27,y:0.50},{x:0.52,y:0.50},{x:0.72,y:0.50}], arrowAngle:0  },
      { points: [{x:0.27,y:0.92},{x:0.53,y:0.92},{x:0.78,y:0.92}], arrowAngle:0  },
    ],
  },
  I: {
    tutorial: "Vamos a trazar la letra I. Es una sola línea recta hacia abajo. Ponemos el dedo en el punto azul y bajamos sin torcernos.",
    strokes: [
      { points: [{x:0.50,y:0.08},{x:0.50,y:0.50},{x:0.50,y:0.92}], arrowAngle:90 },
    ],
  },
  O: {
    tutorial: "Vamos a trazar la letra O. Es un óvalo. Empezamos arriba y rodeamos todo con el dedo sin levantarlo, hasta volver al inicio.",
    strokes: [
      { points: [
        {x:0.50,y:0.05},{x:0.75,y:0.12},{x:0.90,y:0.35},{x:0.93,y:0.55},
        {x:0.85,y:0.77},{x:0.68,y:0.92},{x:0.50,y:0.95},
        {x:0.32,y:0.92},{x:0.15,y:0.77},{x:0.07,y:0.55},
        {x:0.10,y:0.35},{x:0.25,y:0.12},{x:0.50,y:0.05},
      ], arrowAngle:45 },
    ],
  },
  U: {
    tutorial: "Vamos a trazar la letra U. El dedo baja, se curva por abajo y vuelve a subir por el otro lado.",
    strokes: [
      { points: [
        {x:0.25,y:0.08},{x:0.25,y:0.40},{x:0.25,y:0.65},
        {x:0.30,y:0.82},{x:0.42,y:0.93},{x:0.55,y:0.95},
        {x:0.68,y:0.93},{x:0.75,y:0.82},{x:0.78,y:0.65},
        {x:0.78,y:0.40},{x:0.78,y:0.08},
      ], arrowAngle:90 },
    ],
  },

  // ── VOCALES MINÚSCULAS ────────────────────────────────────────────────────
  // Coordenadas para letras de imprenta en minúscula.
  // La letra ocupa el tercio central del canvas (x: 0.15–0.85, y: 0.20–0.85).

  a: {
    // Trazo 1: círculo (de derecha, hacia arriba, en sentido antihorario)
    // Trazo 2: trazo vertical bajando por el lado derecho del círculo
    tutorial: "Empieza en el punto azul, haz un circulo y luego baja el dedo por el lado.",
    strokes: [
      { points: [
          {x:0.72,y:0.38},{x:0.58,y:0.22},{x:0.40,y:0.22},{x:0.25,y:0.35},
          {x:0.22,y:0.52},{x:0.28,y:0.68},{x:0.45,y:0.78},{x:0.62,y:0.74},{x:0.72,y:0.60},
        ], arrowAngle: 270 },
      { points: [{x:0.72,y:0.22},{x:0.72,y:0.78}], arrowAngle: 90 },
    ],
  },

  e: {
    // Un solo trazo: empieza a la derecha del centro, va a la izquierda por el
    // ecuador (línea media), sube, rodea la letra y termina a la izquierda.
    tutorial: "Empieza en el punto azul, ve a la izquierda y rodea la letra con el dedo.",
    strokes: [
      { points: [
          {x:0.72,y:0.50},{x:0.50,y:0.50},{x:0.28,y:0.50},
          {x:0.22,y:0.40},{x:0.25,y:0.26},{x:0.42,y:0.20},
          {x:0.60,y:0.22},{x:0.75,y:0.33},{x:0.78,y:0.50},
          {x:0.72,y:0.66},{x:0.55,y:0.78},{x:0.35,y:0.75},{x:0.22,y:0.65},
        ], arrowAngle: 180 },
    ],
  },

  i: {
    // Trazo 1: palito vertical (zona media del canvas)
    // Trazo 2: el punto (trazo muy corto en la parte superior)
    tutorial: "Baja el dedo desde el punto azul. Luego marca el puntito de arriba.",
    strokes: [
      { points: [{x:0.50,y:0.33},{x:0.50,y:0.78}], arrowAngle: 90 },
      { points: [{x:0.44,y:0.16},{x:0.56,y:0.16}], arrowAngle: 0  },
    ],
  },

  o: {
    // Oval completa, sentido antihorario empezando por arriba
    tutorial: "Empieza en el punto azul y rodea con el dedo haciendo un ovalo cerrado.",
    strokes: [
      { points: [
          {x:0.50,y:0.20},{x:0.30,y:0.26},{x:0.20,y:0.42},
          {x:0.20,y:0.58},{x:0.30,y:0.74},{x:0.50,y:0.80},
          {x:0.70,y:0.74},{x:0.80,y:0.58},{x:0.80,y:0.42},
          {x:0.70,y:0.26},{x:0.50,y:0.20},
        ], arrowAngle: 225 },
    ],
  },

  u: {
    // Un solo trazo: baja por la izquierda, curva en el fondo, sube por la derecha
    tutorial: "Empieza en el punto azul, baja el dedo, curva abajo y sube por el otro lado.",
    strokes: [
      { points: [
          {x:0.28,y:0.22},{x:0.28,y:0.45},{x:0.28,y:0.60},
          {x:0.33,y:0.73},{x:0.50,y:0.80},{x:0.67,y:0.73},
          {x:0.72,y:0.60},{x:0.72,y:0.45},{x:0.72,y:0.22},
        ], arrowAngle: 90 },
    ],
  },

  // ── CONSONANTES ───────────────────────────────────────────────────────────
  B: {
    tutorial: "Baja el dedo desde el punto azul. Luego traza las dos curvas hacia la derecha.",
    strokes: [
      { points: [{x:0.25,y:0.08},{x:0.25,y:0.50},{x:0.25,y:0.92}], arrowAngle:90 },
      { points: [{x:0.25,y:0.08},{x:0.55,y:0.10},{x:0.72,y:0.22},{x:0.72,y:0.40},{x:0.55,y:0.52},{x:0.25,y:0.52}], arrowAngle:0 },
      { points: [{x:0.25,y:0.52},{x:0.58,y:0.55},{x:0.78,y:0.68},{x:0.78,y:0.80},{x:0.58,y:0.92},{x:0.25,y:0.92}], arrowAngle:0 },
    ],
  },
  C: {
    tutorial: "Empieza en el punto azul y curva el dedo hacia abajo rodeando la letra.",
    strokes: [
      { points: [
        {x:0.78,y:0.22},{x:0.60,y:0.08},{x:0.38,y:0.08},
        {x:0.18,y:0.22},{x:0.10,y:0.45},{x:0.10,y:0.60},
        {x:0.20,y:0.80},{x:0.42,y:0.93},{x:0.62,y:0.92},{x:0.78,y:0.80},
      ], arrowAngle:315 },
    ],
  },
  D: {
    tutorial: "Baja el dedo desde el punto azul. Luego traza la curva grande hacia la derecha.",
    strokes: [
      { points: [{x:0.25,y:0.08},{x:0.25,y:0.50},{x:0.25,y:0.92}], arrowAngle:90 },
      { points: [
        {x:0.25,y:0.08},{x:0.55,y:0.12},{x:0.78,y:0.30},
        {x:0.85,y:0.52},{x:0.78,y:0.72},{x:0.55,y:0.90},{x:0.25,y:0.92},
      ], arrowAngle:0 },
    ],
  },
  F: {
    tutorial: "Baja el dedo desde el punto azul. Traza la rayita de arriba y la del medio.",
    strokes: [
      { points: [{x:0.25,y:0.08},{x:0.25,y:0.50},{x:0.25,y:0.92}], arrowAngle:90 },
      { points: [{x:0.25,y:0.08},{x:0.52,y:0.08},{x:0.78,y:0.08}], arrowAngle:0  },
      { points: [{x:0.25,y:0.50},{x:0.50,y:0.50},{x:0.70,y:0.50}], arrowAngle:0  },
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
      ], arrowAngle:315 },
    ],
  },
  H: {
    tutorial: "Baja el dedo dos veces, una por cada lado. Luego traza la rayita del medio.",
    strokes: [
      { points: [{x:0.22,y:0.08},{x:0.22,y:0.50},{x:0.22,y:0.92}], arrowAngle:90 },
      { points: [{x:0.78,y:0.08},{x:0.78,y:0.50},{x:0.78,y:0.92}], arrowAngle:90 },
      { points: [{x:0.22,y:0.50},{x:0.50,y:0.50},{x:0.78,y:0.50}], arrowAngle:0  },
    ],
  },
  J: {
    tutorial: "Empieza en el punto azul, baja el dedo y curva hacia la izquierda abajo.",
    strokes: [
      { points: [
        {x:0.65,y:0.08},{x:0.65,y:0.40},{x:0.65,y:0.68},
        {x:0.60,y:0.83},{x:0.50,y:0.93},{x:0.35,y:0.93},{x:0.22,y:0.82},{x:0.18,y:0.68},
      ], arrowAngle:90 },
    ],
  },
  K: {
    tutorial: "Baja el dedo desde el punto azul. Luego traza las dos rayitas diagonales.",
    strokes: [
      { points: [{x:0.25,y:0.08},{x:0.25,y:0.50},{x:0.25,y:0.92}], arrowAngle:90  },
      { points: [{x:0.80,y:0.08},{x:0.55,y:0.35},{x:0.25,y:0.52}], arrowAngle:225 },
      { points: [{x:0.25,y:0.52},{x:0.52,y:0.70},{x:0.80,y:0.92}], arrowAngle:45  },
    ],
  },
  L: {
    tutorial: "Baja el dedo desde el punto azul y luego arrastra hacia la derecha.",
    strokes: [
      { points: [{x:0.30,y:0.08},{x:0.30,y:0.50},{x:0.30,y:0.92}], arrowAngle:90 },
      { points: [{x:0.30,y:0.92},{x:0.55,y:0.92},{x:0.80,y:0.92}], arrowAngle:0  },
    ],
  },
  M: {
    tutorial: "Sube el dedo desde el punto azul, baja al centro y vuelve a subir y bajar.",
    strokes: [
      { points: [
        {x:0.15,y:0.92},{x:0.15,y:0.60},{x:0.15,y:0.08},
        {x:0.35,y:0.38},{x:0.50,y:0.58},
        {x:0.65,y:0.38},{x:0.85,y:0.08},
        {x:0.85,y:0.60},{x:0.85,y:0.92},
      ], arrowAngle:270 },
    ],
  },
  N: {
    tutorial: "Sube el dedo, baja en diagonal y sube de nuevo por el otro lado.",
    strokes: [
      { points: [{x:0.22,y:0.92},{x:0.22,y:0.50},{x:0.22,y:0.08}], arrowAngle:270 },
      { points: [{x:0.22,y:0.08},{x:0.50,y:0.50},{x:0.78,y:0.92}], arrowAngle:135 },
      { points: [{x:0.78,y:0.92},{x:0.78,y:0.50},{x:0.78,y:0.08}], arrowAngle:270 },
    ],
  },
  P: {
    tutorial: "Baja el dedo desde el punto azul. Luego traza la curva de arriba a la derecha.",
    strokes: [
      { points: [{x:0.25,y:0.08},{x:0.25,y:0.50},{x:0.25,y:0.92}], arrowAngle:90 },
      { points: [
        {x:0.25,y:0.08},{x:0.55,y:0.10},{x:0.75,y:0.22},
        {x:0.78,y:0.38},{x:0.68,y:0.50},{x:0.45,y:0.55},{x:0.25,y:0.52},
      ], arrowAngle:0 },
    ],
  },
  Q: {
    tutorial: "Haz un ovalo desde el punto azul. Luego traza el rabito abajo a la derecha.",
    strokes: [
      { points: [
        {x:0.50,y:0.05},{x:0.75,y:0.12},{x:0.90,y:0.35},{x:0.93,y:0.55},
        {x:0.85,y:0.77},{x:0.68,y:0.92},{x:0.50,y:0.95},
        {x:0.32,y:0.92},{x:0.15,y:0.77},{x:0.07,y:0.55},
        {x:0.10,y:0.35},{x:0.25,y:0.12},{x:0.50,y:0.05},
      ], arrowAngle:45 },
      { points: [{x:0.58,y:0.72},{x:0.78,y:0.92}], arrowAngle:135 },
    ],
  },
  R: {
    tutorial: "Baja el dedo, traza la curva de arriba y luego la patita diagonal abajo.",
    strokes: [
      { points: [{x:0.25,y:0.08},{x:0.25,y:0.50},{x:0.25,y:0.92}], arrowAngle:90 },
      { points: [
        {x:0.25,y:0.08},{x:0.55,y:0.10},{x:0.75,y:0.22},
        {x:0.78,y:0.38},{x:0.68,y:0.50},{x:0.45,y:0.55},{x:0.25,y:0.52},
      ], arrowAngle:0 },
      { points: [{x:0.25,y:0.52},{x:0.52,y:0.70},{x:0.80,y:0.92}], arrowAngle:45 },
    ],
  },
  S: {
    tutorial: "Empieza en el punto azul, curva a la izquierda arriba y luego a la derecha abajo.",
    strokes: [
      { points: [
        {x:0.78,y:0.22},{x:0.60,y:0.08},{x:0.38,y:0.08},
        {x:0.20,y:0.22},{x:0.18,y:0.38},{x:0.32,y:0.48},
        {x:0.50,y:0.52},{x:0.68,y:0.57},{x:0.82,y:0.68},
        {x:0.80,y:0.82},{x:0.62,y:0.93},{x:0.38,y:0.93},{x:0.22,y:0.82},
      ], arrowAngle:315 },
    ],
  },
  T: {
    tutorial: "Traza la rayita de arriba con el dedo. Luego baja desde el punto azul.",
    strokes: [
      { points: [{x:0.15,y:0.08},{x:0.50,y:0.08},{x:0.85,y:0.08}], arrowAngle:0  },
      { points: [{x:0.50,y:0.08},{x:0.50,y:0.50},{x:0.50,y:0.92}], arrowAngle:90 },
    ],
  },
  V: {
    tutorial: "Baja el dedo desde el punto azul hasta la punta y luego sube al otro lado.",
    strokes: [
      { points: [{x:0.18,y:0.08},{x:0.38,y:0.50},{x:0.50,y:0.92}], arrowAngle:135 },
      { points: [{x:0.50,y:0.92},{x:0.62,y:0.50},{x:0.82,y:0.08}], arrowAngle:315 },
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
      ], arrowAngle:135 },
    ],
  },
  X: {
    tutorial: "Empieza en el punto azul y cruza el dedo en diagonal. Luego cruza al otro lado.",
    strokes: [
      { points: [{x:0.18,y:0.08},{x:0.50,y:0.50},{x:0.82,y:0.92}], arrowAngle:135 },
      { points: [{x:0.82,y:0.08},{x:0.50,y:0.50},{x:0.18,y:0.92}], arrowAngle:225 },
    ],
  },
  Y: {
    tutorial: "Baja los dos brazos desde arriba hasta el centro. Luego baja el palito.",
    strokes: [
      { points: [{x:0.18,y:0.08},{x:0.35,y:0.32},{x:0.50,y:0.52}], arrowAngle:135 },
      { points: [{x:0.82,y:0.08},{x:0.65,y:0.32},{x:0.50,y:0.52}], arrowAngle:225 },
      { points: [{x:0.50,y:0.52},{x:0.50,y:0.72},{x:0.50,y:0.92}], arrowAngle:90  },
    ],
  },
  Z: {
    tutorial: "Traza la rayita de arriba, baja en diagonal y traza la rayita de abajo.",
    strokes: [
      { points: [{x:0.18,y:0.08},{x:0.50,y:0.08},{x:0.82,y:0.08}], arrowAngle:0   },
      { points: [{x:0.82,y:0.08},{x:0.50,y:0.50},{x:0.18,y:0.92}], arrowAngle:225 },
      { points: [{x:0.18,y:0.92},{x:0.50,y:0.92},{x:0.82,y:0.92}], arrowAngle:0   },
    ],
  },

  // ── DÍGITOS ───────────────────────────────────────────────────────────────
  "0": {
    tutorial: "Empieza en el punto azul y rodea con el dedo haciendo un ovalo completo.",
    strokes: [
      { points: [
        {x:0.50,y:0.05},{x:0.75,y:0.12},{x:0.90,y:0.35},{x:0.93,y:0.55},
        {x:0.85,y:0.77},{x:0.68,y:0.92},{x:0.50,y:0.95},
        {x:0.32,y:0.92},{x:0.15,y:0.77},{x:0.07,y:0.55},
        {x:0.10,y:0.35},{x:0.25,y:0.12},{x:0.50,y:0.05},
      ], arrowAngle:45 },
    ],
  },
  "1": {
    tutorial: "Empieza en el punto azul y baja el dedo en linea recta hasta abajo.",
    strokes: [
      { points: [
        {x:0.38,y:0.30},{x:0.45,y:0.18},{x:0.52,y:0.08},
        {x:0.52,y:0.40},{x:0.52,y:0.70},{x:0.52,y:0.92},
      ], arrowAngle:315 },
    ],
  },
  "2": {
    tutorial: "Empieza en el punto azul, curva arriba y baja en diagonal hasta la rayita.",
    strokes: [
      { points: [
        {x:0.25,y:0.30},{x:0.32,y:0.12},{x:0.50,y:0.08},
        {x:0.72,y:0.12},{x:0.80,y:0.30},{x:0.75,y:0.48},
        {x:0.55,y:0.62},{x:0.30,y:0.78},{x:0.20,y:0.92},
        {x:0.50,y:0.92},{x:0.80,y:0.92},
      ], arrowAngle:315 },
    ],
  },
  "3": {
    tutorial: "Empieza en el punto azul, curva a la derecha arriba y luego curva abajo.",
    strokes: [
      { points: [
        {x:0.25,y:0.18},{x:0.45,y:0.08},{x:0.68,y:0.12},
        {x:0.80,y:0.30},{x:0.72,y:0.48},{x:0.52,y:0.52},
        {x:0.72,y:0.57},{x:0.82,y:0.72},{x:0.73,y:0.88},
        {x:0.52,y:0.95},{x:0.28,y:0.90},
      ], arrowAngle:315 },
    ],
  },
  "4": {
    tutorial: "Baja el dedo y traza la rayita cruzada. Luego baja el palito de la derecha.",
    strokes: [
      { points: [{x:0.70,y:0.08},{x:0.70,y:0.50},{x:0.70,y:0.92}], arrowAngle:90  },
      { points: [{x:0.70,y:0.08},{x:0.45,y:0.55},{x:0.15,y:0.68}], arrowAngle:225 },
      { points: [{x:0.15,y:0.68},{x:0.45,y:0.68},{x:0.85,y:0.68}], arrowAngle:0   },
    ],
  },
  "5": {
    tutorial: "Empieza en el punto azul, ve a la izquierda, baja y curva hacia la derecha.",
    strokes: [
      { points: [
        {x:0.78,y:0.08},{x:0.50,y:0.08},{x:0.25,y:0.08},
        {x:0.25,y:0.35},{x:0.25,y:0.55},
        {x:0.45,y:0.52},{x:0.72,y:0.58},
        {x:0.82,y:0.72},{x:0.75,y:0.88},
        {x:0.55,y:0.95},{x:0.28,y:0.92},{x:0.20,y:0.80},
      ], arrowAngle:180 },
    ],
  },
  "6": {
    tutorial: "Empieza en el punto azul, baja y curva cerrando el circulo de abajo.",
    strokes: [
      { points: [
        {x:0.75,y:0.15},{x:0.55,y:0.08},{x:0.32,y:0.15},
        {x:0.18,y:0.35},{x:0.15,y:0.58},{x:0.22,y:0.78},
        {x:0.42,y:0.93},{x:0.65,y:0.92},{x:0.82,y:0.78},
        {x:0.85,y:0.60},{x:0.75,y:0.45},{x:0.55,y:0.42},
        {x:0.30,y:0.48},{x:0.18,y:0.62},
      ], arrowAngle:225 },
    ],
  },
  "7": {
    tutorial: "Traza la rayita de arriba y luego baja el dedo en diagonal hasta abajo.",
    strokes: [
      { points: [
        {x:0.20,y:0.08},{x:0.50,y:0.08},{x:0.82,y:0.08},
        {x:0.65,y:0.38},{x:0.50,y:0.65},{x:0.40,y:0.92},
      ], arrowAngle:0 },
    ],
  },
  "8": {
    tutorial: "Empieza en el punto azul y haz dos circulos seguidos, uno arriba y otro abajo.",
    strokes: [
      // Bucle superior: start top, go right, down to middle
      { points: [
        {x:0.50,y:0.52},{x:0.50,y:0.08},{x:0.80,y:0.15},
        {x:0.83,y:0.35},{x:0.60,y:0.50},{x:0.50,y:0.52},
        {x:0.40,y:0.50},{x:0.17,y:0.35},
        {x:0.20,y:0.15},{x:0.50,y:0.08},
      ], arrowAngle:270 },
      // Bucle inferior
      { points: [
        {x:0.50,y:0.52},{x:0.78,y:0.60},{x:0.83,y:0.75},
        {x:0.72,y:0.90},{x:0.50,y:0.95},{x:0.28,y:0.90},
        {x:0.17,y:0.75},{x:0.22,y:0.60},{x:0.50,y:0.52},
      ], arrowAngle:45 },
    ],
  },
  "9": {
    tutorial: "Empieza en el punto azul, haz el circulo de arriba y luego baja el palito.",
    strokes: [
      { points: [
        {x:0.50,y:0.08},{x:0.75,y:0.15},{x:0.83,y:0.32},
        {x:0.80,y:0.50},{x:0.65,y:0.62},{x:0.45,y:0.65},
        {x:0.25,y:0.55},{x:0.18,y:0.38},{x:0.22,y:0.20},
        {x:0.38,y:0.10},{x:0.55,y:0.08},{x:0.72,y:0.12},
        {x:0.82,y:0.30},{x:0.83,y:0.55},{x:0.80,y:0.75},
        {x:0.68,y:0.92},{x:0.52,y:0.95},{x:0.38,y:0.92},
      ], arrowAngle:45 },
    ],
  },
};

// ── Secuencia de letras para topics de sílaba (flujo multi-paso) ─────────────
// Cada sílaba → array de claves de LETTER_DATA a trazar en orden.
// Después del último trazo el agente pide pronunciar la sílaba.

const SYLLABLE_LETTERS = {
  silaba_ma: ["M", "A"],
  silaba_mi: ["M", "I"],
  silaba_sa: ["S", "A"],
  silaba_la: ["L", "A"],
  silaba_pa: ["P", "A"],
};

/**
 * Devuelve las letras a trazar para un topic de sílaba, o null si no aplica.
 * @param {string} topicId
 * @returns {string[] | null}
 */
export function getSyllableLetters(topicId) {
  return SYLLABLE_LETTERS[topicId] ?? null;
}

/**
 * Devuelve los datos de trazado directamente por clave de LETTER_DATA.
 * Útil para sílabas donde necesitamos la clave del paso actual.
 * @param {string} key  — e.g. "M", "A", "LINEA_H"
 * @returns {{ key: string, strokes: object[] } | null}
 */
export function getCharDataByKey(key) {
  if (!key || !LETTER_DATA[key]) return null;
  return { key, ...LETTER_DATA[key] };
}

// ── Mapeo topicId → clave de LETTER_DATA ──────────────────────────────────

const TOPIC_MAP = {
  // Trazos pregráficos (edad 3)
  trazo_linea_h: "LINEA_H", trazo_linea_v: "LINEA_V",
  trazo_curva:   "CURVA",   trazo_zigzag:  "ZIGZAG",
  trazo_circulo: "CIRCULO", trazo_angulo:  "ANGULO",
  // Vocales mayúsculas
  vocal_a:       "A", vocal_e:       "E", vocal_i:       "I",
  vocal_o:       "O", vocal_u:       "U",
  // Vocales minúsculas
  vocal_a_min:   "a", vocal_e_min:   "e", vocal_i_min:   "i",
  vocal_o_min:   "o", vocal_u_min:   "u",
  // Números
  numero_1:      "1", numero_2:      "2", numero_3:      "3",
  numero_4:      "4", numero_5:      "5", numero_6:      "6",
  numero_7:      "7", numero_8:      "8", numero_9:      "9",
  // Consonantes fase 1 (edad 4) y fase 2 (edad 5)
  consonante_m:  "M", consonante_p:  "P", consonante_t:  "T",
  consonante_s:  "S", consonante_l:  "L", consonante_n:  "N",
  consonante_d:  "D", consonante_f:  "F", consonante_r:  "R",
  // Sílabas y palabras: sin canvas (devuelven null)
};

/**
 * Devuelve los datos de trazado para un topicId del currículo.
 * Retorna null si el topic no tiene datos de trazado (p.ej. temas no-letra).
 */
export function getCharData(topicId) {
  const key = TOPIC_MAP[topicId];
  if (!key) return null;
  return { key, ...LETTER_DATA[key] };
}
