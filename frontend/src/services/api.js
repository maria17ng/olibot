/**
 * OLIBOT API client — wraps all backend REST calls.
 */
const BASE_URL = `http://${window.location.hostname}:5050/api/v1`;

export const api = {
  // ---- Students ----
  async getStudents() {
    const res = await fetch(`${BASE_URL}/students/`);
    if (!res.ok) throw new Error("Failed to fetch students");
    return res.json();
  },

  async deleteStudent(studentId) {
    const res = await fetch(`${BASE_URL}/students/${studentId}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete student");
  },

  async createStudent(name, age, avatarId = "robot", level = "beginner") {
    const res = await fetch(`${BASE_URL}/students/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, age, level, avatar_id: avatarId }),
    });
    if (!res.ok) throw new Error("Failed to create student");
    return res.json();
  },

  // ---- Chat ----
  async * sendMessageStream(studentId, message, sessionId = null, currentScreen = null) {
    const res = await fetch(`${BASE_URL}/chat/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ student_id: studentId, message, session_id: sessionId, current_screen: currentScreen }),
    });
    if (!res.ok) throw new Error("Stream request failed");

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop(); // keep last incomplete line
      for (const line of lines) {
        if (line.startsWith("data: ")) {
          try { yield JSON.parse(line.slice(6)); } catch { /* skip malformed */ }
        }
      }
    }
  },

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

  async advanceSession(sessionId, topicId) {
    const res = await fetch(`${BASE_URL}/chat/session/${sessionId}/advance`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic_id: topicId }),
    });
    if (!res.ok) throw new Error("Failed to advance session");
    return res.json(); // { session_id, topic_id }
  },

  async getAccessibleTopics(studentId) {
    const res = await fetch(`${BASE_URL}/chat/student/${studentId}/topics`);
    if (!res.ok) throw new Error("Failed to fetch topics");
    return res.json(); // [{ id, display_name, emoji, category, attempts, mastered }]
  },

  // ---- Reports ----
  async getReport(studentId) {
    const res = await fetch(`${BASE_URL}/reports/${studentId}`);
    if (!res.ok) throw new Error("Failed to fetch report");
    return res.json();
  },

  async getStudentMessages(studentId, sessionId = null, limit = 100) {
    const params = new URLSearchParams({ limit });
    if (sessionId != null) params.append("session_id", sessionId);
    const res = await fetch(`${BASE_URL}/reports/${studentId}/messages?${params}`);
    if (!res.ok) throw new Error("Failed to fetch messages");
    return res.json();
  },

  // ---- Student update ----
  async updateStudentBeliefs(studentId, beliefs) {
    const res = await fetch(`${BASE_URL}/students/${studentId}/beliefs`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ beliefs }),
    });
    if (!res.ok) throw new Error("Failed to update beliefs");
    return res.json();
  },

  async updateStudentAge(studentId, newAge) {
    const res = await fetch(`${BASE_URL}/students/${studentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ age: newAge }),
    });
    if (!res.ok) throw new Error("Failed to update student age");
    return res.json();
  },

  // ---- Initial assessment (#8B) ----
  async requestAssessment(studentId) {
    const res = await fetch(`${BASE_URL}/students/${studentId}/request-assessment`, { method: "POST" });
    if (!res.ok) throw new Error("Failed to request assessment");
    return res.json();
  },

  // ---- Emotional checkpoints (#20) ----
  async createEmotionalCheckpoint(studentId, context, emotion = null) {
    const body = { context };
    if (emotion) body.emotion = emotion;
    const res = await fetch(`${BASE_URL}/students/${studentId}/emotional-checkpoints`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error("Failed to save emotional checkpoint");
    return res.json();
  },

  async getEmotionalCheckpoints(studentId, limit = 200) {
    const res = await fetch(`${BASE_URL}/students/${studentId}/emotional-checkpoints?limit=${limit}`);
    if (!res.ok) throw new Error("Failed to fetch emotional checkpoints");
    return res.json();
  },
};
