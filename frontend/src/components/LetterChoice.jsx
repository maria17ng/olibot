/**
 * LetterChoice — ejercicio de reconocimiento auditivo (#13).
 * OLIBOT ya ha pronunciado "¿Dónde está la X?" por voz (desde ChatWindow).
 * El niño debe tocar la letra correcta entre 4 opciones grandes.
 * Texto en pantalla eliminado — sólo botones grandes para no lectores.
 *
 * Props:
 *   charKey     string  — letra/número correcto (e.g. "A", "m", "4")
 *   onCorrect   () => void
 *   onIncorrect () => void  — called on wrong tap (component resets for retry)
 *   onSkip      () => void
 *   onNudge     () => void  — called after NUDGE_DELAY ms of inactivity
 */
import { useState, useEffect, useRef } from "react";

const UPPERCASE_POOL = "AEIOUMLSPTBCDFGHJKNRQVWXYZ";
const LOWERCASE_POOL = "aeioumlsptbcdfghjknrqvwxyz";
const NUMBER_POOL    = "0123456789";
const NUDGE_DELAY    = 8000; // ms before encouraging the child

function pickDistractors(correctKey, pool, count = 3) {
  const chars = pool.split("").filter(c => c !== correctKey);
  // Fisher-Yates shuffle on the slice we need
  for (let i = chars.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.slice(0, count);
}

export default function LetterChoice({ charKey, onCorrect, onIncorrect, onSkip, onNudge }) {
  const [choices, setChoices]     = useState([]);
  const [chosen, setChosen]       = useState(null); // null | chosen key
  const [attempts, setAttempts]   = useState(0);
  const nudgeTimerRef             = useRef(null);

  useEffect(() => {
    const isNumber    = /^[0-9]$/.test(charKey);
    const isUppercase = /^[A-ZÁÉÍÓÚÑÜ]$/i.test(charKey) && charKey === charKey.toUpperCase() && !/[0-9]/.test(charKey);
    const pool = isNumber ? NUMBER_POOL : (isUppercase ? UPPERCASE_POOL : LOWERCASE_POOL);
    const distractors = pickDistractors(charKey, pool, 3);
    const all = [charKey, ...distractors].sort(() => Math.random() - 0.5);
    setChoices(all);
    setChosen(null);
    setAttempts(0);
  }, [charKey]);

  // Nudge the child after NUDGE_DELAY ms of no interaction
  useEffect(() => {
    if (nudgeTimerRef.current) clearTimeout(nudgeTimerRef.current);
    nudgeTimerRef.current = setTimeout(() => onNudge?.(), NUDGE_DELAY);
    return () => clearTimeout(nudgeTimerRef.current);
  }, [chosen, onNudge]);

  const handleTap = (key) => {
    if (chosen !== null) return; // wait for reset
    setChosen(key);
    if (key === charKey) {
      setTimeout(() => onCorrect?.(), 900);
    } else {
      setAttempts(a => a + 1);
      onIncorrect?.();
      // Let child try again after brief feedback
      setTimeout(() => setChosen(null), 1100);
    }
  };

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 30,
        background: "linear-gradient(180deg, #e8f4ff 0%, #f5faff 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "32px",
        padding: "24px",
      }}
    >
      {/* No text instruction — OLIBOT speaks "¿Dónde está la X?" by voice */}

      {/* Letter buttons — big, tap-friendly */}
      <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", justifyContent: "center" }}>
        {choices.map(key => {
          const isChosen  = chosen === key;
          const isCorrect = key === charKey;
          const bg = !isChosen ? "white"
                   : isCorrect ? "#16a34a"
                   : "#dc2626";
          const borderColor = !isChosen ? "#dce8f5"
                            : isCorrect ? "#16a34a"
                            : "#dc2626";
          return (
            <button
              key={key}
              onClick={() => handleTap(key)}
              style={{
                width: "110px",
                height: "110px",
                fontSize: "62px",
                fontWeight: "bold",
                background: bg,
                border: `3px solid ${borderColor}`,
                borderRadius: "28px",
                cursor: chosen !== null ? "default" : "pointer",
                color: isChosen ? "white" : "#1e3a5f",
                boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
                transition: "background 0.2s, border-color 0.2s, transform 0.1s",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transform: isChosen && isCorrect ? "scale(1.15)" : "scale(1)",
              }}
            >
              {key}
            </button>
          );
        })}
      </div>

      {/* Attempt feedback — brief visual only, no text */}
      {attempts > 0 && (
        <div style={{ fontSize: "36px" }}>💪</div>
      )}

      {/* Skip */}
      <button
        onClick={onSkip}
        style={{
          padding: "8px 22px",
          borderRadius: "20px",
          border: "2px solid #d1d5db",
          background: "rgba(255,255,255,0.85)",
          color: "#6b7280",
          fontSize: "14px",
          cursor: "pointer",
        }}
      >
        Saltar →
      </button>
    </div>
  );
}
