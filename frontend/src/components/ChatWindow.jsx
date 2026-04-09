/**
 * ChatWindow — main conversational interface.
 * Manages the message list and sends input to the OLIBOT API.
 */
import { useState, useRef, useEffect } from "react";
import { api } from "../services/api";
import MessageBubble from "./MessageBubble";

export default function ChatWindow({ student }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState(null);
  const [loading, setLoading] = useState(false);
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
        },
      ]);
      setSessionId(null);
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
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const response = await api.sendMessage(student.id, input, sessionId);
      setSessionId(response.session_id);

      setMessages((prev) => [
        ...prev,
        {
          role: "agent",
          content: response.agent_response,
          shield_triggered: response.shield_triggered,
          detected_intent: response.detected_intent,
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "agent",
          content: "Lo siento, tuve un problema. ¿Lo intentamos otra vez? 🙈",
          shield_triggered: false,
          detected_intent: null,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: "16px" }}>
      {/* Message list */}
      <div style={{ flex: 1, overflowY: "auto", paddingBottom: "16px" }}>
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
      <form onSubmit={handleSend} style={{ display: "flex", gap: "8px", paddingTop: "8px", borderTop: "1px solid #e0e0e0" }}>
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
