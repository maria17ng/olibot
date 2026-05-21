/**
 * LetterTracing — panel de trazado de letras y números para niños de 3-5 años.
 *
 * Muestra un canvas cuadrado donde el niño traza la letra/número con el dedo
 * (tablet) o el ratón. La guía visual se adapta al nivel de pista:
 *
 *   hintLevel 3 → letra guía semitransparente + puntos numerados + flechas
 *   hintLevel 2 → puntos numerados (sin letra guía)
 *   hintLevel 1 → solo puntos de inicio y fin de cada trazo
 *
 * Al completar todos los trazos (o pulsar "¡Listo!"), emite onComplete con
 * { shapeScore, orderScore, passed }.
 *
 * Props:
 *   charData   {key, strokes}   Del letterData.js. Si null, el panel no se muestra.
 *   hintLevel  1|2|3            Derivado de successRate en ChatWindow.
 *   onComplete (result) => void Callback con resultado final.
 */
import { useEffect } from "react";
import { useLetterTracing } from "../hooks/useLetterTracing";

// ── Colores de resultado ─────────────────────────────────────────────────────
const COLOR_PASS = "#15803d";
const COLOR_FAIL = "#b45309";

export default function LetterTracing({ charData, hintLevel = 3, onComplete, disabled = false }) {
  const {
    canvasRef,
    currentStrokeIdx,
    totalStrokes,
    phase,
    result,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    reset,
  } = useLetterTracing({ charData, hintLevel, onComplete });

  // Ajuste del tamaño del canvas al montar / cambiar tamaño de ventana
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const size = Math.min(canvas.parentElement?.clientWidth ?? 420, 420);
      canvas.width  = size;
      canvas.height = size;
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [canvasRef]);

  if (!charData) return null;

  const pct = (v) => `${Math.round(v * 100)}%`;
  const hintLabel = ["", "Solo puntos", "Puntos numerados", "Letra + flechas"][hintLevel] ?? "";

  return (
    <div
      style={{
        background: "white",
        borderRadius: "16px",
        border: "2px solid #dce8f5",
        padding: "12px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "8px",
        userSelect: "none",
        WebkitUserSelect: "none",
      }}
    >
      {/* Cabecera: letra activa + nivel de pista */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", width: "100%" }}>
        <span
          style={{
            fontSize: "36px",
            fontWeight: "bold",
            color: "#1e3a5f",
            lineHeight: 1,
            minWidth: "40px",
            textAlign: "center",
          }}
        >
          {charData.key}
        </span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "13px", fontWeight: "bold", color: "#374151" }}>
            ¡Traza la letra {charData.key}!
          </div>
          <div style={{ fontSize: "11px", color: "#9ca3af" }}>
            {hintLabel} · Trazo {Math.min(currentStrokeIdx + 1, totalStrokes)}/{totalStrokes}
          </div>
        </div>
        {/* Progreso de trazos */}
        <div style={{ display: "flex", gap: "4px" }}>
          {Array.from({ length: totalStrokes }, (_, i) => (
            <div
              key={i}
              style={{
                width: "10px",
                height: "10px",
                borderRadius: "50%",
                background:
                  i < currentStrokeIdx
                    ? "#15803d"
                    : i === currentStrokeIdx
                    ? "#4a90d9"
                    : "#e5e7eb",
                border: i === currentStrokeIdx ? "2px solid #1e40af" : "none",
              }}
            />
          ))}
        </div>
      </div>

      {/* Canvas */}
      <div
        style={{
          position: "relative",
          touchAction: "none",
          cursor: disabled ? "not-allowed" : phase === "done" ? "default" : "crosshair",
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
          onPointerDown={disabled ? undefined : handlePointerDown}
          onPointerMove={disabled ? undefined : handlePointerMove}
          onPointerUp={disabled ? undefined : handlePointerUp}
          onPointerCancel={disabled ? undefined : handlePointerUp}
        />

        {/* Loading overlay — shown while OLIBOT is thinking */}
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

        {/* Overlay de resultado */}
        {phase === "done" && result && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "12px",
              background: result.passed
                ? "rgba(21,128,61,0.88)"
                : "rgba(180,83,9,0.88)",
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
            <div style={{ fontSize: "48px" }}>{result.passed ? "⭐" : "💪"}</div>
            <div>{result.passed ? "¡Muy bien!" : "¡Casi! Inténtalo otra vez"}</div>
            <div style={{ fontSize: "12px", fontWeight: "normal", opacity: 0.9 }}>
              Forma: {pct(result.shapeScore)} · Orden: {pct(result.orderScore)}
            </div>
          </div>
        )}
      </div>

      {/* Instrucción dinámica */}
      {phase === "tracing" && (
        <p
          style={{
            margin: 0,
            fontSize: "13px",
            color: "#4a5568",
            textAlign: "center",
          }}
        >
          {currentStrokeIdx === 0
            ? "Empieza por el punto azul 🔵"
            : `Trazo ${currentStrokeIdx + 1}: ¡sigue los puntos!`}
        </p>
      )}

      {/* Botones */}
      <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
        {/* Borrar / repetir */}
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

        {/* Botón "¡Listo!" — disponible aunque no hayan completado todos los trazos */}
        {phase === "tracing" && currentStrokeIdx > 0 && (
          <button
            onClick={() => {
              // Forzar evaluación con los trazos que haya hecho
              // Emitimos resultado parcial con los datos ya recogidos
              onComplete?.({ shapeScore: 0, orderScore: 0, passed: false, partial: true });
            }}
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
    </div>
  );
}
