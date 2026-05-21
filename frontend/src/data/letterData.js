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
    strokes: [
      { points: [{x:0.10,y:0.50},{x:0.35,y:0.50},{x:0.60,y:0.50},{x:0.90,y:0.50}], arrowAngle:0 },
    ],
  },
  LINEA_V: {
    strokes: [
      { points: [{x:0.50,y:0.10},{x:0.50,y:0.35},{x:0.50,y:0.65},{x:0.50,y:0.90}], arrowAngle:90 },
    ],
  },
  CURVA: {
    strokes: [
      { points: [
        {x:0.10,y:0.50},{x:0.22,y:0.28},{x:0.38,y:0.50},
        {x:0.54,y:0.72},{x:0.70,y:0.50},{x:0.82,y:0.28},{x:0.90,y:0.50},
      ], arrowAngle:0 },
    ],
  },
  ZIGZAG: {
    strokes: [
      { points: [
        {x:0.10,y:0.72},{x:0.28,y:0.28},{x:0.46,y:0.72},
        {x:0.64,y:0.28},{x:0.82,y:0.72},{x:0.90,y:0.72},
      ], arrowAngle:315 },
    ],
  },
  CIRCULO: {
    strokes: [
      { points: [
        {x:0.50,y:0.10},{x:0.78,y:0.18},{x:0.90,y:0.44},{x:0.90,y:0.58},
        {x:0.78,y:0.82},{x:0.50,y:0.90},{x:0.22,y:0.82},
        {x:0.10,y:0.58},{x:0.10,y:0.44},{x:0.22,y:0.18},{x:0.50,y:0.10},
      ], arrowAngle:315 },
    ],
  },
  ANGULO: {
    strokes: [
      { points: [
        {x:0.10,y:0.85},{x:0.28,y:0.55},{x:0.50,y:0.18},{x:0.72,y:0.55},{x:0.90,y:0.85},
      ], arrowAngle:315 },
    ],
  },

  // ── VOCALES ───────────────────────────────────────────────────────────────
  A: {
    strokes: [
      { points: [{x:0.50,y:0.06},{x:0.38,y:0.38},{x:0.25,y:0.70},{x:0.18,y:0.93}], arrowAngle:135 },
      { points: [{x:0.50,y:0.06},{x:0.62,y:0.38},{x:0.75,y:0.70},{x:0.82,y:0.93}], arrowAngle:45  },
      { points: [{x:0.30,y:0.57},{x:0.50,y:0.57},{x:0.70,y:0.57}], arrowAngle:0   },
    ],
  },
  E: {
    strokes: [
      { points: [{x:0.27,y:0.08},{x:0.27,y:0.50},{x:0.27,y:0.92}], arrowAngle:90 },
      { points: [{x:0.27,y:0.08},{x:0.53,y:0.08},{x:0.78,y:0.08}], arrowAngle:0  },
      { points: [{x:0.27,y:0.50},{x:0.52,y:0.50},{x:0.72,y:0.50}], arrowAngle:0  },
      { points: [{x:0.27,y:0.92},{x:0.53,y:0.92},{x:0.78,y:0.92}], arrowAngle:0  },
    ],
  },
  I: {
    strokes: [
      { points: [{x:0.50,y:0.08},{x:0.50,y:0.50},{x:0.50,y:0.92}], arrowAngle:90 },
    ],
  },
  O: {
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
    strokes: [
      { points: [{x:0.50,y:0.33},{x:0.50,y:0.78}], arrowAngle: 90 },
      { points: [{x:0.44,y:0.16},{x:0.56,y:0.16}], arrowAngle: 0  },
    ],
  },

  o: {
    // Oval completa, sentido antihorario empezando por arriba
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
    strokes: [
      { points: [{x:0.25,y:0.08},{x:0.25,y:0.50},{x:0.25,y:0.92}], arrowAngle:90 },
      { points: [{x:0.25,y:0.08},{x:0.55,y:0.10},{x:0.72,y:0.22},{x:0.72,y:0.40},{x:0.55,y:0.52},{x:0.25,y:0.52}], arrowAngle:0 },
      { points: [{x:0.25,y:0.52},{x:0.58,y:0.55},{x:0.78,y:0.68},{x:0.78,y:0.80},{x:0.58,y:0.92},{x:0.25,y:0.92}], arrowAngle:0 },
    ],
  },
  C: {
    strokes: [
      { points: [
        {x:0.78,y:0.22},{x:0.60,y:0.08},{x:0.38,y:0.08},
        {x:0.18,y:0.22},{x:0.10,y:0.45},{x:0.10,y:0.60},
        {x:0.20,y:0.80},{x:0.42,y:0.93},{x:0.62,y:0.92},{x:0.78,y:0.80},
      ], arrowAngle:315 },
    ],
  },
  D: {
    strokes: [
      { points: [{x:0.25,y:0.08},{x:0.25,y:0.50},{x:0.25,y:0.92}], arrowAngle:90 },
      { points: [
        {x:0.25,y:0.08},{x:0.55,y:0.12},{x:0.78,y:0.30},
        {x:0.85,y:0.52},{x:0.78,y:0.72},{x:0.55,y:0.90},{x:0.25,y:0.92},
      ], arrowAngle:0 },
    ],
  },
  F: {
    strokes: [
      { points: [{x:0.25,y:0.08},{x:0.25,y:0.50},{x:0.25,y:0.92}], arrowAngle:90 },
      { points: [{x:0.25,y:0.08},{x:0.52,y:0.08},{x:0.78,y:0.08}], arrowAngle:0  },
      { points: [{x:0.25,y:0.50},{x:0.50,y:0.50},{x:0.70,y:0.50}], arrowAngle:0  },
    ],
  },
  G: {
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
    strokes: [
      { points: [{x:0.22,y:0.08},{x:0.22,y:0.50},{x:0.22,y:0.92}], arrowAngle:90 },
      { points: [{x:0.78,y:0.08},{x:0.78,y:0.50},{x:0.78,y:0.92}], arrowAngle:90 },
      { points: [{x:0.22,y:0.50},{x:0.50,y:0.50},{x:0.78,y:0.50}], arrowAngle:0  },
    ],
  },
  J: {
    strokes: [
      { points: [
        {x:0.65,y:0.08},{x:0.65,y:0.40},{x:0.65,y:0.68},
        {x:0.60,y:0.83},{x:0.50,y:0.93},{x:0.35,y:0.93},{x:0.22,y:0.82},{x:0.18,y:0.68},
      ], arrowAngle:90 },
    ],
  },
  K: {
    strokes: [
      { points: [{x:0.25,y:0.08},{x:0.25,y:0.50},{x:0.25,y:0.92}], arrowAngle:90  },
      { points: [{x:0.80,y:0.08},{x:0.55,y:0.35},{x:0.25,y:0.52}], arrowAngle:225 },
      { points: [{x:0.25,y:0.52},{x:0.52,y:0.70},{x:0.80,y:0.92}], arrowAngle:45  },
    ],
  },
  L: {
    strokes: [
      { points: [{x:0.30,y:0.08},{x:0.30,y:0.50},{x:0.30,y:0.92}], arrowAngle:90 },
      { points: [{x:0.30,y:0.92},{x:0.55,y:0.92},{x:0.80,y:0.92}], arrowAngle:0  },
    ],
  },
  M: {
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
    strokes: [
      { points: [{x:0.22,y:0.92},{x:0.22,y:0.50},{x:0.22,y:0.08}], arrowAngle:270 },
      { points: [{x:0.22,y:0.08},{x:0.50,y:0.50},{x:0.78,y:0.92}], arrowAngle:135 },
      { points: [{x:0.78,y:0.92},{x:0.78,y:0.50},{x:0.78,y:0.08}], arrowAngle:270 },
    ],
  },
  P: {
    strokes: [
      { points: [{x:0.25,y:0.08},{x:0.25,y:0.50},{x:0.25,y:0.92}], arrowAngle:90 },
      { points: [
        {x:0.25,y:0.08},{x:0.55,y:0.10},{x:0.75,y:0.22},
        {x:0.78,y:0.38},{x:0.68,y:0.50},{x:0.45,y:0.55},{x:0.25,y:0.52},
      ], arrowAngle:0 },
    ],
  },
  Q: {
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
    strokes: [
      { points: [{x:0.15,y:0.08},{x:0.50,y:0.08},{x:0.85,y:0.08}], arrowAngle:0  },
      { points: [{x:0.50,y:0.08},{x:0.50,y:0.50},{x:0.50,y:0.92}], arrowAngle:90 },
    ],
  },
  V: {
    strokes: [
      { points: [{x:0.18,y:0.08},{x:0.38,y:0.50},{x:0.50,y:0.92}], arrowAngle:135 },
      { points: [{x:0.50,y:0.92},{x:0.62,y:0.50},{x:0.82,y:0.08}], arrowAngle:315 },
    ],
  },
  W: {
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
    strokes: [
      { points: [{x:0.18,y:0.08},{x:0.50,y:0.50},{x:0.82,y:0.92}], arrowAngle:135 },
      { points: [{x:0.82,y:0.08},{x:0.50,y:0.50},{x:0.18,y:0.92}], arrowAngle:225 },
    ],
  },
  Y: {
    strokes: [
      { points: [{x:0.18,y:0.08},{x:0.35,y:0.32},{x:0.50,y:0.52}], arrowAngle:135 },
      { points: [{x:0.82,y:0.08},{x:0.65,y:0.32},{x:0.50,y:0.52}], arrowAngle:225 },
      { points: [{x:0.50,y:0.52},{x:0.50,y:0.72},{x:0.50,y:0.92}], arrowAngle:90  },
    ],
  },
  Z: {
    strokes: [
      { points: [{x:0.18,y:0.08},{x:0.50,y:0.08},{x:0.82,y:0.08}], arrowAngle:0   },
      { points: [{x:0.82,y:0.08},{x:0.50,y:0.50},{x:0.18,y:0.92}], arrowAngle:225 },
      { points: [{x:0.18,y:0.92},{x:0.50,y:0.92},{x:0.82,y:0.92}], arrowAngle:0   },
    ],
  },

  // ── DÍGITOS ───────────────────────────────────────────────────────────────
  "0": {
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
    strokes: [
      { points: [
        {x:0.38,y:0.30},{x:0.45,y:0.18},{x:0.52,y:0.08},
        {x:0.52,y:0.40},{x:0.52,y:0.70},{x:0.52,y:0.92},
      ], arrowAngle:315 },
    ],
  },
  "2": {
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
    strokes: [
      { points: [{x:0.70,y:0.08},{x:0.70,y:0.50},{x:0.70,y:0.92}], arrowAngle:90  },
      { points: [{x:0.70,y:0.08},{x:0.45,y:0.55},{x:0.15,y:0.68}], arrowAngle:225 },
      { points: [{x:0.15,y:0.68},{x:0.45,y:0.68},{x:0.85,y:0.68}], arrowAngle:0   },
    ],
  },
  "5": {
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
    strokes: [
      { points: [
        {x:0.20,y:0.08},{x:0.50,y:0.08},{x:0.82,y:0.08},
        {x:0.65,y:0.38},{x:0.50,y:0.65},{x:0.40,y:0.92},
      ], arrowAngle:0 },
    ],
  },
  "8": {
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
