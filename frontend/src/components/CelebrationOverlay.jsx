/**
 * CelebrationOverlay — canvas-based confetti burst for level-up moments.
 *
 * Renders a full-screen transparent canvas with 90 confetti particles
 * launched from the lower-centre of the screen.  Particles obey gravity
 * and fade out; when the animation ends `onDone` is called so the parent
 * can clear the `active` flag.
 *
 * Usage:
 *   <CelebrationOverlay active={celebrationState === "big"} onDone={() => setCelebrationState(null)} />
 */
import { useEffect, useRef } from "react";

const CONF_COLORS = [
  "#f59e0b", "#4a90d9", "#16a34a", "#dc2626", "#7c3aed",
  "#ec4899", "#06b6d4", "#fbbf24", "#f97316", "#a3e635",
];
const DURATION_MS = 2600; // total animation time
const N_PARTICLES = 90;

function randomBetween(a, b) { return a + Math.random() * (b - a); }

export default function CelebrationOverlay({ active, onDone }) {
  const canvasRef = useRef(null);
  const rafRef    = useRef(null);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    const ctx = canvas.getContext("2d");

    // Origin: slightly above the bottom-centre so the burst fans upward nicely
    const ox = canvas.width  * 0.5;
    const oy = canvas.height * 0.72;

    const particles = Array.from({ length: N_PARTICLES }, () => {
      const angle = randomBetween(-Math.PI * 0.9, -Math.PI * 0.1); // mostly upward
      const speed = randomBetween(7, 22);
      return {
        x: ox + randomBetween(-80, 80),
        y: oy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: CONF_COLORS[Math.floor(Math.random() * CONF_COLORS.length)],
        w: randomBetween(7, 16),
        h: randomBetween(4, 10),
        rotation: randomBetween(0, Math.PI * 2),
        rotSpeed: randomBetween(-0.22, 0.22),
        shape: Math.random() > 0.55 ? "rect" : "circle",
      };
    });

    // Second wave — slightly delayed, narrower spread for depth effect
    const wave2 = Array.from({ length: 30 }, () => {
      const angle = randomBetween(-Math.PI * 0.75, -Math.PI * 0.25);
      const speed = randomBetween(12, 28);
      return {
        x: ox + randomBetween(-40, 40),
        y: oy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: CONF_COLORS[Math.floor(Math.random() * CONF_COLORS.length)],
        w: randomBetween(8, 18),
        h: randomBetween(5, 11),
        rotation: randomBetween(0, Math.PI * 2),
        rotSpeed: randomBetween(-0.28, 0.28),
        shape: Math.random() > 0.5 ? "rect" : "circle",
        delay: randomBetween(0.05, 0.22), // fraction of DURATION_MS
      };
    });

    const allParticles = [...particles, ...wave2];
    const startTime = performance.now();

    const animate = (now) => {
      const elapsed  = now - startTime;
      const progress = elapsed / DURATION_MS; // 0 → 1

      if (elapsed > DURATION_MS) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        onDone?.();
        return;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      allParticles.forEach((p) => {
        const delay = p.delay ?? 0;
        if (progress < delay) return; // wave-2 particles start later
        const localProgress = Math.min((progress - delay) / (1 - delay), 1);

        // Physics
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.52;      // gravity
        p.vx *= 0.993;     // tiny air resistance
        p.rotation += p.rotSpeed;

        // Fade: start fading at 55% of duration
        const alpha = localProgress < 0.55
          ? 1
          : Math.max(0, 1 - (localProgress - 0.55) / 0.45);

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle   = p.color;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);

        if (p.shape === "circle") {
          ctx.beginPath();
          ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        }

        ctx.restore();
      });

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [active, onDone]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 22,
        pointerEvents: "none",
        width: "100%",
        height: "100%",
      }}
    />
  );
}
