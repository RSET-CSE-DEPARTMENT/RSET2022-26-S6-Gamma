import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getNotesBySubject } from "../api";

const subjects = [
  { code: "CD", name: "Compiler Design" },
  { code: "COA", name: "Computer Organization & Architecture" },
  { code: "DBMS", name: "Database Management System" },
  { code: "OS", name: "Operating Systems" },
  { code: "PY", name: "Python" },
];

function AdminOverview() {
  const [allNotes, setAllNotes] = useState({});
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAllNotes = async () => {
      const notesData = {};

      for (let subject of subjects) {
        try {
          const res = await getNotesBySubject(subject.code);
          notesData[subject.code] = res?.notes || [];
        } catch (error) {
          notesData[subject.code] = [];
        }
      }

      setAllNotes(notesData);
      setLoading(false);
    };

    fetchAllNotes();
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #4facfe, #2c3e50)",
        padding: "40px",
        animation: "fadeIn 0.6s ease-in-out",
      }}
    >
      {/* Fade Animation */}
      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}
      </style>

      <div
        style={{
          maxWidth: "1100px",
          margin: "auto",
          background: "#fff",
          borderRadius: "20px",
          padding: "40px",
          boxShadow: "0 15px 40px rgba(0,0,0,0.15)",
          transition: "all 0.4s ease",
        }}
      >
        <h1
          style={{
            textAlign: "center",
            marginBottom: "40px",
            fontWeight: "600",
          }}
        >
          📊 Admin Dashboard 
        </h1>

        {/* TOP ACTION BUTTONS */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "20px",
            marginBottom: "50px",
          }}
        >
          {/* Upload/Edit Button */}
          <button
            onClick={() => navigate("/admin")}
            style={{
              padding: "14px 30px",
              fontSize: "15px",
              background: "#2ecc71",
              color: "#fff",
              border: "none",
              borderRadius: "12px",
              cursor: "pointer",
              transition: "all 0.3s ease",
              boxShadow: "0 6px 18px rgba(0,0,0,0.1)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "scale(1.07)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "scale(1)";
            }}
          >
            ⚙ Upload / Edit Notes
          </button>

          {/* Back to Home Button */}
          <button
            onClick={() => navigate("/")}
            style={{
              padding: "14px 30px",
              fontSize: "15px",
              background: "#3498db",
              color: "#fff",
              border: "none",
              borderRadius: "12px",
              cursor: "pointer",
              transition: "all 0.3s ease",
              boxShadow: "0 6px 18px rgba(0,0,0,0.1)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "scale(1.07)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "scale(1)";
            }}
          >
            ⬅ Back to Home
          </button>
        </div>

        {/* SUBJECT SECTIONS */}
        {loading ? (
          <p style={{ textAlign: "center", color: "#777" }}>
            Loading notes...
          </p>
        ) : (
          subjects.map((subject) => {
            const subjectNotes = allNotes[subject.code] || [];

            return (
              <div key={subject.code} style={{ marginBottom: "50px" }}>
                <h2
                  style={{
                    marginBottom: "20px",
                    color: "#2c3e50",
                    borderBottom: "2px solid #eee",
                    paddingBottom: "8px",
                  }}
                >
                  📘 {subject.name}
                </h2>

                {subjectNotes.length === 0 ? (
                  <p style={{ color: "#777" }}>No notes uploaded.</p>
                ) : (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fill, minmax(180px, 1fr))",
                      gap: "20px",
                    }}
                  >
                    {subjectNotes.map((note, index) => (
                      <a
                        key={index}
                        href={note.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          textDecoration: "none",
                          background: "#f4f6f9",
                          padding: "20px",
                          borderRadius: "14px",
                          textAlign: "center",
                          fontSize: "14px",
                          fontWeight: "500",
                          color: "#34495e",
                          boxShadow:
                            "0 4px 12px rgba(0,0,0,0.05)",
                          transition: "all 0.3s ease",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform =
                            "translateY(-6px)";
                          e.currentTarget.style.boxShadow =
                            "0 10px 25px rgba(0,0,0,0.15)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform =
                            "translateY(0)";
                          e.currentTarget.style.boxShadow =
                            "0 4px 12px rgba(0,0,0,0.05)";
                        }}
                      >
                        📄 {note.title}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default AdminOverview;