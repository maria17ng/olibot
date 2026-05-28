/**
 * ColoringCanvas — pantalla de colorear para niños de 3-5 años.
 *
 * Layout:
 *   - Canvas de pintura ocupa toda la pantalla
 *   - SVG guía (contorno) encima, pointer-events:none
 *   - Paleta de colores en la parte inferior
 *   - Botón "Cambiar dibujo" y botón "Limpiar"
 *
 * Props:
 *   subject  (string)  — clave del sujeto (p.ej. "perro")
 *   onBack   () => void — volver a la pantalla principal
 */
import { useEffect, useRef, useState, useCallback } from "react";
import { COLORING_DATA, getColoringVariant, ALL_SUBJECTS } from "../data/coloringData";

const COLORS = [
  { color: "#e63946", label: "Rojo" },
  { color: "#f4a261", label: "Naranja" },
  { color: "#ffd700", label: "Amarillo" },
  { color: "#2a9d8f", label: "Verde" },
  { color: "#457b9d", label: "Azul" },
  { color: "#7b2d8b", label: "Morado" },
  { color: "#f48fb1", label: "Rosa" },
  { color: "#8b5a2b", label: "Marrón" },
  { color: "#1d1d1b", label: "Negro" },
];

// White is the eraser colour — separate from the palette so children understand the metaphor
const ERASER_COLOR = "#ffffff";

const BRUSH_SIZE = 28; // big enough for small fingers

export default function ColoringCanvas({ subject, onBack, inline = false }) {
  const canvasRef      = useRef(null);
  const drawingRef     = useRef(false);
  const lastPosRef     = useRef(null);
  const [color,        setColor]        = useState(COLORS[0].color);
  const [variant,      setVariant]      = useState(() => getColoringVariant(subject));
  const [showPicker,   setShowPicker]   = useState(false);
  const [svgUrl,       setSvgUrl]       = useState("");

  // Build a data URL from the current SVG so we can display it on top of the canvas
  useEffect(() => {
    if (!variant?.svg) return;
    const blob = new Blob([variant.svg], { type: "image/svg+xml" });
    const url  = URL.createObjectURL(blob);
    setSvgUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [variant]);

  // Resize canvas on mount / window resize
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      // inline: leave room for top buttons (80px), compact palette (~70px), margins
      const size = inline
        ? Math.min(window.innerWidth - 24, window.innerHeight - 180)
        : Math.min(window.innerWidth - 16, window.innerHeight - 130);
      canvas.width  = Math.max(size, 200);
      canvas.height = Math.max(size, 200);
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [inline]);

  const getPoint = useCallback((e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width  / rect.width;
    const scaleY = canvas.height / rect.height;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top)  * scaleY,
    };
  }, []);

  const startDraw = useCallback((e) => {
    e.preventDefault();
    drawingRef.current = true;
    const pt = getPoint(e, canvasRef.current);
    lastPosRef.current = pt;
    // Draw a dot on tap
    const ctx = canvasRef.current.getContext("2d");
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, BRUSH_SIZE / 2, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  }, [color, getPoint]);

  const draw = useCallback((e) => {
    if (!drawingRef.current) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext("2d");
    const pt     = getPoint(e, canvas);
    const last   = lastPosRef.current;

    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(pt.x, pt.y);
    ctx.strokeStyle = color;
    ctx.lineWidth   = BRUSH_SIZE;
    ctx.lineCap     = "round";
    ctx.lineJoin    = "round";
    ctx.stroke();
    lastPosRef.current = pt;
  }, [color, getPoint]);

  const stopDraw = useCallback(() => {
    drawingRef.current = false;
    lastPosRef.current = null;
  }, []);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  const changeVariant = useCallback((newSubject) => {
    setVariant(getColoringVariant(newSubject || subject));
    clearCanvas();
    setShowPicker(false);
  }, [subject, clearCanvas]);

  // ── Inline mode (embedded inside ChatWindow, robot stays visible) ────────
  if (inline) {
    return (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "8px" }}>
        {/* Canvas + SVG outline */}
        <div style={{ position: "relative", touchAction: "none", flexShrink: 0 }}>
          <canvas
            ref={canvasRef}
            style={{ display: "block", borderRadius: "16px", border: "2px solid rgba(0,0,0,0.12)", boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}
            onPointerDown={startDraw} onPointerMove={draw}
            onPointerUp={stopDraw} onPointerCancel={stopDraw} onPointerLeave={stopDraw}
          />
          {svgUrl && (
            <img src={svgUrl} alt="contorno" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", objectFit: "contain" }} />
          )}
        </div>
        {/* Compact colour palette */}
        <div style={{ display: "flex", gap: "6px", padding: "8px 14px", flexWrap: "wrap", justifyContent: "center", background: "rgba(255,255,255,0.88)", borderRadius: "24px", boxShadow: "0 2px 10px rgba(0,0,0,0.1)" }}>
          {COLORS.map(({ color: c, label }) => (
            <button key={c} onClick={() => setColor(c)} title={label}
              style={{ width: "34px", height: "34px", borderRadius: "50%", background: c, border: color === c ? "3px solid #1e3a5f" : "2px solid rgba(0,0,0,0.18)", cursor: "pointer", boxShadow: color === c ? "0 0 0 2px white, 0 0 0 4px #1e3a5f" : "none", flexShrink: 0 }}
            />
          ))}
          {/* Eraser — selects white to paint over mistakes */}
          <button
            onClick={() => setColor(ERASER_COLOR)}
            title="Goma de borrar"
            style={{
              width: "34px", height: "22px", borderRadius: "4px", flexShrink: 0, cursor: "pointer",
              background: color === ERASER_COLOR ? "#ffb6c1" : "#ffd6e0",
              border: color === ERASER_COLOR ? "3px solid #1e3a5f" : "2px solid #ff99b0",
              boxShadow: color === ERASER_COLOR ? "0 0 0 2px white, 0 0 0 4px #1e3a5f" : "none",
            }}
          />
        </div>
        {showPicker && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setShowPicker(false)}>
            <div style={{ background: "white", borderRadius: "20px", padding: "20px", maxWidth: "380px", width: "90vw", maxHeight: "70vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
              <div style={{ fontSize: "18px", fontWeight: "bold", marginBottom: "14px", textAlign: "center" }}>¿Qué quieres dibujar?</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
                {ALL_SUBJECTS.map(({ key, label, emoji }) => (
                  <button key={key} onClick={() => changeVariant(key)}
                    style={{ padding: "12px 8px", borderRadius: "14px", border: key === subject ? "3px solid #4a90d9" : "2px solid #e0e0e0", background: key === subject ? "#e8f0fb" : "white", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", fontSize: "13px", fontWeight: key === subject ? "bold" : "normal" }}>
                    <span style={{ fontSize: "28px" }}>{emoji}</span>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  const canvasSize = canvasRef.current
    ? canvasRef.current.width
    : Math.min(window.innerWidth - 16, window.innerHeight - 130);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "linear-gradient(180deg, #fff9e6 0%, #fff0f5 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        overflow: "hidden",
        zIndex: 100,
      }}
    >
      {/* Top bar */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 12px", width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.85)", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
        <button
          onClick={onBack}
          style={{ padding: "8px 14px", borderRadius: "20px", border: "2px solid #dce8f5", background: "white", fontSize: "22px", cursor: "pointer" }}
          title="Volver"
        >
          ⬅️
        </button>
        <span style={{ fontSize: "18px", fontWeight: "bold", color: "#1e3a5f", flex: 1 }}>
          {COLORING_DATA[subject]?.emoji ?? "🎨"} {COLORING_DATA[subject]?.label ?? "Dibujo libre"}
        </span>
        {/* Eraser button */}
        <button
          onClick={() => setColor(ERASER_COLOR)}
          title="Goma de borrar"
          style={{
            padding: "8px 18px", borderRadius: "20px", cursor: "pointer",
            background: color === ERASER_COLOR ? "#ffb6c1" : "#ffd6e0",
            border: color === ERASER_COLOR ? "3px solid #1e3a5f" : "2px solid #ff99b0",
            fontWeight: color === ERASER_COLOR ? "bold" : "normal",
            fontSize: "14px", color: "#5a2030",
          }}
        >
          Goma
        </button>
      </div>

      {/* Canvas + SVG overlay */}
      <div style={{ position: "relative", touchAction: "none", flexShrink: 0 }}>
        <canvas
          ref={canvasRef}
          style={{ display: "block", borderRadius: "12px", border: "2px solid #e0e0e0" }}
          onPointerDown={startDraw}
          onPointerMove={draw}
          onPointerUp={stopDraw}
          onPointerCancel={stopDraw}
          onPointerLeave={stopDraw}
        />
        {/* SVG outline overlaid — children paint behind it */}
        {svgUrl && (
          <img
            src={svgUrl}
            alt="contorno"
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              pointerEvents: "none",
              objectFit: "contain",
            }}
          />
        )}
      </div>

      {/* Color palette */}
      <div style={{ display: "flex", gap: "10px", padding: "10px 8px", flexWrap: "wrap", justifyContent: "center", background: "rgba(255,255,255,0.85)", width: "100%", boxSizing: "border-box" }}>
        {COLORS.map(({ color: c, label }) => (
          <button
            key={c}
            onClick={() => setColor(c)}
            title={label}
            style={{
              width: "46px",
              height: "46px",
              borderRadius: "50%",
              background: c,
              border: color === c ? "4px solid #1e3a5f" : "3px solid #ccc",
              cursor: "pointer",
              boxShadow: color === c ? "0 0 0 3px white, 0 0 0 5px #1e3a5f" : "none",
              transition: "transform 0.1s",
              transform: color === c ? "scale(1.15)" : "scale(1)",
              flexShrink: 0,
            }}
          />
        ))}
        {/* Eraser swatch — rectangular like a real eraser */}
        <button
          onClick={() => setColor(ERASER_COLOR)}
          title="Goma de borrar"
          style={{
            width: "60px", height: "36px", borderRadius: "6px", flexShrink: 0,
            background: color === ERASER_COLOR ? "#ffb6c1" : "#ffd6e0",
            border: color === ERASER_COLOR ? "4px solid #1e3a5f" : "3px solid #ff99b0",
            cursor: "pointer", fontSize: "12px", fontWeight: "bold", color: "#7a2040",
            boxShadow: color === ERASER_COLOR ? "0 0 0 3px white, 0 0 0 5px #1e3a5f" : "none",
            alignSelf: "center",
          }}
        >
          Goma
        </button>
      </div>

      {/* Subject picker overlay */}
      {showPicker && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 200,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={() => setShowPicker(false)}
        >
          <div
            style={{
              background: "white",
              borderRadius: "20px",
              padding: "20px",
              maxWidth: "380px",
              width: "90vw",
              maxHeight: "70vh",
              overflowY: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: "18px", fontWeight: "bold", marginBottom: "14px", textAlign: "center" }}>
              ¿Qué quieres dibujar?
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
              {ALL_SUBJECTS.map(({ key, label, emoji }) => (
                <button
                  key={key}
                  onClick={() => changeVariant(key)}
                  style={{
                    padding: "12px 8px",
                    borderRadius: "14px",
                    border: key === subject ? "3px solid #4a90d9" : "2px solid #e0e0e0",
                    background: key === subject ? "#e8f0fb" : "white",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "4px",
                    fontSize: "13px",
                    fontWeight: key === subject ? "bold" : "normal",
                  }}
                >
                  <span style={{ fontSize: "28px" }}>{emoji}</span>
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}