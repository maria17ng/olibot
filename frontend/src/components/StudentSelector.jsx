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

const AGE_OPTS = [3, 4, 5];

// Pre-defined seeds for the robot picker grid
const ROBOT_SEEDS = [
  "atlas", "bolt", "cosmo", "dash", "echo", "finn",
  "gizmo", "hex", "iris", "jet", "kira", "luna",
];

export default function StudentSelector({ onSelectStudent }) {
  const [students,    setStudents]    = useState([]);
  const [showCreate,  setShowCreate]  = useState(false);
  const [newName,     setNewName]     = useState("");
  const [newAge,      setNewAge]      = useState(4);
  const [avatarSeed,  setAvatarSeed]  = useState("atlas");

  useEffect(() => {
    api.getStudents().then(setStudents).catch(console.error);
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    const student = await api.createStudent(newName.trim(), newAge, avatarSeed);
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
        ¿Quién eres hoy? 🌟
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
          return (
            <div key={s.id} style={{ position: "relative" }}>
              <button
                onClick={() => onSelectStudent(s)}
                style={{
                  width: "100%",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "8px",
                  padding: "16px 12px",
                  background: "rgba(255,255,255,0.93)",
                  border: "3px solid transparent",
                  borderRadius: "24px",
                  cursor: "pointer",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
                  transition: "transform 0.15s, border-color 0.15s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "scale(1.06)";
                  e.currentTarget.style.borderColor = "#4a90d9";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "scale(1)";
                  e.currentTarget.style.borderColor = "transparent";
                }}
              >
                <DiceBearAvatar seed={seed} size={90} state="idle" />
                <span style={{ fontSize: "18px", fontWeight: "bold", color: "#1e3a5f" }}>
                  {s.name}
                </span>
                <span style={{ fontSize: "12px", color: "#6b7280" }}>{s.age} años</span>
              </button>

              {/* Delete button — top-right corner */}
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
            </div>
          );
        })}

        {/* Add new student */}
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

              {/* Age */}
              <label
                style={{ display: "block", fontSize: "13px", color: "#6b7280", marginBottom: "10px", fontWeight: "bold" }}
              >
                Edad
              </label>
              <div style={{ display: "flex", gap: "10px", marginBottom: "28px", justifyContent: "center" }}>
                {AGE_OPTS.map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => setNewAge(a)}
                    style={{
                      width: "58px",
                      height: "58px",
                      borderRadius: "50%",
                      fontSize: "22px",
                      fontWeight: "bold",
                      cursor: "pointer",
                      background: newAge === a ? "#4a90d9" : "white",
                      color: newAge === a ? "white" : "#374151",
                      border: newAge === a ? "3px solid #357abd" : "2px solid #e5e7eb",
                      transition: "all 0.12s",
                    }}
                  >
                    {a}
                  </button>
                ))}
              </div>

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