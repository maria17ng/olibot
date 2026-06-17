/**
 * LetterTracing — canvas de trazado para niños de 3-5 años.
 *
 * Fases visuales:
 *   demo    → cursor rojo animado muestra cómo trazar; banner "¡Mira!" + "Toca para saltar"
 *   tracing → el niño dibuja; pequeño botón "🔄" flotante para reiniciar
 *   done    → overlay verde/naranja con resultado
 *
 * Props:
 *   charData   {key, strokes, tutorial?}  Del letterData.js. null → no se muestra.
 *   hintLevel  1|2|3
 *   onComplete (result) => void
 *   disabled   bool   — canvas bloqueado mientras OLIBOT piensa
 *   minimal    bool   — modo pantalla completa (oculta cabecera de texto)
 *   title      string — etiqueta descriptiva mostrada en modo minimal (p.ej. "Vocal A")
 */
import { useEffect, useRef } from "react";
import { useLetterTracing } from "../hooks/useLetterTracing";

export default function LetterTracing({ charData, hintLevel = 3, onComplete, onDemoEnd, skipInitialDemo = false, disabled = false, isThinking = false, minimal = false, title = "" }) {
  const {
    canvasRef,
    currentStrokeIdx,
    totalStrokes,
    phase,
    result,
    skipDemo,
    cancelStroke,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    reset,
  } = useLetterTracing({ charData, hintLevel, onComplete, skipInitialDemo, minimal });

  // Cancel any active stroke when the canvas is disabled mid-draw
  useEffect(() => {
    if (disabled) cancelStroke();
  }, [disabled, cancelStroke]);

  // Call onDemoEnd when demo transitions to tracing
  const prevPhaseRef = useRef(phase);
  useEffect(() => {
    if (prevPhaseRef.current === "demo" && phase === "tracing") {
      onDemoEnd?.();
    }
    prevPhaseRef.current = phase;
  }, [phase, onDemoEnd]);

  if (!charData) return null;

  const pct = (v) => `${Math.round(v * 100)}%`;

  return (
    <div
      style={{
        background: minimal ? "transparent" : "white",
        borderRadius: minimal ? "0" : "16px",
        border: minimal ? "none" : "2px solid #dce8f5",
        padding: minimal ? "0" : "12px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "8px",
        userSelect: "none",
        WebkitUserSelect: "none",
        width: minimal ? "100%" : undefined,
      }}
    >
      {/* Header — non-minimal only */}
      {!minimal && (
        <div style={{ display: "flex", alignItems: "center", gap: "10px", width: "100%" }}>
          <span style={{ fontSize: "36px", fontWeight: "bold", color: "#1e3a5f", lineHeight: 1, minWidth: "40px", textAlign: "center" }}>
            {charData.key}
          </span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "13px", fontWeight: "bold", color: "#374151" }}>
              ¡Traza la letra {charData.key}!
            </div>
            <div style={{ fontSize: "11px", color: "#9ca3af" }}>
              {["", "Solo puntos", "Puntos numerados", "Letra + flechas"][hintLevel] ?? ""}
              {" · "}Trazo {Math.min(currentStrokeIdx + 1, totalStrokes)}/{totalStrokes}
            </div>
          </div>
          <div style={{ display: "flex", gap: "4px" }}>
            {Array.from({ length: totalStrokes }, (_, i) => (
              <div key={i} style={{ width: "10px", height: "10px", borderRadius: "50%", background: i < currentStrokeIdx ? "#15803d" : i === currentStrokeIdx ? "#4a90d9" : "#e5e7eb", border: i === currentStrokeIdx ? "2px solid #1e40af" : "none" }} />
            ))}
          </div>
        </div>
      )}

      {/* Title and stroke progress dots removed */}

      {/* Canvas container */}
      <div
        style={{
          position: "relative",
          touchAction: "none",
          cursor: disabled ? "not-allowed" : phase === "done" ? "default" : phase === "demo" ? "pointer" : "crosshair",
        }}
      >
        <canvas
          ref={canvasRef}
          style={{
            display: "block",
            borderRadius: "12px",
            border: "2px solid #e0e0e0",
            background: "#fafafa",
            touchAction: "none",
            opacity: disabled ? 0.55 : 1,
            transition: "opacity 0.2s",
          }}
          onPointerDown={disabled || phase === "demo" ? undefined : handlePointerDown}
          onPointerMove={disabled || phase === "demo" ? undefined : handlePointerMove}
          onPointerUp={disabled || phase === "demo" ? undefined : handlePointerUp}
          onPointerCancel={disabled || phase === "demo" ? undefined : handlePointerUp}
        />

        {/* Demo phase: transparent overlay blocks all touch input */}
        {phase === "demo" && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "12px",
              zIndex: 5,
              touchAction: "none",
              pointerEvents: "all",
            }}
          />
        )}

        {/* ── Loading overlay ───────────────────────────────────────────────── */}
        {disabled && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "12px",
              background: "rgba(255,255,255,0.75)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px",
            }}
          >
            <div
              style={{
                width: "44px",
                height: "44px",
                border: "5px solid #dce8f5",
                borderTop: "5px solid #4a90d9",
                borderRadius: "50%",
                animation: "ltSpin 0.9s linear infinite",
              }}
            />
            <style>{`@keyframes ltSpin { to { transform: rotate(360deg); } }`}</style>
            <span style={{ fontSize: "13px", color: "#4a5568" }}>OLIBOT está pensando…</span>
          </div>
        )}

        {/* ── Result overlay ────────────────────────────────────────────────── */}
        {phase === "done" && result && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "12px",
              background: result.passed ? "rgba(21,128,61,0.88)" : "rgba(180,83,9,0.88)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontSize: "16px",
              fontWeight: "bold",
              gap: "6px",
            }}
          >
            <div style={{ fontSize: minimal ? "72px" : "48px" }}>{result.passed ? "⭐" : "💪"}</div>
            <div style={{ fontSize: minimal ? "24px" : "18px" }}>
              {result.passed ? "¡Muy bien!" : "¡Casi! Inténtalo otra vez"}
            </div>
            <div style={{ fontSize: minimal ? "15px" : "12px", fontWeight: "normal", opacity: 0.9 }}>
              Forma: {pct(result.shapeScore)} · Orden: {pct(result.orderScore)}
            </div>
          </div>
        )}

      </div>

      {/* Instruction text — non-minimal tracing phase */}
      {!minimal && phase === "tracing" && (
        <p style={{ margin: 0, fontSize: "13px", color: "#4a5568", textAlign: "center" }}>
          {currentStrokeIdx === 0 ? "Empieza por el punto azul 🔵" : `Trazo ${currentStrokeIdx + 1}: ¡sigue los puntos!`}
        </p>
      )}

      {/* Buttons — non-minimal only */}
      {!minimal && (
        <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
          <button
            onClick={reset}
            style={{
              padding: "8px 16px",
              borderRadius: "20px",
              border: "2px solid #d1d5db",
              background: "white",
              color: "#374151",
              fontSize: "13px",
              cursor: "pointer",
            }}
          >
            🔄 Repetir
          </button>
          {phase === "tracing" && currentStrokeIdx > 0 && (
            <button
              onClick={() => onComplete?.({ shapeScore: 0, orderScore: 0, passed: false, partial: true })}
              style={{
                padding: "8px 16px",
                borderRadius: "20px",
                border: "none",
                background: "#4a90d9",
                color: "white",
                fontSize: "13px",
                cursor: "pointer",
              }}
            >
              ✅ ¡Listo!
            </button>
          )}
        </div>
      )}
    </div>
  );
}