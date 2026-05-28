/**
 * CharacterAvatar — avatar infantil con cuerpo completo y brazos para cada personaje.
 *
 * Cada uno de los 12 personajes del catálogo tiene:
 *   - El emoji del personaje como "cara/cabeza"
 *   - Un cuerpo SVG con dos brazos, torso y pies en el color del personaje
 *   - El brazo derecho sube al oído en estado "listening"
 *   - 4 animaciones de estado: idle (flotar), speaking (rebotar),
 *     listening (pulsar), thinking (oscilar)
 *
 * No requiere dependencias externas — todo es CSS + SVG inline.
 *
 * Props:
 *   avatarId  string      ID del personaje (de CHARACTERS)
 *   state     string      idle | speaking | listening | thinking
 *   size      number      Anchura total en px (default 110)
 */
import { CHARACTERS } from "./AvatarDisplay";

// Color de cuerpo por personaje
const BODY_COLOR = {
  robot:     "#4a90d9",
  panda:     "#374151",
  fox:       "#ea580c",
  frog:      "#16a34a",
  lion:      "#d97706",
  dolphin:   "#0ea5e9",
  butterfly: "#a855f7",
  star:      "#f59e0b",
  dino:      "#22c55e",
  unicorn:   "#ec4899",
  cat:       "#f97316",
  owl:       "#7c3aed",
};

const BODY_LIGHT = {
  robot:     "#7bb8e8",
  panda:     "#6b7280",
  fox:       "#fb923c",
  frog:      "#4ade80",
  lion:      "#fbbf24",
  dolphin:   "#38bdf8",
  butterfly: "#c084fc",
  star:      "#fcd34d",
  dino:      "#86efac",
  unicorn:   "#f9a8d4",
  cat:       "#fdba74",
  owl:       "#a78bfa",
};

const KEYFRAMES = `
  @keyframes caFloat   { 0%,100%{transform:translateY(0)}       50%{transform:translateY(-10px)} }
  @keyframes caBounce  { 0%,100%{transform:scale(1)}             50%{transform:scale(0.9) translateY(4px)} }
  @keyframes caPulse   { 0%,100%{transform:scale(1)}             50%{transform:scale(1.1)} }
  @keyframes caWobble  { 0%,25%,75%,100%{transform:rotate(0deg)} 25%{transform:rotate(-6deg)} 75%{transform:rotate(6deg)} }
`;

export default function CharacterAvatar({ avatarId = "robot", state = "idle", size = 110 }) {
  const char  = CHARACTERS.find((c) => c.id === avatarId) ?? CHARACTERS[0];
  const color = BODY_COLOR[avatarId]  ?? "#4a90d9";
  const light = BODY_LIGHT[avatarId]  ?? "#7bb8e8";

  const animation =
    state === "speaking"  ? `caBounce  0.45s ease-in-out infinite` :
    state === "listening" ? `caPulse   1.1s  ease-in-out infinite` :
    state === "thinking"  ? `caWobble  0.7s  ease-in-out infinite` :
    /* idle */              `caFloat   3.2s  ease-in-out infinite`;

  const isListening = state === "listening";

  // Dimensions derived from `size`
  const emojiPx = Math.round(size * 0.52);  // emoji head
  const bodyW   = size;
  const bodyH   = Math.round(size * 0.72);

  // SVG viewBox is fixed; bodyW/bodyH scale it
  // viewBox: 0 0 100 72
  // Layout: arms at sides, torso center, feet bottom

  return (
    <>
      <style>{KEYFRAMES}</style>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 0,
          userSelect: "none",
          WebkitUserSelect: "none",
          animation,
          filter: state === "thinking" ? "grayscale(0.2) brightness(0.9)" : "none",
          transition: "filter 0.3s",
        }}
      >
        {/* ── Emoji head ─────────────────────────────────────────────────── */}
        <span
          role="img"
          aria-label={char.name}
          style={{
            fontSize: emojiPx,
            lineHeight: 1,
            display: "block",
            marginBottom: -Math.round(size * 0.04), // slight overlap with body
          }}
        >
          {char.emoji}
        </span>

        {/* ── SVG body ───────────────────────────────────────────────────── */}
        <svg
          width={bodyW}
          height={bodyH}
          viewBox="0 0 100 72"
          overflow="visible"
          style={{ display: "block" }}
        >
          {/* Neck */}
          <rect x="41" y="0" width="18" height="12" rx="6" fill={light} />

          {/* Torso */}
          <rect x="24" y="10" width="52" height="42" rx="14" fill={color} />

          {/* Belly highlight */}
          <ellipse cx="50" cy="28" rx="14" ry="10" fill={light} opacity="0.3" />

          {/* Left arm (static) */}
          <rect x="6" y="14" width="20" height="11" rx="5.5" fill={color} />
          <circle cx="10" cy="33" r="9" fill={color} />
          {/* Left hand */}
          <circle cx="6"  cy="36" r="5" fill={light} />
          <circle cx="12" cy="39" r="5" fill={light} />
          <circle cx="17" cy="37" r="5" fill={light} />

          {/* Right arm — raises to ear when listening */}
          <g
            style={{
              transformOrigin: "86px 18px",
              transform: isListening ? "rotate(-140deg)" : "rotate(0deg)",
              transition: "transform 0.55s cubic-bezier(0.34,1.56,0.64,1)",
            }}
          >
            <rect x="74" y="14" width="20" height="11" rx="5.5" fill={color} />
            <circle cx="90" cy="33" r="9" fill={color} />
            {/* Right hand */}
            <circle cx="88" cy="37" r="5" fill={light} />
            <circle cx="94" cy="36" r="5" fill={light} />
            <circle cx="98" cy="32" r="5" fill={light} />
          </g>

          {/* Left leg */}
          <rect x="30" y="50" width="16" height="22" rx="7" fill={light} />
          {/* Left foot */}
          <ellipse cx="30" cy="72" rx="12" ry="6" fill={color} opacity="0.8" />

          {/* Right leg */}
          <rect x="54" y="50" width="16" height="22" rx="7" fill={light} />
          {/* Right foot */}
          <ellipse cx="70" cy="72" rx="12" ry="6" fill={color} opacity="0.8" />
        </svg>
      </div>
    </>
  );
}