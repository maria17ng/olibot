/**
 * ChatWindow — main conversational interface.
 *
 * Fase 3 additions:
 *   - Shows the current curriculum topic in a badge
 *   - Passes is_correct / next_topic_id / current_topic_id to MessageBubble
 *   - Displays a session stats bar (hints used, success rate)
 *   - Handles topic advancement: updates topic badge when next_topic_id arrives
 */
import { useState, useRef, useEffect } from "react";
import { api } from "../services/api";
import MessageBubble from "./MessageBubble";

export default function ChatWindow({ student }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentTopicId, setCurrentTopicId] = useState(null);
  const [sessionStats, setSessionStats] = useState({ correct: 0, incorrect: 0, hints: 0 });
  const bottomRef = useRef(null);

  // Welcome message when a student is selected
  useEffect(() => {
    if (student) {
      setMessages([
        {
          role: "agent",
          content: `¡Hola ${student.name}! 🌈 Soy OLIBOT, tu robot amigo. ¿Estás listo para aprender hoy? 🚀`,
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
    }
  }, [student]);

  // Auto-scroll to the latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = {
      role: "user",
      content: input,
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
      const response = await api.sendMessage(student.id, input, sessionId);
      setSessionId(response.session_id);

      // Update current topic — if the agent is advancing to a new topic, show the new one
      const newTopicId = response.next_topic_id || response.current_topic_id;
      if (newTopicId) setCurrentTopicId(newTopicId);

      // Update session stats
      if (response.detected_intent === "attempt_answer") {
        if (response.is_correct === true) {
          setSessionStats((s) => ({ ...s, correct: s.correct + 1 }));
        } else if (response.is_correct === false) {
          setSessionStats((s) => ({ ...s, incorrect: s.incorrect + 1 }));
        }
      }
      if (response.detected_intent === "ask_for_hint" || response.detected_intent === "ask_for_answer") {
        setSessionStats((s) => ({ ...s, hints: s.hints + 1 }));
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "agent",
          content: response.agent_response,
          shield_triggered: response.shield_triggered,
          detected_intent: response.detected_intent,
          is_correct: response.is_correct ?? null,
          next_topic_id: response.next_topic_id ?? null,
          current_topic_id: response.current_topic_id ?? null,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "agent",
          content: "Lo siento, tuve un problema. ¿Lo intentamos otra vez? 🙈",
          shield_triggered: false,
          detected_intent: null,
          is_correct: null,
          next_topic_id: null,
          current_topic_id: null,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const totalAttempts = sessionStats.correct + sessionStats.incorrect;
  const successRate = totalAttempts > 0
    ? Math.round((sessionStats.correct / totalAttempts) * 100)
    : null;

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
                color: successRate >= 60 ? "#15803d" : successRate >= 30 ? "#b45309" : "#dc2626",
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
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <form
        onSubmit={handleSend}
        style={{
          display: "flex",
          gap: "8px",
          padding: "12px 16px",
          borderTop: "1px solid #e0e0e0",
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Escribe aquí... 📝"
          disabled={loading}
          style={{
            flex: 1,
            padding: "12px 16px",
            borderRadius: "24px",
            border: "2px solid #4a90d9",
            fontSize: "16px",
            outline: "none",
          }}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          style={{
            padding: "12px 20px",
            borderRadius: "24px",
            background: loading ? "#ccc" : "#4a90d9",
            color: "white",
            border: "none",
            cursor: loading ? "not-allowed" : "pointer",
            fontSize: "18px",
          }}
        >
          ➤
        </button>
      </form>
    </div>
  );
}