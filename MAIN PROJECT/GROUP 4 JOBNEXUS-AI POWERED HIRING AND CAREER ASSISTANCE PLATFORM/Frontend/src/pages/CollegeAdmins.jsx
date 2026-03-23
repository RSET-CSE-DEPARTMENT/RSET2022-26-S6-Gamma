import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import ProfileIcon from "./ProfileIcon";
import "./CollegeAdmins.css";

const API_BASE = process.env.REACT_APP_PHP_API_BASE || "http://localhost/JobNexus/Backend-PHP/api";
const TAB_OPTIONS = [
  { value: "overview", label: "Overview" },
  { value: "students", label: "Students" },
  { value: "applications", label: "Applications" },
  { value: "recruiters", label: "Recruiters" },
  { value: "announcements", label: "Announcements" },
  { value: "reports", label: "Reports" },
  { value: "audit", label: "Audit" }
];

function toCsv(rows) {
  if (!rows || rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const escapeCell = (value) => {
    const s = String(value ?? "");
    if (s.includes(",") || s.includes("\"") || s.includes("\n")) {
      return `"${s.replace(/"/g, "\"\"")}"`;
    }
    return s;
  };
  const lines = [headers.join(",")];
  rows.forEach((row) => {
    lines.push(headers.map((h) => escapeCell(row[h])).join(","));
  });
  return lines.join("\n");
}

function downloadCsv(filename, rows) {
  const csv = toCsv(rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function CollegeAdmins() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token") || "";
  const userRaw = localStorage.getItem("user");
  const user = userRaw ? JSON.parse(userRaw) : null;

  const [tab, setTab] = useState("overview");
  const [loading, setLoading] = useState(false);
  const [metrics, setMetrics] = useState(null);
  const [statusStats, setStatusStats] = useState({});
  const [recentJobs, setRecentJobs] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [recruiters, setRecruiters] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);

  const [candidateFilters, setCandidateFilters] = useState({
    search: "",
    skill: "",
    location: "",
    minExperience: "",
    hasResume: "",
  });

  const [appFilters, setAppFilters] = useState({
    status: "",
    jobId: "",
    candidateId: "",
    recruiterId: "",
  });

  const [announcement, setAnnouncement] = useState({
    target: "all_candidates",
    message: "",
  });

  const [resumeUpload, setResumeUpload] = useState({
    candidateId: "",
    displayName: "",
    file: null,
  });

  const callAdminApi = useCallback(async (payload) => {
    const response = await fetch(`${API_BASE}/college-admin-control.php`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const raw = await response.text();
    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      throw new Error(raw || "Invalid response");
    }

    if (!data.success) {
      throw new Error(data.message || "Request failed");
    }
    return data;
  }, [token]);

  const loadOverview = useCallback(async () => {
    const data = await callAdminApi({ action: "dashboard_metrics" });
    setMetrics(data.metrics || null);
    setStatusStats(data.application_status || {});
    setRecentJobs(data.recent_jobs || []);
  }, [callAdminApi]);

  const loadCandidates = useCallback(async () => {
    const payload = {
      action: "list_candidates",
      ...candidateFilters,
      hasResume:
        candidateFilters.hasResume === ""
          ? undefined
          : candidateFilters.hasResume === "true",
    };
    const data = await callAdminApi(payload);
    setCandidates(data.candidates || []);
  }, [callAdminApi, candidateFilters]);

  const loadRecruiters = useCallback(async () => {
    const data = await callAdminApi({ action: "list_recruiters" });
    setRecruiters(data.recruiters || []);
  }, [callAdminApi]);

  const loadJobs = useCallback(async () => {
    const data = await callAdminApi({ action: "list_jobs" });
    setJobs(data.jobs || []);
  }, [callAdminApi]);

  const loadApplications = useCallback(async () => {
    const payload = {
      action: "list_applications",
      ...appFilters,
    };
    const data = await callAdminApi(payload);
    setApplications(data.applications || []);
  }, [callAdminApi, appFilters]);

  const loadAuditLogs = useCallback(async () => {
    const data = await callAdminApi({ action: "list_audit_logs", limit: 80 });
    setAuditLogs(data.logs || []);
  }, [callAdminApi]);

  useEffect(() => {
    const loadInitial = async () => {
      setLoading(true);
      try {
        await Promise.all([loadOverview(), loadRecruiters(), loadJobs(), loadApplications(), loadAuditLogs()]);
      } catch (error) {
        alert(error.message);
      } finally {
        setLoading(false);
      }
    };
    loadInitial();
  }, [loadOverview, loadRecruiters, loadJobs, loadApplications, loadAuditLogs]);

  useEffect(() => {
    if (tab === "students") {
      loadCandidates().catch((e) => alert(e.message));
    }
  }, [tab, loadCandidates]);

  const statusOptions = useMemo(
    () => ["pending", "reviewed", "shortlisted", "rejected"],
    []
  );

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  const handleApplicationStatusChange = async (applicationId, status) => {
    try {
      await callAdminApi({
        action: "update_application_status",
        applicationId,
        status,
      });
      await loadApplications();
      await loadOverview();
      alert("Application status updated");
    } catch (error) {
      alert(error.message);
    }
  };

  const handleSendAnnouncement = async (e) => {
    e.preventDefault();
    if (!announcement.message.trim()) {
      alert("Message is required");
      return;
    }
    try {
      const data = await callAdminApi({
        action: "send_announcement",
        target: announcement.target,
        message: announcement.message.trim(),
      });
      alert(`Announcement sent to ${data.recipientCount} users`);
      setAnnouncement((prev) => ({ ...prev, message: "" }));
    } catch (error) {
      alert(error.message);
    }
  };

  const handleResumeUpload = async (e) => {
    e.preventDefault();
    if (!resumeUpload.candidateId || !resumeUpload.file) {
      alert("Candidate ID and file are required");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("candidate_id", resumeUpload.candidateId);
      formData.append("display_name", resumeUpload.displayName);
      formData.append("resume", resumeUpload.file);

      const res = await fetch(`${API_BASE}/college-admin-upload-resume.php`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });
      const text = await res.text();
      const data = JSON.parse(text);
      if (!data.success) throw new Error(data.message || "Upload failed");
      alert("Resume uploaded");
      setResumeUpload({ candidateId: "", displayName: "", file: null });
      await loadCandidates();
      await loadOverview();
    } catch (error) {
      alert(error.message);
    }
  };

  const handleExportCandidates = async () => {
    try {
      const data = await callAdminApi({ action: "report_candidates" });
      downloadCsv("candidates_report.csv", data.rows || []);
    } catch (error) {
      alert(error.message);
    }
  };

  const handleExportApplications = async () => {
    try {
      const data = await callAdminApi({ action: "report_applications" });
      downloadCsv("applications_report.csv", data.rows || []);
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <div className="college-admin-page">
      <header className="college-admin-header">
        <div className="college-admin-header-copy">
          <h1 className="dashboard-banner-title">College Admin Dashboard</h1>
          <p>Placement operations, student pipeline, recruiter coordination</p>
        </div>
        <div className="college-admin-header-actions">
          <select
            className="college-tab-select"
            value={tab}
            onChange={(e) => setTab(e.target.value)}
            aria-label="Select dashboard section"
          >
            {TAB_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <ProfileIcon />
          <button className="college-btn college-btn-danger" onClick={handleLogout}>Logout</button>
        </div>
      </header>

      {loading && <div className="college-admin-card">Loading dashboard data...</div>}

      {tab === "overview" && (
        <section className="college-admin-card">
          <h2>Placement Overview</h2>
          <div className="overview-grid">
            <div><strong>{metrics?.candidates ?? 0}</strong><span>Candidates</span></div>
            <div><strong>{metrics?.recruiters ?? 0}</strong><span>Recruiters</span></div>
            <div><strong>{metrics?.jobs ?? 0}</strong><span>Jobs</span></div>
            <div><strong>{metrics?.applications ?? 0}</strong><span>Applications</span></div>
            <div><strong>{metrics?.resumes_uploaded ?? 0}</strong><span>Resumes Uploaded</span></div>
          </div>
          <h3>Application Pipeline</h3>
          <div className="pipeline-grid">
            {statusOptions.map((s) => (
              <div key={s}><strong>{statusStats[s] ?? 0}</strong><span>{s}</span></div>
            ))}
          </div>
          <h3>Recent Jobs</h3>
          <ul className="simple-list">
            {recentJobs.map((j) => (
              <li key={j.id}>{j.title} - {j.company_name}</li>
            ))}
          </ul>
        </section>
      )}

      {tab === "students" && (
        <section className="college-admin-card">
          <h2>Student Profile and Resume Management</h2>
          <div className="form-grid">
            <input
              placeholder="Search name/email"
              value={candidateFilters.search}
              onChange={(e) => setCandidateFilters((p) => ({ ...p, search: e.target.value }))}
            />
            <input
              placeholder="Skill contains"
              value={candidateFilters.skill}
              onChange={(e) => setCandidateFilters((p) => ({ ...p, skill: e.target.value }))}
            />
            <input
              placeholder="Preferred location"
              value={candidateFilters.location}
              onChange={(e) => setCandidateFilters((p) => ({ ...p, location: e.target.value }))}
            />
            <input
              placeholder="Min experience years"
              type="number"
              value={candidateFilters.minExperience}
              onChange={(e) => setCandidateFilters((p) => ({ ...p, minExperience: e.target.value }))}
            />
            <select
              value={candidateFilters.hasResume}
              onChange={(e) => setCandidateFilters((p) => ({ ...p, hasResume: e.target.value }))}
            >
              <option value="">Resume filter</option>
              <option value="true">Has resume</option>
              <option value="false">No resume</option>
            </select>
            <button className="college-btn" onClick={loadCandidates}>Apply Filters</button>
          </div>

          <h3>Bulk/Managed Resume Upload</h3>
          <form className="form-grid" onSubmit={handleResumeUpload}>
            <input
              placeholder="Candidate ID"
              value={resumeUpload.candidateId}
              onChange={(e) => setResumeUpload((p) => ({ ...p, candidateId: e.target.value }))}
              required
            />
            <input
              placeholder="Display name (optional)"
              value={resumeUpload.displayName}
              onChange={(e) => setResumeUpload((p) => ({ ...p, displayName: e.target.value }))}
            />
            <input
              type="file"
              accept=".pdf,.doc,.docx,.txt"
              onChange={(e) => setResumeUpload((p) => ({ ...p, file: e.target.files?.[0] || null }))}
              required
            />
            <button className="college-btn" type="submit">Upload Resume</button>
          </form>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Email</th>
                  <th>Name</th>
                  <th>Skills</th>
                  <th>Location</th>
                  <th>Exp</th>
                  <th>Resumes</th>
                  <th>Applications</th>
                </tr>
              </thead>
              <tbody>
                {candidates.map((c) => (
                  <tr key={c.candidate_id}>
                    <td>{c.candidate_id}</td>
                    <td>{c.email}</td>
                    <td>{`${c.first_name || ""} ${c.last_name || ""}`.trim()}</td>
                    <td>{c.skills || "-"}</td>
                    <td>{c.preferred_location || "-"}</td>
                    <td>{c.experience_years ?? 0}</td>
                    <td>{c.resume_count}</td>
                    <td>{c.application_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tab === "applications" && (
        <section className="college-admin-card">
          <h2>Pipeline Tracking and Shortlisting</h2>
          <div className="form-grid">
            <select value={appFilters.status} onChange={(e) => setAppFilters((p) => ({ ...p, status: e.target.value }))}>
              <option value="">All statuses</option>
              {statusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <input placeholder="Job ID" value={appFilters.jobId} onChange={(e) => setAppFilters((p) => ({ ...p, jobId: e.target.value }))} />
            <input placeholder="Candidate ID" value={appFilters.candidateId} onChange={(e) => setAppFilters((p) => ({ ...p, candidateId: e.target.value }))} />
            <input placeholder="Recruiter ID" value={appFilters.recruiterId} onChange={(e) => setAppFilters((p) => ({ ...p, recruiterId: e.target.value }))} />
            <button className="college-btn" onClick={loadApplications}>Refresh</button>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>App ID</th>
                  <th>Job</th>
                  <th>Candidate</th>
                  <th>Recruiter</th>
                  <th>Company</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {applications.map((a) => (
                  <tr key={a.application_id}>
                    <td>{a.application_id}</td>
                    <td>{a.job_title}</td>
                    <td>{a.candidate_email}</td>
                    <td>{a.recruiter_email}</td>
                    <td>{a.company_name}</td>
                    <td>{a.status}</td>
                    <td>
                      <select
                        defaultValue={a.status}
                        onChange={(e) => handleApplicationStatusChange(a.application_id, e.target.value)}
                      >
                        {statusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tab === "recruiters" && (
        <section className="college-admin-card">
          <h2>Recruiter Coordination</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Email</th>
                  <th>Company</th>
                  <th>Industry</th>
                  <th>Jobs</th>
                  <th>Applications</th>
                </tr>
              </thead>
              <tbody>
                {recruiters.map((r) => (
                  <tr key={r.recruiter_id}>
                    <td>{r.recruiter_id}</td>
                    <td>{r.email}</td>
                    <td>{r.company_name || "-"}</td>
                    <td>{r.industry || "-"}</td>
                    <td>{r.job_count}</td>
                    <td>{r.application_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <h3>Open Jobs</h3>
          <ul className="simple-list">
            {jobs.slice(0, 20).map((j) => (
              <li key={j.id}>
                #{j.id} {j.title} - {j.company_name} ({j.application_count} applications)
              </li>
            ))}
          </ul>
        </section>
      )}

      {tab === "announcements" && (
        <section className="college-admin-card">
          <h2>Announcements and Notifications</h2>
          <form className="announcement-form" onSubmit={handleSendAnnouncement}>
            <select
              value={announcement.target}
              onChange={(e) => setAnnouncement((p) => ({ ...p, target: e.target.value }))}
            >
              <option value="all_candidates">All candidates</option>
              <option value="all_recruiters">All recruiters</option>
              <option value="all_users">All users</option>
            </select>
            <textarea
              rows={6}
              placeholder="Write campus placement announcement..."
              value={announcement.message}
              onChange={(e) => setAnnouncement((p) => ({ ...p, message: e.target.value }))}
            />
            <button className="college-btn" type="submit">Send Announcement</button>
          </form>
        </section>
      )}

      {tab === "reports" && (
        <section className="college-admin-card">
          <h2>Reports and Export</h2>
          <div className="report-actions">
            <button className="college-btn" onClick={handleExportCandidates}>Export Candidates CSV</button>
            <button className="college-btn" onClick={handleExportApplications}>Export Applications CSV</button>
          </div>
        </section>
      )}

      {tab === "audit" && (
        <section className="college-admin-card">
          <h2>Compliance and Audit Logs</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Admin</th>
                  <th>Action</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log) => (
                  <tr key={log.id}>
                    <td>{log.created_at}</td>
                    <td>{log.admin_email || log.admin_user_id}</td>
                    <td>{log.action}</td>
                    <td>{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <footer className="college-admin-footer">
        Logged in as: {user?.email || "admin"}
      </footer>
    </div>
  );
}

