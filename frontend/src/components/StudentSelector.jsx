/**
 * StudentSelector — full-screen parent panel for choosing or creating a student profile.
 *
 * - Grid of student cards with DiceBear robot avatars + delete button
 * - "Nuevo niño" modal: robot picker (12 DiceBear robots), name input, age selector
 * - Live robot preview updates as the name is typed
 */
import { useState, useEffect } from "react";
import { api } from "../services/api";
import DiceBearAvatar from "./DiceBearAvatar";

const LEVEL_OPTS = [3, 4, 5, 6, "auto"];

// Pastel-colour system — no age references visible to children or parents.
// DB still stores 3/4/5/6 for levels; "auto" triggers initial evaluation (age 4 default).
const LEVEL_COLORS = {
  3:      { bg: "#FFF9C4", border: "#E8C800", dot: "#D4B000", label: "Amarillo",   desc: "Trazos pregráficos (líneas, curvas, zigzag) y reconocimiento auditivo de vocales" },
  4:      { bg: "#C8F7C5", border: "#4CAF50", dot: "#2E8B2E", label: "Verde",      desc: "Números 1–10, vocales A E I O U (mayúscula y minúscula), consonantes b–z" },
  5:      { bg: "#C5E8FF", border: "#5AAEE8", dot: "#1B6DC0", label: "Azul",       desc: "Consonantes especiales (h, k, q, w, x), sílabas y palabras bisílabas" },
  6:      { bg: "#FFD0D0", border: "#E53935", dot: "#B71C1C", label: "Rojo",       desc: "Sílabas inversas (as, es, ar…), sílabas complejas (bra, tra, pla…), palabras trisílabas y frases cortas" },
  "auto": { bg: "#E8C5FF", border: "#B05AE8", dot: "#7B1BD4", label: "Automático", desc: "OLIBOT hará una pequeña evaluación al inicio para determinar el nivel adecuado. El niño empieza jugando y el sistema asigna el nivel óptimo." },
};

// Pre-defined seeds for the robot picker grid
const ROBOT_SEEDS = [
  "atlas", "bolt", "cosmo", "dash", "echo", "finn",
  "gizmo", "hex", "iris", "jet", "kira", "luna",
];

export default function StudentSelector({ onSelectStudent, onSelectPair }) {
  const [students,      setStudents]      = useState([]);
  const [showCreate,    setShowCreate]    = useState(false);
  const [newName,       setNewName]       = useState("");
  const [newAge,        setNewAge]        = useState(4);
  const [avatarSeed,    setAvatarSeed]    = useState("atlas");
  const [showLevelInfo, setShowLevelInfo] = useState(false);
  // Pair mode selection
  const [pairMode,     setPairMode]      = useState(false);
  const [pairPlayer1,  setPairPlayer1]   = useState(null);

  useEffect(() => {
    api.getStudents().then(setStudents).catch(console.error);
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    // "auto" uses age 4 as default; evaluation pending flag handled by future #8B
    const ageToSend = newAge === "auto" ? 4 : newAge;
    const student = await api.createStudent(newName.trim(), ageToSend, avatarSeed);
    setStudents((prev) => [...prev, student]);
    onSelectStudent(student, true); // true = recién creado → mostrar tutorial
  };

  const handleDelete = async (e, student) => {
    e.stopPropagation();
    if (!confirm(`¿Borrar a ${student.name}? Esta acción no se puede deshacer.`)) return;
    try {
      await api.deleteStudent(student.id);
      setStudents((prev) => prev.filter((s) => s.id !== student.id));
    } catch {
      alert("No se pudo borrar el alumno. Inténtalo de nuevo.");
    }
  };

  const closeCreate = () => {
    setShowCreate(false);
    setNewName("");
    setAvatarSeed("atlas");
    setNewAge(4);
    setShowLevelInfo(false);
  };

  // The seed used for DiceBear: always the picked robot, the name never overrides it
  const previewSeed = avatarSeed;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        boxSizing: "border-box",
        overflow: "auto",
      }}
    >
      {/* Title */}
      <div
        style={{
          fontSize: "30px",
          fontWeight: "bold",
          color: "white",
          marginBottom: "24px",
          textShadow: "0 2px 10px rgba(0,0,0,0.25)",
          textAlign: "center",
        }}
      >
        {pairMode
          ? (pairPlayer1 ? `¿Y el segundo jugador? 🌟` : `¿Quién juega primero? 🎮`)
          : "¿Quién eres hoy? 🌟"}
      </div>

      {/* Student cards grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(155px, 1fr))",
          gap: "16px",
          width: "100%",
          maxWidth: "740px",
        }}
      >
        {students.map((s) => {
          const seed  = s.avatar_id && s.avatar_id !== "robot" ? s.avatar_id : s.name;
          const isP1  = pairPlayer1?.id === s.id;
          const handleCardClick = () => {
            if (!pairMode) {
              onSelectStudent(s);
              return;
            }
            if (!pairPlayer1) {
              setPairPlayer1(s);
            } else if (!isP1) {
              onSelectPair(pairPlayer1, s);
            }
          };
          return (
            <div key={s.id} style={{ position: "relative" }}>
              <button
                onClick={handleCardClick}
                style={{
                  width: "100%",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "8px",
                  padding: "16px 12px",
                  background: isP1 ? "rgba(245,158,11,0.18)" : "rgba(255,255,255,0.93)",
                  border: isP1 ? "3px solid #f59e0b" : "3px solid transparent",
                  borderRadius: "24px",
                  cursor: "pointer",
                  boxShadow: isP1 ? "0 0 0 4px rgba(245,158,11,0.35), 0 8px 32px rgba(0,0,0,0.15)" : "0 8px 32px rgba(0,0,0,0.15)",
                  transition: "transform 0.15s, border-color 0.15s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "scale(1.06)";
                  if (!isP1) e.currentTarget.style.borderColor = "#4a90d9";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "scale(1)";
                  if (!isP1) e.currentTarget.style.borderColor = "transparent";
                }}
              >
                <DiceBearAvatar seed={seed} size={90} state="idle" />
                <span style={{ fontSize: "18px", fontWeight: "bold", color: "#1e3a5f" }}>
                  {s.name}
                </span>
                {/* Level shown as pastel colour dot */}
                <span style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "13px", color: "#4b5563" }}>
                  <span style={{
                    display: "inline-block", width: "12px", height: "12px", borderRadius: "50%",
                    background: LEVEL_COLORS[s.age]?.dot ?? "#9ca3af",
                    flexShrink: 0,
                  }} />
                  {LEVEL_COLORS[s.age]?.label ?? `Nivel ${s.age}`}
                </span>
                {isP1 && (
                  <span style={{ fontSize: "13px", fontWeight: "bold", color: "#d97706", marginTop: 2 }}>
                    Jugador 1 ✓
                  </span>
                )}
              </button>

              {/* Delete button — hidden in pair-selection mode */}
              {!pairMode && (
              <button
                onClick={(e) => handleDelete(e, s)}
                title={`Borrar a ${s.name}`}
                style={{
                  position: "absolute",
                  top: "8px",
                  right: "8px",
                  width: "28px",
                  height: "28px",
                  borderRadius: "50%",
                  border: "none",
                  background: "rgba(220,38,38,0.85)",
                  color: "white",
                  fontSize: "14px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
                  lineHeight: 1,
                }}
              >
                🗑️
              </button>
              )}
            </div>
          );
        })}

        {/* Add new student */}
        {/* Add new student — hidden in pair mode */}
        {!pairMode && (
        <button
          onClick={() => setShowCreate(true)}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
            padding: "20px 12px",
            minHeight: "185px",
            background: "rgba(255,255,255,0.22)",
            border: "3px dashed rgba(255,255,255,0.7)",
            borderRadius: "24px",
            cursor: "pointer",
            color: "white",
            transition: "background 0.15s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.32)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.22)"; }}
        >
          <span style={{ fontSize: "48px" }}>➕</span>
          <span style={{ fontSize: "15px", fontWeight: "bold" }}>Nuevo niño</span>
        </button>
        )}
      </div>

      {/* ── Pair mode controls ────────────────────────────────────────────────── */}
      <div style={{ marginTop: "24px", display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
        {!pairMode ? (
          students.length >= 2 && (
            <button
              onClick={() => { setPairMode(true); setPairPlayer1(null); }}
              style={{
                padding: "12px 28px", borderRadius: "20px", border: "none",
                background: "rgba(255,255,255,0.22)", color: "white",
                fontSize: "17px", fontWeight: "bold", cursor: "pointer",
                boxShadow: "0 4px 14px rgba(0,0,0,0.15)",
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.35)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.22)"; }}
            >
              🎮 Jugar en pareja
            </button>
          )
        ) : (
          <button
            onClick={() => { setPairMode(false); setPairPlayer1(null); }}
            style={{
              padding: "12px 28px", borderRadius: "20px", border: "none",
              background: "rgba(255,255,255,0.15)", color: "white",
              fontSize: "17px", cursor: "pointer",
              boxShadow: "0 4px 14px rgba(0,0,0,0.10)",
            }}
          >
            ✖ Cancelar
          </button>
        )}
      </div>

      {/* ── Create student modal ─────────────────────────────────────────────── */}
      {showCreate && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            background: "rgba(0,0,0,0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
          onClick={(e) => { if (e.target === e.currentTarget) closeCreate(); }}
        >
          <div
            style={{
              background: "white",
              borderRadius: "24px",
              padding: "28px 24px",
              width: "100%",
              maxWidth: "480px",
              maxHeight: "92vh",
              overflow: "auto",
              boxShadow: "0 24px 80px rgba(0,0,0,0.4)",
            }}
          >
            {/* Header with live preview */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "20px", gap: "8px" }}>
              <DiceBearAvatar seed={previewSeed} size={90} state="idle" />
              <h2 style={{ margin: 0, fontSize: "20px", color: "#1e3a5f", textAlign: "center" }}>
                ¡Elige tu robot!
              </h2>
            </div>

            <form onSubmit={handleCreate}>
              {/* Robot picker grid */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(6, 1fr)",
                  gap: "8px",
                  marginBottom: "24px",
                }}
              >
                {ROBOT_SEEDS.map((seed) => (
                  <button
                    key={seed}
                    type="button"
                    onClick={() => setAvatarSeed(seed)}
                    title={seed}
                    style={{
                      padding: "6px",
                      borderRadius: "12px",
                      cursor: "pointer",
                    background: avatarSeed === seed ? "#dbeafe" : "white",
                    border:
                      avatarSeed === seed
                        ? "3px solid #4a90d9"
                        : "2px solid #e5e7eb",
                    transform: avatarSeed === seed ? "scale(1.12)" : "scale(1)",
                      transition: "all 0.12s",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <DiceBearAvatar seed={seed} size={38} state="idle" />
                  </button>
                ))}
              </div>

              {/* Name */}
              <label
                style={{ display: "block", fontSize: "13px", color: "#6b7280", marginBottom: "6px", fontWeight: "bold" }}
              >
                Nombre
              </label>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Nombre del niño/a"
                required
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "11px 14px",
                  borderRadius: "12px",
                  border: "2px solid #e5e7eb",
                  fontSize: "16px",
                  marginBottom: "20px",
                  outline: "none",
                  color: "#1e3a5f",
                }}
              />

              {/* Level selector */}
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "10px" }}>
                <label style={{ fontSize: "13px", color: "#6b7280", fontWeight: "bold" }}>
                  Nivel
                </label>
                <button
                  type="button"
                  onClick={() => setShowLevelInfo(v => !v)}
                  title="Ver descripción del nivel"
                  style={{ background: "none", border: "none", cursor: "pointer", fontSize: "16px", lineHeight: 1, padding: "2px 4px", color: showLevelInfo ? "#4a90d9" : "#9ca3af" }}
                >
                  ❓
                </button>
              </div>

              <div style={{ display: "flex", gap: "10px", marginBottom: "12px", justifyContent: "center", flexWrap: "wrap" }}>
                {LEVEL_OPTS.map((opt) => {
                  const lc = LEVEL_COLORS[opt];
                  const selected = newAge === opt;
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setNewAge(opt)}
                      style={{
                        padding: "10px 14px",
                        borderRadius: "16px",
                        cursor: "pointer",
                        background: selected ? lc.bg : "white",
                        border: selected ? `3px solid ${lc.border}` : "2px solid #e5e7eb",
                        transition: "all 0.12s",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "5px",
                        minWidth: "70px",
                        boxShadow: selected ? `0 0 0 3px ${lc.border}33` : "none",
                      }}
                    >
                      {/* Colour circle */}
                      <span style={{
                        display: "block", width: "28px", height: "28px", borderRadius: "50%",
                        background: lc.bg,
                        border: `3px solid ${lc.dot}`,
                        boxShadow: selected ? `0 0 6px ${lc.dot}66` : "none",
                      }} />
                      <span style={{ fontSize: "11px", fontWeight: "bold", color: selected ? lc.dot : "#6b7280" }}>
                        {lc.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Info panel — shown when ❓ is active */}
              {showLevelInfo && (
                <div style={{
                  background: LEVEL_COLORS[newAge]?.bg ?? "#f9fafb",
                  border: `1px solid ${LEVEL_COLORS[newAge]?.border ?? "#e5e7eb"}`,
                  borderRadius: "12px",
                  padding: "12px 14px",
                  fontSize: "13px",
                  color: LEVEL_COLORS[newAge]?.dot ?? "#374151",
                  marginBottom: "20px",
                  lineHeight: 1.55,
                }}>
                  <strong>{LEVEL_COLORS[newAge]?.label}:</strong> {LEVEL_COLORS[newAge]?.desc}
                </div>
              )}
              {!showLevelInfo && <div style={{ marginBottom: "16px" }} />}

              {/* Action buttons */}
              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  type="button"
                  onClick={closeCreate}
                  style={{
                    flex: 1, padding: "13px", borderRadius: "12px",
                    border: "2px solid #e5e7eb", background: "white",
                    cursor: "pointer", fontSize: "16px", color: "#374151",
                  }}
                >
                  ❌ Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!newName.trim()}
                  style={{
                    flex: 1, padding: "13px", borderRadius: "12px",
                    border: "none",
                    background: newName.trim() ? "#4a90d9" : "#d1d5db",
                    color: "white",
                    cursor: newName.trim() ? "pointer" : "not-allowed",
                    fontSize: "16px", fontWeight: "bold",
                  }}
                >
                  ✅ ¡Listo!
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}