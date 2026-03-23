import React, { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";
import { useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

function AdminLoginPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAdminLogin = async () => {
    if (!email || !password) {
      setError("Please enter email and password.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const result = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

      const user = result.user;

      const userDoc = await getDoc(doc(db, "users", user.uid));

      if (!userDoc.exists() || userDoc.data().role !== "admin") {
        setError("You are not authorized to access the admin portal.");
        setLoading(false);
        return;
      }

      navigate("/admin-dashboard");

    } catch (err) {
      setError("Invalid email or password.");
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      handleAdminLogin();
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #43cea2, #185a9d)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "20px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "420px",
          background: "#ffffff",
          borderRadius: "28px",
          padding: "50px 40px",
          boxShadow: "0 20px 45px rgba(0,0,0,0.18)",
          textAlign: "center",
        }}
      >
        {/* Heading */}
        <h1
          style={{
            fontSize: "28px",
            fontWeight: "600",
            marginBottom: "8px",
            letterSpacing: "0.5px"
          }}
        >
          Admin Portal
        </h1>

        <p
          style={{
            fontSize: "14px",
            color: "#666",
            marginBottom: "35px"
          }}
        >
          Secure access for content management
        </p>

        {/* Email */}
        <input
          type="email"
          placeholder="Admin Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={handleKeyDown}
          style={{
            width: "100%",
            padding: "14px",
            marginBottom: "18px",
            borderRadius: "14px",
            border: "1px solid #e0e0e0",
            fontSize: "14px",
            outline: "none"
          }}
        />

        {/* Password */}
        <div style={{ position: "relative", marginBottom: "25px" }}>
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={handleKeyDown}
            style={{
              width: "100%",
              padding: "14px",
              paddingRight: "45px",
              borderRadius: "14px",
              border: "1px solid #e0e0e0",
              fontSize: "14px",
              outline: "none"
            }}
          />

          {/* Eye Icon (SVG, not emoji) */}
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            style={{
              position: "absolute",
              right: "14px",
              top: "50%",
              transform: "translateY(-50%)",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0
            }}
          >
            {showPassword ? (
              <svg width="20" height="20" fill="#555" viewBox="0 0 24 24">
                <path d="M12 6c-5 0-9 6-9 6s4 6 9 6 9-6 9-6-4-6-9-6zm0 10a4 4 0 110-8 4 4 0 010 8z"/>
              </svg>
            ) : (
              <svg width="20" height="20" fill="#555" viewBox="0 0 24 24">
                <path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6S2 12 2 12zm10 4a4 4 0 100-8 4 4 0 000 8z"/>
              </svg>
            )}
          </button>
        </div>

        {/* Button */}
        <button
          onClick={handleAdminLogin}
          disabled={loading}
          style={{
            width: "100%",
            padding: "14px",
            background: "#185a9d",
            color: "#fff",
            border: "none",
            borderRadius: "14px",
            fontSize: "15px",
            fontWeight: "600",
            cursor: "pointer",
            opacity: loading ? 0.7 : 1,
            transition: "0.2s ease"
          }}
        >
          {loading ? "Signing in..." : "Access Admin Dashboard"}
        </button>

        {error && (
          <p
            style={{
              color: "#e53935",
              marginTop: "18px",
              fontSize: "13px"
            }}
          >
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

export default AdminLoginPage;
