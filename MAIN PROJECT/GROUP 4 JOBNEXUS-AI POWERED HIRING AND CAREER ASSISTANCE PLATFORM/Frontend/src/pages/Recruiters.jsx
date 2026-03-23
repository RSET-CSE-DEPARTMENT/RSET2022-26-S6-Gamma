import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import ProfileIcon from "./ProfileIcon";
import "./Recruiters.css";

const STATUS_OPTIONS = [
  { value: "applied", label: "Applied" },
  { value: "reviewed", label: "Reviewed" },
  { value: "interview_scheduled", label: "Interview Scheduled" },
  { value: "interviewed", label: "Interviewed" },
  { value: "pending", label: "Pending" },
  { value: "accepted", label: "Accepted" },
  { value: "rejected", label: "Rejected" }
];

const normalizeStatus = (rawStatus) => {
  const status = String(rawStatus || "pending").trim().toLowerCase().replace(/[\s-]+/g, "_");
  switch (status) {
    case "applied":
    case "reviewed":
    case "interview_scheduled":
    case "interviewed":
    case "pending":
    case "accepted":
    case "rejected":
      return status;
    case "shortlisted":
      return "reviewed";
    default:
      return "pending";
  }
};

const statusLabel = (status) =>
  STATUS_OPTIONS.find((s) => s.value === normalizeStatus(status))?.label || "Pending";

export default function Recruiters() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [requiredSkills, setRequiredSkills] = useState("");
  const [loading, setLoading] = useState(false);
  const [applications, setApplications] = useState([]);
  const [applicationsLoading, setApplicationsLoading] = useState(false);
  const [applicationsError, setApplicationsError] = useState("");
  const [selectedResume, setSelectedResume] = useState(null);
  const [resumeModalOpen, setResumeModalOpen] = useState(false);
  const [statusUpdates, setStatusUpdates] = useState({});
  const [feedbackUpdates, setFeedbackUpdates] = useState({});
  const [statusSaving, setStatusSaving] = useState({});

  const [selectedJobForRanking, setSelectedJobForRanking] = useState("");
  const [rankings, setRankings] = useState([]);
  const [rankingLoading, setRankingLoading] = useState(false);
  const [rankingError, setRankingError] = useState("");
  const [recruiterJobs, setRecruiterJobs] = useState([]);
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("all");
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState("");
  const [showNotificationsMenu, setShowNotificationsMenu] = useState(false);
  const notificationsMenuRef = useRef(null);

  const API_BASE = "http://localhost/JobNexus/Backend-PHP/api";
  const user = useMemo(() => JSON.parse(localStorage.getItem("user")), []);

  const fetchRecruiterJobs = async (recruiterId) => {
    try {
      const res = await fetch(`${API_BASE}/recruiter-jobs.php?recruiter_id=${recruiterId}`);
      const data = await res.json();
      if (data.success) {
        setRecruiterJobs(data.jobs || []);
      }
    } catch (err) {
      console.error("Error fetching jobs:", err);
    }
  };

  const fetchApplicants = async (recruiterId) => {
    setApplicationsLoading(true);
    setApplicationsError("");
    try {
      const res = await fetch(`${API_BASE}/get-applicants.php?recruiter_id=${recruiterId}`);
      const data = await res.json();
      if (data.success) {
        setApplications(data.applications || []);
        const initialStatuses = {};
        const initialFeedback = {};
        data.applications?.forEach((app) => {
          initialStatuses[app.application_id] = normalizeStatus(app.status);
          initialFeedback[app.application_id] = app.recruiter_feedback || "";
        });
        setStatusUpdates(initialStatuses);
        setFeedbackUpdates(initialFeedback);
      } else {
        setApplicationsError(data.message || "Failed to load applications");
      }
    } catch {
      setApplicationsError("Error loading applications");
    } finally {
      setApplicationsLoading(false);
    }
  };

  const fetchRecruiterNotifications = async (recruiterId) => {
    setNotificationsLoading(true);
    setNotificationsError("");
    try {
      const res = await fetch(`${API_BASE}/get-notifications.php?user_id=${recruiterId}&limit=50`);
      const data = await res.json();
      if (data.success) {
        setNotifications(data.notifications || []);
      } else {
        setNotificationsError(data.message || "Failed to load notifications");
      }
    } catch {
      setNotificationsError("Failed to load notifications");
    } finally {
      setNotificationsLoading(false);
    }
  };

  // Fetch applicants and recruiter's jobs
  useEffect(() => {
    if (!user || user.role !== "recruiter") {
      alert("Please login as recruiter");
      return;
    }
    fetchApplicants(user.id);
    fetchRecruiterJobs(user.id);
    fetchRecruiterNotifications(user.id);
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationsMenuRef.current && !notificationsMenuRef.current.contains(event.target)) {
        setShowNotificationsMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Post job
  const handlePostJob = async (e) => {
    e.preventDefault();
    if (!user || user.role !== "recruiter") {
      alert("Please login as recruiter");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/post-job.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          required_skills: requiredSkills,
          recruiter_id: user.id,
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert("Job posted successfully");
        setTitle("");
        setDescription("");
        setRequiredSkills("");
        await fetchRecruiterJobs(user.id);
      } else {
        alert(data.message || "Failed to post job");
      }
    } catch (error) {
      console.error(error);
      alert("Server error");
    } finally {
      setLoading(false);
    }
  };

  // View resume
  const handleViewResume = (application) => {
    if (!application.resume_filename) {
      alert("No resume available for this candidate");
      return;
    }

    setSelectedResume({
      application_id: application.application_id,
      filename: application.resume_filename,
      candidate_name: application.candidate_name || application.candidate_email,
      job_title: application.job_title,
    });
    setResumeModalOpen(true);
  };

  // Download resume
  const handleDownloadResume = (application) => {
    if (!application.resume_filename) {
      alert("No resume available for download");
      return;
    }

    const url = `${API_BASE}/download-resume.php?application_id=${application.application_id}&recruiter_id=${user.id}`;
    window.open(url, "_blank");
  };

  // Close resume modal
  const closeResumeModal = () => {
    setResumeModalOpen(false);
    setSelectedResume(null);
  };

  // Update local selected status
  const handleStatusChange = (applicationId, newStatus) => {
    setStatusUpdates((prev) => ({
      ...prev,
      [applicationId]: normalizeStatus(newStatus),
    }));
  };

  const handleFeedbackChange = (applicationId, feedbackText) => {
    setFeedbackUpdates((prev) => ({
      ...prev,
      [applicationId]: feedbackText,
    }));
  };

  // Save status + optional recruiter feedback
  const handleSaveStatus = async (application) => {
    const applicationId = application.application_id;
    const selectedStatus = normalizeStatus(
      statusUpdates[applicationId] || application.status || "pending"
    );
    const feedback = (feedbackUpdates[applicationId] || "").trim();

    setStatusSaving((prev) => ({ ...prev, [applicationId]: true }));
    try {
      const response = await fetch(`${API_BASE}/update-application-status.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          application_id: applicationId,
          status: selectedStatus,
          recruiter_id: user.id,
          feedback,
        }),
      });

      const data = await response.json();
      if (!data.success) {
        alert(data.message || "Failed to update status");
        return;
      }

      setApplications((prev) =>
        prev.map((app) =>
          app.application_id === applicationId
            ? {
                ...app,
                status: selectedStatus,
                recruiter_feedback: feedback,
              }
            : app
        )
      );
      setFeedbackUpdates((prev) => ({
        ...prev,
        [applicationId]: "",
      }));
    } catch (error) {
      console.error("Error updating status:", error);
      alert("Failed to update status");
    } finally {
      setStatusSaving((prev) => ({ ...prev, [applicationId]: false }));
    }
  };

  // Rank candidates
  const handleRankCandidates = async () => {
    if (!selectedJobForRanking) {
      setRankingError("Please select a job to rank candidates");
      return;
    }

    setRankingLoading(true);
    setRankingError("");

    try {
      const jobApplications = applications.filter(
        (app) => app.job_id?.toString() === selectedJobForRanking.toString()
      );

      if (jobApplications.length === 0) {
        setRankingError("No applications found for this job");
        setRankingLoading(false);
        return;
      }

      const response = await fetch(`${API_BASE}/rank-resumes.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_id: selectedJobForRanking,
          applications: jobApplications,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setRankings(data.rankings || []);
      } else {
        setRankingError(data.message || "Failed to rank resumes");
      }
    } catch (err) {
      console.error(err);
      setRankingError("Server error");
    } finally {
      setRankingLoading(false);
    }
  };

  // Get status badge class
  const getStatusClass = (status) => {
    switch (normalizeStatus(status)) {
      case "applied":
        return "status-applied";
      case "pending":
        return "status-pending";
      case "reviewed":
        return "status-reviewed";
      case "interview_scheduled":
        return "status-interview-scheduled";
      case "interviewed":
        return "status-interviewed";
      case "accepted":
        return "status-accepted";
      case "rejected":
        return "status-rejected";
      default:
        return "status-pending";
    }
  };

  // Get score badge style
  const getScoreBadge = (score) => {
    if (score >= 0.7) return { text: "Excellent Match", className: "score-excellent" };
    if (score >= 0.5) return { text: "Good Match", className: "score-good" };
    return { text: "Fair Match", className: "score-fair" };
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Download resume from rankings
  const downloadRankedResume = (filename) => {
    if (!filename) {
      alert("No resume available for download");
      return;
    }
    window.open(
      `${API_BASE}/download-resume.php?filename=${filename}&recruiter_id=${user.id}`,
      "_blank"
    );
  };

  const markNotificationRead = async (notificationId) => {
    if (!user?.id) return;
    try {
      await fetch(`${API_BASE}/mark-notification-read.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notification_id: notificationId,
          user_id: user.id,
        }),
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, is_read: 1 } : n))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const humanizeNotificationStatus = (status) => {
    const normalized = String(status || "").trim().toLowerCase();
    if (!normalized) return "updated";
    if (normalized === "interview_scheduled") return "scheduled for interview";
    return normalized.replace(/_/g, " ");
  };

  const openCandidateContact = (application) => {
    const email = application?.candidate_email || "";
    if (!email) {
      alert("Candidate email not available.");
      return;
    }

    const subject = encodeURIComponent(
      `Regarding your application: ${application.job_title || "Job Application"}`
    );
    const body = encodeURIComponent(
      `Hi ${application.candidate_name || "Candidate"},\n\nI am reaching out regarding your application.`
    );
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
      email
    )}&su=${subject}&body=${body}`;

    const popup = window.open(gmailUrl, "_blank", "noopener,noreferrer");
    if (!popup) {
      window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const filteredApplications = useMemo(() => {
    if (!selectedJobForRanking) return applications;
    return applications.filter(
      (app) => app.job_id?.toString() === selectedJobForRanking.toString()
    );
  }, [applications, selectedJobForRanking]);

  const groupedApplications = useMemo(() => {
    const groups = {};
    STATUS_OPTIONS.forEach((opt) => {
      groups[opt.value] = [];
    });

    filteredApplications.forEach((app) => {
      const status = normalizeStatus(app.status);
      if (!groups[status]) {
        groups[status] = [];
      }
      groups[status].push(app);
    });

    return groups;
  }, [filteredApplications]);

  const filteredByStatus = useMemo(() => {
    if (selectedStatusFilter === "all") return filteredApplications;
    return filteredApplications.filter(
      (app) => normalizeStatus(app.status) === selectedStatusFilter
    );
  }, [filteredApplications, selectedStatusFilter]);

  return (
    <>
      <header className="dashboard-header">
        <div className="dashboard-header-copy">
          <h1 className="dashboard-banner-title">Recruiter Dashboard</h1>
          <p className="dashboard-banner-subtitle">
            Manage job postings and review candidate applications
          </p>
        </div>
        <div className="dashboard-header-actions-row">
          <div ref={notificationsMenuRef} style={{ position: "relative" }}>
            <button
              type="button"
              onClick={() => setShowNotificationsMenu((prev) => !prev)}
              style={{
                position: "relative",
                padding: "8px 12px",
                borderRadius: "8px",
                border: "1px solid rgba(255,255,255,0.8)",
                backgroundColor: "transparent",
                color: "#ffffff",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "13px",
                fontWeight: "600",
                gap: "6px",
                cursor: "pointer"
              }}
              aria-label="Notifications"
            >
              Notifications
              {unreadCount > 0 && (
                <span style={{
                  position: "relative",
                  minWidth: "16px",
                  height: "16px",
                  borderRadius: "999px",
                  backgroundColor: "#ffffff",
                  color: "#4A70A9",
                  fontSize: "10px",
                  fontWeight: "700",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "0 4px"
                }}>
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>
            {showNotificationsMenu && (
              <div style={{
                position: "absolute",
                top: "46px",
                right: 0,
                width: "340px",
                maxHeight: "420px",
                overflowY: "auto",
                backgroundColor: "white",
                border: "1px solid #e5e7eb",
                borderRadius: "10px",
                boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
                zIndex: 60,
                padding: "10px"
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                  <div style={{ fontSize: "14px", fontWeight: "700", color: "#1f2937" }}>Notifications</div>
                  <div style={{ fontSize: "11px", color: "#6b7280" }}>{unreadCount} unread</div>
                </div>
                {notificationsLoading && (
                  <div style={{ color: "#6b7280", fontSize: "13px", padding: "8px 4px" }}>
                    Loading notifications...
                  </div>
                )}
                {!notificationsLoading && notificationsError && (
                  <div style={{ color: "#b91c1c", fontSize: "13px", padding: "8px 4px" }}>
                    {notificationsError}
                  </div>
                )}
                {!notificationsLoading && !notificationsError && notifications.length === 0 && (
                  <div style={{ color: "#6b7280", fontSize: "13px", padding: "8px 4px" }}>
                    No notifications yet.
                  </div>
                )}
                {!notificationsLoading && !notificationsError && notifications.map((n) => (
                  <div
                    key={n.id}
                    style={{
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                      padding: "10px",
                      marginBottom: "8px",
                      backgroundColor: n.is_read ? "#f9fafb" : "#eef2ff"
                    }}
                  >
                    <div style={{ fontSize: "13px", color: "#1f2937", fontWeight: 500 }}>
                      {n.message || `New application status: ${humanizeNotificationStatus(n.status)}`}
                    </div>
                    <div style={{ fontSize: "11px", color: "#6b7280", marginTop: "4px" }}>
                      {formatDate(n.created_at)}
                    </div>
                    {!n.is_read && (
                      <button
                        onClick={() => markNotificationRead(n.id)}
                        style={{
                          marginTop: "6px",
                          fontSize: "11px",
                          background: "transparent",
                          border: "none",
                          color: "#4A70A9",
                          cursor: "pointer",
                          padding: 0
                        }}
                      >
                        Mark as read
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          <ProfileIcon />
        </div>
      </header>

      <main className="recruiter-layout">
        <div className="top-row recruiter-top-row">
          {/* Left: Post Job Form */}
          <section className="card post-job-card">
            <h2>Post New Job</h2>

            <form onSubmit={handlePostJob} className="job-form">
              <label>
                <strong>Job Title</strong>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                placeholder="e.g., Senior Frontend Developer"
                className="job-input"
              />

              <label>
                <strong>Job Description</strong>
              </label>
              <textarea
                rows="6"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                placeholder="Describe the job responsibilities, requirements, and benefits..."
                className="job-textarea"
              ></textarea>

              <label>
                <strong>Required Skills (comma-separated)</strong>
              </label>
              <textarea
                rows="3"
                value={requiredSkills}
                onChange={(e) => setRequiredSkills(e.target.value)}
                required
                placeholder="e.g., python, sql, react, docker, aws"
                className="job-textarea"
              ></textarea>

              <div className="button-group">
                <button type="submit" disabled={loading} className="btn primary">
                  {loading ? "Posting..." : "Post Job"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTitle("");
                    setDescription("");
                    setRequiredSkills("");
                  }}
                  className="btn outline"
                >
                  Clear Form
                </button>
                <button
                  type="button"
                  className="btn secondary"
                  onClick={() => navigate("/recruiter-jobs")}
                >
                  View Posted Jobs
                </button>
              </div>
            </form>
          </section>

          {/* Center: Applied Candidates */}
          <section className="card applied-card">
            <h2>Applied Candidates</h2>

            <div className="section-block">
              <div className="section-title">Filters</div>
              <div className="filters-bar">
                <div className="filter-item">
                  <label className="toolbar-label">Job</label>
                  {recruiterJobs.length === 0 ? (
                    <div className="no-jobs">No jobs posted yet</div>
                  ) : (
                    <select
                      value={selectedJobForRanking}
                      onChange={(e) => {
                        setSelectedJobForRanking(e.target.value);
                        setRankings([]);
                        setRankingError("");
                      }}
                      className="job-selector"
                    >
                      <option value="">All jobs</option>
                      {recruiterJobs.map((job) => (
                        <option key={job.id} value={job.id}>
                          {job.title} ({job.company_name || "Company"}) - {new Date(job.created_at).toLocaleDateString()}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="filter-item">
                  <label className="toolbar-label">Status</label>
                  <select
                    value={selectedStatusFilter}
                    onChange={(e) => setSelectedStatusFilter(e.target.value)}
                    className="status-filter-select"
                  >
                    <option value="all">All</option>
                    {STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label} ({groupedApplications[opt.value]?.length || 0})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="filters-row">
                <div className="filter-item">
                  {selectedJobForRanking && (
                    <div className="selected-job-info">
                      <h4>
                        {recruiterJobs.find((j) => j.id.toString() === selectedJobForRanking.toString())?.title ||
                          "Selected Job"}
                      </h4>
                      <p>Applications: {filteredApplications.length} candidates</p>
                    </div>
                  )}
                </div>
                <div className="filter-item filter-metric">
                  <div className="toolbar-metric">
                    <span className="metric-value">{filteredApplications.length}</span>
                    <span className="metric-label">Candidates</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="section-block">
              <div className="section-title">Candidates</div>

              {applicationsLoading && (
                <div className="empty-state">
                  <p>Loading applications...</p>
                </div>
              )}

              {!applicationsLoading && applicationsError && (
                <div className="applications-error">{applicationsError}</div>
              )}

              {!applicationsLoading && !applicationsError && filteredApplications.length === 0 ? (
                <div className="empty-state">
                  <p>No applications found for the selected job.</p>
                  <p>Applications will appear here when candidates apply.</p>
                </div>
              ) : (
                <div className="applications-list">
                  {filteredByStatus.length ? (
                    filteredByStatus.map((app) => (
                      <div key={app.application_id} className="application-card">
                        <div className="application-header">
                          <div>
                            <div className="candidate-name">
                              {app.candidate_name || app.candidate_email || "Unknown Candidate"}
                            </div>
                            <span className={`application-status ${getStatusClass(app.status)}`}>
                              {statusLabel(app.status)}
                            </span>
                          </div>
                          <div className="application-date">{formatDate(app.applied_at)}</div>
                        </div>

                        <div className="application-details">
                          <div>
                            <strong>Email:</strong> {app.candidate_email || "N/A"}
                          </div>
                          <div>
                            <strong>Phone:</strong> {app.candidate_phone || "N/A"}
                          </div>
                          <div>
                            <strong>Job:</strong> {app.job_title || "N/A"}
                          </div>
                          <div>
                            <strong>Company:</strong> {app.company_name || "N/A"}
                          </div>
                        </div>

                        <div className="resume-section">
                          <strong>Resume:</strong>
                          {app.resume_filename ? (
                            <div className="resume-actions">
                              <button onClick={() => handleViewResume(app)} className="btn-resume btn-view">
                                View Resume
                              </button>
                              <button onClick={() => handleDownloadResume(app)} className="btn-resume btn-download">
                                Download
                              </button>
                            </div>
                          ) : (
                            <span className="no-resume"> No resume uploaded</span>
                          )}
                        </div>

                        <div className="portfolio-section">
                          <strong>Portfolio Links:</strong>
                          {app.portfolio_links && app.portfolio_links.length > 0 ? (
                            <div className="portfolio-links">
                              {app.portfolio_links.map((link, index) => (
                                <a
                                  key={`${app.application_id}-link-${index}`}
                                  href={link.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="portfolio-link"
                                >
                                  {link.label}
                                </a>
                              ))}
                            </div>
                          ) : (
                            <span className="no-resume"> No links found</span>
                          )}
                        </div>

                        <div className="status-row">
                          <label>
                            <strong>Update Status:</strong>
                          </label>
                          <select
                            value={normalizeStatus(statusUpdates[app.application_id] || app.status || "pending")}
                            onChange={(e) => handleStatusChange(app.application_id, e.target.value)}
                            className="status-selector"
                          >
                            {STATUS_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            className="btn primary"
                            disabled={!!statusSaving[app.application_id]}
                            onClick={() => handleSaveStatus(app)}
                          >
                            {statusSaving[app.application_id] ? "Saving..." : "Save Status"}
                          </button>
                        </div>
                        <div className="feedback-row">
                          <label htmlFor={`feedback-${app.application_id}`}>
                            <strong>Feedback (optional):</strong>
                          </label>
                          <textarea
                            id={`feedback-${app.application_id}`}
                            className="feedback-textarea"
                            rows="3"
                            placeholder="Share optional feedback for this status update..."
                            value={feedbackUpdates[app.application_id] ?? app.recruiter_feedback ?? ""}
                            onChange={(e) => handleFeedbackChange(app.application_id, e.target.value)}
                          />
                        </div>
                        <div className="contact-row">
                          <button
                            type="button"
                            className="btn secondary"
                            onClick={() => openCandidateContact(app)}
                          >
                            Contact Candidate
                          </button>
                          <button
                            type="button"
                            className="btn secondary"
                            onClick={() => window.open(`tel:${app.candidate_phone}`, "_self")}
                            disabled={!app.candidate_phone}
                          >
                            Call Candidate
                          </button>
                          <button
                            type="button"
                            className="btn outline"
                            onClick={async () => {
                              try {
                                await navigator.clipboard.writeText(app.candidate_email || "");
                                alert("Candidate email copied.");
                              } catch {
                                alert("Could not copy email.");
                              }
                            }}
                          >
                            Copy Email
                          </button>
                          <button
                            type="button"
                            className="btn outline"
                            disabled={!app.candidate_phone}
                            onClick={async () => {
                              if (!app.candidate_phone) return;
                              try {
                                await navigator.clipboard.writeText(app.candidate_phone);
                                alert("Candidate phone copied.");
                              } catch {
                                alert("Could not copy phone.");
                              }
                            }}
                          >
                            Copy Phone
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="status-empty">No candidates in this filter.</div>
                  )}
                </div>
              )}
            </div>
          </section>

          <section className="card recruiter-ranking-card">
            <h2>Ranking</h2>
            <div className="section-block">
              <h3>Rank Candidates by Match Score</h3>
              <p className="ranking-subtitle">Select a job and rank candidates who applied for it</p>

              <div className="filter-item" style={{ marginBottom: "0.8rem" }}>
                <label className="toolbar-label">Job</label>
                {recruiterJobs.length === 0 ? (
                  <div className="no-jobs">No jobs posted yet</div>
                ) : (
                  <select
                    value={selectedJobForRanking}
                    onChange={(e) => {
                      setSelectedJobForRanking(e.target.value);
                      setRankings([]);
                      setRankingError("");
                    }}
                    className="job-selector"
                  >
                    <option value="">All jobs</option>
                    {recruiterJobs.map((job) => (
                      <option key={job.id} value={job.id}>
                        {job.title} ({job.company_name || "Company"}) - {new Date(job.created_at).toLocaleDateString()}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {selectedJobForRanking && (
                <div className="selected-job-info">
                  <h4>
                    {recruiterJobs.find((j) => j.id.toString() === selectedJobForRanking.toString())?.title ||
                      "Selected Job"}
                  </h4>
                  <p>Applications: {filteredApplications.length} candidates</p>
                </div>
              )}

              {rankingError && <div className="ranking-error">{rankingError}</div>}

              <button
                onClick={handleRankCandidates}
                disabled={rankingLoading || !selectedJobForRanking}
                className="rank-button"
              >
                {rankingLoading ? (
                  <>
                    <span className="spinner"></span>
                    Analyzing Resumes...
                  </>
                ) : (
                  <>
                    <span className="rank-icon">Rank</span>
                    Rank Candidates
                  </>
                )}
              </button>
            </div>

            {rankings.length > 0 && (
              <div className="rankings-results">
                <h3>Candidate Rankings</h3>

                <div className="rankings-list">
                  {rankings.map((candidate, index) => {
                    const badge = getScoreBadge(candidate.score);
                    return (
                      <div key={index} className={`ranking-item ${index === 0 ? "top-ranking" : ""}`}>
                        <div className="ranking-header">
                          <div className="rank-number">{index + 1}</div>
                          <div className="candidate-info">
                            <h4>
                              {candidate.candidate_name || candidate.candidate_email || `Candidate ${candidate.candidate_id}`}
                            </h4>
                            <span className={`score-badge ${badge.className}`}>{badge.text}</span>
                          </div>
                          <div className="score-display">
                            <div className="score-value">{(candidate.score * 100).toFixed(1)}%</div>
                            <div className="score-label">Match Score</div>
                          </div>
                        </div>

                        <div className="progress-bar">
                          <div className="progress-fill" style={{ width: `${candidate.score * 100}%` }}></div>
                        </div>

                        <div className="candidate-details">
                          <div className="detail-group">
                            <strong>Resume:</strong>
                            {candidate.resume_filename ? (
                              <button
                                onClick={() => downloadRankedResume(candidate.resume_filename)}
                                className="resume-link"
                              >
                                {candidate.resume_filename}
                              </button>
                            ) : (
                              <span>No resume</span>
                            )}
                          </div>
                          <div className="detail-group">
                            <strong>Applied:</strong>
                            <span>{formatDate(candidate.applied_at)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="summary-stats">
                  <div className="stat-card excellent">
                    <div className="stat-title">Excellent Matches</div>
                    <div className="stat-value">{rankings.filter((r) => r.score >= 0.7).length}</div>
                  </div>
                  <div className="stat-card good">
                    <div className="stat-title">Good Matches</div>
                    <div className="stat-value">
                      {rankings.filter((r) => r.score >= 0.5 && r.score < 0.7).length}
                    </div>
                  </div>
                  <div className="stat-card average">
                    <div className="stat-title">Average Score</div>
                    <div className="stat-value">
                      {rankings.length > 0
                        ? ((rankings.reduce((sum, r) => sum + r.score, 0) / rankings.length) * 100).toFixed(1) +
                          "%"
                        : "0%"}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>

        </div>
      </main>

      {resumeModalOpen && selectedResume && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ margin: 0 }}>
                Resume: {selectedResume.candidate_name} - {selectedResume.job_title}
              </h3>
              <button onClick={closeResumeModal} className="modal-close">
                x
              </button>
            </div>
            <div className="modal-body">
              {selectedResume.filename && selectedResume.filename.endsWith(".pdf") ? (
                <iframe
                  src={`${API_BASE}/download-resume.php?application_id=${selectedResume.application_id}&recruiter_id=${
                    JSON.parse(localStorage.getItem("user"))?.id
                  }`}
                  title="Resume Preview"
                  className="resume-frame"
                />
              ) : (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    height: "100%",
                    textAlign: "center",
                  }}
                >
                  <h3>Document Preview</h3>
                  <p>This document type cannot be previewed in browser.</p>
                  <p>Please download to view.</p>
                  <button
                    onClick={() =>
                      window.open(
                        `${API_BASE}/download-resume.php?application_id=${selectedResume.application_id}&recruiter_id=${
                          JSON.parse(localStorage.getItem("user"))?.id
                        }`,
                        "_blank"
                      )
                    }
                    className="btn primary"
                    style={{ marginTop: "1rem" }}
                  >
                    Download Resume
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <footer className="dashboard-footer">
        <p>&copy; 2025 Job Nexus - Recruiter Dashboard</p>
        <p style={{ fontSize: "0.9rem", marginTop: "0.5rem" }}>
          {applications.length} total applications | Last updated: {new Date().toLocaleDateString()}
        </p>
      </footer>
    </>
  );
}

