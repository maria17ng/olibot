/**
 * ChatWindow — interfaz conversacional principal con soporte de voz.
 *
 * Fase 5 (voz):
 *   - Botón de micrófono como entrada principal (STT via Web Speech API)
 *   - TTS automático en cada respuesta del agente (Web Speech API)
 *   - Feedback visual mientras el niño habla (texto intermedio + animación)
 *   - Input de texto mantenido como fallback (modo desarrollo / sin micrófono)
 *
 * Fase 3 (previo):
 *   - Badge de tema activo y barra de estadísticas de sesión
 *   - Feedback visual de respuestas correctas/incorrectas en MessageBubble
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { api } from "../services/api";
import MessageBubble from "./MessageBubble";
import { useSpeech } from "../hooks/useSpeech";

export default function ChatWindow({ student }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentTopicId, setCurrentTopicId] = useState(null);
  const [sessionStats, setSessionStats] = useState({ correct: 0, incorrect: 0, hints: 0 });
  const bottomRef = useRef(null);

  // ── Voice ─────────────────────────────────────────────────────────────────

  // handleSend is defined later; useCallback lets us pass it to useSpeech
  // without a dependency cycle. We forward via a ref.
  const sendRef = useRef(null);

  const handleTranscript = useCallback((text) => {
    // Called by useSpeech when STT produces a final result.
    // Inserts the transcript and triggers send.
    if (sendRef.current) sendRef.current(text);
  }, []);

  const { supported, listening, speaking, interimTranscript, startListening, speak, stopSpeaking } =
    useSpeech({ onTranscript: handleTranscript });

  // ── Welcome message ───────────────────────────────────────────────────────

  useEffect(() => {
    if (student) {
      const welcome = `¡Hola ${student.name}! Soy OLIBOT, tu robot amigo. ¿Estás listo para aprender hoy?`;
      setMessages([
        {
          role: "agent",
          content: welcome + " 🌈🚀",
          shield_triggered: false,
          detected_intent: "greet",
          is_correct: null,
          next_topic_id: null,
          current_topic_id: null,
        },
      ]);
      setSessionId(null);
      setCurrentTopicId(null);
      setSessionStats({ correct: 0, incorrect: 0, hints: 0 });
      // Speak welcome message when student is selected
      speak(welcome);
    }
  }, [student]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Core send logic ───────────────────────────────────────────────────────

  const sendMessage = useCallback(async (text) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    // Stop any ongoing TTS before processing the new turn
    stopSpeaking();

    const userMsg = {
      role: "user",
      content: trimmed,
      shield_triggered: false,
      detected_intent: null,
      is_correct: null,
      next_topic_id: null,
      current_topic_id: null,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const response = await api.sendMessage(student.id, trimmed, sessionId);
      setSessionId(response.session_id);

      const newTopicId = response.next_topic_id || response.current_topic_id;
      if (newTopicId) setCurrentTopicId(newTopicId);

      if (response.detected_intent === "attempt_answer") {
        if (response.is_correct === true)
          setSessionStats((s) => ({ ...s, correct: s.correct + 1 }));
        else if (response.is_correct === false)
          setSessionStats((s) => ({ ...s, incorrect: s.incorrect + 1 }));
      }
      if (
        response.detected_intent === "ask_for_hint" ||
        response.detected_intent === "ask_for_answer"
      ) {
        setSessionStats((s) => ({ ...s, hints: s.hints + 1 }));
      }

      const agentMsg = {
        role: "agent",
        content: response.agent_response,
        shield_triggered: response.shield_triggered,
        detected_intent: response.detected_intent,
        is_correct: response.is_correct ?? null,
        next_topic_id: response.next_topic_id ?? null,
        current_topic_id: response.current_topic_id ?? null,
      };

      setMessages((prev) => [...prev, agentMsg]);

      // Speak the agent's response automatically
      speak(response.agent_response);
    } catch {
      const errMsg = "Lo siento, tuve un problema. ¿Lo intentamos otra vez?";
      setMessages((prev) => [
        ...prev,
        {
          role: "agent",
          content: errMsg + " 🙈",
          shield_triggered: false,
          detected_intent: null,
          is_correct: null,
          next_topic_id: null,
          current_topic_id: null,
        },
      ]);
      speak(errMsg);
    } finally {
      setLoading(false);
    }
  }, [loading, sessionId, student, speak, stopSpeaking]);

  // Keep the ref in sync so handleTranscript can always call the latest version
  useEffect(() => {
    sendRef.current = sendMessage;
  }, [sendMessage]);

  // ── Form submit (text input fallback) ─────────────────────────────────────

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(input);
  };

  // ── Stats ─────────────────────────────────────────────────────────────────

  const totalAttempts = sessionStats.correct + sessionStats.incorrect;
  const successRate =
    totalAttempts > 0 ? Math.round((sessionStats.correct / totalAttempts) * 100) : null;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>

      {/* Topic + session stats bar */}
      <div
        style={{
          padding: "8px 16px",
          background: "#f0f7ff",
          borderBottom: "1px solid #dce8f5",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          fontSize: "13px",
          color: "#4a5568",
          flexWrap: "wrap",
        }}
      >
        {currentTopicId ? (
          <span
            style={{
              background: "#4a90d9",
              color: "white",
              borderRadius: "12px",
              padding: "3px 10px",
              fontWeight: "bold",
              fontSize: "12px",
            }}
          >
            📚 {currentTopicId.replace(/_/g, " ")}
          </span>
        ) : (
          <span style={{ color: "#a0aec0", fontStyle: "italic" }}>Tema por asignar…</span>
        )}

        <span style={{ marginLeft: "auto", display: "flex", gap: "12px" }}>
          {sessionStats.correct > 0 && (
            <span style={{ color: "#15803d" }}>✅ {sessionStats.correct} correctas</span>
          )}
          {sessionStats.incorrect > 0 && (
            <span style={{ color: "#b45309" }}>💪 {sessionStats.incorrect} intentos</span>
          )}
          {sessionStats.hints > 0 && (
            <span style={{ color: "#6b7280" }}>💡 {sessionStats.hints} pistas</span>
          )}
          {successRate !== null && (
            <span
              style={{
                fontWeight: "bold",
                color:
                  successRate >= 60 ? "#15803d" : successRate >= 30 ? "#b45309" : "#dc2626",
              }}
            >
              {successRate}% aciertos
            </span>
          )}
        </span>
      </div>

      {/* Message list */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
        {messages.map((msg, idx) => (
          <MessageBubble key={idx} message={msg} />
        ))}
        {loading && (
          <div style={{ textAlign: "left", padding: "8px", color: "#888", fontSize: "14px" }}>
            🤖 OLIBOT está pensando...
          </div>
        )}
        {/* Interim transcript feedback */}
        {interimTranscript && (
          <div
            style={{
              textAlign: "right",
              padding: "8px 16px",
              color: "#6b7280",
              fontStyle: "italic",
              fontSize: "15px",
            }}
          >
            🎙️ {interimTranscript}…
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div
        style={{
          borderTop: "1px solid #e0e0e0",
          padding: "16px",
          background: "white",
        }}
      >
        {/* Mic button — main interaction for children */}
        {supported && (
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "12px" }}>
            <button
              onClick={listening ? undefined : startListening}
              disabled={loading || speaking}
              title={listening ? "Escuchando…" : speaking ? "OLIBOT está hablando…" : "Habla con OLIBOT"}
              style={{
                width: "80px",
                height: "80px",
                borderRadius: "50%",
                border: "none",
                cursor: loading || speaking ? "not-allowed" : "pointer",
                fontSize: "36px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: listening
                  ? "#dc2626"
                  : speaking
                  ? "#f59e0b"
                  : "#4a90d9",
                color: "white",
                boxShadow: listening
                  ? "0 0 0 8px rgba(220,38,38,0.25), 0 0 0 16px rgba(220,38,38,0.10)"
                  : "0 4px 12px rgba(74,144,217,0.4)",
                transition: "all 0.2s ease",
                animation: listening ? "pulse 1.2s infinite" : "none",
              }}
            >
              {listening ? "🔴" : speaking ? "🔊" : "🎙️"}
            </button>

            <style>{`
              @keyframes pulse {
                0%   { box-shadow: 0 0 0 0   rgba(220,38,38,0.5), 0 0 0 0   rgba(220,38,38,0.3); }
                70%  { box-shadow: 0 0 0 12px rgba(220,38,38,0),   0 0 0 20px rgba(220,38,38,0); }
                100% { box-shadow: 0 0 0 0   rgba(220,38,38,0),   0 0 0 0   rgba(220,38,38,0); }
              }
            `}</style>
          </div>
        )}

        {/* Status label under mic button */}
        {supported && (
          <p
            style={{
              textAlign: "center",
              fontSize: "13px",
              color: listening ? "#dc2626" : speaking ? "#f59e0b" : "#6b7280",
              margin: "0 0 12px",
              fontWeight: listening || speaking ? "bold" : "normal",
            }}
          >
            {listening
              ? "Te estoy escuchando…"
              : speaking
              ? "OLIBOT está hablando…"
              : "Pulsa el micrófono y habla"}
          </p>
        )}

        {!supported && (
          <p style={{ textAlign: "center", fontSize: "13px", color: "#dc2626", marginBottom: "8px" }}>
            Tu navegador no soporta voz. Usa el texto.
          </p>
        )}

        {/* Text input — fallback / development mode */}
        <form onSubmit={handleSubmit} style={{ display: "flex", gap: "8px" }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={supported ? "O escribe aquí…" : "Escribe aquí… 📝"}
            disabled={loading || listening}
            style={{
              flex: 1,
              padding: "10px 16px",
              borderRadius: "24px",
              border: "2px solid #d1d5db",
              fontSize: "15px",
              outline: "none",
              color: "#374151",
            }}
          />
          <button
            type="submit"
            disabled={loading || listening || !input.trim()}
            style={{
              padding: "10px 18px",
              borderRadius: "24px",
              background: loading || !input.trim() ? "#d1d5db" : "#4a90d9",
              color: "white",
              border: "none",
              cursor: loading || !input.trim() ? "not-allowed" : "pointer",
              fontSize: "18px",
            }}
          >
            ➤
          </button>
        </form>
      </div>
    </div>
  );
}
