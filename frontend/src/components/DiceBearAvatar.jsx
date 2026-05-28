/**
 * DiceBearAvatar — avatar de robot generado con DiceBear (@dicebear/collection v9).
 *
 * Utiliza el estilo "bottts": robots coloridos planos estilo icono.
 * Cada estudiante obtiene un robot único basado en su nombre (seed determinista).
 *
 * Estados de animación (CSS puro sobre el contenedor SVG):
 *   idle      → flota arriba/abajo suavemente
 *   speaking  → rebota (simula hablar)
 *   listening → pulsa (me están escuchando)
 *   thinking  → oscila + desaturado (estoy procesando)
 *
 * Dependencias: @dicebear/core, @dicebear/collection (MIT, ~20 KB gzip, offline)
 */
import { useMemo } from "react";
import { createAvatar } from "@dicebear/core";
import { bottts } from "@dicebear/collection";

// Paleta de colores de fondo por carácter del seed (módulo 8)
const BASE_COLORS = [
  "b6e3f5", // azul claro
  "c0aede", // lila
  "d1d4f9", // violeta claro
  "ffd5dc", // rosa claro
  "ffeba4", // amarillo claro
  "a8e6cf", // verde menta
  "ffd3b6", // naranja claro
  "dcedc1", // verde lima
];

const KEYFRAMES = `
  @keyframes dbFloat   { 0%,100%{transform:translateY(0)}    50%{transform:translateY(-10px)} }
  @keyframes dbBounce  { 0%,100%{transform:scale(1)}          50%{transform:scale(0.9) translateY(5px)} }
  @keyframes dbPulse   { 0%,100%{transform:scale(1)}          50%{transform:scale(1.12)} }
  @keyframes dbWobble  { 0%,100%{transform:rotate(0deg)}      25%{transform:rotate(-6deg)} 75%{transform:rotate(6deg)} }
`;

export default function DiceBearAvatar({ seed = "olibot", state = "idle", size = 120 }) {
  // Pick a deterministic background color from the seed string
  const colorIdx = useMemo(() => {
    let h = 0;
    for (let i = 0; i < String(seed).length; i++) h = (h * 31 + String(seed).charCodeAt(i)) & 0xffff;
    return h % BASE_COLORS.length;
  }, [seed]);

  const svgString = useMemo(() => {
    return createAvatar(bottts, {
      seed: String(seed),
      size,
      baseColor: [BASE_COLORS[colorIdx]],
    }).toString();
  }, [seed, size, colorIdx]);

  const animation =
    state === "speaking"  ? "dbBounce 0.45s ease-in-out infinite" :
    state === "listening" ? "dbPulse  1.1s  ease-in-out infinite" :
    state === "thinking"  ? "dbWobble 0.7s  ease-in-out infinite" :
    /* idle */              "dbFloat  3.2s  ease-in-out infinite";

  return (
    <>
      <style>{KEYFRAMES}</style>
      <div
        style={{
          display: "inline-block",
          animation,
          filter: state === "thinking" ? "grayscale(0.3) brightness(0.88)" : "none",
          transition: "filter 0.3s",
          lineHeight: 0,
        }}
        // DiceBear returns sanitised SVG — safe to inject inline
        dangerouslySetInnerHTML={{ __html: svgString }}
      />
    </>
  );
}