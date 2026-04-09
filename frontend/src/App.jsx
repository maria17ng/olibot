/**
 * OLIBOT — Main Application Component
 * Manages the selected student state and lays out the UI.
 */
import { useState } from "react";
import StudentSelector from "./components/StudentSelector";
import ChatWindow from "./components/ChatWindow";

export default function App() {
  const [selectedStudent, setSelectedStudent] = useState(null);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        maxWidth: "800px",
        margin: "0 auto",
        fontFamily: "'Segoe UI', sans-serif",
        backgroundColor: "#f9fbff",
      }}
    >
      {/* Header */}
      <header
        style={{
          padding: "16px 24px",
          background: "linear-gradient(135deg, #4a90d9, #357abd)",
          color: "white",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
        }}
      >
        <span style={{ fontSize: "36px" }}>🤖</span>
        <div>
          <h1 style={{ margin: 0, fontSize: "22px", fontWeight: "bold" }}>OLIBOT</h1>
          <p style={{ margin: 0, fontSize: "12px", opacity: 0.85 }}>
            Tu tutor inteligente — Objective Learning Intelligent BOT
          </p>
        </div>
        {selectedStudent && (
          <div style={{ marginLeft: "auto", fontSize: "14px", opacity: 0.9 }}>
            Alumno: <strong>{selectedStudent.name}</strong>
          </div>
        )}
      </header>

      {/* Student selector */}
      <StudentSelector onSelectStudent={setSelectedStudent} />

      {/* Chat area */}
      <div style={{ flex: 1, overflow: "hidden" }}>
        {selectedStudent ? (
          <ChatWindow student={selectedStudent} />
        ) : (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              flexDirection: "column",
              gap: "16px",
              color: "#888",
            }}
          >
            <span style={{ fontSize: "64px" }}>👆</span>
            <p style={{ fontSize: "18px" }}>Selecciona un alumno para empezar</p>
          </div>
        )}
      </div>
    </div>
  );
}
