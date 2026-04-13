/**
 * MessageBubble — renders a single chat message.
 *
 * Fase 3 additions:
 *   - Green/orange badge when is_correct is true/false
 *   - Topic advancement banner when next_topic_id is set
 *   - Shield icon if the Safety Shield intercepted the response
 */
export default function MessageBubble({ message }) {
  const isAgent = message.role === "agent";
  const { is_correct, next_topic_id, current_topic_id, shield_triggered, detected_intent } = message;

  return (
    <div style={{ marginBottom: "16px" }}>
      {/* Topic advancement banner — shown above the agent message */}
      {isAgent && next_topic_id && (
        <div
          style={{
            margin: "0 0 8px 44px",
            padding: "10px 16px",
            borderRadius: "12px",
            background: "linear-gradient(135deg, #f0fdf4, #dcfce7)",
            border: "2px solid #86efac",
            color: "#166534",
            fontSize: "14px",
            fontWeight: "bold",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <span style={{ fontSize: "20px" }}>🏆</span>
          ¡Has superado el tema anterior! Pasamos al siguiente.
        </div>
      )}

      <div
        style={{
          display: "flex",
          justifyContent: isAgent ? "flex-start" : "flex-end",
          alignItems: "flex-end",
          gap: "8px",
        }}
      >
        {isAgent && (
          <div style={{ fontSize: "28px", flexShrink: 0 }}>🤖</div>
        )}

        <div style={{ maxWidth: "70%" }}>
          {/* Correct/Incorrect badge — shown above bubble for answers */}
          {is_correct === true && (
            <div
              style={{
                marginBottom: "4px",
                fontSize: "13px",
                fontWeight: "bold",
                color: "#15803d",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <span>✅</span> ¡Respuesta correcta!
            </div>
          )}
          {is_correct === false && (
            <div
              style={{
                marginBottom: "4px",
                fontSize: "13px",
                fontWeight: "bold",
                color: "#b45309",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <span>💪</span> ¡Inténtalo de nuevo!
            </div>
          )}

          <div
            style={{
              padding: "12px 16px",
              borderRadius: isAgent ? "4px 16px 16px 16px" : "16px 4px 16px 16px",
              backgroundColor: isAgent ? "#e8f4fd" : "#4a90d9",
              color: isAgent ? "#1a1a2e" : "#ffffff",
              boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
              borderLeft: is_correct === true
                ? "4px solid #22c55e"
                : is_correct === false
                  ? "4px solid #f59e0b"
                  : undefined,
            }}
          >
            <p style={{ margin: 0, fontSize: "16px", lineHeight: "1.5" }}>
              {message.content}
            </p>

            {/* Debug metadata — visible during development */}
            {(detected_intent || shield_triggered || current_topic_id) && (
              <div style={{ marginTop: "6px", fontSize: "11px", opacity: 0.55, display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {current_topic_id && (
                  <span>📚 {current_topic_id}</span>
                )}
                {detected_intent && (
                  <span>Intent: {detected_intent}</span>
                )}
                {shield_triggered && (
                  <span style={{ color: "#e74c3c" }}>🛡️ Shield</span>
                )}
              </div>
            )}
          </div>
        </div>

        {!isAgent && (
          <div style={{ fontSize: "28px", flexShrink: 0 }}>👦</div>
        )}
      </div>
    </div>
  );
}