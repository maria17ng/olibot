/**
 * ColoringCanvas — pintar para niños de 3-5 años.
 *
 * Dos modos:
 *   IMAGE MODE  — imagen PNG descargada de Crayola; un toque rellena la zona
 *                 (flood-fill), la goma pinta blanco como pincel.
 *   SVG MODE    — overlay SVG clásico; pincel libre sobre lienzo blanco.
 *
 * El modo se selecciona automáticamente según la variante activa:
 *   variant.imageFile → IMAGE MODE
 *   variant.svg       → SVG MODE
 */
import { useEffect, useRef, useState, useCallback } from "react";
import { COLORING_DATA, getColoringVariant, loadColoringManifest, ALL_SUBJECTS, normalize } from "../data/coloringData";

const COLORS = [
  { color: "#e63946", label: "Rojo"     },
  { color: "#f4a261", label: "Naranja"  },
  { color: "#ffd700", label: "Amarillo" },
  { color: "#2a9d8f", label: "Verde"    },
  { color: "#457b9d", label: "Azul"     },
  { color: "#7b2d8b", label: "Morado"   },
  { color: "#f48fb1", label: "Rosa"     },
  { color: "#8b5a2b", label: "Marrón"   },
  { color: "#1d1d1b", label: "Negro"    },
];

const ERASER_COLOR = "#ffffff";
const BRUSH_SIZE   = 28;

// ── Flood-fill (for image mode) ──────────────────────────────────────────────

function hexToRgb(hex) {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

// srcCtx: the original image canvas (used for border detection — never mutated).
// dstCtx: the color layer canvas (receives the filled color).
function floodFill(srcCtx, dstCtx, startX, startY, fillHex) {
  const canvas = srcCtx.canvas;
  const w = canvas.width, h = canvas.height;
  if (startX < 0 || startX >= w || startY < 0 || startY >= h) return;

  const srcData = srcCtx.getImageData(0, 0, w, h).data;
  const dstImg  = dstCtx.getImageData(0, 0, w, h);
  const dstData = dstImg.data;

  const pos = (x, y) => (y * w + x) * 4;
  const startPos = pos(startX, startY);

  // Read target color from the ORIGINAL image (stable borders regardless of painting)
  const tR = srcData[startPos], tG = srcData[startPos + 1], tB = srcData[startPos + 2];
  const [fR, fG, fB] = hexToRgb(fillHex);

  const TOLERANCE = 60;

  const matches = (p) => {
    const r = srcData[p], g = srcData[p + 1], b = srcData[p + 2];
    if ((r + g + b) / 3 < 90) return false;  // stop at dark border lines
    return (
      Math.abs(r - tR) <= TOLERANCE &&
      Math.abs(g - tG) <= TOLERANCE &&
      Math.abs(b - tB) <= TOLERANCE
    );
  };

  const visited = new Uint8Array(w * h);
  const stack   = [startX + startY * w];

  while (stack.length > 0) {
    const flat = stack.pop();
    if (visited[flat]) continue;
    const x = flat % w;
    const y = (flat / w) | 0;
    const p = flat * 4;
    if (!matches(p)) continue;

    visited[flat] = 1;
    dstData[p]     = fR;
    dstData[p + 1] = fG;
    dstData[p + 2] = fB;
    dstData[p + 3] = 255;

    if (x > 0)     stack.push(flat - 1);
    if (x < w - 1) stack.push(flat + 1);
    if (y > 0)     stack.push(flat - w);
    if (y < h - 1) stack.push(flat + w);
  }

  dstCtx.putImageData(dstImg, 0, 0);
}

// ── Emoji lookup for manifest post names ─────────────────────────────────────

const EMOJI_HINTS = [
  ["mariposa","butterfly","🦋"],["perro","cachorro","dog","puppy","🐶"],
  ["gato","cat","kitten","🐱"],["conejo","rabbit","bunny","🐰"],
  ["pato","duck","🦆"],["pajaro","pájaro","bird","🐦"],
  ["pez","fish","🐟"],["elefante","elephant","🐘"],
  ["oso","bear","🐻"],["flor","flower","🌸"],
  ["arbol","árbol","tree","🌳"],["casa","house","🏠"],
  ["sol","sun","☀️"],["estrella","star","⭐"],
  ["corazon","heart","❤️"],["nube","cloud","☁️"],
  ["pelota","ball","⚽"],["helado","ice","🍦"],
  ["burro","donkey","🫏"],["iguana","🦎"],
  ["pterodactyl","🦕"],["triceratops","🦕"],["rex","🦖"],
  ["hormiga","ant","🐜"],["hamster","🐹"],["koala","🐨"],
  ["guacamaya","parrot","loro","🦜"],["cebra","zebra","🦓"],
  ["tiburon","shark","🦈"],["delfin","dolphin","🐬"],
  ["ballena","whale","🐳"],["caballo","horse","🐴"],
  ["vaca","cow","🐮"],["cerdo","pig","🐷"],["oveja","sheep","🐑"],
  ["pollo","chicken","🐔"],["tortuga","turtle","🐢"],["rana","frog","🐸"],
  ["cangrejo","crab","🦀"],["pulpo","octopus","🐙"],
  ["abeja","bee","🐝"],["caracol","snail","🐌"],
  ["leon","lion","🦁"],["tigre","tiger","🐯"],
  ["jirafa","giraffe","🦒"],["mono","monkey","🐵"],
  ["panda","🐼"],["pingüino","penguin","🐧"],
  ["dino","dinosaur","🦕"],["dragon","🐲"],
  ["unicornio","unicorn","🦄"],["lobo","wolf","🐺"],
  ["zorro","fox","🦊"],["murcielago","bat","🦇"],
  ["serpiente","snake","🐍"],["cocodrilo","crocodile","🐊"],
];

function guessEmoji(name) {
  const lower = name.toLowerCase();
  for (const row of EMOJI_HINTS) {
    const emoji = row[row.length - 1];
    const kws   = row.slice(0, -1);
    if (kws.some(k => lower.includes(k))) return emoji;
  }
  return "🎨";
}

// ── Component ────────────────────────────────────────────────────────────────

export default function ColoringCanvas({ subject, onBack, inline = false, disabled = false }) {
  const canvasRef         = useRef(null);
  const drawingRef        = useRef(false);
  const lastPosRef        = useRef(null);
  const imgRef            = useRef(null);
  // Clean image snapshot for line-detection (floodFill) and multiply overlay
  const originalCanvasRef = useRef(null);
  // Separate layer for painted colors; composited under the image lines
  const colorLayerRef     = useRef(null);

  const [color,         setColor]         = useState(COLORS[3].color);
  const [drawMode,      setDrawMode]      = useState("pencil");   // "pencil" | "bucket"
  const [variant,       setVariant]       = useState(() => getColoringVariant(subject));
  const [showPicker,    setShowPicker]    = useState(false);
  const [svgUrl,        setSvgUrl]        = useState("");
  const [pickerItems,   setPickerItems]   = useState(ALL_SUBJECTS);
  const manifestRef = useRef(null);

  // Load manifest; upgrade to image mode and build merged picker list
  useEffect(() => {
    loadColoringManifest().then(m => {
      manifestRef.current = m;
      const imgVariant = getColoringVariant(subject, m);
      if (imgVariant?.imageFile) setVariant(imgVariant);

      if (m && m.length > 0) {
        // One picker entry per manifest post (first image as representative)
        const seen = new Set();
        const manifestItems = [];
        for (const entry of m) {
          if (seen.has(entry.nombre) || !entry.images.length) continue;
          seen.add(entry.nombre);
          manifestItems.push({
            key:       `m:${entry.nombre}`,
            label:     entry.nombre,
            emoji:     guessEmoji(entry.nombre),
            imageFile: entry.images[0],  // picked image on click via changeVariant
            _entry:    entry,            // full entry for random image selection
          });
        }
        // Merge: manifest first, then SVG subjects with no manifest match.
        // Use normalize() so accented names (Pájaro, Águila…) don't create duplicates.
        const svgOnly = ALL_SUBJECTS.filter(s =>
          !manifestItems.some(mi => normalize(mi.label).includes(normalize(s.key)))
        );
        setPickerItems([...manifestItems, ...svgOnly]);
      }
    });
  }, [subject]); // eslint-disable-line react-hooks/exhaustive-deps

  const isImageMode = Boolean(variant?.imageFile);

  // ── SVG overlay URL (SVG mode only) ─────────────────────────────────────
  useEffect(() => {
    if (!variant?.svg) { setSvgUrl(""); return; }
    const blob = new Blob([variant.svg], { type: "image/svg+xml" });
    const url  = URL.createObjectURL(blob);
    setSvgUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [variant]);

  // ── Canvas sizing ────────────────────────────────────────────────────────

  // Composites colorLayer (painted colors) + originalCanvas (lines, multiply)
  // onto the main canvas. Multiply: white×color=color, black×anything=black
  // → image lines always stay visible no matter how much the child paints.
  const renderComposite = useCallback(() => {
    const canvas = canvasRef.current;
    const orig   = originalCanvasRef.current;
    if (!canvas || !orig) return;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const cl = colorLayerRef.current;
    if (cl) ctx.drawImage(cl, 0, 0);
    ctx.globalCompositeOperation = "multiply";
    ctx.drawImage(orig, 0, 0);
    ctx.globalCompositeOperation = "source-over";
  }, []);

  const paintImage = useCallback(() => {
    const canvas = canvasRef.current;
    const img    = imgRef.current;
    if (!canvas || !img) return;
    const scale = Math.min(canvas.width / img.naturalWidth, canvas.height / img.naturalHeight);
    const dw = img.naturalWidth  * scale;
    const dh = img.naturalHeight * scale;
    // Build originalCanvasRef: clean image used for multiply overlay + floodFill border detection
    const orig = originalCanvasRef.current || document.createElement("canvas");
    orig.width  = canvas.width;
    orig.height = canvas.height;
    const origCtx = orig.getContext("2d");
    origCtx.fillStyle = "#fff";
    origCtx.fillRect(0, 0, orig.width, orig.height);
    origCtx.drawImage(img, (canvas.width - dw) / 2, (canvas.height - dh) / 2, dw, dh);
    originalCanvasRef.current = orig;
    // Reset color layer (loading a new image discards any previous painting)
    const cl = colorLayerRef.current || document.createElement("canvas");
    cl.width  = canvas.width;
    cl.height = canvas.height;
    cl.getContext("2d").clearRect(0, 0, cl.width, cl.height);
    colorLayerRef.current = cl;
    renderComposite();
  }, [renderComposite]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const size = inline
        ? Math.min(window.innerWidth - 24, window.innerHeight - 180)
        : Math.min(window.innerWidth - 16, window.innerHeight - 130);
      canvas.width  = Math.max(size, 200);
      canvas.height = Math.max(size, 200);

      if (isImageMode && imgRef.current?.complete) {
        paintImage();
      } else {
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [inline, isImageMode, paintImage]);

  // ── Load image (image mode) ──────────────────────────────────────────────
  useEffect(() => {
    if (!variant?.imageFile) return;
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      paintImage();
    };
    img.onerror = () => console.warn("[ColoringCanvas] Failed to load", variant.imageFile);
    // encodeURI handles accented folder names like /descargas/…/Águila/1.webp
    img.src = encodeURI(variant.imageFile);
  }, [variant, paintImage]);

  // ── Pointer helpers ──────────────────────────────────────────────────────
  const getPoint = useCallback((e, canvas) => {
    const rect   = canvas.getBoundingClientRect();
    const scaleX = canvas.width  / rect.width;
    const scaleY = canvas.height / rect.height;
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    const cy = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: (cx - rect.left) * scaleX, y: (cy - rect.top) * scaleY };
  }, []);

  // ── Erase helper: punch a transparent hole in the color layer ────────────
  // destination-out: wherever we draw, the colorLayer becomes transparent,
  // revealing the original image pixels through renderComposite.
  const eraseAtPoint = useCallback((x, y) => {
    const cl = colorLayerRef.current;
    if (!cl) return;
    const clCtx = cl.getContext("2d");
    clCtx.save();
    clCtx.globalCompositeOperation = "destination-out";
    clCtx.beginPath();
    clCtx.arc(x, y, BRUSH_SIZE / 2, 0, Math.PI * 2);
    clCtx.fill();
    clCtx.restore();
  }, []);

  // ── Image mode: pencil (default) or bucket (flood-fill) ──────────────────
  const handleImagePointerDown = useCallback((e) => {
    if (disabled) return;
    e.preventDefault();
    drawingRef.current = true;
    const pt = getPoint(e, canvasRef.current);

    if (color === ERASER_COLOR || drawMode === "pencil") {
      // Pencil / eraser: free brush stroke onto the color layer
      lastPosRef.current = pt;
      if (color === ERASER_COLOR) {
        eraseAtPoint(pt.x, pt.y);
      } else {
        const cl = colorLayerRef.current;
        if (cl) {
          const clCtx = cl.getContext("2d");
          clCtx.beginPath();
          clCtx.arc(pt.x, pt.y, BRUSH_SIZE / 2, 0, Math.PI * 2);
          clCtx.fillStyle = color;
          clCtx.fill();
        }
      }
      renderComposite();
    } else {
      // Bucket mode: flood-fill reads original image (borders), writes to color layer
      const orig = originalCanvasRef.current;
      const cl   = colorLayerRef.current;
      if (orig && cl) {
        floodFill(orig.getContext("2d"), cl.getContext("2d"),
          Math.round(pt.x), Math.round(pt.y), color);
        renderComposite();
      }
      drawingRef.current = false;
    }
  }, [color, drawMode, disabled, getPoint, eraseAtPoint, renderComposite]);

  const handleImagePointerMove = useCallback((e) => {
    if (!drawingRef.current || disabled) return;
    if (drawMode === "bucket" && color !== ERASER_COLOR) return;
    e.preventDefault();
    const pt   = getPoint(e, canvasRef.current);
    const last = lastPosRef.current;
    if (!last) return;
    if (color === ERASER_COLOR) {
      // Erase along stroke: punch transparent holes in the color layer
      const dx = pt.x - last.x;
      const dy = pt.y - last.y;
      const dist  = Math.sqrt(dx * dx + dy * dy);
      const steps = Math.max(1, Math.floor(dist / (BRUSH_SIZE / 4)));
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        eraseAtPoint(last.x + dx * t, last.y + dy * t);
      }
    } else {
      const cl = colorLayerRef.current;
      if (cl) {
        const clCtx = cl.getContext("2d");
        clCtx.beginPath();
        clCtx.moveTo(last.x, last.y);
        clCtx.lineTo(pt.x, pt.y);
        clCtx.strokeStyle = color;
        clCtx.lineWidth   = BRUSH_SIZE;
        clCtx.lineCap     = "round";
        clCtx.lineJoin    = "round";
        clCtx.stroke();
      }
    }
    renderComposite();
    lastPosRef.current = pt;
  }, [color, drawMode, disabled, getPoint, eraseAtPoint, renderComposite]);

  // ── SVG mode: classic free brush ─────────────────────────────────────────
  const startDraw = useCallback((e) => {
    if (disabled) return;
    e.preventDefault();
    drawingRef.current = true;
    const pt = getPoint(e, canvasRef.current);
    lastPosRef.current = pt;
    const ctx = canvasRef.current.getContext("2d");
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, BRUSH_SIZE / 2, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  }, [color, disabled, getPoint]);

  const draw = useCallback((e) => {
    if (!drawingRef.current || disabled) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext("2d");
    const pt     = getPoint(e, canvas);
    ctx.beginPath();
    ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
    ctx.lineTo(pt.x, pt.y);
    ctx.strokeStyle = color;
    ctx.lineWidth   = BRUSH_SIZE;
    ctx.lineCap     = "round";
    ctx.lineJoin    = "round";
    ctx.stroke();
    lastPosRef.current = pt;
  }, [color, disabled, getPoint]);

  const stopDraw = useCallback(() => {
    drawingRef.current = false;
    lastPosRef.current = null;
  }, []);

  // Cancel any active stroke when the canvas is disabled mid-draw
  useEffect(() => {
    if (disabled) stopDraw();
  }, [disabled, stopDraw]);

  const clearCanvas = useCallback(() => {
    const cl = colorLayerRef.current;
    if (cl) cl.getContext("2d").clearRect(0, 0, cl.width, cl.height);
    if (isImageMode && imgRef.current?.complete) {
      renderComposite();  // colorLayer cleared → shows original image cleanly
    } else {
      const canvas = canvasRef.current;
      const ctx    = canvas.getContext("2d");
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }, [isImageMode, renderComposite]);

  const changeVariant = useCallback((item) => {
    imgRef.current = null;
    if (item && item._entry) {
      // Manifest entry: pick a random image from the post
      const imgs = item._entry.images;
      const imageFile = imgs[Math.floor(Math.random() * imgs.length)];
      setVariant({ id: `m:${item.label}`, label: item.label, imageFile });
    } else {
      const key = typeof item === "string" ? item : (item?.key || subject);
      setVariant(getColoringVariant(key, manifestRef.current));
    }
    clearCanvas();
    setShowPicker(false);
  }, [subject, clearCanvas]);

  // ── Shared canvas event props ─────────────────────────────────────────────
  const canvasEvents = isImageMode
    ? {
        onPointerDown:   handleImagePointerDown,
        onPointerMove:   handleImagePointerMove,
        onPointerUp:     stopDraw,
        onPointerCancel: stopDraw,
        onPointerLeave:  stopDraw,
      }
    : {
        onPointerDown:   startDraw,
        onPointerMove:   draw,
        onPointerUp:     stopDraw,
        onPointerCancel: stopDraw,
        onPointerLeave:  stopDraw,
      };

  // ── Palette (shared) ─────────────────────────────────────────────────────
  const Palette = ({ compact = false }) => (
    <div style={{
      display: "flex", gap: compact ? "6px" : "10px",
      padding: compact ? "8px 14px" : "10px 8px",
      flexWrap: "wrap", justifyContent: "center",
      background: "rgba(255,255,255,0.88)", borderRadius: compact ? "24px" : 0,
      boxShadow: compact ? "0 2px 10px rgba(0,0,0,0.1)" : "none",
      width: compact ? undefined : "100%", boxSizing: "border-box",
    }}>
      {COLORS.map(({ color: c, label }) => (
        <button key={c} onClick={() => setColor(c)} title={label}
          style={{
            width:  compact ? "34px" : "46px",
            height: compact ? "34px" : "46px",
            borderRadius: "50%", background: c,
            border:     color === c ? `${compact ? 3 : 4}px solid #1e3a5f` : `${compact ? 2 : 3}px solid rgba(0,0,0,0.18)`,
            cursor: "pointer", flexShrink: 0,
            boxShadow:  color === c ? "0 0 0 2px white, 0 0 0 4px #1e3a5f" : "none",
            transform:  !compact && color === c ? "scale(1.15)" : "scale(1)",
            transition: "transform 0.1s",
          }}
        />
      ))}
      <button onClick={() => setColor(ERASER_COLOR)} title="Goma de borrar"
        style={{
          width: compact ? "34px" : "60px", height: compact ? "22px" : "36px",
          borderRadius: "4px", flexShrink: 0, cursor: "pointer",
          background: color === ERASER_COLOR ? "#ffb6c1" : "#ffd6e0",
          border:     color === ERASER_COLOR
            ? `${compact ? 3 : 4}px solid #1e3a5f`
            : `${compact ? 2 : 3}px solid #ff99b0`,
          boxShadow:  color === ERASER_COLOR ? "0 0 0 2px white, 0 0 0 4px #1e3a5f" : "none",
          fontSize: compact ? undefined : "12px",
          fontWeight: compact ? undefined : "bold", color: "#7a2040",
          alignSelf: "center",
        }}
      >
        {!compact && "Goma"}
      </button>
      {/* Mode toggle: pencil / bucket — only shown in image mode */}
      {isImageMode && (
        <button
          onClick={() => setDrawMode(m => m === "pencil" ? "bucket" : "pencil")}
          title={drawMode === "pencil" ? "Cambiar a cubo de pintura" : "Cambiar a lápiz"}
          style={{
            width: compact ? "34px" : "46px", height: compact ? "34px" : "46px",
            borderRadius: "50%", flexShrink: 0, cursor: "pointer",
            background: drawMode === "pencil" ? "#e8f0fb" : "#fff7ed",
            border: `${compact ? 2 : 3}px solid ${drawMode === "pencil" ? "#4a90d9" : "#f59e0b"}`,
            fontSize: compact ? "18px" : "22px",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          {drawMode === "pencil" ? "🖊️" : "🪣"}
        </button>
      )}
    </div>
  );

  // ── Subject picker modal ─────────────────────────────────────────────────
  const SubjectPicker = () => showPicker ? (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={() => setShowPicker(false)}>
      <div style={{ background: "white", borderRadius: "20px", padding: "20px", maxWidth: "420px", width: "92vw", maxHeight: "75vh", overflowY: "auto" }}
        onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: "18px", fontWeight: "bold", marginBottom: "14px", textAlign: "center" }}>¿Qué quieres dibujar?</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
          {pickerItems.map((item) => {
            const isActive = variant?.id?.startsWith(`m:${item.label}`) || item.key === subject;
            return (
              <button key={item.key} onClick={() => changeVariant(item)}
                style={{ padding: "12px 8px", borderRadius: "14px", border: isActive ? "3px solid #4a90d9" : "2px solid #e0e0e0", background: isActive ? "#e8f0fb" : "white", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", fontSize: "12px", fontWeight: isActive ? "bold" : "normal", overflow: "hidden" }}>
                {item._entry
                  ? <img src={item.imageFile} alt={item.label} style={{ width: "52px", height: "52px", objectFit: "cover", borderRadius: "8px" }} loading="lazy" />
                  : <span style={{ fontSize: "28px" }}>{item.emoji}</span>
                }
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", width: "100%", textAlign: "center" }}>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  ) : null;

  // ── 🎨 Button to open picker ─────────────────────────────────────────────
  const PickerButton = ({ compact = false }) => (
    <button
      onClick={() => setShowPicker(true)}
      title="Elegir dibujo"
      style={{
        padding: compact ? "0" : "8px 16px",
        width:   compact ? "34px" : undefined,
        height:  compact ? "34px" : undefined,
        borderRadius: compact ? "50%" : "20px",
        border: "2px solid #dce8f5", background: "white",
        fontSize: compact ? "18px" : "20px", cursor: "pointer",
        boxShadow: "0 2px 8px rgba(0,0,0,0.10)", flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      🎨
    </button>
  );

  // ── INLINE mode ──────────────────────────────────────────────────────────
  if (inline) {
    return (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "8px" }}>
        <div style={{ position: "relative", touchAction: "none", flexShrink: 0 }}>
          <canvas ref={canvasRef}
            style={{ display: "block", borderRadius: "16px", border: "2px solid rgba(0,0,0,0.12)", boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}
            {...canvasEvents}
          />
          {!isImageMode && svgUrl && (
            <img src={svgUrl} alt="contorno" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", objectFit: "contain" }} />
          )}
          {/* Disabled overlay — blocks drawing while OLIBOT is speaking */}
          {disabled && (
            <div style={{
              position: "absolute", inset: 0, borderRadius: "16px",
              background: "rgba(255,255,255,0.45)",
              display: "flex", alignItems: "center", justifyContent: "center",
              pointerEvents: "all", cursor: "not-allowed",
            }}>
              <span style={{ fontSize: "40px", opacity: 0.7 }}>🔊</span>
            </div>
          )}
        </div>
        {/* Palette + 🎨 picker button in same row */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Palette compact />
          <PickerButton compact />
        </div>
        <SubjectPicker />
      </div>
    );
  }

  // ── FULL-SCREEN mode ─────────────────────────────────────────────────────
  return (
    <div style={{ position: "fixed", inset: 0, background: "linear-gradient(180deg, #fff9e6 0%, #fff0f5 100%)", display: "flex", flexDirection: "column", alignItems: "center", overflow: "hidden", zIndex: 100 }}>
      {/* Top bar */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 12px", width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.85)", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
        <button onClick={onBack}
          style={{ padding: "8px 14px", borderRadius: "20px", border: "2px solid #dce8f5", background: "white", fontSize: "22px", cursor: "pointer" }}
          title="Volver">⬅️</button>
        <span style={{ fontSize: "16px", fontWeight: "bold", color: "#1e3a5f", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {COLORING_DATA[subject]?.emoji ?? guessEmoji(variant?.label ?? "")} {variant?.label ?? COLORING_DATA[subject]?.label ?? "Dibujo libre"}
          {isImageMode && <span style={{ fontSize: "11px", color: "#888", marginLeft: "6px" }}>Toca para colorear</span>}
        </span>
        <PickerButton />
        <button onClick={() => setColor(ERASER_COLOR)} title="Goma de borrar"
          style={{ padding: "8px 18px", borderRadius: "20px", cursor: "pointer", background: color === ERASER_COLOR ? "#ffb6c1" : "#ffd6e0", border: color === ERASER_COLOR ? "3px solid #1e3a5f" : "2px solid #ff99b0", fontWeight: color === ERASER_COLOR ? "bold" : "normal", fontSize: "14px", color: "#5a2030" }}>
          Goma
        </button>
      </div>

      {/* Canvas */}
      <div style={{ position: "relative", touchAction: "none", flexShrink: 0 }}>
        <canvas ref={canvasRef}
          style={{ display: "block", borderRadius: "12px", border: "2px solid #e0e0e0" }}
          {...canvasEvents}
        />
        {!isImageMode && svgUrl && (
          <img src={svgUrl} alt="contorno" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", objectFit: "contain" }} />
        )}
      </div>

      <Palette />
      <SubjectPicker />
    </div>
  );
}
