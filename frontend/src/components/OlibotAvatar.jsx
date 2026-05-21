/**
 * OlibotAvatar — animated SVG robot with four interaction states:
 *
 *   idle      floating up/down gently, neutral smile
 *   speaking  mouth opens/closes, chest equaliser bars pulse
 *   listening right arm raises to ear, wider smile, sound-wave on chest
 *   thinking  eyes look up, antenna glows, three bouncing dots on mouth area
 */
import { useEffect, useRef, useState } from "react";

export default function OlibotAvatar({ state = "idle" }) {
  const [mouthOpen, setMouthOpen]   = useState(false);
  const [blinking,  setBlinking]    = useState(false);
  const mouthRef = useRef(null);

  // Mouth oscillation when speaking
  useEffect(() => {
    clearInterval(mouthRef.current);
    if (state === "speaking") {
      mouthRef.current = setInterval(() => setMouthOpen((o) => !o), 240);
    } else {
      setMouthOpen(false);
    }
    return () => clearInterval(mouthRef.current);
  }, [state]);

  // Irregular blinking
  useEffect(() => {
    let t;
    const schedule = () => {
      t = setTimeout(() => {
        setBlinking(true);
        setTimeout(() => { setBlinking(false); schedule(); }, 130);
      }, 3200 + Math.random() * 2000);
    };
    schedule();
    return () => clearTimeout(t);
  }, []);

  const S = state === "speaking";
  const L = state === "listening";
  const T = state === "thinking";

  const C = {
    body:   "#4a90d9",
    dark:   "#1e3a5f",
    light:  "#7bb8e8",
    screen: "#e8f4fd",
    blush:  "rgba(249,168,212,0.5)",
  };

  return (
    <>
      <style>{`
        @keyframes obFloat {
          0%,100% { transform: translateY(0); }
          50%      { transform: translateY(-10px); }
        }
        @keyframes obThinkDot {
          0%,80%,100% { opacity:0.25; transform:scale(0.55); }
          40%         { opacity:1;    transform:scale(1); }
        }
        @keyframes obAntGlow {
          0%,100% { fill:#fbbf24; }
          50%     { fill:#fb923c; }
        }
        @keyframes obBarA {
          0%,100% { transform:scaleY(1);   }
          50%     { transform:scaleY(1.9); }
        }
        @keyframes obBarB {
          0%,100% { transform:scaleY(0.7); }
          50%     { transform:scaleY(1.6); }
        }
        @keyframes obBarC {
          0%,100% { transform:scaleY(1.2); }
          50%     { transform:scaleY(0.6); }
        }
      `}</style>

      <svg
        viewBox="0 0 200 312"
        style={{
          width: "180px",
          height: "281px",
          filter: "drop-shadow(0 10px 28px rgba(74,144,217,0.3))",
          animation: (!S && !L && !T) ? "obFloat 3.2s ease-in-out infinite" : "none",
          overflow: "visible",
        }}
      >
        {/* ── Antenna ─────────────────────────────────────── */}
        <line x1="100" y1="40" x2="100" y2="18"
              stroke={C.dark} strokeWidth="4" strokeLinecap="round"/>
        <circle cx="100" cy="11" r="9" fill="#fbbf24"
          style={{ animation: T ? "obAntGlow 0.7s infinite" : "none" }}/>

        {/* ── Head ────────────────────────────────────────── */}
        <rect x="36" y="40" width="128" height="110" rx="22" fill={C.body}/>

        {/* Ear left */}
        <circle cx="34" cy="94" r="13" fill={C.light}/>
        <circle cx="34" cy="94" r="7"  fill={C.dark}/>
        {/* Ear right */}
        <circle cx="166" cy="94" r="13" fill={C.light}/>
        <circle cx="166" cy="94" r="7"  fill={C.dark}/>

        {/* Eye left */}
        <circle cx="74" cy="82" r="18" fill="white"/>
        <circle cx="74" cy={T ? "76" : "82"} r="9" fill={C.dark}
                style={{ transition: "cy 0.25s ease" }}/>
        <circle cx="79" cy={T ? "73" : "79"} r="3.5" fill="white" opacity="0.9"/>
        {blinking && <rect x="56" y="73" width="36" height="18" rx="9" fill={C.body}/>}

        {/* Eye right */}
        <circle cx="126" cy="82" r="18" fill="white"/>
        <circle cx="126" cy={T ? "76" : "82"} r="9" fill={C.dark}
                style={{ transition: "cy 0.25s ease" }}/>
        <circle cx="131" cy={T ? "73" : "79"} r="3.5" fill="white" opacity="0.9"/>
        {blinking && <rect x="108" y="73" width="36" height="18" rx="9" fill={C.body}/>}

        {/* Cheeks (speaking / listening only) */}
        {(S || L) && (
          <>
            <circle cx="58"  cy="108" r="12" fill={C.blush}/>
            <circle cx="142" cy="108" r="12" fill={C.blush}/>
          </>
        )}

        {/* ── Mouth ───────────────────────────────────────── */}
        {T ? (
          /* Thinking: three bouncing dots */
          <>
            <circle cx="86"  cy="122" r="5" fill={C.dark}
              style={{ animation: "obThinkDot 1.1s infinite 0.00s" }}/>
            <circle cx="100" cy="122" r="5" fill={C.dark}
              style={{ animation: "obThinkDot 1.1s infinite 0.18s" }}/>
            <circle cx="114" cy="122" r="5" fill={C.dark}
              style={{ animation: "obThinkDot 1.1s infinite 0.36s" }}/>
          </>
        ) : S ? (
          mouthOpen
            ? <ellipse cx="100" cy="124" rx="18" ry="12" fill={C.dark}/>
            : <ellipse cx="100" cy="124" rx="16" ry="5"  fill={C.dark}/>
        ) : (
          /* Idle / listening: smile (wider when listening) */
          <path
            d={L ? "M 80 118 Q 100 134 120 118" : "M 84 118 Q 100 128 116 118"}
            stroke={C.dark} strokeWidth="4" fill="none" strokeLinecap="round"
          />
        )}

        {/* ── Neck ────────────────────────────────────────── */}
        <rect x="84" y="150" width="32" height="18" rx="7" fill={C.light}/>

        {/* ── Body ────────────────────────────────────────── */}
        <rect x="34" y="168" width="132" height="98" rx="18" fill={C.light}/>
        <rect x="38" y="172" width="124" height="90" rx="15" fill={C.body}/>

        {/* Chest display */}
        <rect x="66" y="183" width="68" height="52" rx="9" fill={C.dark}/>
        <rect x="70" y="187" width="60" height="44" rx="7" fill={C.screen}/>

        {S ? (
          /* Speaking: animated equaliser bars */
          <>
            {[
              { x: 79,  delay: "0.00s", anim: "obBarA" },
              { x: 91,  delay: "0.08s", anim: "obBarB" },
              { x: 103, delay: "0.16s", anim: "obBarC" },
              { x: 115, delay: "0.06s", anim: "obBarA" },
            ].map(({ x, delay, anim }) => (
              <rect key={x} x={x} y="199" width="8" height="20" rx="4" fill={C.body}
                style={{
                  transformOrigin: `${x + 4}px 219px`,
                  animation: `${anim} 0.35s infinite ${delay}`,
                }}
              />
            ))}
          </>
        ) : L ? (
          /* Listening: sound-wave arcs */
          <>
            <path d="M 90 196 Q 80 209 90 222" stroke={C.body} strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.5"/>
            <path d="M 95 193 Q 82 209 95 225" stroke={C.body} strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.75"/>
            <path d="M 100 191 Q 84 209 100 227" stroke={C.body} strokeWidth="3" fill="none" strokeLinecap="round"/>
          </>
        ) : (
          /* Idle: OLIBOT logo circles */
          <>
            <circle cx="100" cy="209" r="14" fill={C.body} opacity="0.2"/>
            <circle cx="100" cy="209" r="8"  fill={C.body} opacity="0.5"/>
            <circle cx="100" cy="209" r="4"  fill={C.body}/>
          </>
        )}

        {/* ── Left arm (static) ───────────────────────────── */}
        <rect x="14" y="174" width="22" height="66" rx="11" fill={C.body}/>
        <circle cx="25" cy="246" r="13" fill={C.body}/>

        {/* ── Right arm — raises to ear when listening ─────── */}
        <g
          style={{
            transformOrigin: "175px 174px",
            transform: L ? "rotate(-162deg)" : "rotate(0deg)",
            transition: "transform 0.55s cubic-bezier(0.34,1.56,0.64,1)",
          }}
        >
          <rect x="164" y="174" width="22" height="66" rx="11" fill={C.body}/>
          <circle cx="175" cy="246" r="13" fill={C.body}/>
        </g>

        {/* ── Legs ─────────────────────────────────────────── */}
        <rect x="52"  y="266" width="40" height="28" rx="11" fill={C.dark}/>
        <rect x="108" y="266" width="40" height="28" rx="11" fill={C.dark}/>
        {/* Feet */}
        <rect x="44"  y="284" width="54" height="16" rx="9" fill={C.dark}/>
        <rect x="102" y="284" width="54" height="16" rx="9" fill={C.dark}/>
      </svg>
    </>
  );
}
