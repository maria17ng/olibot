/**
 * ActivityPicker — full-screen overlay shown when the child is bored or tired.
 *
 * Cycles highlight over the cards and calls onHighlight with the spoken label
 * so OLIBOT narrates each option exactly as it lights up.
 *
 * Props:
 *   alternatives  [{ id, display_name, emoji }]  — unlocked topics ≠ current
 *   onSelect      ({ type: "topic"|"draw"|"stay", topicId? }) => void
 *   onHighlight   (label: string) => void
 *   hideDraw      bool  — when true, the drawing option is not shown (pair mode:
 *                         partners only do exercises, never free drawing).
 */
import { useState, useEffect } from "react";

const CYCLE_START    = 1600;  // ms before first highlight (OLIBOT finishes intro)
const CYCLE_INTERVAL = 1800;  // ms per card

// Strip special chars/symbols so TTS reads a natural name
function cleanName(name) {
  return name.replace(/[^a-zA-ZáéíóúüñÁÉÍÓÚÜÑ0-9\s]/g, "").replace(/\s+/g, " ").trim();
}

export default function ActivityPicker({ alternatives = [], onSelect, onHighlight, hideDraw = false }) {
  const topicCards = alternatives.slice(0, 3);

  // All items in order: topic cards + (draw card?) + stay card
  const totalItems = topicCards.length + (hideDraw ? 1 : 2);
  const [highlighted, setHighlighted] = useState(null);

  // Indices of the draw and stay (continue) buttons within the highlight cycle
  const drawIdx = hideDraw ? -1 : topicCards.length;
  const stayIdx = topicCards.length + (hideDraw ? 0 : 1);

  useEffect(() => {
    const timers = topicCards.map((t, i) =>
      setTimeout(() => {
        setHighlighted(i);
        onHighlight?.(cleanName(t.display_name));
      }, CYCLE_START + i * CYCLE_INTERVAL)
    );
    const tDraw = hideDraw ? null : setTimeout(() => {
      setHighlighted(drawIdx);
      onHighlight?.("Dibujar");
    }, CYCLE_START + drawIdx * CYCLE_INTERVAL);
    const tStay = setTimeout(() => {
      setHighlighted(stayIdx);
      onHighlight?.("Seguir con lo de ahora");
    }, CYCLE_START + stayIdx * CYCLE_INTERVAL);
    const clear = setTimeout(() => setHighlighted(null), CYCLE_START + totalItems * CYCLE_INTERVAL);
    return () => { timers.forEach(clearTimeout); if (tDraw) clearTimeout(tDraw); clearTimeout(tStay); clearTimeout(clear); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const cardStyle = (hl) => ({
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "0",
    padding: "20px 10px",
    borderRadius: "24px",
    border: hl ? "4px solid #4a90d9" : "3px solid #e5e7eb",
    background: hl ? "#e8f0fb" : "white",
    cursor: "pointer",
    boxShadow: hl
      ? "0 0 0 7px rgba(74,144,217,0.22), 0 6px 18px rgba(74,144,217,0.18)"
      : "0 4px 14px rgba(0,0,0,0.08)",
    minHeight: "130px",
    transform: hl ? "scale(1.08)" : "scale(1)",
    transition: "transform 0.2s, box-shadow 0.2s, border-color 0.2s",
  });

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 180,
        background: "rgba(20,30,60,0.72)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
    >
      <div
        style={{
          background: "linear-gradient(160deg, #fff9e6 0%, #e8f4ff 100%)",
          borderRadius: "28px",
          padding: "20px 20px 18px",
          maxWidth: "420px",
          width: "100%",
          boxShadow: "0 12px 48px rgba(0,0,0,0.35)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "16px",
        }}
      >
        {/* No static title — OLIBOT speaks the question from ChatWindow */}

        {/* Activity cards grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: topicCards.length === 0 ? "1fr" : "repeat(auto-fit, minmax(100px, 1fr))",
            gap: "12px",
            width: "100%",
          }}
        >
          {topicCards.map((t, i) => (
            <button
              key={t.id}
              onClick={() => onSelect({ type: "topic", topicId: t.id })}
              style={cardStyle(highlighted === i)}
              onPointerDown={e => (e.currentTarget.style.transform = "scale(0.94)")}
              onPointerUp={e => (e.currentTarget.style.transform = highlighted === i ? "scale(1.08)" : "scale(1)")}
              onPointerLeave={e => (e.currentTarget.style.transform = highlighted === i ? "scale(1.08)" : "scale(1)")}
            >
              <span style={{ fontSize: "64px", lineHeight: 1 }}>{t.emoji || "📖"}</span>
            </button>
          ))}

          {/* Draw option — hidden in pair mode (exercises only) */}
          {!hideDraw && (
          <button
            onClick={() => onSelect({ type: "draw" })}
            style={{
              ...cardStyle(highlighted === drawIdx),
              border: highlighted === drawIdx ? "4px solid #f59e0b" : "3px solid #f59e0b",
              background: highlighted === drawIdx ? "#fff7ed" : "white",
              boxShadow: highlighted === drawIdx
                ? "0 0 0 7px rgba(245,158,11,0.22), 0 6px 18px rgba(245,158,11,0.18)"
                : "0 4px 14px rgba(245,158,11,0.12)",
            }}
            onPointerDown={e => (e.currentTarget.style.transform = "scale(0.94)")}
            onPointerUp={e => (e.currentTarget.style.transform = "scale(1)")}
            onPointerLeave={e => (e.currentTarget.style.transform = "scale(1)")}
          >
            <span style={{ fontSize: "64px", lineHeight: 1 }}>🎨</span>
          </button>
          )}
        </div>

        {/* Stay / continue with the current activity — 💪 (narrated as "Seguir con lo de ahora") */}
        <button
          onClick={() => onSelect({ type: "stay" })}
          style={{
            width: highlighted === stayIdx ? "76px" : "56px",
            height: highlighted === stayIdx ? "76px" : "56px",
            borderRadius: "50%",
            border: highlighted === stayIdx ? "4px solid #16a34a" : "2px solid #d1d5db",
            background: highlighted === stayIdx ? "#ecfdf5" : "rgba(255,255,255,0.7)",
            cursor: "pointer",
            fontSize: highlighted === stayIdx ? "40px" : "30px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: highlighted === stayIdx
              ? "0 0 0 7px rgba(22,163,74,0.20), 0 6px 18px rgba(22,163,74,0.25)"
              : "none",
            transform: highlighted === stayIdx ? "scale(1.08)" : "scale(1)",
            transition: "transform 0.2s, box-shadow 0.2s, width 0.2s, height 0.2s, font-size 0.2s",
          }}
        >
          💪
        </button>
      </div>
    </div>
  );
}
