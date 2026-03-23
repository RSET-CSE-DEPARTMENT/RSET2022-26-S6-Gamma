import React from "react";
import { useNavigate } from "react-router-dom";
import ProfileIcon from "./ProfileIcon";
import "./Home.css";
import { ENABLE_COLLEGE_ADMIN } from "../config/featureFlags";

export default function Home() {
  const navigate = useNavigate();
  const loggedIn = localStorage.getItem("loggedIn") === "true";
  const userRole = localStorage.getItem("userRole");

  const handleRoleBasedNavigation = (role) => {
    if (loggedIn) {
      if (userRole === role) {
        switch (role) {
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
            break;
        }
      } else {
        alert(`You are currently logged in as a ${userRole}. Please logout to access ${role} features.`);
      }
    } else {
      navigate("/login", { state: { role } });
    }
  };

  return (
    <>
      <header style={{ position: "relative" }}>
        <div style={{ 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center",
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "0 2rem"
        }}>
          <div>
            <h1>Job Nexus</h1>
            <p>Connecting Candidates, Recruiters, and College Admins for Smarter Careers</p>
          </div>
          
          {loggedIn && (
            <div className="profile-icon-wrapper">
              <ProfileIcon />
            </div>
          )}
        </div>
      </header>

      <main className="container">
        <div className="card-row">
          <div className="card">
            <span className="role-badge candidate">Candidate</span>
            <h2>Career Analysis</h2>
            <ul>
              <li>Upload or build your resume with smart recommendations</li>
              <li>Get detailed feedback and improvement tips</li>
              <li>See skill gaps and possible career paths</li>
              <li>One-click job applications & match score view</li>
              <li>Personalized course recommendations</li>
            </ul>
            <button 
              className="btn" 
              onClick={() => handleRoleBasedNavigation("candidate")}
            >
              {loggedIn && userRole === "candidate" 
                ? "Go to Dashboard" 
                : loggedIn 
                  ? "Switch to Candidate" 
                  : "Explore as Candidate"
              }
            </button>
          </div>

          <div className="card">
            <span className="role-badge recruiter">Recruiter</span>
            <h2>Smart Hiring</h2>
            <ul>
              <li>Upload & enhance job descriptions with AI</li>
              <li>Post jobs and connect with college admins</li>
              <li>Bulk resume analysis, ranking, and shortlisting</li>
              <li>Direct communication with matched candidates</li>
            </ul>
            <button 
              className="btn recruiter" 
              onClick={() => handleRoleBasedNavigation("recruiter")}
            >
              {loggedIn && userRole === "recruiter" 
                ? "Go to Dashboard" 
                : loggedIn 
                  ? "Switch to Recruiter" 
                  : "Join as Recruiter"
              }
            </button>
          </div>

          {ENABLE_COLLEGE_ADMIN && (
            <div className="card">
              <span className="role-badge admin">College Admin</span>
              <h2>Campus Connect</h2>
              <ul>
                <li>Bulk upload student resumes</li>
                <li>Match requirement of recruiters</li>
                <li>Track application and hiring status</li>
                <li>Build bridges between talent & opportunity</li>
              </ul>
              <button 
                className="btn admin" 
                onClick={() => handleRoleBasedNavigation("admin")}
              >
                {loggedIn && userRole === "admin" 
                  ? "Go to Dashboard" 
                  : loggedIn 
                    ? "Switch to Admin" 
                    : "Onboard as Admin"
                }
              </button>
            </div>
          )}
        </div>

        {loggedIn && (
          <div className="user-status-card" style={{
            marginTop: "2rem",
            padding: "1.5rem",
            background: "#ffffff",
            border: "1px solid #4A70A9",
            borderRadius: "12px",
            textAlign: "center"
          }}>
            <p style={{ margin: 0, color: "#4A70A9", fontWeight: "500" }}>
              Welcome back! You are logged in as a <strong>{userRole}</strong>.
              {userRole === "candidate" && " Explore job opportunities and enhance your career."}
              {userRole === "recruiter" && " Find the perfect candidates for your organization."}
              {userRole === "admin" && (
                ENABLE_COLLEGE_ADMIN
                  ? " Manage student placements and connect with recruiters."
                  : " College Admin dashboard is temporarily hidden."
              )}
              {userRole === "database_admin" && " Manage system-wide and database-level controls."}
            </p>
            <div style={{ marginTop: "1rem", display: "flex", gap: "10px", justifyContent: "center" }}>
              <button 
                onClick={() => navigate("/profile")}
                style={{
                  padding: "0.5rem 1rem",
                  background: "transparent",
                  border: "1px solid #4A70A9",
                  color: "#4A70A9",
                  borderRadius: "6px",
                  cursor: "pointer"
                }}
              >
                View Profile
              </button>
              <button 
                onClick={() => {
                  localStorage.clear();
                  navigate("/login");
                  window.location.reload();
                }}
                style={{
                  padding: "0.5rem 1rem",
                  background: "#ffffff",
                  border: "1px solid #4A70A9",
                  color: "#4A70A9",
                  borderRadius: "6px",
                  cursor: "pointer"
                }}
              >
                Logout
              </button>
            </div>
          </div>
        )}

        {!loggedIn && (
          <div className="login-prompt" style={{
            marginTop: "3rem",
            textAlign: "center",
            padding: "2rem",
            background: "#ffffff",
            borderRadius: "12px",
            border: "1px solid #4A70A9"
          }}>
            <h3 style={{ marginBottom: "1rem", color: "#1e293b" }}>Ready to Get Started?</h3>
            <p style={{ marginBottom: "1.5rem", color: "#4A70A9" }}>
              Join thousands of candidates, recruiters, and college admins who are transforming careers and hiring.
            </p>
            <button 
              onClick={() => navigate("/login")}
              style={{
                padding: "0.75rem 2rem",
                background: "#4A70A9",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontSize: "1rem",
                fontWeight: "600",
                cursor: "pointer",
                transition: "all 0.3s ease"
              }}
              onMouseOver={(e) => e.target.style.background = "#4A70A9"}
              onMouseOut={(e) => e.target.style.background = "#4A70A9"}
            >
              Sign In / Create Account
            </button>
          </div>
        )}
      </main>

      <footer>&copy; 2025 Job Nexus - Built for careers, powered by you!</footer>
    </>
  );
}


