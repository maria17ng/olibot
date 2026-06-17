/**
 * RestBreakPicker — overlay shown after 3 minutes of free drawing.
 * OLIBOT already spoke the question ("¿Seguimos dibujando o volvemos a las letras?")
 * when the timer fired. This component cycles a highlight and calls onHighlight
 * so OLIBOT narrates each button exactly when it lights up.
 * No text on screen — child doesn't read, everything is guided by voice + glow.
 *
 * Props:
 *   onContinueDraw   () => void
 *   onGoToLetters    () => void
 *   onHighlight      (label: string) => void
 */
import { useState, useEffect } from "react";

// Delay before first highlight (question takes ~2s to speak at 0.8 rate)
const CYCLE_START    = 1900;
const CYCLE_INTERVAL = 2000;

export default function RestBreakPicker({ onContinueDraw, onGoToLetters, onHighlight }) {
  const [highlighted, setHighlighted] = useState(null); // null | "draw" | "letters"

  useEffect(() => {
    const t1 = setTimeout(() => { setHighlighted("draw");    onHighlight?.("Seguir dibujando");  }, CYCLE_START);
    const t2 = setTimeout(() => { setHighlighted("letters"); onHighlight?.("Volver a las letras"); }, CYCLE_START + CYCLE_INTERVAL);
    const t3 = setTimeout(() => setHighlighted(null), CYCLE_START + CYCLE_INTERVAL * 2);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const btnBase = {
    flex: 1,
    padding: "22px 16px",
    borderRadius: "22px",
    border: "none",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "0",
    transition: "transform 0.2s, box-shadow 0.2s",
  };

  const hlDraw    = highlighted === "draw";
  const hlLetters = highlighted === "letters";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 180,
        background: "rgba(0,0,0,0.45)",
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
          padding: "24px 22px 20px",
          boxShadow: "0 12px 48px rgba(0,0,0,0.30)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "16px",
          maxWidth: "320px",
          width: "90vw",
        }}
      >
        {/* No static title — OLIBOT speaks the question */}

        <div style={{ display: "flex", gap: "14px", width: "100%" }}>
          {/* Continue drawing */}
          <button
            onClick={onContinueDraw}
            style={{
              ...btnBase,
              background: hlDraw ? "#fff7ed" : "#f59e0b",
              border: hlDraw ? "4px solid #f59e0b" : "none",
              boxShadow: hlDraw
                ? "0 0 0 7px rgba(245,158,11,0.22), 0 6px 18px rgba(245,158,11,0.35)"
                : "0 4px 12px rgba(0,0,0,0.18)",
              transform: hlDraw ? "scale(1.10)" : "scale(1)",
            }}
          >
            <span style={{ fontSize: hlDraw ? "88px" : "64px", lineHeight: 1, transition: "font-size 0.2s" }}>
              ✏️
            </span>
          </button>

          {/* Go to letters */}
          <button
            onClick={onGoToLetters}
            style={{
              ...btnBase,
              background: hlLetters ? "#eff6ff" : "#4a90d9",
              border: hlLetters ? "4px solid #4a90d9" : "none",
              boxShadow: hlLetters
                ? "0 0 0 7px rgba(74,144,217,0.22), 0 6px 18px rgba(74,144,217,0.35)"
                : "0 4px 12px rgba(0,0,0,0.18)",
              transform: hlLetters ? "scale(1.10)" : "scale(1)",
            }}
          >
            <span style={{ fontSize: hlLetters ? "88px" : "64px", lineHeight: 1, transition: "font-size 0.2s" }}>
              🔤
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
