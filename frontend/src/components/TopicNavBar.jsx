/**
 * TopicNavBar — franja horizontal fija en la parte inferior.
 * Estilo YouTube Kids: actividad actual (resaltada) + hasta 3 desbloqueadas.
 *
 * Props:
 *   topics         [{ id, display_name, emoji, locked, mastered }]
 *   currentTopicId string
 *   onSelect       (topicId) => void
 */
export default function TopicNavBar({ topics, currentTopicId, onSelect }) {
  const unlocked = topics.filter(t => !t.locked);
  const current  = unlocked.find(t => t.id === currentTopicId);
  const others   = unlocked.filter(t => t.id !== currentTopicId).slice(0, 3);

  if (!current && !others.length) return null;

  // Extract the short label: last word of display_name (e.g. "Vocal A" → "A")
  const shortLabel = (name) => name.split(" ").pop();

  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 15,
        height: "84px",
        background: "rgba(255,255,255,0.94)",
        borderTop: "2px solid rgba(0,0,0,0.08)",
        backdropFilter: "blur(10px)",
        display: "flex",
        alignItems: "center",
        gap: "6px",
        padding: "0 10px",
        overflowX: "auto",
        boxShadow: "0 -4px 16px rgba(0,0,0,0.08)",
      }}
    >
      {/* Active topic — highlighted, slightly larger */}
      {current && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "1px",
            padding: "6px 16px",
            background: "#e8f0fb",
            border: "2.5px solid #4a90d9",
            borderRadius: "18px",
            flexShrink: 0,
            minWidth: "68px",
          }}
        >
          <span style={{ fontSize: "24px", lineHeight: 1 }}>{current.emoji}</span>
          <span style={{ fontSize: "20px", fontWeight: "bold", color: "#1e3a5f", lineHeight: 1 }}>
            {shortLabel(current.display_name)}
          </span>
          <div style={{ width: "28px", height: "3px", borderRadius: "2px", background: "#4a90d9", marginTop: "2px" }} />
        </div>
      )}

      {/* Divider */}
      {current && others.length > 0 && (
        <div style={{ width: "2px", height: "50px", background: "#e5e7eb", flexShrink: 0, margin: "0 2px" }} />
      )}

      {/* Unlocked topics */}
      {others.map(t => (
        <button
          key={t.id}
          onClick={() => onSelect(t.id)}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "1px",
            padding: "6px 12px",
            background: t.mastered ? "rgba(22,163,74,0.10)" : "white",
            border: `2px solid ${t.mastered ? "#86efac" : "#e5e7eb"}`,
            borderRadius: "18px",
            cursor: "pointer",
            flexShrink: 0,
            minWidth: "60px",
            transition: "border-color 0.15s, background 0.15s",
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = "#4a90d9";
            e.currentTarget.style.background = "#f0f8ff";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = t.mastered ? "#86efac" : "#e5e7eb";
            e.currentTarget.style.background = t.mastered ? "rgba(22,163,74,0.10)" : "white";
          }}
        >
          <span style={{ fontSize: "20px", lineHeight: 1 }}>{t.emoji}</span>
          <span style={{ fontSize: "16px", fontWeight: "500", color: "#374151", lineHeight: 1 }}>
            {shortLabel(t.display_name)}
          </span>
          {t.mastered && <span style={{ fontSize: "9px", color: "#16a34a" }}>✓</span>}
        </button>
      ))}
    </div>
  );
}
