import React, { useState, useEffect } from "react";
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "../firebase";
import { useNavigate, useLocation } from "react-router-dom";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../firebase";

function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const role = location.state?.role;

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // 🚫 Prevent direct access without selecting role
  useEffect(() => {
    if (!role) {
      navigate("/");
    }
  }, [role, navigate]);

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setError("");

      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      // 🔹 Create user document if not exists
      await setDoc(
        doc(db, "users", user.uid),
        {
          email: user.email,
          name: user.displayName,
          role: role === "admin" ? "admin" : "student",
          createdAt: new Date()
        },
        { merge: true }
      );

      // 🔐 Role restriction
      if (role === "admin" && user.email === "admin1@gmail.com") {
        navigate("/admin");
      } else if (role === "student") {
        navigate("/student");
      } else {
        setError("You are not authorized for this role.");
      }

    } catch (err) {
      console.error(err);
      setError("Google sign-in failed.");
    }

    setLoading(false);
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
          background: "#fff",
          borderRadius: "28px",
          padding: "50px 40px",
          boxShadow: "0 12px 35px rgba(0,0,0,0.15)",
          textAlign: "center",
        }}
      >
        {/* Title */}
        <h1
          style={{
            fontSize: "28px",
            marginBottom: "10px",
          }}
        >
          🎓 IntelliBot
        </h1>

        <h2
          style={{
            fontSize: "18px",
            fontWeight: "500",
            color: "#666",
            marginBottom: "35px",
          }}
        >
          {role === "admin" ? "Admin Login" : "Student Login"}
        </h2>

        {/* Google Button */}
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          style={{
            width: "100%",
            padding: "14px",
            fontSize: "15px",
            fontWeight: "600",
            background: "#4285F4",
            color: "#fff",
            border: "none",
            borderRadius: "14px",
            cursor: "pointer",
            boxShadow: "0 6px 15px rgba(66,133,244,0.4)",
            transition: "0.2s ease",
            opacity: loading ? 0.7 : 1,
          }}
          onMouseOver={(e) =>
            (e.target.style.transform = "translateY(-2px)")
          }
          onMouseOut={(e) =>
            (e.target.style.transform = "translateY(0)")
          }
        >
          {loading ? "Signing in..." : "🔐 Sign in with Google"}
        </button>

        {/* Error Message */}
        {error && (
          <p
            style={{
              color: "red",
              marginTop: "20px",
              fontSize: "14px",
            }}
          >
            {error}
          </p>
        )}

        {/* Footer Text */}
        <p
          style={{
            marginTop: "30px",
            fontSize: "13px",
            color: "#999",
          }}
        >
          Secure authentication powered by Firebase
        </p>
      </div>
    </div>
  );
}

export default LoginPage;
