import { useEffect, useRef, useState } from "react";
import LetterTracing from "./LetterTracing";
import { getCharDataByKey } from "../data/letterData";

/**
 * Touch/visual panel for the initial placement assessment (#8B).
 *
 * The child never uses the microphone here: every step is solved by drawing,
 * writing or tapping. The backend assessment engine drives the flow and only
 * tells us, per step, what to render via `ui`:
 *   - kind "draw"   → a blank canvas; the child draws a line, then taps "¡Ya está!".
 *   - kind "trace"  → the guided LetterTracing canvas for `ui.char`; the child
 *                     writes that glyph (a real handwriting check).
 *   - kind "choice" → big tappable cards (`options`); the child taps the glyph.
 *
 * On a draw-finish, a completed trace or a card-tap we call `onAnswer(value)`,
 * which sends the value through the normal chat stream so the engine can grade
 * it. We disable input while OLIBOT is speaking/thinking and right after a send
 * (until the next step arrives) to prevent double answers.
 */
export default function AssessmentPanel({ ui, disabled, onAnswer }) {
  const kind    = ui?.kind;
  const options = ui?.options ?? [];

  // Re-enable input whenever a new step (ui) arrives.
  const [sent, setSent] = useState(false);
  useEffect(() => { setSent(false); }, [ui]);

  const locked = disabled || sent;

  const answer = (value) => {
    if (locked) return;
    setSent(true);
    onAnswer(value);
  };

  if (kind === "choice") {
    return (
      <Overlay>
        <div style={CARD_ROW}>
          {options.map((opt) => (
            <button
              key={opt}
              onClick={() => answer(opt)}
              disabled={locked}
              style={{
                ...GLYPH_CARD,
                cursor: locked ? "default" : "pointer",
                opacity: locked ? 0.55 : 1,
              }}
            >
              {opt}
            </button>
          ))}
        </div>
      </Overlay>
    );
  }

  if (kind === "trace") {
    const charData = getCharDataByKey(ui.char, 0); // level 0 = más puntos de guía
    if (!charData) {
      // Defensive: unknown glyph — let the child continue rather than get stuck.
      return null;
    }
    return (
      <Overlay>
        <div style={TRACE_BOX}>
          <LetterTracing
            key={ui.char}
            charData={charData}
            hintLevel={3}
            minimal
            skipInitialDemo
            disabled={locked}
            onComplete={() => answer("ya")}
            title={`Escribe la ${ui.char}`}
          />
        </div>
      </Overlay>
    );
  }

  if (kind === "draw") {
    return (
      <Overlay>
        <DrawCanvas locked={locked} onDone={() => answer("ya")} />
      </Overlay>
    );
  }

  return null;
}

// ── Free-draw canvas for the warm-up "draw a line" step ──────────────────────
function DrawCanvas({ locked, onDone }) {
  const canvasRef = useRef(null);
  const drawingRef = useRef(false);
  const [hasInk, setHasInk] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 10;
    ctx.strokeStyle = "#4a90d9";

    const pos = (e) => {
      const rect = canvas.getBoundingClientRect();
      const p = e.touches ? e.touches[0] : e;
      return { x: p.clientX - rect.left, y: p.clientY - rect.top };
    };
    const start = (e) => {
      if (locked) return;
      e.preventDefault();
      drawingRef.current = true;
      const { x, y } = pos(e);
      ctx.beginPath();
      ctx.moveTo(x, y);
    };
    const move = (e) => {
      if (!drawingRef.current) return;
      e.preventDefault();
      const { x, y } = pos(e);
      ctx.lineTo(x, y);
      ctx.stroke();
      if (!hasInk) setHasInk(true);
    };
    const end = () => { drawingRef.current = false; };

    canvas.addEventListener("pointerdown", start);
    canvas.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
    return () => {
      canvas.removeEventListener("pointerdown", start);
      canvas.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
    };
  }, [locked, hasInk]);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "14px" }}>
      <canvas
        ref={canvasRef}
        width={520}
        height={300}
        style={{
          width: "min(80vw, 520px)",
          height: "min(46vh, 300px)",
          background: "white",
          borderRadius: "24px",
          border: "4px dashed #b9d4f0",
          touchAction: "none",
          boxShadow: "0 8px 28px rgba(0,0,0,0.18)",
        }}
      />
      <button
        onClick={onDone}
        disabled={locked || !hasInk}
        style={{
          ...DONE_BTN,
          opacity: locked || !hasInk ? 0.45 : 1,
          cursor: locked || !hasInk ? "default" : "pointer",
        }}
      >
        ¡Ya está! ✔️
      </button>
    </div>
  );
}

// ── Layout: centered overlay that leaves avatar & menu visible ───────────────
function Overlay({ children }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 26,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "90px 16px 16px",
        boxSizing: "border-box",
        pointerEvents: "none",
      }}
    >
      <div style={{ pointerEvents: "auto" }}>{children}</div>
    </div>
  );
}

const CARD_ROW = {
  display: "flex",
  gap: "20px",
  flexWrap: "wrap",
  justifyContent: "center",
};

const TRACE_BOX = {
  width: "min(80vw, 460px)",
  height: "min(56vh, 460px)",
  background: "white",
  borderRadius: "24px",
  border: "4px solid #b9d4f0",
  boxShadow: "0 8px 28px rgba(0,0,0,0.18)",
  padding: "12px",
  boxSizing: "border-box",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const GLYPH_CARD = {
  width: "clamp(110px, 24vw, 170px)",
  height: "clamp(130px, 30vh, 200px)",
  borderRadius: "26px",
  border: "4px solid #4a90d9",
  background: "white",
  color: "#1e3a5f",
  fontSize: "clamp(64px, 14vw, 110px)",
  fontWeight: 800,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  boxShadow: "0 8px 28px rgba(0,0,0,0.18)",
  userSelect: "none",
};

const DONE_BTN = {
  border: "none",
  background: "#16a34a",
  color: "white",
  fontSize: "26px",
  fontWeight: 700,
  padding: "14px 34px",
  borderRadius: "30px",
  boxShadow: "0 6px 20px rgba(22,163,74,0.4)",
};
