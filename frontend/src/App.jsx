import { useState } from "react";
import StudentSelector from "./components/StudentSelector";
import ChatWindow from "./components/ChatWindow";
import ProgressReport from "./components/ProgressReport";

export default function App() {
  const [players,       setPlayers]       = useState([]);   // [] | [s1] | [s1,s2]
  const [showReport,    setShowReport]    = useState(false);
  const [reportStudent, setReportStudent] = useState(null);
  const [isNewStudent,  setIsNewStudent]  = useState(false);

  const handleSelectStudent = (student, isNew = false) => {
    setPlayers([student]);
    setIsNewStudent(isNew);
    setShowReport(false);
  };

  const handleSelectPair = (s1, s2) => {
    setPlayers([s1, s2]);
    setIsNewStudent(false);
    setShowReport(false);
  };

  const handleReport = (student) => {
    setReportStudent(student);
    setShowReport(true);
  };

  // ── Parent mode ───────────────────────────────────────────────────────────
  if (players.length === 0) {
    return (
      <div style={{ width: "100vw", height: "100dvh", fontFamily: "'Segoe UI', sans-serif" }}>
        <StudentSelector onSelectStudent={handleSelectStudent} onSelectPair={handleSelectPair} />
      </div>
    );
  }

  // ── Child mode ────────────────────────────────────────────────────────────
  return (
    <div style={{ width: "100vw", height: "100dvh", fontFamily: "'Segoe UI', sans-serif", position: "relative", overflow: "hidden" }}>
      <ChatWindow
        players={players}
        isNewStudent={isNewStudent}
        onExit={() => setPlayers([])}
        onReport={handleReport}
      />

      {showReport && reportStudent && (
        <ProgressReport
          student={reportStudent}
          onClose={() => setShowReport(false)}
        />
      )}
    </div>
  );
}