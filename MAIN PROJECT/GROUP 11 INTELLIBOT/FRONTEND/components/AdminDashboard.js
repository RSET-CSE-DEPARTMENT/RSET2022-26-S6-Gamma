import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  uploadNote,
  getNotesBySubject,
  deleteNote,
} from "../api";

function AdminDashboard() {
  const [subject, setSubject] = useState("");
  const [file, setFile] = useState(null);
  const [notes, setNotes] = useState([]);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  // Load notes whenever subject changes
  useEffect(() => {
    if (subject) {
      getNotesBySubject(subject).then((res) => {
        setNotes(res?.notes || []);
      });
    } else {
      setNotes([]);
    }
  }, [subject]);

  const handleUpload = async () => {
    if (!file || !subject) return;

    await uploadNote(subject, file);

    const res = await getNotesBySubject(subject);
    setNotes(res?.notes || []);

    setFile(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #4facfe, #2c3e50)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "20px",
      }}
    >
      <div
        style={{
          width: "600px",
          background: "#fff",
          borderRadius: "18px",
          padding: "40px",
          boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* HEADER */}
        <h1
          style={{
            textAlign: "center",
            fontSize: "28px",
            marginBottom: "24px",
          }}
        >
          📘 Update Notes
        </h1>

        {/* SUBJECT DROPDOWN */}
        <select
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          style={{
            padding: "14px",
            fontSize: "15px",
            borderRadius: "10px",
            border: "1px solid #ccc",
            marginBottom: "20px",
          }}
        >
          <option value="">Select Subject</option>
          <option value="CD">Compiler Design</option>
          <option value="COA">Computer Organization & Architecture</option>
          <option value="DBMS">Database Management System</option>
          <option value="OS">Operating Systems</option>
          <option value="PY">Python</option>
        </select>

        {/* FILE INPUT */}
        {subject && (
          <>
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => setFile(e.target.files[0])}
              style={{
                marginBottom: "16px",
                fontSize: "13px",
              }}
            />

            <button
              onClick={handleUpload}
              disabled={!file}
              style={{
                padding: "12px",
                fontSize: "15px",
                background: "#2ecc71",
                color: "#fff",
                border: "none",
                borderRadius: "10px",
                cursor: file ? "pointer" : "not-allowed",
                marginBottom: "30px",
                transition: "all 0.3s ease",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.transform = "scale(1.05)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.transform = "scale(1)")
              }
            >
              ⬆ Upload Note
            </button>
          </>
        )}

        {/* NOTES LIST */}
        {subject && (
          <div>
            <h3 style={{ marginBottom: "12px" }}>📄 Notes</h3>

            {notes.length === 0 ? (
              <p style={{ color: "#777" }}>
                No notes uploaded for this subject
              </p>
            ) : (
              notes.map((note, index) => {
                const filename = note.url.split("/").pop();

                return (
                  <div
                    key={index}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "10px 14px",
                      marginBottom: "10px",
                      background: "#f9f9f9",
                      borderRadius: "8px",
                      transition: "all 0.3s ease",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.transform = "translateY(-3px)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.transform = "translateY(0)")
                    }
                  >
                    <a
                      href={note.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        textDecoration: "none",
                        fontSize: "14px",
                        color: "#2980b9",
                        fontWeight: "500",
                      }}
                    >
                      📄 {note.title}
                    </a>

                    <button
                      onClick={async () => {
                        await deleteNote(subject, filename);
                        const res = await getNotesBySubject(subject);
                        setNotes(res?.notes || []);
                      }}
                      style={{
                        background: "#e74c3c",
                        color: "#fff",
                        border: "none",
                        padding: "6px 12px",
                        borderRadius: "6px",
                        fontSize: "12px",
                        cursor: "pointer",
                        transition: "all 0.3s ease",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.opacity = "0.8")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.opacity = "1")
                      }
                    >
                      ❌ Delete
                    </button>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* BACK TO OVERVIEW BUTTON */}
        <button
          onClick={() => navigate("/admin-dashboard")}
          style={{
            marginTop: "30px",
            padding: "14px",
            fontSize: "15px",
            background: "#3498db",
            color: "#fff",
            border: "none",
            borderRadius: "10px",
            cursor: "pointer",
            transition: "all 0.3s ease",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.transform = "scale(1.05)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.transform = "scale(1)")
          }
        >
          ⬅ Back to Overview
        </button>
      </div>
    </div>
  );
}

export default AdminDashboard;