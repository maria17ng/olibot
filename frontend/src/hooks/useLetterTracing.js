/**
 * useLetterTracing — hook para trazado libre de letras en canvas.
 *
 * Flujo:
 *   1. El niño dibuja trazos en el canvas con el dedo o el ratón.
 *   2. Cada trazo se evalúa al levantarlo (pointerup):
 *      - shapeScore: % de waypoints del trazo cubiertos por el camino dibujado
 *      - orderScore: 1 si el trazo se hizo en la dirección correcta (punto de inicio
 *        próximo al primer waypoint y vector inicial coherente), 0 si no.
 *   3. Cuando todos los trazos de la letra están evaluados (o el usuario pulsa "Listo"),
 *      se emite un resultado final { shapeScore, orderScore, passed }.
 *
 * Niveles de pista (hintLevel):
 *   3 → letra base semitransparente + puntos de paso numerados + flechas de dirección
 *   2 → puntos de paso numerados (sin letra base)
 *   1 → solo punto de inicio y de fin de cada trazo
 *
 * Evaluación:
 *   - shapeScore  = media de (waypoints cubiertos / total waypoints) para cada trazo.
 *   - orderScore  = fracción de trazos cuyo inicio está cerca del primer waypoint
 *                   Y cuya dirección inicial apunta al segundo waypoint.
 *   - passed      = shapeScore >= PASS_SHAPE && orderScore >= PASS_ORDER
 */
import { useRef, useState, useCallback, useEffect } from "react";

// ── Constantes de evaluación ────────────────────────────────────────────────
const HIT_RADIUS_RATIO = 0.10;   // radio de "toque" = 10% del lado corto del canvas
const PASS_SHAPE       = 0.60;   // 60% de waypoints cubiertos → aprobado en forma
const PASS_ORDER       = 0.50;   // al menos la mitad de trazos en orden correcto
const START_PROXIMITY  = 0.18;   // el inicio del trazo debe estar a < 18% del primer waypoint

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Distancia euclídea en coordenadas normalizadas (0-1). */
function dist(a, b) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

/**
 * Coordenadas del puntero relativas al canvas, normalizadas a [0, 1].
 */
function getCanvasPoint(canvas, e) {
  const rect = canvas.getBoundingClientRect();
  const clientX = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
  const clientY = e.clientY ?? e.touches?.[0]?.clientY ?? 0;
  return {
    x: (clientX - rect.left) / rect.width,
    y: (clientY - rect.top)  / rect.height,
  };
}

/**
 * Evalúa un trazo dibujado contra los waypoints esperados.
 *
 * @param {Array<{x,y}>} drawnPath  - Puntos capturados del puntero (normalizados).
 * @param {Array<{x,y}>} waypoints  - Waypoints del trazo de la letra (normalizados).
 * @param {number}       hitRadius  - Radio de toque en coordenadas normalizadas.
 * @returns {{ shapeScore: number, orderOk: boolean }}
 */
function evaluateStroke(drawnPath, waypoints, hitRadius) {
  if (!drawnPath.length || !waypoints.length) return { shapeScore: 0, orderOk: false };

  // 1. Shape: fracción de waypoints cubiertos por algún punto del camino dibujado.
  let covered = 0;
  for (const wp of waypoints) {
    if (drawnPath.some((p) => dist(p, wp) <= hitRadius)) covered++;
  }
  const shapeScore = covered / waypoints.length;

  // 2. Order: el primer punto dibujado debe estar cerca del primer waypoint.
  const startOk = dist(drawnPath[0], waypoints[0]) <= START_PROXIMITY;

  // Dirección inicial: vector del primer al segundo waypoint vs vector inicial dibujado.
  let dirOk = true;
  if (waypoints.length >= 2 && drawnPath.length >= 2) {
    const expectedDir = {
      x: waypoints[1].x - waypoints[0].x,
      y: waypoints[1].y - waypoints[0].y,
    };
    // Buscar el primer punto dibujado suficientemente alejado del inicio
    let drawnDir = null;
    for (const p of drawnPath.slice(1)) {
      const d = dist(drawnPath[0], p);
      if (d > 0.05) {
        drawnDir = { x: p.x - drawnPath[0].x, y: p.y - drawnPath[0].y };
        break;
      }
    }
    if (drawnDir) {
      // Producto escalar normalizado: > 0 → misma dirección general
      const lenE = Math.sqrt(expectedDir.x ** 2 + expectedDir.y ** 2) || 1;
      const lenD = Math.sqrt(drawnDir.x ** 2 + drawnDir.y ** 2) || 1;
      const dot = (expectedDir.x / lenE) * (drawnDir.x / lenD) +
                  (expectedDir.y / lenE) * (drawnDir.y / lenD);
      dirOk = dot > 0.0; // cualquier componente positiva = dirección compatible
    }
  }

  return { shapeScore, orderOk: startOk && dirOk };
}

// ── Hook principal ───────────────────────────────────────────────────────────

/**
 * @param {object}   charData   - { key: string, strokes: Array<{points, arrowAngle}> }
 *                                 Del letterData.js. null → hook inactivo.
 * @param {number}   hintLevel  - 1 | 2 | 3 (derivado de successRate en ChatWindow)
 * @param {function} onComplete - callback({ shapeScore, orderScore, passed }) al terminar
 */
export function useLetterTracing({ charData, hintLevel = 3, onComplete }) {
  const canvasRef    = useRef(null);
  const drawingRef   = useRef(false);
  const currentPath  = useRef([]);      // puntos del trazo en curso (refs, no state)
  const rafRef       = useRef(null);
  const strokeResults = useRef([]);     // { shapeScore, orderOk } por trazo evaluado

  const [currentStrokeIdx, setCurrentStrokeIdx] = useState(0);
  // phase: "tracing" | "done"
  const [phase, setPhase]   = useState("tracing");
  const [result, setResult] = useState(null);

  const totalStrokes = charData?.strokes?.length ?? 0;

  // ── Reset al cambiar la letra ─────────────────────────────────────────────
  useEffect(() => {
    setCurrentStrokeIdx(0);
    setPhase("tracing");
    setResult(null);
    strokeResults.current = [];
    currentPath.current = [];
    drawingRef.current = false;
  }, [charData]);

  // ── Dibujo en canvas (RAF loop) ───────────────────────────────────────────

  /**
   * Redibuja el canvas completo:
   *  - Guía de letra (si hintLevel >= 3 o queremos siempre mostrar)
   *  - Waypoints / flechas según hintLevel
   *  - Trazos ya completados (verde claro)
   *  - Trazo en curso (azul)
   */
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !charData) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width;
    const H = canvas.height;
    const hitR = Math.min(W, H) * HIT_RADIUS_RATIO;

    ctx.clearRect(0, 0, W, H);

    // ── 1. Fondo blanco ───────────────────────────────────────────────────
    ctx.fillStyle = "#fafafa";
    ctx.fillRect(0, 0, W, H);

    // ── 2. Letra guía (hintLevel 3) ───────────────────────────────────────
    if (hintLevel >= 3) {
      ctx.save();
      ctx.globalAlpha = 0.12;
      ctx.strokeStyle = "#374151";
      ctx.lineWidth = Math.min(W, H) * 0.22;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      for (const stroke of charData.strokes) {
        if (!stroke.points.length) continue;
        ctx.beginPath();
        ctx.moveTo(stroke.points[0].x * W, stroke.points[0].y * H);
        for (const p of stroke.points.slice(1)) ctx.lineTo(p.x * W, p.y * H);
        ctx.stroke();
      }
      ctx.restore();
    }

    // ── 3. Waypoints y flechas ────────────────────────────────────────────
    charData.strokes.forEach((stroke, sIdx) => {
      const done = sIdx < currentStrokeIdx;
      const active = sIdx === currentStrokeIdx;

      stroke.points.forEach((wp, wIdx) => {
        const px = wp.x * W;
        const py = wp.y * H;

        // Mostrar solo si el nivel de pista lo requiere
        const showDot =
          hintLevel >= 2 ||
          (hintLevel === 1 && (wIdx === 0 || wIdx === stroke.points.length - 1));

        if (!showDot) return;

        // Color según estado
        ctx.beginPath();
        ctx.arc(px, py, hitR * 0.55, 0, Math.PI * 2);
        if (done) {
          ctx.fillStyle = "rgba(21,128,61,0.3)";
        } else if (active) {
          ctx.fillStyle = wIdx === 0 ? "#4a90d9" : "rgba(74,144,217,0.45)";
        } else {
          ctx.fillStyle = "rgba(156,163,175,0.4)";
        }
        ctx.fill();

        // Número de waypoint (hintLevel 2-3, solo trazo activo)
        if (hintLevel >= 2 && active && wIdx === 0) {
          ctx.save();
          ctx.fillStyle = "#1e40af";
          ctx.font = `bold ${Math.max(11, hitR * 0.9)}px sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(sIdx + 1, px, py);
          ctx.restore();
        }
      });

      // Flecha de dirección (hintLevel 3, solo trazo activo)
      if (hintLevel >= 3 && active && stroke.points.length >= 1) {
        const p0 = stroke.points[0];
        const arrowAngle = stroke.arrowAngle ?? 0;
        const arrowLen = Math.min(W, H) * 0.13;
        const rad = (arrowAngle * Math.PI) / 180;
        const ax = p0.x * W;
        const ay = p0.y * H;
        const tx = ax + Math.cos(rad) * arrowLen;
        const ty = ay + Math.sin(rad) * arrowLen;

        ctx.save();
        ctx.strokeStyle = "#2563eb";
        ctx.lineWidth = 2.5;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(tx, ty);
        ctx.stroke();
        // Punta de flecha
        ctx.setLineDash([]);
        ctx.fillStyle = "#2563eb";
        const headLen = arrowLen * 0.35;
        const angle1 = rad + Math.PI * 0.75;
        const angle2 = rad - Math.PI * 0.75;
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(tx + Math.cos(angle1) * headLen, ty + Math.sin(angle1) * headLen);
        ctx.lineTo(tx + Math.cos(angle2) * headLen, ty + Math.sin(angle2) * headLen);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    });

    // ── 4. Trazo en curso ─────────────────────────────────────────────────
    const path = currentPath.current;
    if (path.length >= 2) {
      ctx.save();
      ctx.strokeStyle = "#2563eb";
      ctx.lineWidth = Math.min(W, H) * 0.04;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      ctx.moveTo(path[0].x * W, path[0].y * H);
      for (const p of path.slice(1)) ctx.lineTo(p.x * W, p.y * H);
      ctx.stroke();
      ctx.restore();
    }

    // ── 5. Trazos completados ─────────────────────────────────────────────
    // (Re-dibujados para persistencia visual — guardados en strokeResults)
    // No tenemos los paths guardados permanentemente (por economía de memoria),
    // así que solo mostramos "✓" badge sobre el primer waypoint de cada trazo done.
    for (let si = 0; si < currentStrokeIdx && si < charData.strokes.length; si++) {
      const wp0 = charData.strokes[si].points[0];
      const px = wp0.x * W;
      const py = wp0.y * H;
      ctx.save();
      ctx.font = `${Math.max(12, Math.min(W, H) * 0.08)}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.globalAlpha = 0.7;
      ctx.fillText("✓", px, py - Math.min(W, H) * 0.06);
      ctx.restore();
    }
  }, [charData, currentStrokeIdx, hintLevel]);

  // RAF: forzar redibujado mientras se traza
  const scheduleRedraw = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      redraw();
      rafRef.current = null;
    });
  }, [redraw]);

  // Redibujado completo al cambiar strokeIdx o hintLevel
  useEffect(() => {
    redraw();
  }, [redraw]);

  // ── Completar evaluación ──────────────────────────────────────────────────

  const finalize = useCallback(() => {
    if (!strokeResults.current.length) return;

    const shapeScores = strokeResults.current.map((r) => r.shapeScore);
    const shapeScore  = shapeScores.reduce((a, b) => a + b, 0) / shapeScores.length;
    const orderScore  = strokeResults.current.filter((r) => r.orderOk).length /
                        strokeResults.current.length;
    const passed      = shapeScore >= PASS_SHAPE && orderScore >= PASS_ORDER;

    const res = { shapeScore, orderScore, passed };
    setResult(res);
    setPhase("done");
    onComplete?.(res);
  }, [onComplete]);

  // ── Handlers de puntero ───────────────────────────────────────────────────

  const handlePointerDown = useCallback((e) => {
    if (phase !== "tracing" || !charData) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);
    drawingRef.current = true;
    currentPath.current = [getCanvasPoint(canvas, e)];
    scheduleRedraw();
  }, [phase, charData, scheduleRedraw]);

  const handlePointerMove = useCallback((e) => {
    if (!drawingRef.current) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    currentPath.current.push(getCanvasPoint(canvas, e));
    scheduleRedraw();
  }, [scheduleRedraw]);

  const handlePointerUp = useCallback((e) => {
    if (!drawingRef.current || !charData) return;
    e.preventDefault();
    drawingRef.current = false;

    const canvas = canvasRef.current;
    const hitRadius = canvas
      ? (Math.min(canvas.width, canvas.height) * HIT_RADIUS_RATIO) / canvas.width
      : HIT_RADIUS_RATIO;

    const drawnPath = currentPath.current;
    currentPath.current = [];

    const stroke = charData.strokes[currentStrokeIdx];
    if (stroke && drawnPath.length >= 2) {
      const evalResult = evaluateStroke(drawnPath, stroke.points, hitRadius);
      strokeResults.current.push(evalResult);

      const nextIdx = currentStrokeIdx + 1;
      if (nextIdx >= totalStrokes) {
        // Todos los trazos dibujados → finalizar
        setCurrentStrokeIdx(nextIdx);
        setTimeout(finalize, 150); // pequeño delay para que el canvas se limpie
      } else {
        setCurrentStrokeIdx(nextIdx);
      }
    } else {
      scheduleRedraw();
    }
  }, [charData, currentStrokeIdx, totalStrokes, finalize, scheduleRedraw]);

  // ── Reset manual ─────────────────────────────────────────────────────────

  const reset = useCallback(() => {
    setCurrentStrokeIdx(0);
    setPhase("tracing");
    setResult(null);
    strokeResults.current = [];
    currentPath.current = [];
    drawingRef.current = false;
    redraw();
  }, [redraw]);

  // ── Cleanup RAF al desmontar ──────────────────────────────────────────────
  useEffect(() => () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  }, []);

  return {
    canvasRef,
    currentStrokeIdx,
    totalStrokes,
    phase,          // "tracing" | "done"
    result,         // null | { shapeScore, orderScore, passed }
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    reset,
  };
}
