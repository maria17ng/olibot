/**
 * useLetterTracing — hook para trazado de letras con fase de demostración.
 *
 * Fases:
 *   "demo"    → animación automática: cursor rojo recorre los trazos de la letra.
 *               El niño puede tocar el canvas en cualquier momento para saltar la demo.
 *   "tracing" → el niño traza con el dedo. Se evalúa al levantar cada trazo.
 *   "done"    → todos los trazos evaluados; se emite onComplete.
 *
 * Niveles de pista (hintLevel):
 *   3 → letra base semitransparente + puntos numerados + flechas de dirección
 *   2 → puntos numerados (sin letra base)
 *   1 → solo punto de inicio y fin de cada trazo
 */
import { useRef, useState, useCallback, useEffect } from "react";

// ── Evaluación ───────────────────────────────────────────────────────────────
const HIT_RADIUS_RATIO = 0.10;
const PASS_SHAPE       = 0.60;
const PASS_ORDER       = 0.50;
const START_PROXIMITY  = 0.18;

// ── Demo ─────────────────────────────────────────────────────────────────────
const DEMO_MS_PER_WP   = 350;   // ms per waypoint in demo
const DEMO_MIN_MS      = 1400;  // minimum stroke demo duration
const DEMO_PAUSE_MS    = 500;   // pause between strokes
const DEMO_REPEATS     = 2;     // total number of times the demo plays before tracing

function dist(a, b) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function getCanvasPoint(canvas, e) {
  const rect = canvas.getBoundingClientRect();
  const clientX = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
  const clientY = e.clientY ?? e.touches?.[0]?.clientY ?? 0;
  return {
    x: (clientX - rect.left) / rect.width,
    y: (clientY - rect.top)  / rect.height,
  };
}

function evaluateStroke(drawnPath, waypoints, hitRadius) {
  if (!drawnPath.length || !waypoints.length) return { shapeScore: 0, orderOk: false };

  // Sequential greedy coverage: each waypoint is only counted if visited IN ORDER.
  // A circle touching all dots out-of-order (or with wrong direction) scores low.
  let nextWpIdx = 0;
  for (const pt of drawnPath) {
    if (nextWpIdx >= waypoints.length) break;
    if (dist(pt, waypoints[nextWpIdx]) <= hitRadius) nextWpIdx++;
  }
  const coverageScore = nextWpIdx / waypoints.length;

  // Path-length penalty: if the drawn path is much longer than the expected path
  // (e.g., a circle drawn over a straight line), reduce the score.
  const expectedLen = waypoints.slice(1).reduce((s, wp, i) => s + dist(waypoints[i], wp), 0);
  const drawnLen    = drawnPath.slice(1).reduce((s, pt, i) => s + dist(drawnPath[i], pt), 0);
  const lenRatio    = drawnLen / (expectedLen || 0.001);
  const lenPenalty  = lenRatio <= 2.0 ? 1.0 : Math.max(0, 1 - (lenRatio - 2.0) / 1.5);

  const shapeScore = coverageScore * lenPenalty;

  const startOk = dist(drawnPath[0], waypoints[0]) <= START_PROXIMITY;

  let dirOk = true;
  if (waypoints.length >= 2 && drawnPath.length >= 2) {
    const expectedDir = {
      x: waypoints[1].x - waypoints[0].x,
      y: waypoints[1].y - waypoints[0].y,
    };
    let drawnDir = null;
    for (const p of drawnPath.slice(1)) {
      const d = dist(drawnPath[0], p);
      if (d > 0.05) {
        drawnDir = { x: p.x - drawnPath[0].x, y: p.y - drawnPath[0].y };
        break;
      }
    }
    if (drawnDir) {
      const lenE = Math.sqrt(expectedDir.x ** 2 + expectedDir.y ** 2) || 1;
      const lenD = Math.sqrt(drawnDir.x ** 2 + drawnDir.y ** 2) || 1;
      const dot = (expectedDir.x / lenE) * (drawnDir.x / lenD) +
                  (expectedDir.y / lenE) * (drawnDir.y / lenD);
      dirOk = dot > 0.0;
    }
  }

  return { shapeScore, orderOk: startOk && dirOk };
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useLetterTracing({ charData, hintLevel = 3, onComplete, skipInitialDemo = false }) {
  const canvasRef      = useRef(null);
  const drawingRef     = useRef(false);
  const currentPath    = useRef([]);
  const rafRef         = useRef(null);
  const strokeResults  = useRef([]);

  // Demo refs (all state kept in refs to avoid stale closures in RAF)
  const demoStrokeIdxRef  = useRef(0);
  const demoRepeatCountRef = useRef(0);    // how many full demo passes completed so far
  const demoElapsedRef    = useRef(0);
  const demoLastTimeRef   = useRef(null);
  const demoCursorRef     = useRef(null);   // {x,y} normalized or null
  const demoPathRef       = useRef([]);     // accumulated trail for current stroke
  const demoPauseUntilRef = useRef(0);
  const demoRafRef        = useRef(null);
  const charDataRef       = useRef(charData);
  const redrawRef         = useRef(null);   // always points at latest redraw()

  const [currentStrokeIdx, setCurrentStrokeIdx] = useState(0);
  // phase: "demo" | "tracing" | "done"
  const [phase, setPhase] = useState(skipInitialDemo ? "tracing" : "demo");
  const [result, setResult] = useState(null);

  const totalStrokes = charData?.strokes?.length ?? 0;

  // Keep charDataRef current
  useEffect(() => { charDataRef.current = charData; }, [charData]);

  // ── Redraw ────────────────────────────────────────────────────────────────

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !charData) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width;
    const H = canvas.height;
    const hitR = Math.min(W, H) * HIT_RADIUS_RATIO;

    ctx.clearRect(0, 0, W, H);

    // 1. Background
    ctx.fillStyle = "#fafafa";
    ctx.fillRect(0, 0, W, H);

    // 2. Ghost letter guide (hintLevel 3)
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

    // 3. Waypoints and arrows
    charData.strokes.forEach((stroke, sIdx) => {
      const done   = sIdx < currentStrokeIdx;
      const active = sIdx === currentStrokeIdx;

      stroke.points.forEach((wp, wIdx) => {
        const px = wp.x * W;
        const py = wp.y * H;

        const showDot =
          hintLevel >= 2 ||
          (hintLevel === 1 && (wIdx === 0 || wIdx === stroke.points.length - 1));
        if (!showDot) return;

        ctx.beginPath();
        ctx.arc(px, py, hitR * 0.55, 0, Math.PI * 2);
        if (done)        ctx.fillStyle = "rgba(21,128,61,0.3)";
        else if (active) ctx.fillStyle = wIdx === 0 ? "#4a90d9" : "rgba(74,144,217,0.45)";
        else             ctx.fillStyle = "rgba(156,163,175,0.4)";
        ctx.fill();

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

    // 4. Current drawn path (blue)
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

    // 5. Completed stroke checkmarks
    for (let si = 0; si < currentStrokeIdx && si < charData.strokes.length; si++) {
      const wp0 = charData.strokes[si].points[0];
      ctx.save();
      ctx.font = `${Math.max(12, Math.min(W, H) * 0.08)}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.globalAlpha = 0.7;
      ctx.fillText("✓", wp0.x * W, wp0.y * H - Math.min(W, H) * 0.06);
      ctx.restore();
    }

    // 6. Demo cursor and trail (red)
    const dc = demoCursorRef.current;
    const dp = demoPathRef.current;
    if (dc !== null) {
      if (dp.length >= 2) {
        ctx.save();
        ctx.strokeStyle = "rgba(239,68,68,0.55)";
        ctx.lineWidth = Math.min(W, H) * 0.045;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();
        ctx.moveTo(dp[0].x * W, dp[0].y * H);
        for (const p of dp.slice(1)) ctx.lineTo(p.x * W, p.y * H);
        ctx.stroke();
        ctx.restore();
      }

      const cx = dc.x * W;
      const cy = dc.y * H;
      const r  = Math.min(W, H) * 0.055;
      ctx.save();
      ctx.shadowBlur = 22;
      ctx.shadowColor = "rgba(239,68,68,0.75)";
      ctx.fillStyle = "#ef4444";
      ctx.globalAlpha = 0.93;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = "white";
      ctx.globalAlpha = 0.75;
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.38, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }, [charData, currentStrokeIdx, hintLevel]);

  // Keep redrawRef current so RAF tick always uses latest version
  useEffect(() => { redrawRef.current = redraw; }, [redraw]);

  const scheduleRedraw = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      redraw();
      rafRef.current = null;
    });
  }, [redraw]);

  useEffect(() => { redraw(); }, [redraw]);

  // ── Reset when charData changes ───────────────────────────────────────────
  // IMPORTANT: must be declared BEFORE the demo RAF effect so React runs it first.
  // If declared after, charData reset would cancel the RAF the demo effect just started.

  useEffect(() => {
    if (demoRafRef.current) {
      cancelAnimationFrame(demoRafRef.current);
      demoRafRef.current = null;
    }
    demoStrokeIdxRef.current = 0;
    demoRepeatCountRef.current = 0;
    demoElapsedRef.current = 0;
    demoLastTimeRef.current = null;
    demoCursorRef.current = null;
    demoPathRef.current = [];
    demoPauseUntilRef.current = 0;

    setCurrentStrokeIdx(0);
    setPhase(skipInitialDemo ? "tracing" : "demo"); // eslint-disable-line react-hooks/exhaustive-deps
    setResult(null);
    strokeResults.current = [];
    currentPath.current = [];
    drawingRef.current = false;
  }, [charData]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Demo animation ────────────────────────────────────────────────────────
  // Declared AFTER charData reset so React runs it second — it starts the RAF
  // that charData reset cannot cancel (it already ran its cleanup).

  useEffect(() => {
    if (phase !== "demo" || !charData) return;

    // Cancel any leftover RAF before starting fresh
    if (demoRafRef.current) {
      cancelAnimationFrame(demoRafRef.current);
      demoRafRef.current = null;
    }

    const tick = (timestamp) => {
      const cd = charDataRef.current;
      if (!cd) return;

      // Wait during inter-stroke pause
      if (timestamp < demoPauseUntilRef.current) {
        demoRafRef.current = requestAnimationFrame(tick);
        return;
      }

      if (demoLastTimeRef.current === null) demoLastTimeRef.current = timestamp;
      const dt = Math.min(timestamp - demoLastTimeRef.current, 50);
      demoLastTimeRef.current = timestamp;
      demoElapsedRef.current += dt;

      const si = demoStrokeIdxRef.current;
      const stroke = cd.strokes[si];
      if (!stroke) {
        demoCursorRef.current = null;
        demoPathRef.current = [];
        redrawRef.current?.();
        setPhase("tracing");
        return;
      }

      const duration = Math.max(DEMO_MIN_MS, stroke.points.length * DEMO_MS_PER_WP);
      const t = Math.min(demoElapsedRef.current / duration, 1);
      const pts = stroke.points;
      const rawIdx = t * (pts.length - 1);
      const i0 = Math.floor(rawIdx);
      const i1 = Math.min(i0 + 1, pts.length - 1);
      const frac = rawIdx - i0;
      demoCursorRef.current = {
        x: pts[i0].x + (pts[i1].x - pts[i0].x) * frac,
        y: pts[i0].y + (pts[i1].y - pts[i0].y) * frac,
      };
      demoPathRef.current = [...demoPathRef.current, { ...demoCursorRef.current }];

      redrawRef.current?.();

      if (t >= 1) {
        const nextSi = si + 1;
        if (nextSi >= cd.strokes.length) {
          // One full pass done — check if we should repeat
          if (demoRepeatCountRef.current < DEMO_REPEATS - 1) {
            demoRepeatCountRef.current += 1;
            demoStrokeIdxRef.current = 0;
            demoElapsedRef.current = 0;
            demoLastTimeRef.current = null;
            demoPathRef.current = [];
            demoCursorRef.current = null;
            demoPauseUntilRef.current = timestamp + DEMO_PAUSE_MS * 3;
            demoRafRef.current = requestAnimationFrame(tick);
          } else {
            demoCursorRef.current = null;
            demoPathRef.current = [];
            redrawRef.current?.();
            setTimeout(() => setPhase("tracing"), 500);
          }
        } else {
          demoStrokeIdxRef.current = nextSi;
          demoElapsedRef.current = 0;
          demoLastTimeRef.current = null;
          demoPathRef.current = [];
          demoPauseUntilRef.current = timestamp + DEMO_PAUSE_MS;
          demoRafRef.current = requestAnimationFrame(tick);
        }
      } else {
        demoRafRef.current = requestAnimationFrame(tick);
      }
    };

    // Pause before demo starts — lets the robot begin speaking the tutorial first
    demoPauseUntilRef.current = performance.now() + 900;
    demoRafRef.current = requestAnimationFrame(tick);

    return () => {
      if (demoRafRef.current) {
        cancelAnimationFrame(demoRafRef.current);
        demoRafRef.current = null;
      }
    };
  }, [phase, charData]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Finalize ──────────────────────────────────────────────────────────────

  const finalize = useCallback(() => {
    if (!strokeResults.current.length) return;
    const shapeScores = strokeResults.current.map((r) => r.shapeScore);
    const shapeScore  = shapeScores.reduce((a, b) => a + b, 0) / shapeScores.length;
    const orderScore  = strokeResults.current.filter((r) => r.orderOk).length /
                        strokeResults.current.length;
    const passed = shapeScore >= PASS_SHAPE && orderScore >= PASS_ORDER;
    const res = { shapeScore, orderScore, passed };
    setResult(res);
    setPhase("done");
    onComplete?.(res);
  }, [onComplete]);

  // ── Skip demo ─────────────────────────────────────────────────────────────

  const skipDemo = useCallback(() => {
    if (demoRafRef.current) {
      cancelAnimationFrame(demoRafRef.current);
      demoRafRef.current = null;
    }
    demoCursorRef.current = null;
    demoPathRef.current = [];
    setPhase("tracing");
  }, []);

  // ── Pointer handlers ──────────────────────────────────────────────────────

  const handlePointerDown = useCallback((e) => {
    if (!charData || phase === "done") return;
    // During demo: skip demo AND start drawing immediately with this same touch
    if (phase === "demo") skipDemo();
    // Start recording stroke (works for "demo"→"tracing" transition too)
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);
    drawingRef.current = true;
    currentPath.current = [getCanvasPoint(canvas, e)];
    scheduleRedraw();
  }, [phase, charData, scheduleRedraw, skipDemo]);

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
        setCurrentStrokeIdx(nextIdx);
        setTimeout(finalize, 150);
      } else {
        setCurrentStrokeIdx(nextIdx);
      }
    } else {
      scheduleRedraw();
    }
  }, [charData, currentStrokeIdx, totalStrokes, finalize, scheduleRedraw]);

  // ── Reset ─────────────────────────────────────────────────────────────────

  const reset = useCallback(() => {
    if (demoRafRef.current) {
      cancelAnimationFrame(demoRafRef.current);
      demoRafRef.current = null;
    }
    demoStrokeIdxRef.current = 0;
    demoRepeatCountRef.current = 0;
    demoElapsedRef.current = 0;
    demoLastTimeRef.current = null;
    demoCursorRef.current = null;
    demoPathRef.current = [];
    demoPauseUntilRef.current = 0;

    setCurrentStrokeIdx(0);
    setPhase(skipInitialDemo ? "tracing" : "demo"); // eslint-disable-line react-hooks/exhaustive-deps
    setResult(null);
    strokeResults.current = [];
    currentPath.current = [];
    drawingRef.current = false;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Cleanup ───────────────────────────────────────────────────────────────

  useEffect(() => () => {
    if (rafRef.current)     cancelAnimationFrame(rafRef.current);
    if (demoRafRef.current) cancelAnimationFrame(demoRafRef.current);
  }, []);

  return {
    canvasRef,
    currentStrokeIdx,
    totalStrokes,
    phase,      // "demo" | "tracing" | "done"
    result,
    skipDemo,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    reset,
  };
}