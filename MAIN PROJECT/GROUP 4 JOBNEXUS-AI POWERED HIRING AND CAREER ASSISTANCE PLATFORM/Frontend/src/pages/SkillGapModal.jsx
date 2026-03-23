// Frontend/src/pages/SkillGapModal.jsx
import React, { useState, useEffect } from "react";
import { X, BookOpen, Youtube, Globe, Award, Clock, TrendingUp, ExternalLink, ChevronRight, Star, Users, DollarSign } from "lucide-react";

const SkillGapModal = ({ isOpen, onClose, jobId, jobTitle, candidateId, matchPercentage }) => {
  const [loading, setLoading] = useState(true);
  const [analysisData, setAnalysisData] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("missing-skills");
  const [expandedSkills, setExpandedSkills] = useState({});

  useEffect(() => {
    if (isOpen && jobId && candidateId) {
      fetchSkillGapAnalysis();
    }
  }, [isOpen, jobId, candidateId]);

  const fetchSkillGapAnalysis = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append("candidate_id", candidateId);
      
      const response = await fetch(
        `http://localhost:8000/api/skill-gap-analysis/${jobId}`,
        {
          method: "POST",
          body: formData,
        }
      );
      
      const data = await response.json();
      
      if (data.success) {
        setAnalysisData(data);
      } else {
        setError(data.message || "Failed to analyze skill gap");
      }
    } catch (error) {
      console.error("Skill gap analysis error:", error);
      setError("Server error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const toggleSkillExpansion = (skill) => {
    setExpandedSkills(prev => ({
      ...prev,
      [skill]: !prev[skill]
    }));
  };

  const getCourseSourceIcon = (source) => {
    switch(source) {
      case "youtube":
        return <Youtube size={16} />;
      case "coursera":
        return <BookOpen size={16} />;
      case "udemy":
        return <Award size={16} />;
      case "edx":
        return <Globe size={16} />;
      default:
        return <Globe size={16} />;
    }
  };

  const getSourceColor = (source) => {
    switch(source) {
      case "youtube": return "#FF0000";
      case "coursera": return "#0056D2";
      case "udemy": return "#A435F0";
      case "edx": return "#0A6EB4";
      case "linkedin_learning": return "#0A66C2";
      default: return "#6B7280";
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1000,
      padding: "20px"
    }}>
      <div className="modal-content" style={{
        backgroundColor: "white",
        borderRadius: "12px",
        width: "100%",
        maxWidth: "900px",
        maxHeight: "90vh",
        overflow: "hidden",
        boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
      }}>
        {/* Modal Header */}
        <div style={{
          padding: "24px",
          borderBottom: "1px solid #E5E7EB",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <div>
            <h2 style={{
              fontSize: "20px",
              fontWeight: "600",
              color: "#111827",
              marginBottom: "4px"
            }}>
              Skill Gap Analysis & Course Recommendations
            </h2>
            <p style={{
              fontSize: "14px",
              color: "#6B7280"
            }}>
              For: <span style={{ fontWeight: "500" }}>{jobTitle}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "8px",
              borderRadius: "6px",
              color: "#6B7280",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <X size={24} />
          </button>
        </div>

        {/* Loading State */}
        {loading && (
          <div style={{
            padding: "60px 24px",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "16px"
          }}>
            <div className="spinner" style={{
              width: "48px",
              height: "48px",
              border: "4px solid #E5E7EB",
              borderTopColor: "#4F46E5",
              borderRadius: "50%",
              animation: "spin 1s linear infinite"
            }} />
            <div>
              <p style={{ fontWeight: "500", color: "#111827", marginBottom: "4px" }}>
                Analyzing Skill Gap
              </p>
              <p style={{ color: "#6B7280", fontSize: "14px" }}>
                Finding missing skills and course recommendations...
              </p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div style={{
            padding: "40px 24px",
            textAlign: "center"
          }}>
            <div style={{
              width: "64px",
              height: "64px",
              backgroundColor: "#FEF2F2",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
              color: "#DC2626"
            }}>
              <X size={32} />
            </div>
            <h3 style={{
              fontSize: "18px",
              fontWeight: "600",
              color: "#111827",
              marginBottom: "8px"
            }}>
              Analysis Failed
            </h3>
            <p style={{
              color: "#6B7280",
              marginBottom: "24px"
            }}>
              {error}
            </p>
            <button
              onClick={fetchSkillGapAnalysis}
              style={{
                padding: "10px 20px",
                backgroundColor: "#4F46E5",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontWeight: "500"
              }}
            >
              Try Again
            </button>
          </div>
        )}

        {/* Analysis Results */}
        {analysisData && !loading && (
          <>
            {/* Stats Overview */}
            <div style={{
              padding: "24px",
              borderBottom: "1px solid #E5E7EB",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "16px",
              backgroundColor: "#F9FAFB"
            }}>
              <div style={{
                backgroundColor: "white",
                padding: "16px",
                borderRadius: "8px",
                border: "1px solid #E5E7EB",
                textAlign: "center"
              }}>
                <div style={{
                  fontSize: "32px",
                  fontWeight: "700",
                  color: matchPercentage >= 70 ? "#10B981" : matchPercentage >= 50 ? "#F59E0B" : "#EF4444",
                  marginBottom: "4px"
                }}>
                  {matchPercentage}%
                </div>
                <div style={{
                  fontSize: "14px",
                  color: "#6B7280"
                }}>
                  Current Match Score
                </div>
              </div>

              <div style={{
                backgroundColor: "white",
                padding: "16px",
                borderRadius: "8px",
                border: "1px solid #E5E7EB",
                textAlign: "center"
              }}>
                <div style={{
                  fontSize: "32px",
                  fontWeight: "700",
                  color: analysisData.missing_skills_count > 0 ? "#EF4444" : "#10B981",
                  marginBottom: "4px"
                }}>
                  {analysisData.missing_skills_count}
                </div>
                <div style={{
                  fontSize: "14px",
                  color: "#6B7280"
                }}>
                  Missing Skills
                </div>
              </div>

              <div style={{
                backgroundColor: "white",
                padding: "16px",
                borderRadius: "8px",
                border: "1px solid #E5E7EB",
                textAlign: "center"
              }}>
                <div style={{
                  fontSize: "32px",
                  fontWeight: "700",
                  color: "#4F46E5",
                  marginBottom: "4px"
                }}>
                  {analysisData.learning_path?.estimated_weeks || "1-4"}
                </div>
                <div style={{
                  fontSize: "14px",
                  color: "#6B7280"
                }}>
                  Weeks to Learn
                </div>
              </div>

              <div style={{
                backgroundColor: "white",
                padding: "16px",
                borderRadius: "8px",
                border: "1px solid #E5E7EB",
                textAlign: "center"
              }}>
                <div style={{
                  fontSize: "32px",
                  fontWeight: "700",
                  color: "#8B5CF6",
                  marginBottom: "4px"
                }}>
                  {analysisData.course_count || 0}
                </div>
                <div style={{
                  fontSize: "14px",
                  color: "#6B7280"
                }}>
                  Courses Found
                </div>
              </div>
            </div>

            {/* Tabs Navigation */}
            <div style={{
              display: "flex",
              borderBottom: "1px solid #E5E7EB",
              backgroundColor: "#F9FAFB"
            }}>
              <button
                onClick={() => setActiveTab("missing-skills")}
                style={{
                  padding: "16px 24px",
                  backgroundColor: activeTab === "missing-skills" ? "white" : "transparent",
                  border: "none",
                  borderRight: "1px solid #E5E7EB",
                  cursor: "pointer",
                  fontWeight: activeTab === "missing-skills" ? "600" : "500",
                  color: activeTab === "missing-skills" ? "#4F46E5" : "#6B7280",
                  borderBottom: activeTab === "missing-skills" ? "2px solid #4F46E5" : "none",
                  flex: 1,
                  textAlign: "center"
                }}
              >
                Missing Skills
              </button>
              <button
                onClick={() => setActiveTab("courses")}
                style={{
                  padding: "16px 24px",
                  backgroundColor: activeTab === "courses" ? "white" : "transparent",
                  border: "none",
                  borderRight: "1px solid #E5E7EB",
                  cursor: "pointer",
                  fontWeight: activeTab === "courses" ? "600" : "500",
                  color: activeTab === "courses" ? "#4F46E5" : "#6B7280",
                  borderBottom: activeTab === "courses" ? "2px solid #4F46E5" : "none",
                  flex: 1,
                  textAlign: "center"
                }}
              >
                Course Recommendations
              </button>
              <button
                onClick={() => setActiveTab("learning-path")}
                style={{
                  padding: "16px 24px",
                  backgroundColor: activeTab === "learning-path" ? "white" : "transparent",
                  border: "none",
                  cursor: "pointer",
                  fontWeight: activeTab === "learning-path" ? "600" : "500",
                  color: activeTab === "learning-path" ? "#4F46E5" : "#6B7280",
                  borderBottom: activeTab === "learning-path" ? "2px solid #4F46E5" : "none",
                  flex: 1,
                  textAlign: "center"
                }}
              >
                Learning Path
              </button>
            </div>

            {/* Tab Content */}
            <div style={{
              padding: "24px",
              maxHeight: "calc(90vh - 300px)",
              overflowY: "auto"
            }}>
              {/* Missing Skills Tab */}
              {activeTab === "missing-skills" && (
                <div>
                  <h3 style={{
                    fontSize: "18px",
                    fontWeight: "600",
                    marginBottom: "16px",
                    color: "#111827"
                  }}>
                    Skills to Develop ({analysisData.missing_skills.length})
                  </h3>
                  <p style={{
                    color: "#6B7280",
                    marginBottom: "24px",
                    fontSize: "14px"
                  }}>
                    These skills are required for the job but not found in your resume. 
                    Focus on learning these to improve your match score.
                  </p>
                  
                  <div style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px"
                  }}>
                    {analysisData.missing_skills.map((skill, index) => (
                      <div key={index} style={{
                        backgroundColor: "#FEF3C7",
                        border: "1px solid #FBBF24",
                        borderRadius: "8px",
                        padding: "16px",
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "12px"
                      }}>
                        <div style={{
                          backgroundColor: "#F59E0B",
                          color: "white",
                          width: "32px",
                          height: "32px",
                          borderRadius: "6px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0
                        }}>
                          <span style={{ fontWeight: "600", fontSize: "14px" }}>
                            {index + 1}
                          </span>
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: "8px"
                          }}>
                            <h4 style={{
                              fontWeight: "600",
                              fontSize: "16px",
                              color: "#92400E"
                            }}>
                              {skill}
                            </h4>
                            <button
                              onClick={() => toggleSkillExpansion(skill)}
                              style={{
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                color: "#D97706",
                                display: "flex",
                                alignItems: "center",
                                gap: "4px"
                              }}
                            >
                              <ChevronRight size={16} style={{
                                transform: expandedSkills[skill] ? "rotate(90deg)" : "none",
                                transition: "transform 0.2s"
                              }} />
                              <span style={{ fontSize: "14px" }}>
                                {expandedSkills[skill] ? "Show less" : "Get courses"}
                              </span>
                            </button>
                          </div>
                          
                          {expandedSkills[skill] && analysisData.course_recommendations?.[skill] && (
                            <div style={{
                              marginTop: "12px",
                              paddingTop: "12px",
                              borderTop: "1px solid #FBBF24"
                            }}>
                              <div style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
                                gap: "12px"
                              }}>
                                {[...(analysisData.course_recommendations[skill].online_courses || []),
                                  ...(analysisData.course_recommendations[skill].youtube_videos || [])]
                                  .slice(0, 3)
                                  .map((course, idx) => (
                                    <a
                                      key={idx}
                                      href={course.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      style={{
                                        display: "block",
                                        backgroundColor: "white",
                                        border: "1px solid #E5E7EB",
                                        borderRadius: "6px",
                                        padding: "12px",
                                        textDecoration: "none",
                                        color: "inherit",
                                        transition: "all 0.2s"
                                      }}
                                      onMouseOver={(e) => {
                                        e.currentTarget.style.boxShadow = "0 4px 6px -1px rgba(0, 0, 0, 0.1)";
                                        e.currentTarget.style.borderColor = "#D1D5DB";
                                      }}
                                      onMouseOut={(e) => {
                                        e.currentTarget.style.boxShadow = "none";
                                        e.currentTarget.style.borderColor = "#E5E7EB";
                                      }}
                                    >
                                      <div style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "8px",
                                        marginBottom: "8px"
                                      }}>
                                        {getCourseSourceIcon(course.source)}
                                        <span style={{
                                          fontSize: "12px",
                                          fontWeight: "500",
                                          color: getSourceColor(course.source)
                                        }}>
                                          {course.source.charAt(0).toUpperCase() + course.source.slice(1)}
                                        </span>
                                        {course.free && (
                                          <span style={{
                                            fontSize: "12px",
                                            backgroundColor: "#10B981",
                                            color: "white",
                                            padding: "2px 6px",
                                            borderRadius: "4px",
                                            marginLeft: "auto"
                                          }}>
                                            FREE
                                          </span>
                                        )}
                                      </div>
                                      <h5 style={{
                                        fontSize: "14px",
                                        fontWeight: "500",
                                        marginBottom: "4px",
                                        color: "#111827"
                                      }}>
                                        {course.title.length > 60 ? course.title.substring(0, 60) + "..." : course.title}
                                      </h5>
                                      {course.duration && course.duration !== "Varies" && (
                                        <div style={{
                                          display: "flex",
                                          alignItems: "center",
                                          gap: "4px",
                                          fontSize: "12px",
                                          color: "#6B7280",
                                          marginTop: "4px"
                                        }}>
                                          <Clock size={12} />
                                          <span>{course.duration}</span>
                                        </div>
                                      )}
                                    </a>
                                  ))
                                }
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Course Recommendations Tab */}
              {activeTab === "courses" && analysisData.course_recommendations && (
                <div>
                  <h3 style={{
                    fontSize: "18px",
                    fontWeight: "600",
                    marginBottom: "24px",
                    color: "#111827"
                  }}>
                    Recommended Courses by Skill
                  </h3>
                  
                  {Object.entries(analysisData.course_recommendations).map(([skill, recs]) => (
                    <div key={skill} style={{
                      marginBottom: "32px",
                      border: "1px solid #E5E7EB",
                      borderRadius: "8px",
                      overflow: "hidden"
                    }}>
                      <div style={{
                        backgroundColor: "#4F46E5",
                        color: "white",
                        padding: "12px 16px",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px"
                      }}>
                        <BookOpen size={18} />
                        <h4 style={{ fontWeight: "600", fontSize: "16px" }}>
                          {skill}
                        </h4>
                      </div>
                      
                      <div style={{ padding: "16px" }}>
                        {/* YouTube Videos */}
                        {recs.youtube_videos && recs.youtube_videos.length > 0 && (
                          <div style={{ marginBottom: "24px" }}>
                            <div style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                              marginBottom: "12px"
                            }}>
                              <Youtube size={20} color="#FF0000" />
                              <h5 style={{
                                fontWeight: "600",
                                fontSize: "14px",
                                color: "#111827"
                              }}>
                                YouTube Tutorials
                              </h5>
                            </div>
                            <div style={{
                              display: "grid",
                              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                              gap: "16px"
                            }}>
                              {recs.youtube_videos.slice(0, 3).map((video, idx) => (
                                <a
                                  key={idx}
                                  href={video.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{
                                    display: "block",
                                    backgroundColor: "white",
                                    border: "1px solid #E5E7EB",
                                    borderRadius: "8px",
                                    overflow: "hidden",
                                    textDecoration: "none",
                                    color: "inherit",
                                    transition: "all 0.2s"
                                  }}
                                  onMouseOver={(e) => {
                                    e.currentTarget.style.boxShadow = "0 4px 6px -1px rgba(0, 0, 0, 0.1)";
                                    e.currentTarget.style.transform = "translateY(-2px)";
                                  }}
                                  onMouseOut={(e) => {
                                    e.currentTarget.style.boxShadow = "none";
                                    e.currentTarget.style.transform = "none";
                                  }}
                                >
                                  <div style={{
                                    position: "relative",
                                    paddingTop: "56.25%", // 16:9 aspect ratio
                                    backgroundColor: "#F3F4F6"
                                  }}>
                                    <img
                                      src={video.thumbnail}
                                      alt={video.title}
                                      style={{
                                        position: "absolute",
                                        top: 0,
                                        left: 0,
                                        width: "100%",
                                        height: "100%",
                                        objectFit: "cover"
                                      }}
                                    />
                                    <div style={{
                                      position: "absolute",
                                      bottom: "8px",
                                      right: "8px",
                                      backgroundColor: "rgba(0, 0, 0, 0.75)",
                                      color: "white",
                                      padding: "2px 6px",
                                      borderRadius: "4px",
                                      fontSize: "12px"
                                    }}>
                                      YouTube
                                    </div>
                                  </div>
                                  <div style={{ padding: "12px" }}>
                                    <h6 style={{
                                      fontSize: "14px",
                                      fontWeight: "500",
                                      marginBottom: "4px",
                                      color: "#111827",
                                      lineHeight: "1.4"
                                    }}>
                                      {video.title}
                                    </h6>
                                    <p style={{
                                      fontSize: "12px",
                                      color: "#6B7280",
                                      marginBottom: "8px"
                                    }}>
                                      {video.channel}
                                    </p>
                                    <div style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "12px",
                                      fontSize: "11px",
                                      color: "#6B7280"
                                    }}>
                                      <span style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "4px"
                                      }}>
                                        <Clock size={10} />
                                        {video.duration}
                                      </span>
                                      <span style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "4px"
                                      }}>
                                        <Users size={10} />
                                        {video.views}
                                      </span>
                                    </div>
                                  </div>
                                </a>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Online Courses */}
                        {recs.online_courses && recs.online_courses.length > 0 && (
                          <div>
                            <div style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                              marginBottom: "12px"
                            }}>
                              <Globe size={20} color="#4F46E5" />
                              <h5 style={{
                                fontWeight: "600",
                                fontSize: "14px",
                                color: "#111827"
                              }}>
                                Online Courses
                              </h5>
                            </div>
                            <div style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: "12px"
                            }}>
                              {recs.online_courses.slice(0, 5).map((course, idx) => (
                                <a
                                  key={idx}
                                  href={course.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    padding: "12px",
                                    backgroundColor: "white",
                                    border: "1px solid #E5E7EB",
                                    borderRadius: "6px",
                                    textDecoration: "none",
                                    color: "inherit",
                                    transition: "all 0.2s"
                                  }}
                                  onMouseOver={(e) => {
                                    e.currentTarget.style.backgroundColor = "#F9FAFB";
                                    e.currentTarget.style.borderColor = "#D1D5DB";
                                  }}
                                  onMouseOut={(e) => {
                                    e.currentTarget.style.backgroundColor = "white";
                                    e.currentTarget.style.borderColor = "#E5E7EB";
                                  }}
                                >
                                  <div style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "12px",
                                    flex: 1
                                  }}>
                                    <div style={{
                                      width: "40px",
                                      height: "40px",
                                      borderRadius: "6px",
                                      backgroundColor: getSourceColor(course.source) + "20",
                                      color: getSourceColor(course.source),
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      flexShrink: 0
                                    }}>
                                      {getCourseSourceIcon(course.source)}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                      <div style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "8px",
                                        marginBottom: "2px"
                                      }}>
                                        <h6 style={{
                                          fontSize: "14px",
                                          fontWeight: "500",
                                          color: "#111827",
                                          flex: 1
                                        }}>
                                          {course.title}
                                        </h6>
                                        {course.free ? (
                                          <span style={{
                                            fontSize: "12px",
                                            backgroundColor: "#10B981",
                                            color: "white",
                                            padding: "2px 8px",
                                            borderRadius: "4px",
                                            fontWeight: "500"
                                          }}>
                                            FREE
                                          </span>
                                        ) : course.price && (
                                          <span style={{
                                            fontSize: "12px",
                                            backgroundColor: "#F3F4F6",
                                            color: "#111827",
                                            padding: "2px 8px",
                                            borderRadius: "4px",
                                            fontWeight: "500",
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "4px"
                                          }}>
                                            <DollarSign size={10} />
                                            {course.price}
                                          </span>
                                        )}
                                      </div>
                                      <p style={{
                                        fontSize: "12px",
                                        color: "#6B7280",
                                        marginBottom: "4px"
                                      }}>
                                        {course.provider || course.instructor || course.source}
                                      </p>
                                      <div style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "12px",
                                        fontSize: "11px",
                                        color: "#6B7280"
                                      }}>
                                        {course.duration && course.duration !== "Varies" && (
                                          <span style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "4px"
                                          }}>
                                            <Clock size={10} />
                                            {course.duration}
                                          </span>
                                        )}
                                        {course.rating && (
                                          <span style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "4px"
                                          }}>
                                            <Star size={10} fill="#FBBF24" color="#FBBF24" />
                                            {course.rating} ★
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  <ExternalLink size={16} color="#9CA3AF" />
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Learning Path Tab */}
              {activeTab === "learning-path" && analysisData.learning_path && (
                <div>
                  <h3 style={{
                    fontSize: "18px",
                    fontWeight: "600",
                    marginBottom: "16px",
                    color: "#111827"
                  }}>
                    Personalized Learning Path
                  </h3>
                  
                  <div style={{
                    backgroundColor: "#F0F9FF",
                    border: "1px solid #7DD3FC",
                    borderRadius: "8px",
                    padding: "20px",
                    marginBottom: "24px"
                  }}>
                    <div style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                      gap: "16px",
                      marginBottom: "16px"
                    }}>
                      <div>
                        <div style={{
                          fontSize: "14px",
                          color: "#0369A1",
                          marginBottom: "4px",
                          fontWeight: "500"
                        }}>
                          Estimated Time
                        </div>
                        <div style={{
                          fontSize: "20px",
                          fontWeight: "700",
                          color: "#0C4A6E"
                        }}>
                          {analysisData.learning_path.estimated_weeks} weeks
                        </div>
                      </div>
                      <div>
                        <div style={{
                          fontSize: "14px",
                          color: "#0369A1",
                          marginBottom: "4px",
                          fontWeight: "500"
                        }}>
                          Weekly Commitment
                        </div>
                        <div style={{
                          fontSize: "20px",
                          fontWeight: "700",
                          color: "#0C4A6E"
                        }}>
                          {analysisData.learning_path.weekly_hours || 10} hours/week
                        </div>
                      </div>
                      <div>
                        <div style={{
                          fontSize: "14px",
                          color: "#0369A1",
                          marginBottom: "4px",
                          fontWeight: "500"
                        }}>
                          Total Hours
                        </div>
                        <div style={{
                          fontSize: "20px",
                          fontWeight: "700",
                          color: "#0C4A6E"
                        }}>
                          {analysisData.learning_path.total_hours} hours
                        </div>
                      </div>
                    </div>
                    
                    <p style={{
                      color: "#0C4A6E",
                      fontSize: "14px",
                      lineHeight: "1.5"
                    }}>
                      {analysisData.learning_path.recommendation || 
                       "Follow this structured path to systematically develop the required skills."}
                    </p>
                  </div>

                  <h4 style={{
                    fontSize: "16px",
                    fontWeight: "600",
                    marginBottom: "16px",
                    color: "#111827"
                  }}>
                    Priority Learning Order
                  </h4>
                  
                  <div style={{
                    position: "relative",
                    paddingLeft: "24px"
                  }}>
                    {/* Timeline line */}
                    <div style={{
                      position: "absolute",
                      left: "11px",
                      top: "0",
                      bottom: "0",
                      width: "2px",
                      backgroundColor: "#E5E7EB"
                    }} />
                    
                    {analysisData.learning_path.prioritized_skills?.map((skill, index) => (
                      <div key={index} style={{
                        position: "relative",
                        marginBottom: "24px",
                        paddingLeft: "20px"
                      }}>
                        {/* Timeline dot */}
                        <div style={{
                          position: "absolute",
                          left: "-11px",
                          top: "0",
                          width: "24px",
                          height: "24px",
                          backgroundColor: "#4F46E5",
                          borderRadius: "50%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "white",
                          fontWeight: "600",
                          fontSize: "12px"
                        }}>
                          {index + 1}
                        </div>
                        
                        <div style={{
                          backgroundColor: "white",
                          border: "1px solid #E5E7EB",
                          borderRadius: "8px",
                          padding: "16px",
                          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)"
                        }}>
                          <div style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: "8px"
                          }}>
                            <h5 style={{
                              fontSize: "15px",
                              fontWeight: "600",
                              color: "#111827"
                            }}>
                              {skill}
                            </h5>
                            <span style={{
                              fontSize: "12px",
                              padding: "4px 8px",
                              borderRadius: "4px",
                              fontWeight: "500",
                              backgroundColor: analysisData.learning_path.skill_levels?.[skill] === "advanced" ? "#FEF2F2" :
                                              analysisData.learning_path.skill_levels?.[skill] === "intermediate" ? "#FFFBEB" : "#ECFDF5",
                              color: analysisData.learning_path.skill_levels?.[skill] === "advanced" ? "#DC2626" :
                                     analysisData.learning_path.skill_levels?.[skill] === "intermediate" ? "#D97706" : "#059669"
                            }}>
                              {analysisData.learning_path.skill_levels?.[skill] || "Beginner"}
                            </span>
                          </div>
                          
                          <div style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "16px",
                            fontSize: "13px",
                            color: "#6B7280"
                          }}>
                            <div style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "4px"
                            }}>
                              <Clock size={12} />
                              <span>
                                {analysisData.learning_path.skill_levels?.[skill] === "advanced" ? "40-60 hours" :
                                 analysisData.learning_path.skill_levels?.[skill] === "intermediate" ? "20-40 hours" : "10-20 hours"}
                              </span>
                            </div>
                            <div style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "4px"
                            }}>
                              <TrendingUp size={12} />
                              <span>
                                {analysisData.learning_path.skill_levels?.[skill] === "advanced" ? "Advanced Level" :
                                 analysisData.learning_path.skill_levels?.[skill] === "intermediate" ? "Intermediate Level" : "Beginner Level"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div style={{
              padding: "16px 24px",
              borderTop: "1px solid #E5E7EB",
              display: "flex",
              justifyContent: "space-between",
              backgroundColor: "#F9FAFB"
            }}>
              <button
                onClick={() => {
                  // Implement adding to resume
                  alert("Feature coming soon: Add missing skills to your resume");
                }}
                style={{
                  padding: "10px 20px",
                  backgroundColor: "white",
                  color: "#4F46E5",
                  border: "1px solid #4F46E5",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontWeight: "500",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px"
                }}
              >
                <BookOpen size={16} />
                Add to Resume Builder
              </button>
              
              <div style={{ display: "flex", gap: "12px" }}>
                <button
                  onClick={fetchSkillGapAnalysis}
                  style={{
                    padding: "10px 20px",
                    backgroundColor: "#F3F4F6",
                    color: "#4B5563",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontWeight: "500"
                  }}
                >
                  Refresh Analysis
                </button>
                <button
                  onClick={onClose}
                  style={{
                    padding: "10px 20px",
                    backgroundColor: "#4F46E5",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontWeight: "500"
                  }}
                >
                  Done
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SkillGapModal;
