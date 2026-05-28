/**
 * AvatarDisplay — renders the student's chosen character as an animated emoji.
 *
 * States:
 *   idle      → floating up/down
 *   speaking  → bouncing (mouth open / active)
 *   listening → pulsing (I'm listening)
 *   thinking  → wobbling (processing)
 */

export const CHARACTERS = [
  { id: "robot",     emoji: "🤖", name: "Robot"     },
  { id: "panda",     emoji: "🐼", name: "Panda"     },
  { id: "fox",       emoji: "🦊", name: "Zorro"     },
  { id: "frog",      emoji: "🐸", name: "Rana"      },
  { id: "lion",      emoji: "🦁", name: "León"      },
  { id: "dolphin",   emoji: "🐬", name: "Delfín"    },
  { id: "butterfly", emoji: "🦋", name: "Mariposa"  },
  { id: "star",      emoji: "🌟", name: "Estrella"  },
  { id: "dino",      emoji: "🦕", name: "Dino"      },
  { id: "unicorn",   emoji: "🦄", name: "Unicornio" },
  { id: "cat",       emoji: "🐱", name: "Gato"      },
  { id: "owl",       emoji: "🦉", name: "Búho"      },
];

const KEYFRAMES = `
  @keyframes avFloat   { 0%,100%{transform:translateY(0)}    50%{transform:translateY(-10px)} }
  @keyframes avBounce  { 0%,100%{transform:scale(1)}         50%{transform:scale(0.9) translateY(4px)} }
  @keyframes avPulse   { 0%,100%{transform:scale(1)}         50%{transform:scale(1.12)} }
  @keyframes avWobble  { 0%,100%{transform:rotate(0deg)}     25%{transform:rotate(-8deg)} 75%{transform:rotate(8deg)} }
`;

export default function AvatarDisplay({ avatarId, state = "idle", size = 90 }) {
  const char = CHARACTERS.find((c) => c.id === avatarId) ?? CHARACTERS[0];

  const animation =
    state === "speaking"  ? "avBounce  0.45s ease-in-out infinite" :
    state === "listening" ? "avPulse   1.1s  ease-in-out infinite" :
    state === "thinking"  ? "avWobble  0.7s  ease-in-out infinite" :
    /* idle */              "avFloat   3.2s  ease-in-out infinite";

  return (
    <>
      <style>{KEYFRAMES}</style>
      <span
        role="img"
        aria-label={char.name}
        style={{
          fontSize: size,
          lineHeight: 1,
          display: "inline-block",
          animation,
          userSelect: "none",
          filter: state === "thinking" ? "grayscale(0.25) brightness(0.9)" : "none",
          transition: "filter 0.3s",
        }}
      >
        {char.emoji}
      </span>
    </>
  );
}