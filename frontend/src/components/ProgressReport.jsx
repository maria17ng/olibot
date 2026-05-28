/**
 * ProgressReport — Parent/Teacher progress portal.
 *
 * Fetches GET /api/v1/reports/{studentId} and renders:
 *   - Overall stats card (sessions, messages, success rate)
 *   - Topic mastery summary (mastered / in progress / not started)
 *   - Per-topic progress cards with mastery bar
 *   - Recommended focus topics
 *   - Recent sessions list
 */
import { useState, useEffect } from "react";
import { api } from "../services/api";

// ── Helper: coloured progress bar ─────────────────────────────────────────
function MasteryBar({ rate, mastered }) {
  const pct = Math.round(rate * 100);
  const color = mastered ? "#22c55e" : pct >= 60 ? "#f59e0b" : pct >= 30 ? "#fb923c" : "#f87171";
  return (
    <div style={{ marginTop: "6px" }}>
      <div
        style={{
          height: "8px",
          borderRadius: "4px",
          background: "#e5e7eb",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            background: color,
            borderRadius: "4px",
            transition: "width 0.4s ease",
          }}
        />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#6b7280", marginTop: "2px" }}>
        <span>{pct}% aciertos</span>
        {mastered && <span style={{ color: "#15803d", fontWeight: "bold" }}>✅ Superado</span>}
      </div>
    </div>
  );
}

// ── Helper: stat card ──────────────────────────────────────────────────────
function StatCard({ emoji, value, label, color }) {
  return (
    <div
      style={{
        flex: "1 1 120px",
        background: "white",
        border: "1px solid #e5e7eb",
        borderRadius: "12px",
        padding: "16px",
        textAlign: "center",
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
      }}
    >
      <div style={{ fontSize: "28px" }}>{emoji}</div>
      <div style={{ fontSize: "24px", fontWeight: "bold", color: color || "#1a1a2e" }}>
        {value}
      </div>
      <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "2px" }}>{label}</div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
export default function ProgressReport({ student, onClose }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("overview"); // "overview" | "topics" | "sessions" | "bdi"

  useEffect(() => {
    if (!student) return;
    setLoading(true);
    setError(null);
    api.getReport(student.id)
      .then(setReport)
      .catch(() => setError("No se pudo cargar el informe. ¿Está el backend corriendo?"))
      .finally(() => setLoading(false));
  }, [student]);

  if (loading) {
    return (
      <div style={overlayStyle}>
        <div style={panelStyle}>
          <div style={{ textAlign: "center", padding: "40px", color: "#888" }}>
            <div style={{ fontSize: "48px" }}>📊</div>
            <p>Cargando informe...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={overlayStyle}>
        <div style={panelStyle}>
          <button onClick={onClose} style={closeButtonStyle}>✕</button>
          <div style={{ textAlign: "center", padding: "40px", color: "#e74c3c" }}>
            <div style={{ fontSize: "48px" }}>⚠️</div>
            <p>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  const overallPct = Math.round(report.overall_success_rate * 100);

  return (
    <div style={overlayStyle}>
      <div style={panelStyle}>
        {/* Header */}
        <div
          style={{
            padding: "20px 24px 16px",
            background: "linear-gradient(135deg, #4a90d9, #357abd)",
            color: "white",
            borderRadius: "16px 16px 0 0",
            position: "relative",
          }}
        >
          <button onClick={onClose} style={closeButtonStyle}>✕</button>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "36px" }}>📋</span>
            <div>
              <h2 style={{ margin: 0, fontSize: "20px" }}>
                Informe de progreso — {report.student_name}
              </h2>
              <p style={{ margin: "2px 0 0", fontSize: "13px", opacity: 0.85 }}>
                {report.student_age} años • Generado el {new Date(report.generated_at).toLocaleDateString("es-ES")}
              </p>
            </div>
          </div>
        </div>

        {/* Tab bar */}
        <div style={{ display: "flex", borderBottom: "2px solid #e5e7eb", background: "#f9fafb" }}>
          {[
            { key: "overview", label: "📊 Resumen" },
            { key: "topics",   label: "📚 Temas" },
            { key: "sessions", label: "🗓️ Sesiones" },
            { key: "bdi",      label: "🤖 Agente BDI" },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              style={{
                flex: 1,
                padding: "12px",
                border: "none",
                background: "none",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: activeTab === key ? "bold" : "normal",
                color: activeTab === key ? "#4a90d9" : "#6b7280",
                borderBottom: activeTab === key ? "3px solid #4a90d9" : "3px solid transparent",
                marginBottom: "-2px",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div style={{ overflowY: "auto", flex: 1, padding: "20px 24px" }}>

          {/* ── OVERVIEW ─────────────────────────────────────────────── */}
          {activeTab === "overview" && (
            <div>
              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "20px" }}>
                <StatCard emoji="🗓️" value={report.total_sessions} label="Sesiones" />
                <StatCard emoji="💬" value={report.total_messages} label="Mensajes" />
                <StatCard
                  emoji="🎯"
                  value={`${overallPct}%`}
                  label="Tasa de aciertos"
                  color={overallPct >= 60 ? "#15803d" : overallPct >= 30 ? "#b45309" : "#dc2626"}
                />
                <StatCard emoji="🏆" value={report.topics_mastered} label="Temas superados" color="#15803d" />
                <StatCard emoji="📖" value={report.topics_in_progress} label="En progreso" color="#b45309" />
                <StatCard emoji="💤" value={report.topics_not_started} label="Sin empezar" color="#9ca3af" />
              </div>

              {/* Recommended focus */}
              {report.recommended_display_names.length > 0 && (
                <div
                  style={{
                    background: "#fff7ed",
                    border: "1px solid #fed7aa",
                    borderRadius: "12px",
                    padding: "16px",
                  }}
                >
                  <h3 style={{ margin: "0 0 10px", fontSize: "15px", color: "#92400e" }}>
                    💡 Temas para reforzar en casa
                  </h3>
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    {report.recommended_display_names.map((name, i) => (
                      <span
                        key={i}
                        style={{
                          background: "#fed7aa",
                          color: "#92400e",
                          borderRadius: "16px",
                          padding: "4px 12px",
                          fontSize: "13px",
                          fontWeight: "bold",
                        }}
                      >
                        {name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── TOPICS ───────────────────────────────────────────────── */}
          {activeTab === "topics" && (
            <div>
              {report.mastery_by_topic.length === 0 ? (
                <p style={{ color: "#9ca3af", textAlign: "center", paddingTop: "40px" }}>
                  Aún no hay actividad registrada.
                </p>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "12px" }}>
                  {report.mastery_by_topic.map((t) => (
                    <div
                      key={t.topic_id}
                      style={{
                        background: "white",
                        border: t.mastered ? "2px solid #86efac" : "1px solid #e5e7eb",
                        borderRadius: "12px",
                        padding: "14px",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                        <span style={{ fontSize: "22px" }}>{t.emoji}</span>
                        <div>
                          <div style={{ fontWeight: "bold", fontSize: "14px", color: "#1a1a2e" }}>
                            {t.display_name}
                          </div>
                          <div style={{ fontSize: "11px", color: "#6b7280" }}>
                            {t.category} • {t.attempts} intentos
                          </div>
                        </div>
                      </div>
                      <MasteryBar rate={t.success_rate} mastered={t.mastered} />
                      {t.attempts === 0 && (
                        <div style={{ fontSize: "12px", color: "#9ca3af", marginTop: "4px", fontStyle: "italic" }}>
                          Sin actividad todavía
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── SESSIONS ─────────────────────────────────────────────── */}
          {activeTab === "sessions" && (
            <div>
              {report.recent_sessions.length === 0 ? (
                <p style={{ color: "#9ca3af", textAlign: "center", paddingTop: "40px" }}>
                  Aún no hay sesiones registradas.
                </p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {report.recent_sessions.map((s) => {
                    const pct = Math.round(s.success_rate * 100);
                    return (
                      <div
                        key={s.session_id}
                        style={{
                          background: "white",
                          border: "1px solid #e5e7eb",
                          borderRadius: "12px",
                          padding: "14px 16px",
                          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                          <div>
                            <div style={{ fontWeight: "bold", fontSize: "14px", color: "#1a1a2e" }}>
                              📚 {s.topic_display_name}
                            </div>
                            <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "2px" }}>
                              {new Date(s.started_at).toLocaleDateString("es-ES", {
                                day: "numeric", month: "long", year: "numeric",
                              })}
                            </div>
                          </div>
                          <div
                            style={{
                              fontWeight: "bold",
                              fontSize: "16px",
                              color: pct >= 60 ? "#15803d" : pct >= 30 ? "#b45309" : "#dc2626",
                            }}
                          >
                            {pct}%
                          </div>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            gap: "16px",
                            marginTop: "10px",
                            fontSize: "13px",
                            color: "#6b7280",
                          }}
                        >
                          <span>💬 {s.messages_count} mensajes</span>
                          <span style={{ color: "#15803d" }}>✅ {s.correct_answers} correctas</span>
                          <span style={{ color: "#b45309" }}>💪 {s.incorrect_answers} intentos</span>
                          <span>💡 {s.hints_given} pistas</span>
                          {s.shield_triggered_count > 0 && (
                            <span style={{ color: "#e74c3c" }}>🛡️ {s.shield_triggered_count}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
          {/* ── BDI AGENT ────────────────────────────────────────────── */}
          {activeTab === "bdi" && report.bdi_explanation && (
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>

              {/* L1 — Intention */}
              <div style={bdiCardStyle("#eff6ff", "#bfdbfe", "#1e40af")}>
                <div style={bdiCardTitleStyle}>
                  <span>🎯</span>
                  <span>Nivel 1 — Intención actual</span>
                  <span style={{ marginLeft: "auto", fontSize: "11px", opacity: 0.7 }}>L1</span>
                </div>
                <div style={{ marginTop: "8px", display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
                  <span
                    style={{
                      background: "#1e40af",
                      color: "white",
                      borderRadius: "16px",
                      padding: "3px 10px",
                      fontSize: "12px",
                      fontWeight: "bold",
                    }}
                  >
                    {report.bdi_explanation.agent_status}
                  </span>
                </div>
                <p style={{ margin: "8px 0 0", fontSize: "14px", color: "#1e3a8a", lineHeight: 1.5 }}>
                  {report.bdi_explanation.current_desire}
                </p>
              </div>

              {/* L2 — Plan */}
              <div style={bdiCardStyle("#f0fdf4", "#bbf7d0", "#166534")}>
                <div style={bdiCardTitleStyle}>
                  <span>🗺️</span>
                  <span>Nivel 2 — Plan pedagógico</span>
                  <span style={{ marginLeft: "auto", fontSize: "11px", opacity: 0.7 }}>L2</span>
                </div>
                <div style={{ marginTop: "10px", display: "flex", flexDirection: "column", gap: "10px" }}>
                  <div>
                    <div style={bdiSubLabelStyle}>Selección de tema</div>
                    <p style={bdiTextStyle}>{report.bdi_explanation.topic_selection_reason}</p>
                  </div>
                  <div>
                    <div style={bdiSubLabelStyle}>Estrategia de andamiaje</div>
                    <p style={bdiTextStyle}>{report.bdi_explanation.hint_strategy}</p>
                  </div>
                  <div>
                    <div style={bdiSubLabelStyle}>Siguiente paso previsto</div>
                    <p style={bdiTextStyle}>{report.bdi_explanation.next_topic_preview}</p>
                  </div>
                </div>
              </div>

              {/* L3 — Beliefs */}
              <div style={bdiCardStyle("#fdf4ff", "#e9d5ff", "#6b21a8")}>
                <div style={bdiCardTitleStyle}>
                  <span>🧠</span>
                  <span>Nivel 3 — Base de creencias</span>
                  <span style={{ marginLeft: "auto", fontSize: "11px", opacity: 0.7 }}>L3</span>
                </div>
                <p style={{ ...bdiTextStyle, marginTop: "8px", fontStyle: "italic" }}>
                  {report.bdi_explanation.belief_summary}
                </p>
                <ul style={{ margin: "10px 0 0", paddingLeft: "18px", display: "flex", flexDirection: "column", gap: "4px" }}>
                  {report.bdi_explanation.mastery_evidence.map((line, i) => (
                    <li key={i} style={{ fontSize: "13px", color: "#4c1d95", lineHeight: 1.5 }}>
                      {line}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Citation footer */}
              <p style={{ fontSize: "11px", color: "#9ca3af", textAlign: "center", margin: 0 }}>
                Explicabilidad BDI basada en Dennis &amp; Oren (2022) y Yan, Burattini et al. (2023)
              </p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

// ── BDI card styles ────────────────────────────────────────────────────────
function bdiCardStyle(bg, border, titleColor) {
  return {
    background: bg,
    border: `1px solid ${border}`,
    borderRadius: "12px",
    padding: "14px 16px",
  };
}

const bdiCardTitleStyle = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  fontWeight: "bold",
  fontSize: "14px",
  color: "#1a1a2e",
};

const bdiSubLabelStyle = {
  fontSize: "11px",
  fontWeight: "bold",
  color: "#6b7280",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  marginBottom: "3px",
};

const bdiTextStyle = {
  margin: 0,
  fontSize: "13px",
  color: "#374151",
  lineHeight: 1.6,
};

// ── Styles ─────────────────────────────────────────────────────────────────
const overlayStyle = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.45)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
  padding: "16px",
};

const panelStyle = {
  background: "#f9fafb",
  borderRadius: "16px",
  width: "100%",
  maxWidth: "680px",
  maxHeight: "90vh",
  display: "flex",
  flexDirection: "column",
  boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
  overflow: "hidden",
};

const closeButtonStyle = {
  position: "absolute",
  top: "14px",
  right: "14px",
  background: "rgba(255,255,255,0.2)",
  border: "none",
  color: "white",
  fontSize: "18px",
  width: "32px",
  height: "32px",
  borderRadius: "50%",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  lineHeight: 1,
};