/**
 * StudentSelector — dropdown + form to select or create a student profile.
 */
import { useState, useEffect } from "react";
import { api } from "../services/api";

export default function StudentSelector({ onSelectStudent }) {
  const [students, setStudents] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newAge, setNewAge] = useState(5);

  useEffect(() => {
    api.getStudents().then(setStudents).catch(console.error);
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    const student = await api.createStudent(newName, newAge);
    setStudents((prev) => [...prev, student]);
    onSelectStudent(student);
    setShowCreateForm(false);
    setNewName("");
  };

  return (
    <div style={{ padding: "16px", borderBottom: "1px solid #e0e0e0" }}>
      <h2 style={{ margin: "0 0 12px", fontSize: "18px", color: "#1a1a2e" }}>
        ¿Quién eres hoy? 🌟
      </h2>

      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        {students.map((s) => (
          <button
            key={s.id}
            onClick={() => onSelectStudent(s)}
            style={{
              padding: "8px 16px",
              borderRadius: "20px",
              border: "2px solid #4a90d9",
              background: "white",
              cursor: "pointer",
              fontSize: "14px",
              color: "#4a90d9",
              fontWeight: "bold",
            }}
          >
            {s.name} ({s.age} años)
          </button>
        ))}

        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          style={{
            padding: "8px 16px",
            borderRadius: "20px",
            border: "2px dashed #4a90d9",
            background: "white",
            cursor: "pointer",
            fontSize: "14px",
            color: "#4a90d9",
          }}
        >
          + Nuevo niño
        </button>
      </div>

      {showCreateForm && (
        <form onSubmit={handleCreate} style={{ marginTop: "12px", display: "flex", gap: "8px" }}>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nombre"
            required
            style={{ padding: "8px", borderRadius: "8px", border: "1px solid #ccc", fontSize: "14px" }}
          />
          <input
            type="number"
            value={newAge}
            onChange={(e) => setNewAge(Number(e.target.value))}
            min={3}
            max={6}
            style={{ width: "60px", padding: "8px", borderRadius: "8px", border: "1px solid #ccc", fontSize: "14px" }}
          />
          <button
            type="submit"
            style={{
              padding: "8px 16px",
              borderRadius: "8px",
              background: "#4a90d9",
              color: "white",
              border: "none",
              cursor: "pointer",
              fontSize: "14px",
            }}
          >
            Crear
          </button>
        </form>
      )}
    </div>
  );
}
