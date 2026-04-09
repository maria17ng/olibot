/**
 * MessageBubble — renders a single chat message.
 * Shows a shield icon if the Safety Shield intercepted the response.
 */
export default function MessageBubble({ message }) {
  const isAgent = message.role === "agent";

  return (
    <div
      style={{
        display: "flex",
        justifyContent: isAgent ? "flex-start" : "flex-end",
        marginBottom: "12px",
      }}
    >
      {isAgent && (
        <div style={{ fontSize: "28px", marginRight: "8px", alignSelf: "flex-end" }}>
          🤖
        </div>
      )}

      <div
        style={{
          maxWidth: "70%",
          padding: "12px 16px",
          borderRadius: isAgent ? "4px 16px 16px 16px" : "16px 4px 16px 16px",
          backgroundColor: isAgent ? "#e8f4fd" : "#4a90d9",
          color: isAgent ? "#1a1a2e" : "#ffffff",
          boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
          position: "relative",
        }}
      >
        <p style={{ margin: 0, fontSize: "16px", lineHeight: "1.5" }}>
          {message.content}
        </p>

        {/* Debug metadata — visible during development */}
        <div style={{ marginTop: "6px", fontSize: "11px", opacity: 0.6 }}>
          {message.detected_intent && (
            <span>Intent: {message.detected_intent}</span>
          )}
          {message.shield_triggered && (
            <span style={{ marginLeft: "8px", color: "#e74c3c" }}>
              🛡️ Shield
            </span>
          )}
        </div>
      </div>

      {!isAgent && (
        <div style={{ fontSize: "28px", marginLeft: "8px", alignSelf: "flex-end" }}>
          👦
        </div>
      )}
    </div>
  );
}
