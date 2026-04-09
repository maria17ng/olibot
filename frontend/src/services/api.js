/**
 * OLIBOT API client — wraps all backend REST calls.
 */
const BASE_URL = "http://localhost:8000/api/v1";

export const api = {
  // ---- Students ----
  async getStudents() {
    const res = await fetch(`${BASE_URL}/students/`);
    if (!res.ok) throw new Error("Failed to fetch students");
    return res.json();
  },

  async createStudent(name, age, level = "beginner") {
    const res = await fetch(`${BASE_URL}/students/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, age, level }),
    });
    if (!res.ok) throw new Error("Failed to create student");
    return res.json();
  },

  // ---- Chat ----
  async sendMessage(studentId, message, sessionId = null) {
    const res = await fetch(`${BASE_URL}/chat/message`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        student_id: studentId,
        message,
        session_id: sessionId,
      }),
    });
    if (!res.ok) throw new Error("Failed to send message");
    return res.json();
  },

  async getHistory(sessionId) {
    const res = await fetch(`${BASE_URL}/chat/session/${sessionId}/history`);
    if (!res.ok) throw new Error("Failed to fetch history");
    return res.json();
  },

  async endSession(sessionId) {
    const res = await fetch(`${BASE_URL}/chat/session/${sessionId}/end`, {
      method: "POST",
    });
    if (!res.ok) throw new Error("Failed to end session");
    return res.json();
  },
};
