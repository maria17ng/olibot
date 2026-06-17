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

// ── Emotional timeline (#20) ──────────────────────────────────────────────
const EMOTION_CONFIG = {
  happy:  { emoji: "😊", color: "#bbf7d0", border: "#22c55e", label: "Feliz"    },
  sad:    { emoji: "😢", color: "#bfdbfe", border: "#3b82f6", label: "Triste"   },
  tired:  { emoji: "😴", color: "#fed7aa", border: "#f97316", label: "Cansado"  },
  angry:  { emoji: "😠", color: "#fecaca", border: "#ef4444", label: "Enfadado" },
};
const CONTEXT_CONFIG = {
  session_start:   { emoji: "🟢", label: "Inicio sesión"  },
  post_levelup:    { emoji: "🏆", label: "Tras nivel"     },
  coloring_start:  { emoji: "🎨", label: "Dibujando"      },
  tracing_resume:  { emoji: "✏️", label: "Volvió al trazo" },
};

function EmotionalTimeline({ checkpoints }) {
  // Group checkpoints by calendar day
  const byDay = {};
  checkpoints.forEach(c => {
    const day = c.timestamp.slice(0, 10); // YYYY-MM-DD
    if (!byDay[day]) byDay[day] = [];
    byDay[day].push(c);
  });
  const days = Object.keys(byDay).sort();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Legend */}
      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "4px" }}>
        {Object.entries(EMOTION_CONFIG).map(([k, v]) => (
          <span key={k} style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", color: "#374151" }}>
            <span style={{ background: v.color, border: `1px solid ${v.border}`, borderRadius: "50%", width: 20, height: 20, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>{v.emoji}</span>
            {v.label}
          </span>
        ))}
      </div>
      {days.map(day => (
        <div key={day}>
          <div style={{ fontSize: "12px", fontWeight: "bold", color: "#6b7280", marginBottom: "6px" }}>
            📅 {new Date(day + "T12:00:00").toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
            {byDay[day].map(c => {
              const emo   = c.emotion ? EMOTION_CONFIG[c.emotion] : null;
              const ctx   = CONTEXT_CONFIG[c.context] ?? { emoji: "•", label: c.context };
              const time  = new Date(c.timestamp).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
              return (
                <div key={c.id} style={{
                  display: "flex", alignItems: "center", gap: "8px",
                  background: emo ? emo.color : "#f3f4f6",
                  border: `1px solid ${emo ? emo.border : "#e5e7eb"}`,
                  borderRadius: "10px", padding: "6px 12px",
                }}>
                  <span style={{ fontSize: "16px" }}>{ctx.emoji}</span>
                  <span style={{ fontSize: "12px", color: "#374151", flex: 1 }}>
                    {ctx.label}
                    {emo && <span style={{ marginLeft: "8px", fontWeight: "bold" }}>{emo.emoji} {emo.label}</span>}
                  </span>
                  <span style={{ fontSize: "11px", color: "#9ca3af" }}>{time}</span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
export default function ProgressReport({ student, onClose }) {
  const [report,               setReport]               = useState(null);
  const [loading,              setLoading]              = useState(true);
  const [error,                setError]                = useState(null);
  const [activeTab,            setActiveTab]            = useState("overview"); // "overview"|"ages"|"sessions"|"emotions"
  const [expandedSession,      setExpandedSession]      = useState(null);
  const [expandedMsgs,         setExpandedMsgs]         = useState(null);
  const [expandedMsgsLoading,  setExpandedMsgsLoading]  = useState(false);
  const [emotionalCheckpoints, setEmotionalCheckpoints] = useState([]);

  useEffect(() => {
    if (!student) return;
    setLoading(true);
    setError(null);
    Promise.all([
      api.getReport(student.id),
      api.getEmotionalCheckpoints(student.id, 300).catch(() => []),
    ])
      .then(([rep, checkpoints]) => {
        setReport(rep);
        setEmotionalCheckpoints(checkpoints);
      })
      .catch(() => setError("No se pudo cargar el informe. ¿Está el backend corriendo?"))
      .finally(() => setLoading(false));
  }, [student]);

  const handleSessionClick = (sessionId) => {
    if (expandedSession === sessionId) {
      setExpandedSession(null);
      setExpandedMsgs(null);
      return;
    }
    setExpandedSession(sessionId);
    setExpandedMsgs(null);
    setExpandedMsgsLoading(true);
    api.getStudentMessages(student.id, sessionId)
      .then(setExpandedMsgs)
      .catch(() => setExpandedMsgs([]))
      .finally(() => setExpandedMsgsLoading(false));
  };

  const handlePrint = () => window.print();

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

  // ── Alerts computation (#11) ───────────────────────────────────────────
  const alerts = [];
  const recentEmotions = emotionalCheckpoints
    .filter(c => c.context === "post_levelup" && c.emotion)
    .slice(-3);
  if (recentEmotions.length >= 3 && recentEmotions.every(c => ["sad", "tired", "angry"].includes(c.emotion))) {
    alerts.push({ emoji: "😟", msg: "El niño/a ha expresado emociones negativas en los últimos 3 controles. Revisa el ritmo o la dificultad de los ejercicios." });
  }
  if (report.total_sessions >= 4 && report.topics_mastered === 0 && report.overall_success_rate < 0.35) {
    alerts.push({ emoji: "🚧", msg: "El progreso parece estancado tras varias sesiones. Considera revisar el nivel asignado con la orientadora." });
  }

  const LEVEL_COLORS = {
    3: { bg: "#FFF9C4", border: "#E8C800", header: "#F5F0A0", bar: "#D4B000", emoji: "🟡", label: "Amarillo" },
    4: { bg: "#C8F7C5", border: "#4CAF50", header: "#C0F0BD", bar: "#2E8B2E", emoji: "🟢", label: "Verde"    },
    5: { bg: "#C5E8FF", border: "#5AAEE8", header: "#B8DFFF", bar: "#1B6DC0", emoji: "🔵", label: "Azul"     },
    6: { bg: "#FFD0D0", border: "#E53935", header: "#FFBCBC", bar: "#B71C1C", emoji: "🔴", label: "Rojo"     },
  };

  return (
    <div style={overlayStyle}>
      <style>{PRINT_STYLE}</style>
      <div data-print-panel="1" style={panelStyle}>

        {/* ── Header ───────────────────────────────────────────────── */}
        <div style={{
          padding: "20px 24px 16px",
          background: "linear-gradient(135deg, #4a90d9, #357abd)",
          color: "white",
          borderRadius: "16px 16px 0 0",
          position: "relative",
        }}>
          <button onClick={onClose} style={closeButtonStyle}>✕</button>
          <button onClick={handlePrint} title="Exportar PDF"
            style={{ position: "absolute", top: "14px", right: "54px", background: "rgba(255,255,255,0.2)", border: "none", color: "white", fontSize: "13px", fontWeight: "bold", padding: "4px 10px", borderRadius: "12px", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}>
            📄 PDF
          </button>
          {/* #8B — request initial assessment */}
          <button
            title="Solicitar evaluación inicial del nivel"
            onClick={() => {
              if (!student) return;
              if (!confirm(`¿Solicitar evaluación inicial de nivel para ${student.name}? OLIBOT la realizará al inicio de la próxima sesión.`)) return;
              api.requestAssessment(student.id)
                .then(() => alert(`✅ Evaluación programada para ${student.name}. Lanza una sesión para comenzar.`))
                .catch(() => alert("No se pudo programar la evaluación. Comprueba la conexión con el backend."));
            }}
            style={{ position: "absolute", top: "14px", right: "108px", background: "rgba(255,255,255,0.2)", border: "none", color: "white", fontSize: "13px", fontWeight: "bold", padding: "4px 10px", borderRadius: "12px", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
          >
            🎯 Evaluar
          </button>
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

        {/* ── Tab bar ──────────────────────────────────────────────── */}
        <div style={{ display: "flex", borderBottom: "2px solid #e5e7eb", background: "#f9fafb", overflowX: "auto", flexShrink: 0 }}>
          {[
            { key: "overview",  label: "📊 Resumen"    },
            { key: "ages",      label: "🎨 Por Niveles" },
            { key: "sessions",  label: "🗓️ Sesiones"   },
            { key: "emotions",  label: "💛 Emociones"  },
          ].map(({ key, label }) => (
            <button key={key} onClick={() => setActiveTab(key)} style={{
              flex: 1, padding: "12px", border: "none", background: "none", cursor: "pointer",
              fontSize: "13px",
              fontWeight: activeTab === key ? "bold" : "normal",
              color: activeTab === key ? "#4a90d9" : "#6b7280",
              borderBottom: activeTab === key ? "3px solid #4a90d9" : "3px solid transparent",
              marginBottom: "-2px", whiteSpace: "nowrap",
            }}>
              {label}
            </button>
          ))}
        </div>

        {/* ── Tab content ──────────────────────────────────────────── */}
        <div style={{ overflowY: "auto", flex: 1, minHeight: 0, padding: "20px 24px" }}>

          {/* OVERVIEW */}
          {activeTab === "overview" && (
            <div>
              {/* Alerts */}
              {alerts.length > 0 && (
                <div style={{ background: "#fef3c7", border: "1px solid #fbbf24", borderRadius: "12px", padding: "14px 16px", marginBottom: "16px" }}>
                  <div style={{ fontWeight: "bold", fontSize: "14px", color: "#92400e", marginBottom: "8px" }}>⚠️ Alertas</div>
                  {alerts.map((a, i) => (
                    <div key={i} style={{ display: "flex", gap: "8px", alignItems: "flex-start", fontSize: "13px", color: "#78350f", marginBottom: i < alerts.length - 1 ? "6px" : 0 }}>
                      <span style={{ flexShrink: 0 }}>{a.emoji}</span>
                      <span>{a.msg}</span>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "20px" }}>
                <StatCard emoji="🗓️" value={report.total_sessions}    label="Sesiones" />
                <StatCard emoji="💬" value={report.total_messages}    label="Mensajes" />
                <StatCard emoji="🎯" value={`${overallPct}%`}          label="Aciertos"
                  color={overallPct >= 60 ? "#15803d" : overallPct >= 30 ? "#b45309" : "#dc2626"} />
                <StatCard emoji="🏆" value={report.topics_mastered}   label="Superados"  color="#15803d" />
                <StatCard emoji="📖" value={report.topics_in_progress} label="En progreso" color="#b45309" />
                <StatCard emoji="💤" value={report.topics_not_started} label="Sin empezar" color="#9ca3af" />
              </div>
              {report.recommended_display_names.length > 0 && (
                <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: "12px", padding: "16px" }}>
                  <h3 style={{ margin: "0 0 10px", fontSize: "15px", color: "#92400e" }}>💡 Temas para reforzar en casa</h3>
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    {report.recommended_display_names.map((name, i) => (
                      <span key={i} style={{ background: "#fed7aa", color: "#92400e", borderRadius: "16px", padding: "4px 12px", fontSize: "13px", fontWeight: "bold" }}>
                        {name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* POR NIVELES — pastel colors matching StudentSelector */}
          {activeTab === "ages" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {(!report.age_groups || report.age_groups.length === 0) ? (
                <p style={{ color: "#9ca3af", textAlign: "center", paddingTop: "40px" }}>Sin actividad registrada aún.</p>
              ) : report.age_groups.map(group => {
                const pct = Math.round(group.completion_pct * 100);
                const c   = LEVEL_COLORS[group.age] ?? { bg: "white", border: "#e5e7eb", header: "#f9fafb", bar: "#94a3b8", emoji: "📄", label: `${group.age} años` };
                return (
                  <div key={group.age} style={{ border: `2px solid ${c.border}`, borderRadius: "16px", overflow: "hidden", background: c.bg }}>
                    <div style={{ padding: "14px 18px", background: c.header, display: "flex", alignItems: "center", gap: "12px" }}>
                      <span style={{ fontSize: "28px" }}>{c.emoji}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: "bold", fontSize: "16px", color: "#1e3a5f" }}>
                          Nivel {c.label}
                        </div>
                        <div style={{ fontSize: "13px", color: "#6b7280" }}>
                          {group.mastered_topics}/{group.total_topics} temas superados
                          {group.in_progress_topics > 0 && ` · ${group.in_progress_topics} en progreso`}
                        </div>
                      </div>
                      <div style={{ fontSize: "20px", fontWeight: "bold", color: "#1e3a5f" }}>
                        {pct}%{group.all_mastered && <span style={{ marginLeft: "6px" }}>✅</span>}
                      </div>
                    </div>
                    <div style={{ height: "10px", background: "rgba(255,255,255,0.6)" }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: c.bar, transition: "width 0.4s ease" }} />
                    </div>
                    {group.all_mastered && group.advance_message && (
                      <div style={{ padding: "12px 18px", background: "#fefce8", borderTop: `1px solid ${c.border}`, fontSize: "14px", color: "#854d0e", fontWeight: "500" }}>
                        {group.advance_message}
                      </div>
                    )}
                    <div style={{ padding: "10px 14px", display: "flex", flexWrap: "wrap", gap: "8px" }}>
                      {group.topics.map(t => (
                        <span key={t.topic_id} style={{
                          display: "inline-flex", alignItems: "center", gap: "4px",
                          padding: "4px 10px", borderRadius: "20px", fontSize: "12px",
                          background: t.mastered ? "#dcfce7" : t.attempts > 0 ? "#fef3c7" : "#f3f4f6",
                          color:      t.mastered ? "#15803d" : t.attempts > 0 ? "#92400e" : "#6b7280",
                          border:    `1px solid ${t.mastered ? "#86efac" : t.attempts > 0 ? "#fde68a" : "#e5e7eb"}`,
                        }}>
                          {t.emoji} {t.display_name}{t.mastered && " ✅"}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* SESIONES — click to expand messages inline */}
          {activeTab === "sessions" && (
            <div>
              {report.recent_sessions.length === 0 ? (
                <p style={{ color: "#9ca3af", textAlign: "center", paddingTop: "40px" }}>Aún no hay sesiones registradas.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {report.recent_sessions.map((s) => {
                    const pct        = Math.round(s.success_rate * 100);
                    const isExpanded = expandedSession === s.session_id;
                    return (
                      <div key={s.session_id}>
                        <div onClick={() => handleSessionClick(s.session_id)} style={{
                          background: isExpanded ? "#eff6ff" : "white",
                          border: `1px solid ${isExpanded ? "#93c5fd" : "#e5e7eb"}`,
                          borderRadius: isExpanded ? "12px 12px 0 0" : "12px",
                          padding: "14px 16px",
                          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                          cursor: "pointer",
                        }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                            <div>
                              <div style={{ fontWeight: "bold", fontSize: "14px", color: "#1a1a2e" }}>
                                📚 {s.topic_display_name}
                              </div>
                              <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "2px" }}>
                                {new Date(s.started_at).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })}
                              </div>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <div style={{ fontWeight: "bold", fontSize: "16px", color: pct >= 60 ? "#15803d" : pct >= 30 ? "#b45309" : "#dc2626" }}>
                                {pct}%
                              </div>
                              <span style={{ fontSize: "14px", color: isExpanded ? "#4a90d9" : "#9ca3af" }}>
                                {isExpanded ? "▲" : "▼"}
                              </span>
                            </div>
                          </div>
                          <div style={{ display: "flex", gap: "16px", marginTop: "10px", fontSize: "13px", color: "#6b7280" }}>
                            <span>💬 {s.messages_count}</span>
                            <span style={{ color: "#15803d" }}>✅ {s.correct_answers}</span>
                            <span style={{ color: "#b45309" }}>💪 {s.incorrect_answers}</span>
                            <span>💡 {s.hints_given}</span>
                            {s.shield_triggered_count > 0 && <span style={{ color: "#e74c3c" }}>🛡️ {s.shield_triggered_count}</span>}
                          </div>
                        </div>

                        {isExpanded && (
                          <div style={{
                            border: "1px solid #93c5fd", borderTop: "none",
                            borderRadius: "0 0 12px 12px",
                            padding: "14px 16px",
                            background: "#f0f9ff",
                            maxHeight: "340px", overflowY: "auto",
                          }}>
                            {expandedMsgsLoading ? (
                              <div style={{ textAlign: "center", padding: "20px", color: "#888" }}>Cargando…</div>
                            ) : !expandedMsgs || expandedMsgs.length === 0 ? (
                              <p style={{ color: "#9ca3af", textAlign: "center", padding: "16px 0" }}>Sin mensajes registrados.</p>
                            ) : (
                              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                {expandedMsgs.map((m) => (
                                  <div key={m.message_id} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                                    <div style={{
                                      maxWidth: "78%", padding: "8px 12px",
                                      borderRadius: m.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                                      background: m.role === "user" ? "#dbeafe" : "white",
                                      border: m.role === "user" ? "1px solid #bfdbfe" : "1px solid #e5e7eb",
                                      fontSize: "13px", color: "#1e3a5f", lineHeight: 1.5,
                                    }}>
                                      <div style={{ fontSize: "11px", color: "#6b7280", marginBottom: "3px", fontWeight: "bold" }}>
                                        {m.role === "user" ? "👦 Niño" : "🤖 OLIBOT"}
                                        {m.shield_triggered && <span style={{ color: "#e74c3c", marginLeft: "6px" }}>🛡️</span>}
                                      </div>
                                      {m.content}
                                      <div style={{ fontSize: "10px", color: "#9ca3af", marginTop: "3px", textAlign: "right" }}>
                                        {new Date(m.timestamp).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* EMOCIONES (#20) */}
          {activeTab === "emotions" && (
            <div>
              {emotionalCheckpoints.length === 0 ? (
                <p style={{ color: "#9ca3af", textAlign: "center", paddingTop: "40px" }}>
                  Aún no hay registros emocionales. Se guardarán automáticamente durante las sesiones.
                </p>
              ) : (
                <EmotionalTimeline checkpoints={emotionalCheckpoints} />
              )}
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

// Injected once: print styles that make the panel fill the page
const PRINT_STYLE = `
@media print {
  body > * { display: none !important; }
  [data-print-panel] { display: flex !important; position: static !important;
    inset: 0 !important; background: white !important; box-shadow: none !important;
    max-height: none !important; max-width: 100% !important; border-radius: 0 !important; }
  button { display: none !important; }
}
`;

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