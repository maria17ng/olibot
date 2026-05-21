/**
 * ChatWindow — avatar-based conversational interface for OLIBOT.
 *
 * Layout:
 *   - OLIBOT robot avatar in the center (animated: idle / speaking / listening / thinking)
 *   - Speech bubble above the avatar showing the last OLIBOT message
 *   - Text+mic input below (age 4-5); hidden for age 3 (auto-listen only)
 *   - Letter-tracing canvas appears as a fullscreen overlay and dismisses on completion
 *
 * All pedagogical logic (practice count, BDI turns, STT/TTS) is unchanged.
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { api } from "../services/api";
import { useSpeech } from "../hooks/useSpeech";
import OlibotAvatar from "./OlibotAvatar";
import LetterTracing from "./LetterTracing";
import { getCharData } from "../data/letterData";

const MAX_TURNS_BY_AGE   = { 3: 4,  4: 8,  5: 12 };
const REQUIRED_PRACTICES = { 3: 3,  4: 2,  5: 1  };

export default function ChatWindow({ student }) {
  const [lastMessage,   setLastMessage]   = useState("");
  const [input,         setInput]         = useState("");
  const [sessionId,     setSessionId]     = useState(null);
  const [loading,       setLoading]       = useState(false);
  const [currentTopicId, setCurrentTopicId] = useState(null);
  const [sessionStats,  setSessionStats]  = useState({ correct: 0, incorrect: 0, hints: 0 });
  const [turnCount,     setTurnCount]     = useState(0);
  const [currentBeliefs, setCurrentBeliefs] = useState({});
  const [practiceCount, setPracticeCount] = useState(0);
  const [tracingKey,    setTracingKey]    = useState(0);

  const ageProfile       = student ? Math.min(Math.max(parseInt(student.age) || 4, 3), 5) : 4;
  const maxTurns         = MAX_TURNS_BY_AGE[ageProfile]   ?? 12;
  const requiredPractices = REQUIRED_PRACTICES[ageProfile] ?? 1;

  // ── Voice ─────────────────────────────────────────────────────────────────
  const sendRef = useRef(null);
  const handleTranscript = useCallback((text) => {
    if (sendRef.current) sendRef.current(text);
  }, []);

  const { supported, listening, speaking, interimTranscript, startListening, speak, stopSpeaking } =
    useSpeech({ onTranscript: handleTranscript });

  // ── Age-3 auto-listen after TTS ───────────────────────────────────────────
  const prevSpeakingRef = useRef(false);
  const charDataRef     = useRef(null);

  // ── Initialise on student change ─────────────────────────────────────────
  useEffect(() => {
    if (!student) return;
    const age    = Math.min(Math.max(parseInt(student.age) || 4, 3), 5);
    const welcome = age <= 3
      ? `¡Hola ${student.name}! 🌟`
      : `¡Hola ${student.name}! Soy OLIBOT, tu robot amigo. ¿Estás listo para aprender? 🌈🚀`;

    setLastMessage(welcome);
    setSessionId(null);
    setCurrentTopicId(null);
    setSessionStats({ correct: 0, incorrect: 0, hints: 0 });
    setTurnCount(0);
    setCurrentBeliefs(student.beliefs || {});
    speak(welcome);

    if (age <= 3) {
      setTimeout(() => { if (sendRef.current) sendRef.current("hola"); }, 600);
    }
  }, [student]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset practice counter when topic changes
  useEffect(() => {
    setPracticeCount(0);
    setTracingKey((k) => k + 1);
  }, [currentTopicId]);

  // Auto-listen for age 3 (no mic button) once TTS ends and canvas is not showing
  useEffect(() => {
    const wasJustSpeaking = prevSpeakingRef.current && !speaking;
    prevSpeakingRef.current = speaking;
    if (wasJustSpeaking && ageProfile <= 3 && !loading && !charDataRef.current && supported) {
      startListening();
    }
  }, [speaking]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Core send ─────────────────────────────────────────────────────────────
  const sendMessage = useCallback(async (text) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    stopSpeaking();
    setInput("");
    setLoading(true);

    try {
      const response = await api.sendMessage(student.id, trimmed, sessionId);
      setSessionId(response.session_id);

      const newTopicId = response.next_topic_id || response.current_topic_id;
      if (newTopicId) setCurrentTopicId(newTopicId);
      if (response.current_beliefs) setCurrentBeliefs(response.current_beliefs);
      setTurnCount((n) => n + 1);

      if (response.detected_intent === "attempt_answer") {
        if (response.is_correct === true)
          setSessionStats((s) => ({ ...s, correct: s.correct + 1 }));
        else if (response.is_correct === false)
          setSessionStats((s) => ({ ...s, incorrect: s.incorrect + 1 }));
      }
      if (["ask_for_hint", "ask_for_answer"].includes(response.detected_intent)) {
        setSessionStats((s) => ({ ...s, hints: s.hints + 1 }));
      }

      setLastMessage(response.agent_response);
      speak(response.agent_response);
    } catch {
      const err = "Lo siento, tuve un problema. ¿Lo intentamos otra vez?";
      setLastMessage(err + " 🙈");
      speak(err);
    } finally {
      setLoading(false);
    }
  }, [loading, sessionId, student, speak, stopSpeaking]);

  useEffect(() => { sendRef.current = sendMessage; }, [sendMessage]);

  // ── Tracing completion ────────────────────────────────────────────────────
  const handleTracingComplete = useCallback(({ shapeScore, orderScore, passed, partial }) => {
    if (partial) return;

    const nextCount = practiceCount + 1;
    if (nextCount < requiredPractices) {
      setPracticeCount(nextCount);
      setTracingKey((k) => k + 1);
      speak(passed ? "¡Muy bien! 🌟 Otra vez..." : "¡Casi! 💪 Inténtalo otra vez...");
      return;
    }

    setPracticeCount(0);
    const charInfo = getCharData(currentTopicId);
    const key      = charInfo?.key ?? "";
    const score    = Math.round(((shapeScore + orderScore) / 2) * 100);
    const isStroke = currentTopicId?.startsWith("trazo_");
    const subject  = isStroke ? `el trazo ${key}` : `la letra ${key}`;
    const msg      = passed
      ? `He trazado ${subject} y me ha salido bien (${score}% de acierto)`
      : `He intentado trazar ${subject} pero necesito practicar más (${score}%)`;
    sendMessage(msg);
  }, [practiceCount, requiredPractices, currentTopicId, speak, sendMessage]);

  const handleSubmit = (e) => { e.preventDefault(); sendMessage(input); };

  // ── Derived values ────────────────────────────────────────────────────────
  const totalAttempts = sessionStats.correct + sessionStats.incorrect;
  const successRate   = totalAttempts > 0
    ? Math.round((sessionStats.correct / totalAttempts) * 100)
    : null;

  const charData = getCharData(currentTopicId);
  charDataRef.current = charData;

  const topicMastery  = currentBeliefs?.mastery?.[currentTopicId] ?? {};
  const topicAttempts = topicMastery.attempts ?? 0;
  const topicCorrect  = topicMastery.correct  ?? 0;
  const topicSR       = topicAttempts > 0 ? Math.round((topicCorrect / topicAttempts) * 100) : null;
  const hintLevel =
    ageProfile <= 3        ? 3 :
    topicSR === null || topicSR < 40 ? 3 :
    topicSR < 70           ? 2 : 1;

  const avatarState = speaking ? "speaking" : listening ? "listening" : loading ? "thinking" : "idle";

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>

      {/* ── Stats bar ── */}
      <div
        style={{
          padding: "7px 16px",
          background: "#f0f7ff",
          borderBottom: "1px solid #dce8f5",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          fontSize: "12px",
          color: "#4a5568",
          flexWrap: "wrap",
          flexShrink: 0,
        }}
      >
        {currentTopicId ? (
          <span style={{ background: "#4a90d9", color: "white", borderRadius: "12px", padding: "3px 10px", fontWeight: "bold" }}>
            📚 {currentTopicId.replace(/_/g, " ")}
          </span>
        ) : (
          <span style={{ color: "#a0aec0", fontStyle: "italic" }}>Tema por asignar…</span>
        )}
        <span style={{ marginLeft: "auto", display: "flex", gap: "12px" }}>
          {sessionStats.correct   > 0 && <span style={{ color: "#15803d" }}>✅ {sessionStats.correct}</span>}
          {sessionStats.incorrect > 0 && <span style={{ color: "#b45309" }}>💪 {sessionStats.incorrect}</span>}
          {sessionStats.hints     > 0 && <span style={{ color: "#6b7280" }}>💡 {sessionStats.hints}</span>}
          {successRate !== null && (
            <span style={{ fontWeight: "bold", color: successRate >= 60 ? "#15803d" : successRate >= 30 ? "#b45309" : "#dc2626" }}>
              {successRate}%
            </span>
          )}
        </span>
      </div>

      {/* ── Turn-limit banner ── */}
      {turnCount >= maxTurns && (
        <div style={{ background: "#fef3c7", borderBottom: "1px solid #fcd34d", padding: "10px 16px", textAlign: "center", fontSize: "14px", color: "#92400e", flexShrink: 0 }}>
          🌟 ¡Hemos practicado mucho hoy! ¿Lo dejamos aquí por hoy?
        </div>
      )}

      {/* ── Avatar stage ── */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "4px",
          padding: "16px",
          overflow: "hidden",
          background: "linear-gradient(180deg, #f0f7ff 0%, #fafcff 100%)",
        }}
      >
        {/* Speech bubble */}
        {lastMessage && (
          <div
            style={{
              position: "relative",
              background: "white",
              border: "2px solid #dce8f5",
              borderRadius: "20px",
              padding: "14px 22px",
              maxWidth: "min(400px, 88%)",
              fontSize: ageProfile <= 3 ? "20px" : "15px",
              color: "#1e3a5f",
              textAlign: "center",
              lineHeight: 1.5,
              boxShadow: "0 4px 20px rgba(74,144,217,0.12)",
              marginBottom: "14px",
              wordBreak: "break-word",
            }}
          >
            {lastMessage}

            {/* Loading overlay on bubble while thinking */}
            {loading && (
              <div style={{ position: "absolute", inset: 0, borderRadius: "18px", background: "rgba(240,247,255,0.7)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: "13px", color: "#4a90d9" }}>…</span>
              </div>
            )}

            {/* Tail pointing down toward avatar */}
            <div style={{ position: "absolute", bottom: "-16px", left: "50%", transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "13px solid transparent", borderRight: "13px solid transparent", borderTop: "15px solid #dce8f5" }}/>
            <div style={{ position: "absolute", bottom: "-13px", left: "50%", transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "11px solid transparent", borderRight: "11px solid transparent", borderTop: "13px solid white" }}/>
          </div>
        )}

        {/* Interim STT transcript */}
        {interimTranscript && (
          <div style={{ fontSize: "14px", color: "#6b7280", fontStyle: "italic", marginBottom: "6px", textAlign: "center" }}>
            🎙️ {interimTranscript}…
          </div>
        )}

        {/* Avatar */}
        <OlibotAvatar state={avatarState} />

        {/* Status label below avatar */}
        <div style={{ fontSize: "13px", color: listening ? "#dc2626" : speaking ? "#f59e0b" : loading ? "#4a90d9" : "transparent", fontWeight: "bold", marginTop: "4px", transition: "color 0.3s", minHeight: "20px" }}>
          {listening ? "Te estoy escuchando…" : speaking ? "OLIBOT está hablando…" : loading ? "OLIBOT está pensando…" : ""}
        </div>
      </div>

      {/* ── Input controls — age 4-5 only ── */}
      {ageProfile > 3 && (
        <div style={{ borderTop: "1px solid #e0e0e0", padding: "14px 16px", background: "white", flexShrink: 0 }}>
          {supported && (
            <div style={{ display: "flex", justifyContent: "center", marginBottom: "10px" }}>
              <button
                onClick={listening ? undefined : startListening}
                disabled={loading || speaking}
                style={{
                  width: "68px", height: "68px", borderRadius: "50%", border: "none",
                  cursor: loading || speaking ? "not-allowed" : "pointer",
                  fontSize: "28px", display: "flex", alignItems: "center", justifyContent: "center",
                  background: listening ? "#dc2626" : speaking ? "#f59e0b" : "#4a90d9",
                  color: "white",
                  boxShadow: listening
                    ? "0 0 0 8px rgba(220,38,38,0.22)"
                    : "0 4px 12px rgba(74,144,217,0.4)",
                  transition: "all 0.2s ease",
                  animation: listening ? "obMicPulse 1.2s infinite" : "none",
                }}
              >
                {listening ? "🔴" : speaking ? "🔊" : "🎙️"}
              </button>
              <style>{`
                @keyframes obMicPulse {
                  0%   { box-shadow: 0 0 0 0   rgba(220,38,38,0.5); }
                  70%  { box-shadow: 0 0 0 14px rgba(220,38,38,0); }
                  100% { box-shadow: 0 0 0 0   rgba(220,38,38,0); }
                }
              `}</style>
            </div>
          )}
          {!supported && (
            <p style={{ textAlign: "center", fontSize: "13px", color: "#dc2626", marginBottom: "8px" }}>
              Tu navegador no soporta voz. Usa el texto.
            </p>
          )}
          <form onSubmit={handleSubmit} style={{ display: "flex", gap: "8px" }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={supported ? "O escribe aquí…" : "Escribe aquí… 📝"}
              disabled={loading || listening}
              style={{ flex: 1, padding: "10px 16px", borderRadius: "24px", border: "2px solid #d1d5db", fontSize: "15px", outline: "none", color: "#374151" }}
            />
            <button
              type="submit"
              disabled={loading || listening || !input.trim()}
              style={{ padding: "10px 18px", borderRadius: "24px", background: loading || !input.trim() ? "#d1d5db" : "#4a90d9", color: "white", border: "none", cursor: loading || !input.trim() ? "not-allowed" : "pointer", fontSize: "18px" }}
            >
              ➤
            </button>
          </form>
        </div>
      )}

      {/* ── Fullscreen canvas overlay ── */}
      {charData && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            background: "rgba(15,30,60,0.94)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
        >
          <div
            style={{
              background: "white",
              borderRadius: "24px",
              padding: "20px",
              width: "100%",
              maxWidth: "480px",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
              boxShadow: "0 24px 80px rgba(0,0,0,0.5)",
            }}
          >
            {/* Overlay header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: "18px", fontWeight: "bold", color: "#1e3a5f" }}>
                  {currentTopicId?.startsWith("trazo_") ? "✏️ Traza el trazo" : `✏️ Traza la ${charData.key}`}
                </div>
                {requiredPractices > 1 && (
                  <div style={{ fontSize: "13px", color: "#6b7280", marginTop: "2px" }}>
                    Práctica {practiceCount + 1} de {requiredPractices}
                    {" · "}
                    {Array.from({ length: requiredPractices }, (_, i) => (
                      <span key={i} style={{ marginLeft: 2 }}>
                        {i < practiceCount ? "⭐" : "○"}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* OLIBOT mini speaking indicator */}
              {loading && (
                <div style={{ fontSize: "12px", color: "#4a90d9", display: "flex", alignItems: "center", gap: "6px" }}>
                  <div style={{ width: "20px", height: "20px", border: "3px solid #dce8f5", borderTop: "3px solid #4a90d9", borderRadius: "50%", animation: "obMiniSpin 0.9s linear infinite" }}/>
                  <style>{`@keyframes obMiniSpin { to { transform: rotate(360deg); } }`}</style>
                  Pensando…
                </div>
              )}
            </div>

            <LetterTracing
              key={tracingKey}
              charData={charData}
              hintLevel={hintLevel}
              onComplete={handleTracingComplete}
              disabled={loading}
            />
          </div>
        </div>
      )}
    </div>
  );
}
