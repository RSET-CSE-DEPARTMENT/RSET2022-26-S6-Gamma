import React, { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import "./Login.css";
import { ENABLE_COLLEGE_ADMIN } from "../config/featureFlags";

const API_BASE = process.env.REACT_APP_PHP_API_BASE || "http://localhost/JobNexus/Backend-PHP/api";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("candidate");
  const [isLogin, setIsLogin] = useState(true);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  React.useEffect(() => {
    const loggedIn = localStorage.getItem("loggedIn") === "true";
    const userRole = localStorage.getItem("userRole");

    if (loggedIn && userRole) {
      switch (userRole) {
        case "candidate":
          navigate("/candidates", { replace: true });
          break;
        case "recruiter":
          navigate("/recruiters", { replace: true });
          break;
        case "admin":
          navigate(ENABLE_COLLEGE_ADMIN ? "/collegeadmins" : "/home", { replace: true });
          break;
        case "database_admin":
          navigate("/database-admin", { replace: true });
          break;
        default:
          break;
      }
    }
  }, [navigate]);

  React.useEffect(() => {
    if (location.state?.role) {
      setRole(location.state.role);
    }
  }, [location]);

  React.useEffect(() => {
    if (!isLogin && role === "database_admin") {
      setRole("admin");
    }
  }, [isLogin, role]);

  React.useEffect(() => {
    if (!ENABLE_COLLEGE_ADMIN && role === "admin") {
      setRole("candidate");
    }
  }, [role]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const endpoint = isLogin ? "login" : "register";
      const url = `${API_BASE}/${endpoint}.php`;

      const payload = isLogin
        ? { email, password, role }
        : { email, password, role, firstName, lastName, companyName };

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const raw = await response.text();
      const sanitized = raw.replace(/^\uFEFF/, "");
      let data;
      try {
        data = JSON.parse(sanitized);
      } catch {
        throw new Error(sanitized || "Invalid response from server");
      }

      if (data.success) {
        localStorage.setItem("loggedIn", "true");
        localStorage.setItem("user", JSON.stringify(data.user));
        localStorage.setItem("token", data.token);
        localStorage.setItem("userRole", data.user.role);

        switch (data.user.role) {
          case "candidate":
            navigate("/candidates");
            break;
          case "recruiter":
            navigate("/recruiters");
            break;
          case "admin":
            navigate(ENABLE_COLLEGE_ADMIN ? "/collegeadmins" : "/home");
            break;
          case "database_admin":
            navigate("/database-admin");
            break;
          default:
            navigate("/");
        }
      } else {
        alert(data.message || "Authentication failed");
      }
    } catch (error) {
      console.error("Login error:", error);
      alert(error.message || "Unable to connect to server. Make sure XAMPP is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page-compact">
      <div className="back-home">
        <Link to="/home" className="back-link">Back to Home</Link>
      </div>

      <div className="login-container-compact">
        <div className="brand-compact">
          <h1 className="logo-compact">
            <span className="logo-gradient">Job</span>Nexus
          </h1>
          <p className="tagline-compact">
            {isLogin ? "Welcome back! Sign in to continue" : "Join our community today"}
          </p>
        </div>

        <div className="form-card-compact">
          <div className="form-header-compact">
            <h2>{isLogin ? "Sign In" : "Create Account"}</h2>
            <button
              type="button"
              className="toggle-form-btn"
              onClick={() => setIsLogin(!isLogin)}
            >
              {isLogin ? "Need an account? Sign up" : "Have an account? Sign in"}
            </button>
          </div>

          {(!isLogin || role !== "database_admin") && (
            <div className="role-selection-compact inside-form">
              <div
                className="role-tabs-compact"
                style={{
                  gridTemplateColumns: ENABLE_COLLEGE_ADMIN ? "repeat(3, 1fr)" : "repeat(2, 1fr)"
                }}
              >
                <button
                  className={`role-tab-compact ${role === "candidate" ? "active" : ""}`}
                  onClick={() => setRole("candidate")}
                  type="button"
                >
                  Candidate
                </button>

                <button
                  className={`role-tab-compact ${role === "recruiter" ? "active" : ""}`}
                  onClick={() => setRole("recruiter")}
                  type="button"
                >
                  Recruiter
                </button>

                {ENABLE_COLLEGE_ADMIN && (
                  <button
                    className={`role-tab-compact ${role === "admin" ? "active" : ""}`}
                    onClick={() => setRole("admin")}
                    type="button"
                  >
                    Admin
                  </button>
                )}

              </div>

              <div className="role-description-compact">
                {role === "candidate" && "Find jobs, build your resume, and get AI-powered career guidance"}
                {role === "recruiter" && "Post jobs, find candidates, and streamline your hiring process"}
                {ENABLE_COLLEGE_ADMIN && role === "admin" && "Manage student placements and connect with recruiters"}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="form-compact">
            {!isLogin && (
              <div className="name-fields-compact">
                <div className="form-group-compact">
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="First name"
                    required
                  />
                </div>

                <div className="form-group-compact">
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Last name"
                    required
                  />
                </div>
              </div>
            )}

            {!isLogin && role === "recruiter" && (
              <div className="form-group-compact">
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Company name"
                  required
                />
              </div>
            )}

            <div className="form-group-compact">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                required
              />
            </div>

            <div className="form-group-compact">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                minLength="6"
                required
              />
              {!isLogin && (
                <p className="password-hint-compact">
                  Must be at least 6 characters
                </p>
              )}
            </div>

            {isLogin && (
              <div className="forgot-password-compact">
                <Link to="/forgot-password" className="forgot-link-compact">
                  Forgot password?
                </Link>
              </div>
            )}

            <button
              type="submit"
              className="submit-btn-compact"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner-compact"></span>
                  {isLogin ? "Signing in..." : "Creating account..."}
                </>
              ) : (
                isLogin ? "Sign In" : "Create Account"
              )}
            </button>

            {isLogin && (
              <button
                type="button"
                className={`database-admin-link-compact ${role === "database_admin" ? "active" : ""}`}
                onClick={() => setRole(role === "database_admin" ? "candidate" : "database_admin")}
              >
                {role === "database_admin" ? "Back to regular sign in" : "Database Admin Sign In"}
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
