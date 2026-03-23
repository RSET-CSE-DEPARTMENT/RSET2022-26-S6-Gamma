import React, { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import ProfileIcon from "./ProfileIcon";
import "./Recruiters.css";

const API_BASE = "http://localhost:8000";

export default function InterviewPrep() {
  const location = useLocation();
  const navigate = useNavigate();
  const { jobId, jobTitle, resumeSelection } = location.state || {};
  const user = JSON.parse(localStorage.getItem("user"));

  const [jobDetails, setJobDetails] = useState(jobTitle ? { title: jobTitle } : null);
  const [sessionId, setSessionId] = useState(null);
  const [totalQuestions, setTotalQuestions] = useState(10);
  const [interviewQuestions, setInterviewQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [feedback, setFeedback] = useState({});
  const [loading, setLoading] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [interviewStarted, setInterviewStarted] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [finalScore, setFinalScore] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsError, setSessionsError] = useState("");
  const [reviewSession, setReviewSession] = useState(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  useEffect(() => {
    if (jobId && !jobDetails) {
      fetchJobDetails(jobId);
    }
  }, [jobId, jobDetails]);

  const fetchJobDetails = async (jobIdValue) => {
    try {
      const response = await fetch(`${API_BASE}/api/job/${jobIdValue}`);
      const data = await response.json();
      if (data.success) {
        setJobDetails(data.job);
      }
    } catch (error) {
      console.error("Error fetching job details:", error);
    }
  };

  useEffect(() => {
    // Keep landing state so user can choose start new or review.
  }, [jobId, user?.id]);

  const fetchSessions = useCallback(async () => {
    if (!user?.id) return;
    setSessionsLoading(true);
    setSessionsError("");
    try {
      const params = new URLSearchParams({
        candidate_id: String(user.id)
      });
      if (jobId) params.set("job_id", String(jobId));
      const response = await fetch(`${API_BASE}/api/interview/sessions?${params.toString()}`);
      const data = await response.json();
      if (data.success) {
        setSessions(data.sessions || []);
      } else {
        setSessionsError(data.detail || "Failed to load interview sessions.");
      }
    } catch (err) {
      console.error(err);
      setSessionsError("Failed to load interview sessions.");
    } finally {
      setSessionsLoading(false);
    }
  }, [jobId, user?.id]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const startNewInterview = async () => {
    if (!jobId || !user?.id) return;
    setLoading(true);
    setErrorMessage("");
    setInterviewQuestions([]);
    setCurrentQuestionIndex(0);
    setAnswers({});
    setFeedback({});
    setFinalScore(null);
    setReviewSession(null);

    try {
      const startResponse = await fetch(`${API_BASE}/api/interview/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidate_id: String(user.id),
          job_id: String(jobId),
          question_count: 10,
          include_audio: false,
          resume_type: resumeSelection?.source === "builder" ? "builder" : resumeSelection?.source === "uploaded" ? "uploaded" : "latest",
          resume_id: resumeSelection?.source === "builder" ? String(resumeSelection.id) : null,
          resume_filename: resumeSelection?.source === "uploaded" ? resumeSelection.filename : null,
        }),
      });

      const startData = await startResponse.json();
      if (!startResponse.ok) {
        throw new Error(startData.detail || "Failed to start interview");
      }

      setSessionId(startData.session_id);
      setTotalQuestions(startData.total_questions || 10);
      appendQuestion(startData.next_question);
      setInterviewStarted(true);
      fetchSessions();
    } catch (err) {
      console.error(err);
      setErrorMessage("Unable to start interview. Make sure the FastAPI and interview services are running.");
    } finally {
      setLoading(false);
    }
  };

  const reviewInterviewSession = async (sessionId) => {
    setReviewLoading(true);
    setReviewSession(null);
    try {
      const response = await fetch(`${API_BASE}/api/interview/session/${sessionId}`);
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.detail || "Failed to load interview session");
      }
      setReviewSession(data);
    } catch (err) {
      console.error(err);
      setErrorMessage("Failed to load interview session.");
    } finally {
      setReviewLoading(false);
    }
  };

  const appendQuestion = (question) => {
    setInterviewQuestions((prev) => {
      const next = [...prev, question];
      setCurrentQuestionIndex(next.length - 1);
      return next;
    });
  };

  const currentQuestion = interviewQuestions[currentQuestionIndex];

  const handleAnswerChange = (e) => {
    const newAnswers = { ...answers };
    newAnswers[currentQuestionIndex] = e.target.value;
    setAnswers(newAnswers);
  };

  const evaluateAnswer = async () => {
    if (!currentQuestion) return;
    const currentAnswer = answers[currentQuestionIndex] || "";
    if (!currentAnswer.trim()) {
      alert("Please type or speak your answer before evaluating.");
      return;
    }

    setEvaluating(true);
    setErrorMessage("");

    try {
      const response = await fetch(`${API_BASE}/api/interview/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          question_id: currentQuestion.id,
          answer_text: currentAnswer.trim(),
          answer_audio_base64: null,
          audio_format: null,
          sample_rate_hz: null,
          include_audio: false,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.detail || "Failed to evaluate answer");
      }

      setFeedback((prev) => ({ ...prev, [currentQuestionIndex]: data.feedback }));

      if (data.answer_text) {
        setAnswers((prev) => ({ ...prev, [currentQuestionIndex]: data.answer_text }));
      }
    } catch (err) {
      console.error(err);
      setErrorMessage("Failed to evaluate answer. Please try again.");
    } finally {
      setEvaluating(false);
    }
  };

  const goToNextQuestion = async () => {
    if (currentQuestionIndex < interviewQuestions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/interview/next`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.detail || "Failed to load next question");
      }
      if (data.done) {
        setFinalScore(data.final_score ?? 0);
        setInterviewStarted(false);
        fetchSessions();
        return;
      }
      appendQuestion(data.next_question);
    } catch (err) {
      console.error(err);
      setErrorMessage("Unable to load the next question.");
    }
  };

  const goToPreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const stopInterview = async () => {
    if (!sessionId) return;
    try {
      await fetch(`${API_BASE}/api/interview/stop`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId }),
      });
      setInterviewStarted(false);
      fetchSessions();
    } catch (err) {
      console.error(err);
      setErrorMessage("Failed to stop interview.");
    }
  };

  const calculateOverallScore = () => {
    const scores = Object.values(feedback)
      .filter((f) => f && typeof f.score === "number")
      .map((f) => f.score);
    if (scores.length === 0) return 0;
    return (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);
  };

  const renderFeedbackDetails = (feedbackJson) => {
    if (!feedbackJson) return <div style={{ color: "#6b7280" }}>No feedback recorded.</div>;
    if (typeof feedbackJson === "string") return <div>{feedbackJson}</div>;
    const strength = Array.isArray(feedbackJson.strength) ? feedbackJson.strength : [];
    const improvement = Array.isArray(feedbackJson.improvement) ? feedbackJson.improvement : [];
    const scoreText = typeof feedbackJson.score === "number" ? `Score: ${feedbackJson.score}/10` : null;
    return (
      <div>
        {scoreText && <div style={{ marginBottom: "6px" }}>{scoreText}</div>}
        {strength.length > 0 && <div><strong>Strengths:</strong> {strength.join(" | ")}</div>}
        {improvement.length > 0 && <div><strong>Improvements:</strong> {improvement.join(" | ")}</div>}
      </div>
    );
  };

  return (
    <>
      <header className="dashboard-header">
        <div className="dashboard-header-copy">
          <h1 className="dashboard-banner-title">Interview Preparation</h1>
          <p className="dashboard-banner-subtitle">Practice answers and review interview sessions</p>
        </div>
        <div className="dashboard-header-actions-row">
          <button className="btn outline" onClick={() => navigate("/candidates")}>
            Back to Dashboard
          </button>
          <ProfileIcon />
        </div>
      </header>

      <div
        className="interview-prep-container"
        style={{ padding: "20px", maxWidth: "900px", margin: "0 auto" }}
      >
      {!jobId && (
        <div style={{ marginBottom: "20px", padding: "12px", backgroundColor: "#fef2f2", borderRadius: "6px" }}>
          <p style={{ margin: 0, color: "#b91c1c", fontSize: "14px" }}>
            Missing job information. Please start interview prep from the Jobs page.
          </p>
        </div>
      )}

      {jobDetails && (
        <div
          style={{
            backgroundColor: "#ffffff",
            padding: "15px",
            borderRadius: "8px",
            marginBottom: "20px",
            border: "1px solid #d7e3f7",
            borderLeft: "4px solid #4A70A9",
          }}
        >
          <h3 style={{ margin: 0, color: "#1f2d3d" }}>Preparing for: {jobDetails.title}</h3>
          {jobDetails.description && (
            <p style={{ marginTop: "8px", color: "#4b5563", fontSize: "0.95rem" }}>
              {jobDetails.description.length > 200
                ? `${jobDetails.description.substring(0, 200)}...`
                : jobDetails.description}
            </p>
          )}
        </div>
      )}

      {errorMessage && (
        <div style={{ marginBottom: "20px", padding: "12px", backgroundColor: "#fef2f2", borderRadius: "6px" }}>
          <p style={{ margin: 0, color: "#b91c1c", fontSize: "14px" }}>{errorMessage}</p>
        </div>
      )}

      {loading && <p>Loading interview...</p>}

      {!loading && !interviewStarted && (
        <div style={{ marginBottom: "20px", padding: "16px", border: "1px solid #d7e3f7", borderRadius: "8px", backgroundColor: "#ffffff" }}>
          <p style={{ margin: "0 0 12px 0" }}>
            Ready to start your interview?
          </p>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button
              onClick={startNewInterview}
              style={{
                padding: "10px 16px",
                backgroundColor: "#4A70A9",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
              }}
            >
              Start New Interview
            </button>
          </div>
        </div>
      )}

      {!loading && !interviewStarted && (
        <div style={{ marginBottom: "20px" }}>
          <h3 style={{ marginBottom: "10px" }}>Previous Interviews</h3>
          {sessionsLoading && <p>Loading interview history...</p>}
          {!sessionsLoading && sessionsError && (
            <div style={{ marginBottom: "12px", color: "#b91c1c" }}>{sessionsError}</div>
          )}
          {!sessionsLoading && !sessionsError && sessions.length === 0 && (
            <div style={{ color: "#6b7280" }}>No previous interviews yet.</div>
          )}
          {!sessionsLoading && !sessionsError && sessions.length > 0 && (
            <div style={{ display: "grid", gap: "10px" }}>
              {sessions.map((session) => (
                <div key={session.id} style={{ border: "1px solid #e5e7eb", borderRadius: "8px", padding: "12px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
                    <div>
                      <div style={{ fontWeight: "600", color: "#111827" }}>
                        Session #{session.id} {session.status === "completed" ? "(Completed)" : "(In Progress)"}
                      </div>
                      <div style={{ fontSize: "12px", color: "#6b7280" }}>
                        Questions: {session.asked_count}/{session.total_questions} • Final Score: {session.final_score ?? 0}/10
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        onClick={() => reviewInterviewSession(session.id)}
                        style={{
                          padding: "6px 10px",
                          backgroundColor: "#e5e7eb",
                          color: "#111827",
                          border: "none",
                          borderRadius: "6px",
                          cursor: "pointer",
                        }}
                      >
                        Review
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!loading && interviewStarted && currentQuestion && (
        <div className="interview-section">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <h3>Interview in Progress</h3>
            <button
              onClick={stopInterview}
              style={{
                padding: "8px 16px",
                backgroundColor: "#dc2626",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              Stop Interview
            </button>
          </div>

          <div style={{ marginBottom: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
              <span>
                Question {currentQuestionIndex + 1} of {totalQuestions}
              </span>
              <span>Overall Score: {calculateOverallScore()}/10</span>
            </div>
            <div style={{ height: "8px", backgroundColor: "#e5e7eb", borderRadius: "4px" }}>
              <div
                style={{
                  width: `${Math.min(((currentQuestionIndex + 1) / totalQuestions) * 100, 100)}%`,
                  height: "100%",
                  backgroundColor: "#4f46e5",
                  borderRadius: "4px",
                  transition: "width 0.3s",
                }}
              ></div>
            </div>
          </div>

          <div className="question-card" style={{ marginBottom: "30px", padding: "20px", border: "1px solid #ddd", borderRadius: "8px" }}>
            <h4 style={{ marginBottom: "15px", color: "#374151" }}>
              Question {currentQuestionIndex + 1}:
            </h4>
            <p style={{ fontSize: "18px", marginBottom: "12px" }}>{currentQuestion.question_text}</p>

          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>Your Answer:</label>
            <textarea
              value={answers[currentQuestionIndex] || ""}
              onChange={handleAnswerChange}
              placeholder="Type your answer here..."
              rows="6"
              style={{
                width: "100%",
                padding: "12px",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                fontSize: "16px",
                resize: "vertical",
              }}
            />
          </div>

            <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
              <button
                onClick={evaluateAnswer}
                disabled={evaluating}
                style={{
                  padding: "10px 20px",
                  backgroundColor: evaluating ? "#ccc" : "#059669",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: evaluating ? "not-allowed" : "pointer",
                  flex: 1,
                }}
              >
                {evaluating ? "Evaluating..." : "Get AI Feedback"}
              </button>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <button
                onClick={goToPreviousQuestion}
                disabled={currentQuestionIndex === 0}
                style={{
                  padding: "8px 16px",
                  backgroundColor: currentQuestionIndex === 0 ? "#f3f4f6" : "#4f46e5",
                  color: currentQuestionIndex === 0 ? "#9ca3af" : "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: currentQuestionIndex === 0 ? "not-allowed" : "pointer",
                }}
              >
                Previous Question
              </button>

              <button
                onClick={goToNextQuestion}
                style={{
                  padding: "8px 16px",
                  backgroundColor: "#4f46e5",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                Next Question
              </button>
            </div>
          </div>

          {feedback[currentQuestionIndex] && (
            <div
              className="feedback-card"
              style={{
                marginTop: "30px",
                padding: "20px",
                border: "1px solid #10b981",
                borderRadius: "8px",
                backgroundColor: "#f0fdf4",
              }}
            >
              <h4 style={{ marginBottom: "15px", color: "#065f46" }}>
                AI Feedback{" "}
                {feedback[currentQuestionIndex].score !== undefined
                  ? `(Score: ${feedback[currentQuestionIndex].score}/10)`
                  : ""}
              </h4>

              {feedback[currentQuestionIndex].error ? (
                <p style={{ color: "#dc2626" }}>Error: {feedback[currentQuestionIndex].error}</p>
              ) : (
                <>
                  {feedback[currentQuestionIndex].strength && (
                    <div style={{ marginBottom: "15px" }}>
                      <h5 style={{ color: "#065f46", marginBottom: "8px" }}>Strengths:</h5>
                      <ul style={{ marginLeft: "20px" }}>
                        {feedback[currentQuestionIndex].strength.map((item, index) => (
                          <li key={index} style={{ marginBottom: "5px" }}>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {feedback[currentQuestionIndex].improvement && (
                    <div>
                      <h5 style={{ color: "#b91c1c", marginBottom: "8px" }}>Areas for Improvement:</h5>
                      <ul style={{ marginLeft: "20px" }}>
                        {feedback[currentQuestionIndex].improvement.map((item, index) => (
                          <li key={index} style={{ marginBottom: "5px" }}>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          <div style={{ marginTop: "40px" }}>
            <h4>Questions So Far</h4>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "10px" }}>
              {interviewQuestions.map((question, index) => (
                <div
                  key={question.id}
                  onClick={() => setCurrentQuestionIndex(index)}
                  style={{
                    padding: "12px",
                    border: "2px solid",
                    borderColor:
                      currentQuestionIndex === index ? "#4f46e5" : feedback[index] ? "#10b981" : "#d1d5db",
                    borderRadius: "6px",
                    backgroundColor:
                      currentQuestionIndex === index ? "#eef2ff" : feedback[index] ? "#f0fdf4" : "white",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                >
                  <div style={{ fontSize: "14px", fontWeight: "bold", marginBottom: "5px" }}>Q{index + 1}</div>
                  <div style={{ fontSize: "12px", color: "#6b7280", height: "40px", overflow: "hidden" }}>
                    {question.question_text.substring(0, 60)}...
                  </div>
                  <div style={{ fontSize: "12px", marginTop: "5px" }}>
                    {feedback[index] ? (
                      <span style={{ color: "#059669" }}>✓ Score: {feedback[index].score}/10</span>
                    ) : answers[index] ? (
                      <span style={{ color: "#f59e0b" }}>✎ Answered</span>
                    ) : (
                      <span style={{ color: "#9ca3af" }}>Not answered</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {!loading && !interviewStarted && finalScore !== null && (
        <div style={{ marginTop: "20px", padding: "16px", border: "1px solid #e5e7eb", borderRadius: "8px", backgroundColor: "#f0fdf4" }}>
          <h3 style={{ marginTop: 0, color: "#065f46" }}>Interview Complete</h3>
          <p style={{ margin: 0, color: "#065f46" }}>Final Score: {finalScore}/10</p>
        </div>
      )}

      {!loading && !interviewStarted && reviewLoading && (
        <div style={{ marginTop: "20px" }}>
          <p>Loading interview session...</p>
        </div>
      )}

      {!loading && !interviewStarted && reviewSession && (
        <div style={{ marginTop: "20px", padding: "16px", border: "1px solid #e5e7eb", borderRadius: "8px", backgroundColor: "#ffffff" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <h3 style={{ margin: 0 }}>Interview Review</h3>
            <button
              onClick={() => setReviewSession(null)}
              style={{
                padding: "6px 10px",
                backgroundColor: "#e5e7eb",
                color: "#111827",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
              }}
            >
              Close
            </button>
          </div>
          <p style={{ marginTop: 0, color: "#6b7280" }}>
            Final Score: {reviewSession.final_score ?? 0}/10
          </p>
          {reviewSession.questions && reviewSession.questions.length > 0 && (
            <div style={{ display: "grid", gap: "12px" }}>
              {reviewSession.questions.map((q) => {
                const answer = (reviewSession.answers || []).find((a) => a.question_id === q.id) || {};
                return (
                  <div key={q.id} style={{ border: "1px solid #e5e7eb", borderRadius: "8px", padding: "12px" }}>
                    <div style={{ fontWeight: "600", color: "#111827", marginBottom: "6px" }}>
                      Q: {q.question_text}
                    </div>
                    <div style={{ fontSize: "14px", color: "#374151", marginBottom: "6px" }}>
                      <strong>Answer:</strong> {answer.answer_text || "No answer recorded."}
                    </div>
                    {answer.feedback_json && (
                      <div style={{ fontSize: "13px", color: "#374151" }}>
                        <strong>Feedback:</strong>
                        <div style={{ marginTop: "4px" }}>
                          {renderFeedbackDetails(answer.feedback_json)}
                        </div>
                      </div>
                    )}
                    {answer.score !== undefined && (
                      <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "6px" }}>
                        Score: {answer.score}/10
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
      </div>
    </>
  );
}

