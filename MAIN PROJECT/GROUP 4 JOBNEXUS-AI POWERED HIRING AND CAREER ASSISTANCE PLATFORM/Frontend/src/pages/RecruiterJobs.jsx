import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import ProfileIcon from "./ProfileIcon";
import "./RecruiterJobs.css";

export default function RecruiterJobs() {
  const DESCRIPTION_PREVIEW_LENGTH = 220;
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [toggleId, setToggleId] = useState(null);
  const [editingJob, setEditingJob] = useState(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [requiredSkills, setRequiredSkills] = useState("");
  const [expandedDescriptions, setExpandedDescriptions] = useState({});
  const editSectionRef = useRef(null);

  const API_BASE = "http://localhost/JobNexus/Backend-PHP/api";
  const user = useMemo(() => JSON.parse(localStorage.getItem("user")), []);

  const fetchJobs = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/recruiter-jobs.php?recruiter_id=${user.id}`);
      const data = await res.json();
      if (data.success) {
        setJobs(data.jobs || []);
      } else {
        alert(data.message || "Failed to load posted jobs.");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to load posted jobs.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user || user.role !== "recruiter") {
      alert("Please login as recruiter");
      navigate("/login");
      return;
    }
    fetchJobs();
  }, [fetchJobs, navigate, user]);

  useEffect(() => {
    if (editingJob && editSectionRef.current) {
      editSectionRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [editingJob]);

  const startEdit = (job) => {
    setEditingJob(job);
    setTitle(job.title || "");
    setDescription(job.description || "");
    setRequiredSkills(job.required_skills || "");
  };

  const cancelEdit = () => {
    setEditingJob(null);
    setTitle("");
    setDescription("");
    setRequiredSkills("");
  };

  const submitEdit = async (e) => {
    e.preventDefault();
    if (!editingJob?.id || !user?.id) return;
    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();
    const trimmedRequiredSkills = requiredSkills.trim();

    if (!trimmedTitle || !trimmedDescription) {
      alert("Job title and description are required.");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`${API_BASE}/update-job.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_id: editingJob.id,
          recruiter_id: user.id,
          title: trimmedTitle,
          description: trimmedDescription,
          required_skills: trimmedRequiredSkills,
        }),
      });
      const raw = await response.text();
      let data = null;
      try {
        data = JSON.parse(raw);
      } catch {
        throw new Error(raw || "Invalid response from server.");
      }

      if (response.ok && data.success) {
        setJobs((prev) =>
          prev.map((job) =>
            String(job.id) === String(editingJob.id)
              ? {
                  ...job,
                  title: data?.job?.title ?? trimmedTitle,
                  description: data?.job?.description ?? trimmedDescription,
                  required_skills: data?.job?.required_skills ?? trimmedRequiredSkills,
                }
              : job
          )
        );
        cancelEdit();
        fetchJobs();
      } else {
        alert(data.message || data.error || "Failed to update job.");
      }
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to update job.");
    } finally {
      setSaving(false);
    }
  };

  const deleteJob = async (jobId) => {
    if (!user?.id) return;
    if (!window.confirm("Delete this job and all related applications?")) return;

    setDeletingId(jobId);
    try {
      const response = await fetch(`${API_BASE}/delete-job.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_id: jobId,
          recruiter_id: user.id,
        }),
      });
      const data = await response.json();
      if (data.success) {
        fetchJobs();
      } else {
        alert(data.message || "Failed to delete job.");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to delete job.");
    } finally {
      setDeletingId(null);
    }
  };

  const toggleAccepting = async (job) => {
    if (!user?.id) return;
    const nextState = !(Number(job.accepting_applications) === 1);
    setToggleId(job.id);

    try {
      const response = await fetch(`${API_BASE}/toggle-job-accepting.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_id: job.id,
          recruiter_id: user.id,
          accepting_applications: nextState,
        }),
      });
      const data = await response.json();
      if (data.success) {
        fetchJobs();
      } else {
        alert(data.message || "Failed to update application state.");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to update application state.");
    } finally {
      setToggleId(null);
    }
  };

  const toggleDescription = (jobId) => {
    setExpandedDescriptions((prev) => ({
      ...prev,
      [jobId]: !prev[jobId],
    }));
  };

  return (
    <>
      <header className="recruiter-jobs-header">
        <div className="recruiter-jobs-header-copy">
          <h1>Posted Jobs</h1>
          <p>Manage all jobs you posted from one page.</p>
        </div>
        <div className="recruiter-jobs-header-actions">
          <button className="btn outline" onClick={() => navigate("/recruiters")}>
            Back to Dashboard
          </button>
          <ProfileIcon />
        </div>
      </header>

      <main className="recruiter-jobs-layout">
        {editingJob && (
          <section className="recruiter-jobs-card" ref={editSectionRef}>
            <h2>Edit Job</h2>
            <form onSubmit={submitEdit} className="job-edit-form">
              <label>
                <strong>Job Title</strong>
              </label>
              <input
                type="text"
                className="job-input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />

              <label>
                <strong>Job Description</strong>
              </label>
              <textarea
                rows="8"
                className="job-textarea"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />

              <label>
                <strong>Required Skills (comma-separated)</strong>
              </label>
              <textarea
                rows="3"
                className="job-textarea"
                value={requiredSkills}
                onChange={(e) => setRequiredSkills(e.target.value)}
                placeholder="e.g., python, sql, docker"
              />

              <div className="button-row">
                <button type="submit" className="btn primary" disabled={saving}>
                  {saving ? "Saving..." : "Save Changes"}
                </button>
                <button type="button" className="btn outline" onClick={cancelEdit}>
                  Cancel
                </button>
              </div>
            </form>
          </section>
        )}

        <section className="recruiter-jobs-card">
          {loading ? (
            <p className="muted">Loading posted jobs...</p>
          ) : jobs.length === 0 ? (
            <p className="muted">No jobs posted yet.</p>
          ) : (
            <div className="jobs-list">
              {jobs.map((job) => (
                <article key={job.id} className="job-item">
                  <div className="job-main">
                    <h3>{job.title}</h3>
                    <p className="job-meta">
                      {job.company_name || "Company"} | {new Date(job.created_at).toLocaleDateString()}
                    </p>
                    <p className={`job-state ${Number(job.accepting_applications) === 1 ? "open" : "closed"}`}>
                      {Number(job.accepting_applications) === 1
                        ? "Accepting applications"
                        : "No longer accepting applications"}
                    </p>
                    {(() => {
                      const fullDescription = (job.description || "").trim();
                      const isExpanded = !!expandedDescriptions[job.id];
                      const shouldTruncate = fullDescription.length > DESCRIPTION_PREVIEW_LENGTH;
                      const visibleDescription =
                        !fullDescription
                          ? "No description provided."
                          : shouldTruncate && !isExpanded
                            ? `${fullDescription.substring(0, DESCRIPTION_PREVIEW_LENGTH)}...`
                            : fullDescription;

                      return (
                        <>
                          <p className="job-description">{visibleDescription}</p>
                          {shouldTruncate && (
                            <button
                              type="button"
                              className="job-description-toggle"
                              onClick={() => toggleDescription(job.id)}
                            >
                              {isExpanded ? "Show less" : "Show more"}
                            </button>
                          )}
                        </>
                      );
                    })()}
                  </div>
                  <div className="job-actions">
                    <button className="btn secondary" onClick={() => toggleAccepting(job)} disabled={toggleId === job.id}>
                      {toggleId === job.id
                        ? "Updating..."
                        : Number(job.accepting_applications) === 1
                          ? "Close Applications"
                          : "Reopen Applications"}
                    </button>
                    <button className="btn secondary" onClick={() => startEdit(job)}>
                      Edit
                    </button>
                    <button
                      className="btn outline"
                      onClick={() => deleteJob(job.id)}
                      disabled={deletingId === job.id}
                    >
                      {deletingId === job.id ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

      </main>
    </>
  );
}
