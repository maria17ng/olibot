/**
 * OLIBOT — Main Application Component
 *
 * Two modes:
 *   parent mode  — StudentSelector fills the entire screen (avatar picker, profile creation)
 *   child mode   — ChatWindow fills the entire screen; small overlay buttons (top-left) let
 *                  a parent switch child or open the progress report.
 */
import { useState } from "react";
import StudentSelector from "./components/StudentSelector";
import ChatWindow from "./components/ChatWindow";
import ProgressReport from "./components/ProgressReport";

export default function App() {
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showReport, setShowReport] = useState(false);
  const [isNewStudent, setIsNewStudent] = useState(false);

  const handleSelectStudent = (student, isNew = false) => {
    setSelectedStudent(student);
    setIsNewStudent(isNew);
    setShowReport(false);
  };

  // ── Parent mode ───────────────────────────────────────────────────────────
  if (!selectedStudent) {
    return (
      <div style={{ width: "100vw", height: "100vh", fontFamily: "'Segoe UI', sans-serif" }}>
        <StudentSelector onSelectStudent={handleSelectStudent} />
      </div>
    );
  }

  // ── Child mode ────────────────────────────────────────────────────────────
  return (
    <div style={{ width: "100vw", height: "100vh", fontFamily: "'Segoe UI', sans-serif", position: "relative", overflow: "hidden" }}>
      <ChatWindow student={selectedStudent} isNewStudent={isNewStudent} />

      {/* Parent control buttons — translucent circles, top-left */}
      <div style={{ position: "fixed", top: "12px", left: "12px", zIndex: 300, display: "flex", gap: "10px" }}>
        <button
          onClick={() => setSelectedStudent(null)}
          title="Cambiar niño"
          style={{
            width: "60px", height: "60px", borderRadius: "50%",
            background: "rgba(255,255,255,0.88)", border: "2px solid rgba(0,0,0,0.10)",
            fontSize: "28px", cursor: "pointer", backdropFilter: "blur(8px)",
            boxShadow: "0 4px 14px rgba(0,0,0,0.15)", display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          🏠
        </button>
        <button
          onClick={() => setShowReport(true)}
          title="Informe de progreso"
          style={{
            width: "60px", height: "60px", borderRadius: "50%",
            background: "rgba(255,255,255,0.88)", border: "2px solid rgba(0,0,0,0.10)",
            fontSize: "28px", cursor: "pointer", backdropFilter: "blur(8px)",
            boxShadow: "0 4px 14px rgba(0,0,0,0.15)", display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          📋
        </button>
      </div>

      {showReport && (
        <ProgressReport
          student={selectedStudent}
          onClose={() => setShowReport(false)}
        />
      )}
    </div>
  );
}