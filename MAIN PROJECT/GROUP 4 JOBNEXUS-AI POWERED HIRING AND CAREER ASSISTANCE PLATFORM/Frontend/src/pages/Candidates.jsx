import React, { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, X } from "lucide-react";
import ProfileIcon from "./ProfileIcon";
import "./Recruiters.css";

export default function Candidates() {
  const DESCRIPTION_PREVIEW_LENGTH = 240;
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [appliedJobs, setAppliedJobs] = useState([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [resumeFile, setResumeFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [showResumeLibraryModal, setShowResumeLibraryModal] = useState(false);
  const [resumeLibraryFile, setResumeLibraryFile] = useState(null);
  const [resumeLibraryUploading, setResumeLibraryUploading] = useState(false);
  const [userResumes, setUserResumes] = useState([]);
  const [builderResumes, setBuilderResumes] = useState([]);
  const [matchScores, setMatchScores] = useState({});
  const [interviewLoading, setInterviewLoading] = useState({});
  const [matchLoading, setMatchLoading] = useState({});
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [selectedMatchResult, setSelectedMatchResult] = useState(null);
  const [uploadedResumeModalOpen, setUploadedResumeModalOpen] = useState(false);
  const [selectedUploadedResume, setSelectedUploadedResume] = useState(null);
  const [skillGapLoading, setSkillGapLoading] = useState(false);
  const [skillGapError, setSkillGapError] = useState("");
  const [skillGapData, setSkillGapData] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState("");
  const [showNotificationsMenu, setShowNotificationsMenu] = useState(false);
  const [careerRecoLoading, setCareerRecoLoading] = useState(false);
  const [careerRecoError, setCareerRecoError] = useState("");
  const [careerRecoData, setCareerRecoData] = useState(null);
  const [careerResumeSelection, setCareerResumeSelection] = useState("auto");
  const [selectedJobFilter, setSelectedJobFilter] = useState("all");
  const [expandedJobDescriptions, setExpandedJobDescriptions] = useState({});
  const notificationsMenuRef = useRef(null);
  
  const [selectedResumeByJob, setSelectedResumeByJob] = useState({});
  const API_BASE = "http://localhost/JobNexus/Backend-PHP/api";

  const user = JSON.parse(localStorage.getItem("user"));
  const visibleBuilderResumes = builderResumes.filter(
    (resume) => (resume.title || "").trim().toLowerCase() !== "my resume"
  );

  const getLatestBuilderResume = () => {
    if (visibleBuilderResumes.length === 0) return null;
    return visibleBuilderResumes.reduce((latest, current) => {
      const latestDate = new Date(latest.updated_at || latest.created_at || 0).getTime();
      const currentDate = new Date(current.updated_at || current.created_at || 0).getTime();
      return currentDate > latestDate ? current : latest;
    });
  };

  const getLatestUploadedResume = () => {
    if (userResumes.length === 0) return null;
    return userResumes.reduce((latest, current) => {
      const latestDate = new Date(latest.uploaded_at || 0).getTime();
      const currentDate = new Date(current.uploaded_at || 0).getTime();
      return currentDate > latestDate ? current : latest;
    });
  };

  const getSelectedResumeForJob = (jobId) => {
    const stored = selectedResumeByJob[jobId];
    if (stored) return stored;

    const latestUploaded = getLatestUploadedResume();
    if (latestUploaded) {
      return { source: "uploaded", filename: latestUploaded.resume_filename };
    }

    const latestBuilder = getLatestBuilderResume();
    if (latestBuilder) {
      return { source: "builder", id: latestBuilder.id };
    }

    return null;
  };

  const setSelectedResumeForJob = (jobId, value) => {
    setSelectedResumeByJob((prev) => ({
      ...prev,
      [jobId]: value
    }));
  };

  const toggleJobDescription = (jobId) => {
    setExpandedJobDescriptions((prev) => ({
      ...prev,
      [jobId]: !prev[jobId]
    }));
  };

  const getUploadedResumeLabel = (resume) => {
    const displayName = (resume.display_name || "").trim();
    return displayName || resume.resume_filename;
  };

  const handleViewUploadedResume = (resume) => {
    const filename = (resume?.resume_filename || "").trim();
    if (!filename) {
      alert("Resume file is missing.");
      return;
    }
    setSelectedUploadedResume({
      filename,
      label: getUploadedResumeLabel(resume),
    });
    setUploadedResumeModalOpen(true);
  };

  const closeUploadedResumeModal = () => {
    setUploadedResumeModalOpen(false);
    setSelectedUploadedResume(null);
  };

  const handleEditBuilderResume = (resume) => {
    navigate("/resume-preview", {
      state: {
        resumeData: resume
      }
    });
  };

  const handleRenameBuilderResume = async (resume) => {
    if (!user?.id) return;
    const currentTitle = (resume.title || "").trim() || "Resume Builder - Resume";
    const newTitle = window.prompt("Enter a new name for this resume:", currentTitle);
    if (newTitle === null) return;
    if (!newTitle.trim()) {
      alert("Name cannot be empty.");
      return;
    }

    try {
      const response = await fetch("http://localhost/JobNexus/Backend-PHP/api/rename-builder-resume.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user.id,
          resume_id: resume.id,
          new_title: newTitle.trim()
        })
      });
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || "Failed to rename resume");
      }
      fetchBuilderResumes();
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to rename resume");
    }
  };

  const handleDeleteBuilderResume = async (resume) => {
    if (!user?.id) return;
    const confirmed = window.confirm("Delete this resume? This cannot be undone.");
    if (!confirmed) return;

    try {
      const response = await fetch("http://localhost/JobNexus/Backend-PHP/api/delete-builder-resume.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user.id,
          resume_id: resume.id
        })
      });
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || "Failed to delete resume");
      }
      fetchBuilderResumes();
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to delete resume");
    }
  };

  const handleRenameUploadedResume = async (resume) => {
    if (!user?.id) return;
    const currentLabel = getUploadedResumeLabel(resume);
    const newName = window.prompt("Enter a new name for this resume:", currentLabel);
    if (newName === null) return;
    if (!newName.trim()) {
      alert("Name cannot be empty.");
      return;
    }

    try {
      const response = await fetch("http://localhost/JobNexus/Backend-PHP/api/rename-resume.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidate_id: user.id,
          resume_filename: resume.resume_filename,
          new_name: newName.trim()
        })
      });
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || "Failed to rename resume");
      }
      fetchUserResumes();
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to rename resume");
    }
  };

  const handleDeleteUploadedResume = async (resume) => {
    if (!user?.id) return;
    const confirmed = window.confirm("Delete this resume? This cannot be undone.");
    if (!confirmed) return;

    try {
      const response = await fetch("http://localhost/JobNexus/Backend-PHP/api/delete-resume.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidate_id: user.id,
          resume_filename: resume.resume_filename
        })
      });
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || "Failed to delete resume");
      }
      fetchUserResumes();
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to delete resume");
    }
  };

  // Fetch uploaded resumes (from applications)
  const fetchUserResumes = useCallback(async () => {
    if (!user?.id) return;
    try {
      const response = await fetch(
        `http://localhost/JobNexus/Backend-PHP/api/get-candidate-resumes.php?candidate_id=${user.id}`
      );
      const data = await response.json();
      if (data.success) {
        setUserResumes(data.resumes);
      }
    } catch (err) {
      console.error(err);
    }
  }, [user?.id]);

  // Fetch builder resumes (from resumes table)
  const fetchBuilderResumes = useCallback(async () => {
    if (!user?.id) return;
    try {
      const response = await fetch(
        `http://localhost/JobNexus/Backend-PHP/api/get-resumes.php?user_id=${user.id}`
      );
      const data = await response.json();
      if (data.success) {
        setBuilderResumes(data.resumes);
      }
    } catch (err) {
      console.error(err);
    }
  }, [user?.id]);

  const fetchAppliedJobs = useCallback(async () => {
    if (!user?.id) return;
    try {
      const response = await fetch(
        `http://localhost/JobNexus/Backend-PHP/api/get-applied-jobs.php?candidate_id=${user.id}&_=${Date.now()}`,
        { cache: "no-store" }
      );
      const data = await response.json();
      if (data.success) {
        setAppliedJobs(data.applications);
      }
    } catch (err) {
      console.error(err);
    }
  }, [user?.id]);

  const fetchNotifications = useCallback(async () => {
    if (!user?.id) return;
    setNotificationsLoading(true);
    setNotificationsError("");
    try {
      const response = await fetch(
        `http://localhost/JobNexus/Backend-PHP/api/get-notifications.php?user_id=${user.id}&limit=50`
      );
      const data = await response.json();
      if (data.success) {
        setNotifications(data.notifications || []);
      } else {
        setNotificationsError(data.message || "Failed to load notifications");
      }
    } catch (err) {
      console.error(err);
      setNotificationsError("Failed to load notifications");
    } finally {
      setNotificationsLoading(false);
    }
  }, [user?.id]);

  const fetchCareerRecommendation = async () => {
    if (!user?.id) return;

    setCareerRecoLoading(true);
    setCareerRecoError("");
    setCareerRecoData(null);

    try {
      const latestUploaded = getLatestUploadedResume();
      const latestBuilder = getLatestBuilderResume();

      const payload = { candidate_id: String(user.id), resume_type: "latest" };
      if (careerResumeSelection === "auto") {
        if (latestUploaded?.resume_filename) {
          payload.resume_type = "uploaded";
          payload.resume_filename = latestUploaded.resume_filename;
        } else if (latestBuilder?.id) {
          payload.resume_type = "builder";
          payload.resume_id = String(latestBuilder.id);
        }
      } else {
        const [source, value] = careerResumeSelection.split(":");
        if (source === "uploaded" && value) {
          payload.resume_type = "uploaded";
          payload.resume_filename = value;
        } else if (source === "builder" && value) {
          payload.resume_type = "builder";
          payload.resume_id = value;
        }
      }

      const response = await fetch("http://localhost:8000/api/career-recommendation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.detail || data.message || "Failed to generate career recommendation");
      }

      setCareerRecoData(data);
    } catch (err) {
      console.error(err);
      setCareerRecoError(err.message || "Failed to generate career recommendation");
    } finally {
      setCareerRecoLoading(false);
    }
  };

  const markNotificationRead = async (notificationId) => {
    if (!user?.id) return;
    try {
      await fetch("http://localhost/JobNexus/Backend-PHP/api/mark-notification-read.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notification_id: notificationId,
          user_id: user.id
        })
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, is_read: 1 } : n))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const fetchJobs = useCallback(async () => {
    try {
      const response = await fetch("http://localhost/JobNexus/Backend-PHP/api/get-jobs.php");
      const data = await response.json();
      if (data.success) {
        setJobs(data.jobs);
      } else {
        setJobs([]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch Jobs
  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  // Fetch user-specific data
  useEffect(() => {
    if (user?.id) {
      fetchUserResumes();
      fetchAppliedJobs();
      fetchBuilderResumes();
      fetchNotifications();
    }
  }, [user?.id, fetchUserResumes, fetchAppliedJobs, fetchBuilderResumes, fetchNotifications]);

  useEffect(() => {
    if (!user?.id) return undefined;
    const intervalId = setInterval(() => {
      fetchAppliedJobs();
      fetchNotifications();
    }, 15000);
    return () => clearInterval(intervalId);
  }, [user?.id, fetchAppliedJobs, fetchNotifications]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationsMenuRef.current && !notificationsMenuRef.current.contains(event.target)) {
        setShowNotificationsMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Open Upload Modal
  const openUploadModal = (job) => {
    if (!user || user.role !== "candidate") {
      alert("Please login as candidate");
      return;
    }
    if (Number(job.accepting_applications ?? 1) !== 1) {
      alert("This job is no longer accepting applications.");
      return;
    }
    if (appliedJobs.some(app => app.job_id === job.id)) {
      alert("You have already applied for this job");
      return;
    }
    setSelectedJob(job);
    setResumeFile(null);
    setShowUploadModal(true);
  };

  const handleApplyNow = async (job) => {
    if (!user || user.role !== "candidate") {
      alert("Please login as candidate");
      return;
    }
    if (Number(job.accepting_applications ?? 1) !== 1) {
      alert("This job is no longer accepting applications.");
      return;
    }
    if (appliedJobs.some((app) => app.job_id === job.id)) {
      alert("You have already applied for this job");
      return;
    }

    const selection = getSelectedResumeForJob(job.id);
    if (!selection) {
      openUploadModal(job);
      return;
    }

    if (selection.source !== "uploaded" || !selection.filename) {
      alert("Select an uploaded resume for auto-apply, or upload a new file.");
      openUploadModal(job);
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append("job_id", job.id);
    formData.append("candidate_id", user.id);
    formData.append("resume_filename", selection.filename);

    try {
      const response = await fetch(
        "http://localhost/JobNexus/Backend-PHP/api/apply-job.php",
        {
          method: "POST",
          body: formData,
        }
      );
      const data = await response.json();
      if (data.success) {
        alert("Applied successfully!");
        fetchAppliedJobs();
      } else {
        alert(data.message || "Application failed");
      }
    } catch (error) {
      console.error(error);
      alert("Server error");
    } finally {
      setUploading(false);
    }
  };

  const fetchSkillGapInline = async (jobId, selection) => {
    if (!user?.id) return;
    setSkillGapLoading(true);
    setSkillGapError("");
    setSkillGapData(null);

    try {
      const params = new URLSearchParams({
        candidate_id: String(user.id)
      });
      if (selection?.source === "builder") {
        params.set("resume_type", "builder");
        params.set("resume_id", String(selection.id));
      } else if (selection?.source === "uploaded") {
        params.set("resume_type", "uploaded");
        params.set("resume_filename", selection.filename);
      }
      const response = await fetch(
        `http://localhost:8000/api/skill-gap-analysis/${jobId}?${params.toString()}`
      );
      const data = await response.json();
      if (data.success) {
        setSkillGapData(data);
      } else {
        setSkillGapError(data.message || "Failed to analyze skill gap");
      }
    } catch (error) {
      console.error("Skill gap analysis error:", error);
      setSkillGapError("Server error. Please try again.");
    } finally {
      setSkillGapLoading(false);
    }
  };

  // Handle File Upload
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.type === "application/pdf" || file.type === "application/msword" || 
          file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || 
          file.type === "text/plain") {
        setResumeFile(file);
      } else {
        alert("Please upload a PDF, DOC, DOCX, or TXT file");
      }
    }
  };

  const handleLibraryFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (
        file.type === "application/pdf" ||
        file.type === "application/msword" ||
        file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
        file.type === "text/plain"
      ) {
        setResumeLibraryFile(file);
      } else {
        alert("Please upload a PDF, DOC, DOCX, or TXT file");
      }
    }
  };

  // Apply to Job with Resume
  const handleApplyWithResume = async () => {
    if (!resumeFile) {
      alert("Please upload a resume");
      return;
    }
    setUploading(true);
    const formData = new FormData();
    formData.append("job_id", selectedJob.id);
    formData.append("candidate_id", user.id);
    formData.append("resume", resumeFile);

    try {
      const response = await fetch(
        "http://localhost/JobNexus/Backend-PHP/api/apply-job.php",
        {
          method: "POST",
          body: formData,
        }
      );
      const data = await response.json();
      if (data.success) {
        alert("Applied successfully!");
        setShowUploadModal(false);
        fetchAppliedJobs();
        fetchUserResumes();
      } else {
        alert(data.message || "Application failed");
      }
    } catch (error) {
      console.error(error);
      alert("Server error");
    } finally {
      setUploading(false);
    }
  };

  const handleUploadResumeToLibrary = async () => {
    if (!resumeLibraryFile) {
      alert("Please upload a resume");
      return;
    }
    if (!user?.id) {
      alert("Please log in again.");
      return;
    }
    setResumeLibraryUploading(true);
    const formData = new FormData();
    formData.append("candidate_id", user.id);
    formData.append("resume", resumeLibraryFile);

    try {
      const response = await fetch(
        "http://localhost/JobNexus/Backend-PHP/api/upload-resume.php",
        {
          method: "POST",
          body: formData
        }
      );
      const data = await response.json();
      if (data.success) {
        alert("Resume uploaded successfully!");
        setShowResumeLibraryModal(false);
        setResumeLibraryFile(null);
        fetchUserResumes();
      } else {
        alert(data.message || "Upload failed");
      }
    } catch (error) {
      console.error(error);
      alert("Server error");
    } finally {
      setResumeLibraryUploading(false);
    }
  };

  // Function to calculate match score (available BEFORE applying)
  const calculateMatchScore = async (jobId) => {
    setMatchLoading(prev => ({ ...prev, [jobId]: true }));
    try {
      const user = JSON.parse(localStorage.getItem("user"));
      // Check if user has any resumes
      if (visibleBuilderResumes.length === 0 && userResumes.length === 0) {
        alert("Please create or upload a resume first to calculate match score");
        setMatchLoading(prev => ({ ...prev, [jobId]: false }));
        return;
      }

      const selection = getSelectedResumeForJob(jobId);
      if (!selection) {
        alert("Please select a resume for this job.");
        setMatchLoading(prev => ({ ...prev, [jobId]: false }));
        return;
      }

      const formData = new FormData();
      formData.append("candidate_id", user.id);
      formData.append("resume_type", selection.source === "builder" ? "builder" : "uploaded");
      if (selection.source === "builder") {
        formData.append("resume_id", String(selection.id));
      } else {
        formData.append("resume_filename", selection.filename);
      }
      formData.append("include_reasoning", "true");

      const response = await fetch(
        `http://localhost:8000/api/match-score-with-existing/${jobId}`,
        {
          method: "POST",
          body: formData,
        }
      );
      const data = await response.json();
        if (data.success) {
        setMatchScores(prev => ({ ...prev, [jobId]: data }));
        // Show detailed match modal
        setSelectedMatchResult(data);
        setShowMatchModal(true);
        fetchSkillGapInline(jobId, selection);
      } else {
          alert("Failed to calculate match score: " + (data.message || data.detail || "Unknown error"));
        }
      } catch (error) {
      console.error("Match score error:", error);
      alert("Error calculating match score");
    } finally {
      setMatchLoading(prev => ({ ...prev, [jobId]: false }));
    }
  };

  // Function to start interview prep
  const startInterviewPrep = async (jobId) => {
    const selection = getSelectedResumeForJob(jobId);
    if (!selection) {
      alert("Please select a resume for this job.");
      return;
    }
    setInterviewLoading(prev => ({ ...prev, [jobId]: true }));
    try {
      const job = jobs.find(j => String(j.id) === String(jobId));
      navigate("/interview-prep", {
        state: {
          jobId: jobId,
          jobTitle: job?.title || "Interview",
          resumeSelection: selection
        }
      });
    } catch (error) {
      console.error("Interview prep error:", error);
      alert("Error starting interview prep");
    } finally {
      setInterviewLoading(prev => ({ ...prev, [jobId]: false }));
    };
  };


  const formatNotificationTime = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const normalizeApplicationStatus = (rawStatus) => {
    if (!rawStatus) return "unapplied";
    const normalized = String(rawStatus).trim().toLowerCase().replace(/[\s-]+/g, "_");
    switch (normalized) {
      case "unapplied":
        return "unapplied";
      case "applied":
        return "applied";
      case "pending":
        return "pending";
      case "reviewed":
      case "shortlisted":
      case "in_review":
        return "reviewed";
      case "interview_scheduled":
      case "interviewscheduled":
      case "interview_schedule":
        return "interview_scheduled";
      case "interviewed":
        return "interviewed";
      case "accepted":
      case "selected":
        return "accepted";
      case "rejected":
        return "rejected";
      default:
        return "applied";
    }
  };

  const humanizeNotificationStatus = (status) => {
    const normalized = String(status || "").trim().toLowerCase();
    if (normalized === "interview_scheduled") return "scheduled for interview";
    if (!normalized) return "updated";
    return normalized.replace(/_/g, " ");
  };

  const statusMeta = {
    unapplied: { label: "Unapplied", symbol: "[ ]", bg: "#f3f4f6", color: "#000000" },
    applied: { label: "Applied", symbol: "[A]", bg: "#e0f2fe", color: "#075985" },
    pending: { label: "Pending", symbol: "[...]", bg: "#fff7ed", color: "#9a3412" },
    reviewed: { label: "Reviewed", symbol: "[R]", bg: "#ede9fe", color: "#5b21b6" },
    interview_scheduled: { label: "Interview Scheduled", symbol: "[IS]", bg: "#ecfeff", color: "#155e75" },
    interviewed: { label: "Interviewed", symbol: "[IV]", bg: "#f0fdf4", color: "#166534" },
    accepted: { label: "Accepted", symbol: "[OK]", bg: "#dcfce7", color: "#166534" },
    rejected: { label: "Rejected", symbol: "[X]", bg: "#fee2e2", color: "#991b1b" }
  };

  const appliedJobStatus = appliedJobs.reduce((acc, app) => {
    acc[String(app.job_id)] = normalizeApplicationStatus(app.status || "applied");
    return acc;
  }, {});

  const filteredJobs = jobs.filter((job) => {
    const status = appliedJobStatus[String(job.id)] || "unapplied";
    switch (selectedJobFilter) {
      case "unapplied":
        return status === "unapplied";
      case "applied":
        return status !== "unapplied";
      case "rejected":
        return status === "rejected";
      case "reviewed":
        return status === "reviewed";
      case "pending":
        return status === "pending";
      case "interview_scheduled":
        return status === "interview_scheduled";
      case "interviewed":
        return status === "interviewed";
      case "accepted":
        return status === "accepted";
      default:
        return true;
    }
  });

  return (
    <>
      <header className="dashboard-header">
        <div className="dashboard-header-copy">
          <h1 className="dashboard-banner-title">Candidate Dashboard</h1>
          <p className="dashboard-banner-subtitle">
            Find and apply to your dream job
          </p>
        </div>
        <div className="dashboard-header-actions-row" style={{ position: "relative" }}>
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
                  <div style={{ fontSize: "14px", fontWeight: "700", color: "#000000" }}>Notifications</div>
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
                    <div style={{ fontSize: "13px", color: "#000000", fontWeight: 500 }}>
                      {n.message || `Your application status was ${humanizeNotificationStatus(n.status)}.`}
                    </div>
                    <div style={{ fontSize: "11px", color: "#6b7280", marginTop: "4px" }}>
                      {formatNotificationTime(n.created_at)}
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

      <main className="recruiter-layout candidates-layout">
        <div className="top-row candidates-top-row">
          {/* COLUMN 1: My Resumes Section */}
          <div className="card" style={{ 
            height: "calc(100vh - 180px)",
            display: "flex",
            flexDirection: "column",
            minHeight: 0
          }}>
            <div style={{ marginBottom: "12px" }}>
              <h2 style={{ 
                fontSize: "20px", 
                fontWeight: "800",
                color: "#000000", 
                marginBottom: "16px"
              }}>
                My Resumes
              </h2>
              <div style={{ display: "flex", gap: "12px", marginBottom: "20px" }}>
                <button
                  onClick={() => {
                    setResumeLibraryFile(null);
                    setShowResumeLibraryModal(true);
                  }}
                  style={{ 
                    flex: 1,
                    padding: "10px", 
                    backgroundColor: "#4A70A9", 
                    color: "#fff", 
                    border: "none", 
                    borderRadius: "6px", 
                    cursor: "pointer",
                    fontWeight: "500",
                    fontSize: "14px",
                    transition: "all 0.2s"
                  }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#8FABD4"}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = "#4A70A9"}
                >
                  Upload
                </button>
                <button
                  onClick={() => navigate("/resume-builder")}
                  style={{ 
                    flex: 1,
                    padding: "10px", 
                    backgroundColor: "#8FABD4", 
                    color: "#fff", 
                    border: "none", 
                    borderRadius: "6px", 
                    cursor: "pointer", 
                    display: "flex", 
                    alignItems: "center", 
                    justifyContent: "center",
                    gap: "8px",
                    fontWeight: "500",
                    fontSize: "14px",
                    transition: "all 0.2s"
                  }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#4A70A9"}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = "#8FABD4"}
                >
                  Create
                </button>
              </div>
            </div>

            {/* Resumes List */}
            <div style={{ 
              flex: 1,
              overflowY: "auto",
              paddingRight: "8px"
            }}>
              {visibleBuilderResumes.length === 0 && userResumes.length === 0 ? (
                <div style={{ 
                  textAlign: "center", 
                  padding: "40px 20px",
                  backgroundColor: "#f9fafb",
                  borderRadius: "8px",
                  border: "2px dashed #d1d5db"
                }}>
                  <p style={{ color: "#6b7280", marginBottom: "16px", fontSize: "14px" }}>
                    No resumes yet
                  </p>
                  <p style={{ color: "#9ca3af", fontSize: "12px" }}>
                    Upload or create your first resume
                  </p>
                </div>
              ) : (
                <>
                  {/* Resume Builder Resumes */}
                  <h3 style={{ fontSize: "14px", fontWeight: "500", marginBottom: "12px", color: "#4b5563" }}>
                    Resume Builder
                  </h3>
                  {visibleBuilderResumes.length > 0 ? (
                    visibleBuilderResumes.map((resume) => (
                      <div key={resume.id} style={{ 
                        border: "1px solid #e5e7eb", 
                        borderRadius: "8px", 
                        padding: "16px", 
                        marginBottom: "12px",
                        transition: "all 0.2s"
                      }}
                      onMouseOver={(e) => e.currentTarget.style.borderColor = "#d1d5db"}
                      onMouseOut={(e) => e.currentTarget.style.borderColor = "#e5e7eb"}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
                          <div style={{ flex: 1 }}>
                            <h3 style={{ fontWeight: "600", marginBottom: "4px", fontSize: "15px", color: "#111827" }}>
                              {resume.title.length > 25 ? `${resume.title.substring(0, 25)}...` : resume.title}
                            </h3>
                            <p style={{ color: "#6b7280", fontSize: "12px" }}>
                              {new Date(resume.updated_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: "repeat(2, auto)",
                              gap: "6px",
                              justifyContent: "end",
                              alignItems: "center"
                            }}
                          >
                            <button
                              onClick={() => navigate('/resume-preview', { state: { resumeData: resume } })}
                              style={{ 
                                color: "#10b981", 
                                background: "none", 
                                border: "none", 
                                cursor: "pointer", 
                                fontSize: "12px",
                                fontWeight: "500",
                                padding: "3px 6px",
                                borderRadius: "4px"
                              }}
                            >
                              View
                            </button>
                            <button
                              onClick={() => handleEditBuilderResume(resume)}
                              style={{ 
                                color: "#2563eb", 
                                background: "none", 
                                border: "none", 
                                cursor: "pointer", 
                                fontSize: "12px",
                                fontWeight: "500",
                                padding: "3px 6px",
                                borderRadius: "4px"
                              }}
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleRenameBuilderResume(resume)}
                              style={{ 
                                color: "#6b7280", 
                                background: "none", 
                                border: "none", 
                                cursor: "pointer", 
                                fontSize: "12px",
                                fontWeight: "500",
                                padding: "3px 6px",
                                borderRadius: "4px"
                              }}
                            >
                              Rename
                            </button>
                            <button
                              onClick={() => handleDeleteBuilderResume(resume)}
                              style={{ 
                                color: "#ef4444", 
                                background: "none", 
                                border: "none", 
                                cursor: "pointer", 
                                fontSize: "12px",
                                fontWeight: "500",
                                padding: "3px 6px",
                                borderRadius: "4px"
                              }}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p style={{ color: "#9ca3af", fontSize: "12px", marginBottom: "16px" }}>
                      No Resume Builder resumes yet.
                    </p>
                  )}

                  {/* Uploaded Resumes */}
                  <h3 style={{ fontSize: "14px", fontWeight: "500", marginTop: "8px", marginBottom: "12px", color: "#4b5563" }}>
                    Uploaded
                  </h3>
                  {userResumes.length > 0 ? (
                    userResumes.slice(0, 3).map((resume, index) => (
                      <div key={index} style={{ 
                        border: "1px solid #e5e7eb", 
                        borderRadius: "8px", 
                        padding: "12px", 
                        marginBottom: "8px",
                        fontSize: "13px"
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
                          <div style={{ flex: 1 }}>
                            <p style={{ fontWeight: "500", color: "#111827", fontSize: "13px" }}>
                              {getUploadedResumeLabel(resume).length > 20 ? `${getUploadedResumeLabel(resume).substring(0, 20)}...` : getUploadedResumeLabel(resume)}
                            </p>
                            <p style={{ color: "#6b7280", fontSize: "11px" }}>
                              {new Date(resume.uploaded_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", justifyContent: "flex-end" }}>
                            <button
                              onClick={() => handleViewUploadedResume(resume)}
                              style={{ 
                                color: "#2563eb", 
                                background: "none", 
                                border: "none", 
                                cursor: "pointer", 
                                fontSize: "11px",
                                fontWeight: "500",
                                padding: "4px 6px",
                                borderRadius: "4px"
                              }}
                            >
                              View
                            </button>
                            <button
                              onClick={() => handleRenameUploadedResume(resume)}
                              style={{ 
                                color: "#6b7280", 
                                background: "none", 
                                border: "none", 
                                cursor: "pointer", 
                                fontSize: "11px",
                                fontWeight: "500",
                                padding: "4px 6px",
                                borderRadius: "4px"
                              }}
                            >
                              Rename
                            </button>
                            <button
                              onClick={() => handleDeleteUploadedResume(resume)}
                              style={{ 
                                color: "#ef4444", 
                                background: "none", 
                                border: "none", 
                                cursor: "pointer", 
                                fontSize: "11px",
                                fontWeight: "500",
                                padding: "4px 6px",
                                borderRadius: "4px"
                              }}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p style={{ color: "#9ca3af", fontSize: "12px" }}>
                      No uploaded resumes yet.
                    </p>
                  )}
                </>
              )}
            </div>
          </div>

          {/* COLUMN 2: Job Listings Section (WIDEST COLUMN) */}
          <div className="card" style={{ 
            height: "calc(100vh - 180px)",
            display: "flex",
            flexDirection: "column"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", gap: "12px" }}>
              <h2 style={{ 
                fontSize: "20px", 
                fontWeight: "800", 
                color: "#000000"
              }}>
                Available Jobs
                {!loading && (
                  <span style={{ 
                    fontSize: "14px", 
                    backgroundColor: "#e5e7eb", 
                    color: "#4b5563", 
                    padding: "2px 8px", 
                    borderRadius: "12px",
                    fontWeight: "500"
                  }}>
                    {filteredJobs.length}
                  </span>
                )}
              </h2>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <select
                  value={selectedJobFilter}
                  onChange={(e) => setSelectedJobFilter(e.target.value)}
                  style={{
                    padding: "8px 12px",
                    border: "1px solid #8FABD4",
                    borderRadius: "8px",
                    backgroundColor: "white",
                    fontSize: "14px",
                    fontWeight: "500",
                    color: "#000000"
                  }}
                >
                  <option value="all">All</option>
                  <option value="unapplied">Unapplied</option>
                  <option value="applied">Applied</option>
                  <option value="pending">Pending</option>
                  <option value="reviewed">Reviewed</option>
                  <option value="interview_scheduled">Interview Scheduled</option>
                  <option value="interviewed">Interviewed</option>
                  <option value="accepted">Accepted</option>
                  <option value="rejected">Rejected</option>
                </select>
                <button
                  onClick={fetchJobs}
                  style={{ 
                    padding: "8px 16px", 
                    backgroundColor: "#EFECE3", 
                    color: "#4A70A9", 
                    border: "1px solid #8FABD4", 
                    borderRadius: "6px", 
                    cursor: "pointer",
                    fontWeight: "500",
                    fontSize: "14px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px"
                  }}
                >
                  Refresh
                </button>
              </div>
            </div>

            {/* Jobs List */}
            <div style={{ 
              flex: 1,
              overflowY: "auto",
              paddingRight: "8px"
            }}>
              {loading ? (
                <div style={{ textAlign: "center", padding: "60px 20px" }}>
                  <div className="spinner" style={{
                    width: "48px",
                    height: "48px",
                    border: "4px solid #e5e7eb",
                    borderTopColor: "#4A70A9",
                    borderRadius: "50%",
                    margin: "0 auto 16px",
                    animation: "spin 1s linear infinite"
                  }} />
                  <p style={{ color: "#6b7280" }}>Loading jobs...</p>
                </div>
              ) : filteredJobs.length === 0 ? (
                <div style={{ 
                  textAlign: "center", 
                  padding: "40px 20px",
                  backgroundColor: "#f9fafb",
                  borderRadius: "8px",
                  border: "2px dashed #d1d5db"
                }}>
                  <h3 style={{ fontSize: "16px", fontWeight: "500", color: "#4b5563", marginBottom: "8px" }}>
                    {jobs.length === 0 ? "No jobs available" : "No jobs match this filter"}
                  </h3>
                  <p style={{ color: "#9ca3af", fontSize: "14px" }}>
                    {jobs.length === 0 ? "Check back later for new openings" : "Try a different filter"}
                  </p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    {filteredJobs.map((job) => {
                      const currentStatus = appliedJobStatus[String(job.id)] || "unapplied";
                      const currentStatusMeta = statusMeta[currentStatus] || statusMeta.applied;
                      const hasAppliedToJob = currentStatus !== "unapplied";
                      const isAcceptingApplications = Number(job.accepting_applications ?? 1) === 1;
                      const displayStatusMeta =
                        !isAcceptingApplications && !hasAppliedToJob
                          ? { label: "Closed", symbol: "[X]", bg: "#fee2e2", color: "#991b1b" }
                          : currentStatusMeta;
                      const jobMatchScore = matchScores[job.id];
                      const selection = getSelectedResumeForJob(job.id);
                      return (
                      <div key={job.id} style={{ 
                        border: "1px solid #e5e7eb", 
                        borderRadius: "10px", 
                        padding: "18px",
                        transition: "all 0.2s",
                        backgroundColor: hasAppliedToJob ? "#f0f9ff" : "white"
                      }}
                      onMouseOver={(e) => e.currentTarget.style.boxShadow = "0 4px 6px -1px rgba(0,0,0,0.1)"}
                      onMouseOut={(e) => e.currentTarget.style.boxShadow = "none"}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                          <div style={{ flex: 1 }}>
                            <h3 style={{ fontSize: "17px", fontWeight: "600", color: "#000000", marginBottom: "4px" }}>
                              {job.title}
                            </h3>
                            <p style={{ color: "#6b7280", fontSize: "13px" }}>
                              {job.company_name || "Company"}
                            </p>
                          </div>
                          <div style={{ 
                            backgroundColor: displayStatusMeta.bg, 
                            color: displayStatusMeta.color, 
                            padding: "4px 10px", 
                            borderRadius: "12px", 
                            fontSize: "12px", 
                            fontWeight: "600",
                            whiteSpace: "nowrap",
                            border: "1px solid rgba(0,0,0,0.06)"
                          }}>
                            {displayStatusMeta.symbol} {displayStatusMeta.label}
                          </div>
                        </div>
                        
                        {(() => {
                          const fullDescription = (job.description || "").trim();
                          const isExpanded = !!expandedJobDescriptions[job.id];
                          const shouldTruncate = fullDescription.length > DESCRIPTION_PREVIEW_LENGTH;
                          const visibleDescription = !fullDescription
                            ? "No description provided."
                            : shouldTruncate && !isExpanded
                              ? `${fullDescription.substring(0, DESCRIPTION_PREVIEW_LENGTH)}...`
                              : fullDescription;

                          return (
                            <div style={{ marginBottom: "16px" }}>
                              <p style={{ 
                                color: "#4b5563", 
                                marginBottom: shouldTruncate ? "8px" : "0", 
                                lineHeight: "1.5",
                                fontSize: "14px",
                                whiteSpace: "pre-wrap"
                              }}>
                                {visibleDescription}
                              </p>
                              {shouldTruncate && (
                                <button
                                  type="button"
                                  onClick={() => toggleJobDescription(job.id)}
                                  style={{
                                    background: "none",
                                    border: "none",
                                    padding: 0,
                                    color: "#2563eb",
                                    fontSize: "13px",
                                    fontWeight: "600",
                                    cursor: "pointer"
                                  }}
                                >
                                  {isExpanded ? "Show less" : "Show more"}
                                </button>
                              )}
                            </div>
                          );
                        })()}

                          {/* Resume Picker */}
                          <div style={{ marginBottom: "12px" }}>
                            <label style={{ fontSize: "12px", fontWeight: "600", color: "#6b7280", display: "block", marginBottom: "6px" }}>
                              Resume for this job
                            </label>
                            <select
                              value={
                                selection
                                  ? `${selection.source}:${selection.source === "builder" ? selection.id : selection.filename}`
                                  : ""
                              }
                              onChange={(e) => {
                                const [source, value] = e.target.value.split(":");
                                if (source === "builder") {
                                  setSelectedResumeForJob(job.id, { source: "builder", id: value });
                                } else if (source === "uploaded") {
                                  const normalized = value.replace(/\s+/g, "");
                                  setSelectedResumeForJob(job.id, { source: "uploaded", filename: normalized });
                                }
                              }}
                              style={{
                                width: "100%",
                                padding: "8px 10px",
                                borderRadius: "8px",
                                border: "1px solid #d1d5db",
                                fontSize: "13px",
                                backgroundColor: "white",
                                color: "#111827"
                              }}
                            >
                              <option value="" disabled>Select a resume</option>
                              {userResumes.length > 0 && (
                                <optgroup label="Uploaded">
                                  {userResumes.map((resume, index) => (
                                    <option key={`uploaded-${index}`} value={`uploaded:${resume.resume_filename}`}>
                                      {getUploadedResumeLabel(resume)}
                                    </option>
                                  ))}
                                </optgroup>
                              )}
                              {visibleBuilderResumes.length > 0 && (
                                <optgroup label="Resume Builder">
                                  {visibleBuilderResumes.map((resume) => (
                                    <option key={`builder-${resume.id}`} value={`builder:${resume.id}`}>
                                      {resume.title || "Resume Builder Resume"}
                                    </option>
                                  ))}
                                </optgroup>
                              )}
                            </select>
                          </div>

                          {/* Match Score */}
                        <div style={{ marginBottom: "16px" }}>
                          <div style={{ 
                            display: "flex", 
                            justifyContent: "space-between", 
                            alignItems: "center", 
                            marginBottom: "8px",
                            fontSize: "13px"
                          }}>
                            <span style={{ fontWeight: "500", color: "#6b7280" }}>Match Score</span>
                            <span style={{ 
                              fontWeight: "600", 
                              color: jobMatchScore?.match_percentage >= 70 ? "#10b981" : 
                                    jobMatchScore?.match_percentage >= 50 ? "#f59e0b" : 
                                    jobMatchScore ? "#ef4444" : "#6b7280"
                            }}>
                              {jobMatchScore ? `${jobMatchScore.match_percentage}%` : "Not scored"}
                            </span>
                          </div>
                          {jobMatchScore && (
                            <div style={{ 
                              width: "100%", 
                              backgroundColor: "#e5e7eb", 
                              height: "4px", 
                              borderRadius: "2px", 
                              overflow: "hidden" 
                            }}>
                              <div style={{ 
                                width: `${jobMatchScore.match_percentage}%`, 
                                height: "100%", 
                                backgroundColor: jobMatchScore.match_percentage >= 70 ? "#10b981" : 
                                              jobMatchScore.match_percentage >= 50 ? "#f59e0b" : "#ef4444"
                              }} />
                            </div>
                          )}
                        </div>

                        {/* Action Buttons */}
                          <div style={{ display: "flex", gap: "10px", marginBottom: "12px", flexWrap: "wrap" }}>
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                calculateMatchScore(job.id);
                              }}
                              disabled={matchLoading[job.id] || !selection}
                              style={{
                                padding: "8px 12px",
                                backgroundColor: "#4A70A9",
                                color: "white",
                                border: "none",
                                borderRadius: "6px",
                                cursor: matchLoading[job.id] || !selection ? "not-allowed" : "pointer",
                                fontSize: "13px",
                                fontWeight: "500",
                                flex: "1 1 120px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: "6px"
                              }}
                            >
                              {matchLoading[job.id] ? "..." : "Score"}
                            </button>

                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                startInterviewPrep(job.id);
                              }}
                              disabled={interviewLoading[job.id] || !selection}
                              style={{
                                padding: "8px 12px",
                                backgroundColor: "#8FABD4",
                                color: "white",
                                border: "none",
                                borderRadius: "6px",
                                cursor: interviewLoading[job.id] || !selection ? "not-allowed" : "pointer",
                                fontSize: "13px",
                                fontWeight: "500",
                                flex: "1 1 120px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: "6px"
                              }}
                            >
                              {interviewLoading[job.id] ? "..." : "Interview"}
                            </button>
                        </div>

                        {/* Apply Button */}
                        <button
                          onClick={() => handleApplyNow(job)}
                          disabled={hasAppliedToJob || !isAcceptingApplications || uploading}
                          style={{
                            width: "100%",
                            padding: "10px",
                            backgroundColor: hasAppliedToJob || !isAcceptingApplications || uploading ? "#d1d5db" : "#4A70A9",
                            color: hasAppliedToJob || !isAcceptingApplications || uploading ? "#6b7280" : "#fff",
                            border: "none",
                            borderRadius: "6px",
                            cursor: hasAppliedToJob || !isAcceptingApplications || uploading ? "not-allowed" : "pointer",
                            fontWeight: "600",
                            fontSize: "14px"
                          }}
                        >
                          {hasAppliedToJob
                            ? `${currentStatusMeta.symbol} ${currentStatusMeta.label}`
                            : !isAcceptingApplications
                              ? "Applications Closed"
                              : uploading
                                ? "Applying..."
                                : "Apply Now"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* COLUMN 3: Career Recommendation */}
          <div className="card" style={{ 
            height: "calc(100vh - 180px)",
            display: "flex",
            flexDirection: "column",
            minHeight: 0
          }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                <h2 style={{
                  fontSize: "20px",
                  fontWeight: "800",
                  color: "#000000",
                  margin: 0
                }}>
                  Career Recommendation
                </h2>
                <button
                  onClick={fetchCareerRecommendation}
                  disabled={careerRecoLoading}
                  style={{
                    padding: "6px 10px",
                    borderRadius: "6px",
                    border: "1px solid #8FABD4",
                    backgroundColor: careerRecoLoading ? "#e5e7eb" : "#EFECE3",
                    color: "#4A70A9",
                    cursor: careerRecoLoading ? "not-allowed" : "pointer",
                    fontSize: "12px",
                    fontWeight: "600"
                  }}
                >
                  {careerRecoLoading ? "Analyzing..." : "Analyze Resume"}
                </button>
              </div>

              <div style={{ marginBottom: "10px" }}>
                <label style={{ display: "block", fontSize: "12px", color: "#4b5563", marginBottom: "6px", fontWeight: "600" }}>
                  Resume source
                </label>
                <select
                  value={careerResumeSelection}
                  onChange={(e) => setCareerResumeSelection(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    borderRadius: "8px",
                    border: "1px solid #d1d5db",
                    fontSize: "12px",
                    backgroundColor: "white",
                    color: "#111827"
                  }}
                >
                  <option value="auto">Auto (latest uploaded, else latest builder)</option>
                  {userResumes.map((resume, index) => (
                    <option key={`career-uploaded-${index}`} value={`uploaded:${resume.resume_filename}`}>
                      Uploaded: {getUploadedResumeLabel(resume)}
                    </option>
                  ))}
                  {visibleBuilderResumes.map((resume) => (
                    <option key={`career-builder-${resume.id}`} value={`builder:${resume.id}`}>
                      Builder: {resume.title || "Resume Builder Resume"}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{
                border: "1px solid #e5e7eb",
                borderRadius: "10px",
                backgroundColor: "#f9fafb",
                padding: "12px",
                paddingRight: "8px",
                flex: 1,
                minHeight: 0,
                overflowY: "auto"
              }}>
                {!careerRecoLoading && !careerRecoError && !careerRecoData && (
                  <p style={{ margin: 0, color: "#6b7280", fontSize: "13px", lineHeight: "1.5" }}>
                    Run AI analysis on your latest resume to get a suggested career path and skill gaps.
                  </p>
                )}

                {careerRecoLoading && (
                  <p style={{ margin: 0, color: "#6b7280", fontSize: "13px" }}>
                    Generating recommendation...
                  </p>
                )}

                {!careerRecoLoading && careerRecoError && (
                  <p style={{ margin: 0, color: "#b91c1c", fontSize: "13px" }}>
                    {careerRecoError}
                  </p>
                )}

                {!careerRecoLoading && !careerRecoError && careerRecoData && (
                  <div style={{ display: "grid", gap: "10px" }}>
                    <div style={{
                      backgroundColor: "#ecfeff",
                      border: "1px solid #a5f3fc",
                      borderRadius: "8px",
                      padding: "10px"
                    }}>
                      <div style={{ fontSize: "12px", color: "#0e7490", marginBottom: "4px", fontWeight: "600" }}>
                        Recommended Career
                      </div>
                      <div style={{ fontSize: "15px", color: "#164e63", fontWeight: "700" }}>
                        {careerRecoData.recommended_career || "N/A"}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: "12px", color: "#000000", marginBottom: "6px", fontWeight: "600" }}>
                        Top Matches
                      </div>
                      <div style={{ display: "grid", gap: "6px" }}>
                        {(careerRecoData.top_matches || []).map((item, idx) => (
                          <div key={idx} style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            backgroundColor: "white",
                            border: "1px solid #e5e7eb",
                            borderRadius: "6px",
                            padding: "8px"
                          }}>
                            <span style={{ fontSize: "12px", color: "#111827", fontWeight: "500" }}>
                              {item.career}
                            </span>
                            <span style={{ fontSize: "12px", color: "#4A70A9", fontWeight: "700" }}>
                              {item.score_percentage}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: "12px", color: "#000000", marginBottom: "6px", fontWeight: "600" }}>
                        Missing Skills
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                        {(careerRecoData.missing_skills || []).length > 0 ? (
                          careerRecoData.missing_skills.map((skill, idx) => (
                            <span key={idx} style={{
                              fontSize: "11px",
                              color: "#9a3412",
                              backgroundColor: "#ffedd5",
                              border: "1px solid #fed7aa",
                              borderRadius: "999px",
                              padding: "4px 8px"
                            }}>
                              {skill}
                            </span>
                          ))
                        ) : (
                          <span style={{ fontSize: "12px", color: "#166534" }}>
                            No major skill gaps for this recommendation.
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
          </div>

        </div>
      </main>

        {/* Upload Resume Modal (Apply to Job) */}
        {showUploadModal && (
          <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 50 }}>
            <div style={{ backgroundColor: "white", borderRadius: "12px", padding: "24px", width: "90%", maxWidth: "500px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", gap: "12px" }}>
                <h3 style={{ fontSize: "18px", fontWeight: "600" }}>
                  Upload Resume for {selectedJob?.title}
                </h3>
                <button onClick={() => setShowUploadModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#6b7280" }}>
                  <X size={20} />
                </button>
              </div>
              
              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "500" }}>Resume File</label>
                <div style={{ border: "2px dashed #d1d5db", borderRadius: "8px", padding: "32px", textAlign: "center" }}>
                  <Upload size={40} style={{ color: "#9ca3af", marginBottom: "12px", margin: "0 auto" }} />
                  <p style={{ color: "#6b7280", marginBottom: "8px" }}>
                    Click to upload resume
                  </p>
                  <p style={{ fontSize: "12px", color: "#9ca3af" }}>
                    Only upload PDF files
                  </p>
                  <input type="file" onChange={handleFileChange} style={{ display: "none" }} id="resume-upload" />
                  <button
                    onClick={() => document.getElementById('resume-upload').click()}
                    style={{ marginTop: "16px", padding: "8px 16px", backgroundColor: "#f3f4f6", border: "none", borderRadius: "4px", cursor: "pointer", color: "#4b5563" }}
                  >
                    Browse Files
                  </button>
                </div>
                {resumeFile && (
                  <div style={{ marginTop: "16px", padding: "12px", backgroundColor: "#f0f9ff", borderRadius: "6px", border: "1px solid #7dd3fc" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontWeight: "500" }}>{resumeFile.name}</span>
                      <button onClick={() => setResumeFile(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444" }}>
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
              
              <button
                onClick={handleApplyWithResume}
                disabled={uploading || !resumeFile}
                style={{ 
                  width: "100%", 
                  padding: "12px", 
                  backgroundColor: uploading || !resumeFile ? "#9ca3af" : "#4A70A9", 
                  color: "white", 
                  border: "none", 
                  borderRadius: "6px", 
                  cursor: uploading || !resumeFile ? "not-allowed" : "pointer", 
                  fontWeight: "500",
                  fontSize: "16px"
                }}
              >
                {uploading ? "Applying..." : "Submit Application"}
              </button>
            </div>
          </div>
        )}

        {/* Upload Resume Modal (My Resumes) */}
        {showResumeLibraryModal && (
          <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 50 }}>
            <div style={{ backgroundColor: "white", borderRadius: "12px", padding: "24px", width: "90%", maxWidth: "500px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", gap: "12px" }}>
                <h3 style={{ fontSize: "18px", fontWeight: "600" }}>
                  Upload Resume
                </h3>
                <button
                  onClick={() => setShowResumeLibraryModal(false)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#6b7280" }}
                >
                  <X size={20} />
                </button>
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "500" }}>Resume File</label>
                <div style={{ border: "2px dashed #d1d5db", borderRadius: "8px", padding: "32px", textAlign: "center" }}>
                  <Upload size={40} style={{ color: "#9ca3af", marginBottom: "12px", margin: "0 auto" }} />
                  <p style={{ color: "#6b7280", marginBottom: "8px" }}>
                    Click to upload resume
                  </p>
                  <p style={{ fontSize: "12px", color: "#9ca3af" }}>
                    Only upload PDF files
                  </p>
                  <input type="file" onChange={handleLibraryFileChange} style={{ display: "none" }} id="resume-library-upload" />
                  <button
                    onClick={() => document.getElementById('resume-library-upload').click()}
                    style={{ marginTop: "16px", padding: "8px 16px", backgroundColor: "#f3f4f6", border: "none", borderRadius: "4px", cursor: "pointer", color: "#4b5563" }}
                  >
                    Browse Files
                  </button>
                </div>
                {resumeLibraryFile && (
                  <div style={{ marginTop: "16px", padding: "12px", backgroundColor: "#f0f9ff", borderRadius: "6px", border: "1px solid #7dd3fc" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontWeight: "500" }}>{resumeLibraryFile.name}</span>
                      <button onClick={() => setResumeLibraryFile(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444" }}>
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={handleUploadResumeToLibrary}
                disabled={resumeLibraryUploading || !resumeLibraryFile}
                style={{ 
                  width: "100%", 
                  padding: "12px", 
                  backgroundColor: resumeLibraryUploading || !resumeLibraryFile ? "#9ca3af" : "#4A70A9", 
                  color: "white", 
                  border: "none", 
                  borderRadius: "6px", 
                  cursor: resumeLibraryUploading || !resumeLibraryFile ? "not-allowed" : "pointer", 
                  fontWeight: "500",
                  fontSize: "16px"
                }}
              >
                {resumeLibraryUploading ? "Uploading..." : "Upload Resume"}
              </button>
            </div>
          </div>
        )}

        {uploadedResumeModalOpen && selectedUploadedResume && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-header">
                <h3 style={{ margin: 0 }}>Resume: {selectedUploadedResume.label}</h3>
                <button onClick={closeUploadedResumeModal} className="modal-close">
                  x
                </button>
              </div>
              <div className="modal-body">
                {/\.pdf$/i.test(selectedUploadedResume.filename) ? (
                  <iframe
                    src={`${API_BASE}/download-resume.php?filename=${encodeURIComponent(selectedUploadedResume.filename)}`}
                    title="Uploaded Resume Preview"
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
                    <p>Please open it in a new tab.</p>
                    <button
                      onClick={() =>
                        window.open(
                          `${API_BASE}/download-resume.php?filename=${encodeURIComponent(selectedUploadedResume.filename)}`,
                          "_blank"
                        )
                      }
                      className="btn primary"
                      style={{ marginTop: "1rem" }}
                    >
                      Open Resume
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Match Score Modal */}
       
{showMatchModal && selectedMatchResult && (
  <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 50 }}>
    <div style={{ backgroundColor: "white", borderRadius: "12px", padding: "24px", width: "90%", maxWidth: "700px", maxHeight: "90vh", overflowY: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", gap: "12px" }}>
        <h3 style={{ fontSize: "18px", fontWeight: "600" }}>
          Match Score Analysis
        </h3>
        <button onClick={() => setShowMatchModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#6b7280" }}>
          <X size={20} />
        </button>
      </div>
      
      {/* Score Header */}
      <div style={{ marginBottom: "24px" }}>
        <h4 style={{ fontSize: "16px", fontWeight: "500", marginBottom: "8px", color: "#000000" }}>
          {selectedMatchResult.job_title || "Job"}
        </h4>
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <div style={{ 
            fontSize: "48px", 
            fontWeight: "700", 
            marginBottom: "8px", 
            color: selectedMatchResult.match_percentage >= 70 ? "#10b981" : 
                  selectedMatchResult.match_percentage >= 50 ? "#f59e0b" : "#ef4444" 
          }}>
            {selectedMatchResult.match_percentage}%
          </div>
          <div style={{ fontSize: "14px", color: "#6b7280" }}>Match Score</div>
          <div style={{ width: "100%", height: "8px", backgroundColor: "#e5e7eb", borderRadius: "4px", marginTop: "12px", overflow: "hidden" }}>
            <div style={{ 
              width: `${selectedMatchResult.match_percentage}%`, 
              height: "100%", 
              backgroundColor: selectedMatchResult.match_percentage >= 70 ? "#10b981" : 
                            selectedMatchResult.match_percentage >= 50 ? "#f59e0b" : "#ef4444",
              transition: "width 0.5s"
            }} />
          </div>
          
          {/* Score Interpretation */}
          {selectedMatchResult.reasoning?.score_interpretation && (
            <div style={{ 
              marginTop: "12px", 
              padding: "8px 12px", 
              backgroundColor: "#f0f9ff", 
              borderRadius: "6px",
              display: "inline-block"
            }}>
              <span style={{ 
                fontSize: "14px", 
                fontWeight: "500", 
                color: selectedMatchResult.match_percentage >= 70 ? "#0d9488" : 
                      selectedMatchResult.match_percentage >= 50 ? "#d97706" : "#dc2626"
              }}>
                {selectedMatchResult.reasoning.score_interpretation}
              </span>
            </div>
          )}
        </div>
        
        {/* REASONING SECTION */}
        {selectedMatchResult.reasoning && (
          <div style={{ marginBottom: "24px" }}>
            <h5 style={{ 
              fontSize: "16px", 
              fontWeight: "600", 
              marginBottom: "16px", 
              color: "#000000"
            }}>
              Match Analysis
            </h5>
            
            <div style={{ display: "grid", gap: "16px" }}>
              {/* Score Explanation */}
              {selectedMatchResult.reasoning.score_explanation && (
                <div style={{ 
                  backgroundColor: "#f8fafc", 
                  padding: "16px", 
                  borderRadius: "8px",
                  borderLeft: "3px solid #3b82f6"
                }}>
                  <h6 style={{ fontSize: "14px", fontWeight: "500", marginBottom: "8px", color: "#1e40af" }}>
                    Score Explanation
                  </h6>
                  <p style={{ color: "#4b5563", fontSize: "14px", lineHeight: "1.5" }}>
                    {selectedMatchResult.reasoning.score_explanation}
                  </p>
                </div>
              )}
              
              {/* Two-column layout for strengths and gaps */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                {/* Strengths */}
                <div style={{ 
                  backgroundColor: "#f0fdf4", 
                  padding: "16px", 
                  borderRadius: "8px",
                  borderLeft: "3px solid #10b981"
                }}>
                  <h6 style={{ fontSize: "14px", fontWeight: "500", marginBottom: "8px", color: "#065f46" }}>
                    Strengths
                  </h6>
                  {Array.isArray(selectedMatchResult.reasoning.strengths) ? (
                    <ul style={{ paddingLeft: "20px", margin: 0 }}>
                      {selectedMatchResult.reasoning.strengths.map((strength, idx) => (
                        <li key={idx} style={{ color: "#065f46", fontSize: "14px", marginBottom: "6px", lineHeight: "1.4" }}>
                          {strength}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p style={{ color: "#065f46", fontSize: "14px", lineHeight: "1.5" }}>
                      {selectedMatchResult.reasoning.strengths || "No strengths identified."}
                    </p>
                  )}
                </div>
                
                {/* Gaps */}
                <div style={{ 
                  backgroundColor: "#fef3c7", 
                  padding: "16px", 
                  borderRadius: "8px",
                  borderLeft: "3px solid #f59e0b"
                }}>
                  <h6 style={{ fontSize: "14px", fontWeight: "500", marginBottom: "8px", color: "#92400e" }}>
                    Areas to Improve
                  </h6>
                  {Array.isArray(selectedMatchResult.reasoning.gaps) ? (
                    <ul style={{ paddingLeft: "20px", margin: 0 }}>
                      {selectedMatchResult.reasoning.gaps.map((gap, idx) => (
                        <li key={idx} style={{ color: "#92400e", fontSize: "14px", marginBottom: "6px", lineHeight: "1.4" }}>
                          {gap}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p style={{ color: "#92400e", fontSize: "14px", lineHeight: "1.5" }}>
                      {selectedMatchResult.reasoning.gaps || "No major gaps identified."}
                    </p>
                  )}
                </div>
              </div>
              
              {/* Suggestions */}
              {selectedMatchResult.reasoning.suggestions && (
                <div style={{ 
                  backgroundColor: "#eff6ff", 
                  padding: "16px", 
                  borderRadius: "8px",
                  borderLeft: "3px solid #60a5fa"
                }}>
                  <h6 style={{ fontSize: "14px", fontWeight: "500", marginBottom: "8px", color: "#1e40af" }}>
                    Suggestions
                  </h6>
                  {Array.isArray(selectedMatchResult.reasoning.suggestions) ? (
                    <ul style={{ paddingLeft: "20px", margin: 0 }}>
                      {selectedMatchResult.reasoning.suggestions.map((suggestion, idx) => (
                        <li key={idx} style={{ color: "#1e40af", fontSize: "14px", marginBottom: "6px", lineHeight: "1.4" }}>
                          {suggestion}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p style={{ color: "#1e40af", fontSize: "14px", lineHeight: "1.5" }}>
                      {selectedMatchResult.reasoning.suggestions}
                    </p>
                  )}
                </div>
              )}
              
              {/* Overall Assessment */}
              {selectedMatchResult.reasoning.overall_assessment && (
                <div style={{ 
                  backgroundColor: "#f5f3ff", 
                  padding: "16px", 
                  borderRadius: "8px",
                  borderLeft: "3px solid #8FABD4"
                }}>
                  <h6 style={{ fontSize: "14px", fontWeight: "500", marginBottom: "8px", color: "#5b21b6" }}>
                    Overall Assessment
                  </h6>
                  <p style={{ color: "#5b21b6", fontSize: "14px", lineHeight: "1.5" }}>
                    {selectedMatchResult.reasoning.overall_assessment}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {selectedMatchResult.reasoning_success === false && selectedMatchResult.reasoning_error && (
          <div style={{
            marginBottom: "16px",
            padding: "12px",
            backgroundColor: "#fef2f2",
            borderRadius: "6px",
            border: "1px solid #fecaca"
          }}>
            <p style={{ margin: 0, color: "#b91c1c", fontSize: "12px", textAlign: "center" }}>
              AI feedback unavailable: {selectedMatchResult.reasoning_error}
            </p>
          </div>
        )}
        
        {/* Recommendation Card */}
        <div style={{ backgroundColor: "#f8fafc", padding: "16px", borderRadius: "6px", borderLeft: "4px solid #3b82f6", marginBottom: "24px" }}>
          <h5 style={{ fontSize: "14px", fontWeight: "500", marginBottom: "8px", color: "#000000" }}>
            Recommendation
          </h5>
          <p style={{ color: "#4b5563", fontSize: "14px", lineHeight: "1.5" }}>
            {selectedMatchResult.recommendation || "No recommendation available."}
          </p>
        </div>
      </div>
      
      {/* Skill Gap + Courses (Inline) */}
      <div style={{ marginBottom: "24px" }}>
        <h5 style={{ 
          fontSize: "16px", 
          fontWeight: "600", 
          marginBottom: "12px", 
          color: "#000000"
        }}>
          Skill Gap & Course Recommendations
        </h5>

        {skillGapLoading && (
          <div style={{ padding: "16px", backgroundColor: "#f8fafc", borderRadius: "8px", border: "1px solid #e5e7eb" }}>
            <p style={{ margin: 0, color: "#6b7280", fontSize: "14px" }}>
              Analyzing skill gaps and fetching courses...
            </p>
          </div>
        )}

        {!skillGapLoading && skillGapError && (
          <div style={{ padding: "16px", backgroundColor: "#fef2f2", borderRadius: "8px", border: "1px solid #fecaca" }}>
            <p style={{ margin: 0, color: "#b91c1c", fontSize: "14px" }}>
              {skillGapError}
            </p>
          </div>
        )}

        {!skillGapLoading && !skillGapError && skillGapData && (
          <div style={{ display: "grid", gap: "16px" }}>
            <div style={{ backgroundColor: "#fff7ed", borderRadius: "8px", border: "1px solid #fed7aa", padding: "12px" }}>
              <div style={{ fontSize: "13px", fontWeight: "600", color: "#9a3412", marginBottom: "8px" }}>
                Missing Skills ({skillGapData.missing_skills_count || 0})
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {(skillGapData.missing_skills || []).length > 0 ? (
                  skillGapData.missing_skills.map((skill, idx) => (
                    <span key={idx} style={{ backgroundColor: "#ffedd5", color: "#9a3412", padding: "4px 8px", borderRadius: "4px", fontSize: "0.85rem" }}>
                      {skill}
                    </span>
                  ))
                ) : (
                  <span style={{ color: "#9a3412", fontSize: "13px" }}>No missing skills detected.</span>
                )}
              </div>
            </div>

            {skillGapData.course_recommendations && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                {Object.entries(skillGapData.course_recommendations).slice(0, 4).map(([skill, recs]) => {
                  const courses = [
                    ...(recs.online_courses || []),
                    ...(recs.youtube_videos || [])
                  ].slice(0, 3);

                  return (
                    <div key={skill} style={{ backgroundColor: "#f8fafc", borderRadius: "8px", border: "1px solid #e5e7eb", padding: "12px" }}>
                      <div style={{ fontSize: "13px", fontWeight: "600", color: "#000000", marginBottom: "8px" }}>
                        {skill}
                      </div>
                      <div style={{ display: "grid", gap: "8px" }}>
                        {courses.length > 0 ? (
                          courses.map((course, idx) => (
                            <a
                              key={idx}
                              href={course.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "6px",
                                padding: "8px",
                                borderRadius: "6px",
                                border: "1px solid #e5e7eb",
                                backgroundColor: "white",
                                textDecoration: "none",
                                color: "inherit"
                              }}
                            >
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: "12px", fontWeight: "500", color: "#111827" }}>
                                  {course.title || "Course"}
                                </div>
                                <div style={{ fontSize: "11px", color: "#6b7280" }}>
                                  {course.provider || course.instructor || course.source || "Source"}
                                </div>
                              </div>
                            </a>
                          ))
                        ) : (
                          <div style={{ fontSize: "12px", color: "#6b7280" }}>
                            No course recommendations available.
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div style={{ display: "flex", gap: "12px" }}>
        <button
          onClick={() => {
            setShowMatchModal(false);
            startInterviewPrep(selectedMatchResult.job_id);
          }}
          style={{ 
            flex: 1,
            padding: "12px", 
            backgroundColor: "#8FABD4", 
            color: "white", 
            border: "none", 
            borderRadius: "6px", 
            cursor: "pointer", 
            fontWeight: "500",
            fontSize: "16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          Start Interview Prep
        </button>
      </div>
      
    </div>
  </div>
)}

      {/* CSS */}
      <style>
        {`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          ::-webkit-scrollbar {
            width: 6px;
          }
          ::-webkit-scrollbar-track {
            background: #f1f1f1;
            border-radius: 3px;
          }
          ::-webkit-scrollbar-thumb {
            background: #c1c1c1;
            border-radius: 3px;
          }
          ::-webkit-scrollbar-thumb:hover {
            background: #a1a1a1;
          }
        `}
      </style>
    </>
  );
}



