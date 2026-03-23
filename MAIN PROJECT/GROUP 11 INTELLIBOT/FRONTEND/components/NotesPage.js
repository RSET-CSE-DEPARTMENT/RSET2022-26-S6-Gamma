import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getNotesBySubject } from "../api";

function NotesPage() {
  const { subject } = useParams();
  const navigate = useNavigate();
  const [notes, setNotes] = useState([]);

  useEffect(() => {
    getNotesBySubject(subject).then((res) => {
      setNotes(res.notes || []);
    });
  }, [subject]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #4facfe, #2c3e50)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div
        style={{
          background: "#fff",
          padding: "40px",
          borderRadius: "18px",
          width: "650px",
          boxShadow: "0 12px 30px rgba(0,0,0,0.25)",
        }}
      >
        <h1>Notes (Subject: {subject})</h1>

        {notes.length === 0 ? (
          <p>No notes available for this subject.</p>
        ) : (
          notes.map((note, i) => (
            <p key={i}>
              <a href={note.url} target="_blank" rel="noreferrer">
                📄 {note.title}
              </a>
            </p>
          ))
        )}

        <button
          onClick={() => navigate(-1)}
          style={{ marginTop: "20px", background: "#3498db", color: "#fff" }}
        >
          ⬅ Back
        </button>
      </div>
    </div>
  );
}

export default NotesPage;
