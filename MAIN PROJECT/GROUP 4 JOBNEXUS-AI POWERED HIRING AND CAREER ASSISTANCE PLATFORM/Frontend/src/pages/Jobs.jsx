import React from "react";
import { useNavigate } from "react-router-dom";
import { ENABLE_COLLEGE_ADMIN } from "../config/featureFlags";

export default function Jobs() {
  const navigate = useNavigate();

  return (
    <>
      <header><h1>Find Your Opportunity</h1></header>
      <nav>
        <a href="/" onClick={(e) => { e.preventDefault(); navigate("/"); }}>Home</a>
        <a href="/candidates" onClick={(e) => { e.preventDefault(); navigate("/candidates"); }}>Candidates</a>
        <a href="/recruiters" onClick={(e) => { e.preventDefault(); navigate("/recruiters"); }}>Recruiters</a>
        {ENABLE_COLLEGE_ADMIN && (
          <a href="/collegeadmins" onClick={(e) => { e.preventDefault(); navigate("/collegeadmins"); }}>College Admins</a>
        )}
        <a href="/jobs" onClick={(e) => { e.preventDefault(); navigate("/jobs"); }}>Jobs</a>
        <a href="/login" onClick={(e) => { e.preventDefault(); navigate("/login"); }}>Login</a>
      </nav>

      <main className="container">
        <section className="card">
          <h2>Job Listings</h2>
          <div>
            <h3>Software Engineer - ABC Corp</h3>
            <p>Location: Remote | Match Score: 92%</p>
            <button className="btn">Apply Now</button>
          </div>
          <div>
            <h3>Marketing Analyst - XYZ Inc</h3>
            <p>Location: Mumbai | Match Score: 77%</p>
            <button className="btn">Apply Now</button>
          </div>
        </section>
      </main>

      <footer>&copy; 2025 Job Nexus</footer>
    </>
  );
}
