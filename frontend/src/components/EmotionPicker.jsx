/**
 * EmotionPicker — overlay de check-in emocional para niños.
 * OLIBOT ya habrá preguntado "¿Cómo estás ahora mismo?" por voz (desde ChatWindow).
 * El componente cicla el resaltado y llama onHighlight con el nombre de cada opción
 * para que OLIBOT lo diga exactamente cuando se ilumina el botón.
 *
 * Props:
 *   onSelect     (emotion: "happy"|"neutral"|"angry"|"tired") => void
 *   onHighlight  (label: string) => void
 */
import { useState, useEffect } from "react";

const EMOTIONS = [
  { key: "happy",   emoji: "😄", label: "¡Bien!" },
  { key: "neutral", emoji: "😐", label: "Normal" },
  { key: "angry",   emoji: "😤", label: "Enfadado" },
  { key: "tired",   emoji: "😴", label: "Cansado" },
];

// Delay before first highlight (let OLIBOT finish asking "¿Cómo estás ahora mismo?"
// before the first emoji label is spoken, otherwise the question gets cut off). — #14
const CYCLE_START    = 2600;
const CYCLE_INTERVAL = 1800;

export default function EmotionPicker({ onSelect, onHighlight }) {
  const [highlighted, setHighlighted] = useState(null);

  useEffect(() => {
    const timers = EMOTIONS.map((e, i) =>
      setTimeout(() => {
        setHighlighted(e.key);
        onHighlight?.(e.label); // OLIBOT speaks the label in sync with highlight
      }, CYCLE_START + i * CYCLE_INTERVAL)
    );
    const clear = setTimeout(() => setHighlighted(null), CYCLE_START + EMOTIONS.length * CYCLE_INTERVAL);
    return () => { timers.forEach(clearTimeout); clearTimeout(clear); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        background: "rgba(0,0,0,0.50)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backdropFilter: "blur(4px)",
      }}
    >
      <div
        style={{
          background: "white",
          borderRadius: "28px",
          padding: "22px 22px 18px",
          boxShadow: "0 12px 48px rgba(0,0,0,0.30)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "14px",
          maxWidth: "360px",
          width: "92vw",
        }}
      >
        {/* No static title — OLIBOT speaks the question */}
        <div style={{ display: "flex", gap: "14px", flexWrap: "wrap", justifyContent: "center" }}>
          {EMOTIONS.map(e => {
            const hl = highlighted === e.key;
            return (
              <button
                key={e.key}
                onClick={() => onSelect(e.key)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "18px 20px",
                  background: hl ? "#e8f0fb" : "white",
                  border: hl ? "3px solid #4a90d9" : "2.5px solid #e5e7eb",
                  borderRadius: "24px",
                  cursor: "pointer",
                  fontSize: "72px",
                  lineHeight: 1,
                  minWidth: "106px",
                  boxShadow: hl
                    ? "0 0 0 7px rgba(74,144,217,0.22), 0 6px 18px rgba(74,144,217,0.20)"
                    : "0 2px 8px rgba(0,0,0,0.08)",
                  transform: hl ? "scale(1.15)" : "scale(1)",
                  transition: "border-color 0.2s, transform 0.2s, box-shadow 0.2s",
                }}
              >
                {e.emoji}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
