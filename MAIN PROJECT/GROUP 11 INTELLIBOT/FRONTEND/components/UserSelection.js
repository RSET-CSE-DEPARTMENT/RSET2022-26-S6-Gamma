import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import "@fontsource/orbitron";

function UserSelection() {
  const navigate = useNavigate();

  const handleSelect = (role) => {
  if (role === "admin") {
    navigate("/admin-login");
  } else {
    navigate("/login", { state: { role: "student" } });
  }
};



  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #6a7cff, #7f5bb3)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "20px",
        color: "white",
        textAlign: "center",
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        style={{
          maxWidth: "720px",
          width: "100%",
          padding: "60px 55px",
          borderRadius: "32px",
          background: "rgba(255, 255, 255, 0.18)",
          backdropFilter: "blur(18px)",
          boxShadow: "0 30px 70px rgba(0,0,0,0.3)",
        }}
      >
        {/* TITLE */}
        <motion.h1
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.8 }}
          style={{
            fontFamily: "'Orbitron', sans-serif",
            fontSize: "3.8rem",
            letterSpacing: "4px",
            marginBottom: "15px",
            textShadow: "0 0 25px rgba(255,255,255,0.4)",
          }}
        >
          IntelliBot
        </motion.h1>

        {/* DESCRIPTION */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35, duration: 0.8 }}
          style={{
            fontSize: "1.3rem",
            maxWidth: "580px",
            margin: "0 auto 20px auto",
            lineHeight: "1.7",
            color: "#f3f3f3",
          }}
        >
          Your intelligent learning companion designed to enhance 
          understanding, exploration, and effective studying.
        </motion.p>

        {/* INSTRUCTION */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.8 }}
          style={{
            fontSize: "1rem",
            marginBottom: "25px",
            color: "#e0e0e0",
            letterSpacing: "0.5px",
          }}
        >
          Please select how you would like to continue
        </motion.p>

        {/* SUBTLE DIVIDER */}
        <div
          style={{
            width: "100px",
            height: "4px",
            margin: "0 auto 30px auto",
            borderRadius: "10px",
            background: "linear-gradient(to right, #ffffff, #dcdcdc)",
            opacity: 0.6,
          }}
        />

        {/* BUTTONS */}
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65, duration: 0.8 }}
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "45px",
            flexWrap: "wrap",
          }}
        >
          <button
            onClick={() => handleSelect("admin")}
            style={{
              background: "linear-gradient(135deg, #2ecc71, #27ae60)",
              color: "white",
              padding: "15px 40px",
              borderRadius: "18px",
              fontSize: "1.5rem",
              boxShadow: "0 12px 30px rgba(0,0,0,0.35)",
              transition: "all 0.3s ease",
            }}
            onMouseOver={(e) =>
              (e.currentTarget.style.transform = "translateY(-6px)")
            }
            onMouseOut={(e) =>
              (e.currentTarget.style.transform = "translateY(0)")
            }
          >
            👨‍💼 Admin
          </button>

          <button
            onClick={() => handleSelect("student")}
            style={{
              background: "linear-gradient(135deg, #3498db, #2980b9)",
              color: "white",
              padding: "15px 40px",
              borderRadius: "18px",
              fontSize: "1.4rem",
              boxShadow: "0 12px 30px rgba(0,0,0,0.35)",
              transition: "all 0.3s ease",
            }}
            onMouseOver={(e) =>
              (e.currentTarget.style.transform = "translateY(-6px)")
            }
            onMouseOut={(e) =>
              (e.currentTarget.style.transform = "translateY(0)")
            }
          >
            🎓 Student
          </button>
        </motion.div>
      </motion.div>
    </div>
  );
}

export default UserSelection;
