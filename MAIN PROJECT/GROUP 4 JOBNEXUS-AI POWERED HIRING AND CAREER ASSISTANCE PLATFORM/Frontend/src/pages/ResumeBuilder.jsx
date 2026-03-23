import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, ArrowRight, Save, AlertCircle } from "lucide-react";
import ProfileIcon from "./ProfileIcon";
import "./Recruiters.css";

// Import steps
import TemplateStep from "./TemplateStep";
import PersonalInfoStep from "./PersonalInfoStep";
import ExperienceStep from "./ExperienceStep";
import EducationStep from "./EducationStep";
import SkillsStep from "./SkillsStep";
// Template selection removed

const ResumeBuilder = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem("user"));
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [tailorSummary, setTailorSummary] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [resumeId, setResumeId] = useState(null);
  const [resumeTitle, setResumeTitle] = useState("");
  const [resumeData, setResumeData] = useState({
    personalInfo: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      address: "",
      linkedIn: "",
      portfolio: "",
      summary: "",
      photo: ""
    },
    experience: [],
    education: [],
    skills: [],
    selectedTemplate: 1,
    settings: {
      font: "Arial",
      color: "#2563eb",
      spacing: "normal"
    }
  });

  const steps = [
    { id: 1, title: "Personal Info", component: PersonalInfoStep },
    { id: 2, title: "Experience", component: ExperienceStep },
    { id: 3, title: "Education", component: EducationStep },
    { id: 4, title: "Skills", component: SkillsStep },
    { id: 5, title: "Template", component: TemplateStep }
  ];

  // Validation function
  const validateCurrentStep = () => {
    setError("");

    if (currentStep === steps.length && !resumeData.selectedTemplate) {
      setError("Please select a resume template to continue.");
      return false;
    }

    return true;
  };

  const handleNext = () => {
    if (!validateCurrentStep()) {
      return;
    }

    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    } else {
      // Last step - trigger save
      handleSaveResume();
    }
  };

  const handleBack = () => {
    setError("");
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSaveResume = async () => {
    setIsLoading(true);
    setError("");

    try {
      const user = JSON.parse(localStorage.getItem("user"));
      
      if (!user || !user.id) {
        throw new Error("User not found. Please log in again.");
      }

      const derivedTitle = (() => {
        const first = resumeData.personalInfo?.firstName?.trim() || "";
        const last = resumeData.personalInfo?.lastName?.trim() || "";
        const fullName = `${first} ${last}`.trim();
        return fullName ? `${fullName} - Resume` : "Resume Builder - Resume";
      })();
      const finalTitle = resumeTitle?.trim() ? resumeTitle.trim() : derivedTitle;

      console.log("Sending resume data:", {
        user_id: user.id,
        title: finalTitle,
        resume_data: resumeData,
        template_id: resumeData.selectedTemplate || 1
      });

      const response = await fetch("http://localhost/JobNexus/Backend-PHP/api/save-resume.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: user.id,
          title: finalTitle,
          resume_data: resumeData,
          template_id: resumeData.selectedTemplate || 1,
          resume_id: resumeId || undefined
        })
      });

      console.log("Response status:", response.status);

      // Check if response is ok
      if (!response.ok) {
        throw new Error(`Server error: ${response.status} ${response.statusText}`);
      }

      // Check content type
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        console.error("Non-JSON response:", text);
        throw new Error("Server returned invalid response format");
      }

      const data = await response.json();
      console.log("Server response:", data);

      if (data.success) {
        alert("Resume saved successfully!");
        navigate("/candidates");
      } else {
        throw new Error(data.message || "Failed to save resume");
      }
    } catch (error) {
      console.error("Full error:", error);
      setError(error.message || "Failed to save resume. Please try again.");
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsLoading(false);
    }
  };

  const CurrentStepComponent = steps[currentStep - 1].component;
  const handleTemplatePreview = (templateId) => {
    navigate("/resume-preview", {
      state: {
        resumeData: {
          resume_data: {
            ...resumeData,
            selectedTemplate: templateId
          },
          template_id: templateId,
          id: resumeId,
          title: resumeTitle || "Resume Preview"
        }
      }
    });
  };

  useEffect(() => {
    if (!location.state?.resumeData) return;

    const incoming = location.state.resumeData;
    setResumeData((prev) => ({
      ...prev,
      ...incoming,
      selectedTemplate: incoming.selectedTemplate ?? prev.selectedTemplate,
      settings: incoming.settings ?? prev.settings
    }));

    if (location.state.tailorSummary) {
      setTailorSummary(location.state.tailorSummary);
    }

    if (location.state.jobTitle) {
      setJobTitle(location.state.jobTitle);
    }

    if (location.state.resumeId) {
      setResumeId(location.state.resumeId);
    }

    if (location.state.resumeTitle) {
      setResumeTitle(location.state.resumeTitle);
    }
  }, [location.state]);

  return (
    <div className="resume-builder">
      <header className="dashboard-header">
        <div className="dashboard-header-copy">
          <h1 className="dashboard-banner-title" style={{ fontSize: "2.25rem" }}>Resume Builder</h1>
          <p className="dashboard-banner-subtitle">
            {jobTitle ? `Tailoring for: ${jobTitle}` : "Create a professional resume step by step"}
          </p>
        </div>
        <div className="dashboard-header-actions-row">
          <ProfileIcon />
        </div>
      </header>

      <div className="builder-container">
        {/* Error Alert */}
        {error && (
          <div className="error-alert">
            <AlertCircle size={20} />
            <div>
              <strong>Error:</strong> {error}
            </div>
          </div>
        )}

        {/* Tailor Summary */}
        {tailorSummary && (
          <div className="success-alert">
            <div>
              <strong>Tailoring Complete:</strong> {tailorSummary}
            </div>
          </div>
        )}

        {/* Progress Bar */}
        <div className="progress-bar">
          {steps.map((step, index) => (
            <div key={step.id} className="step-container">
              <div className={`step-circle ${currentStep > step.id ? "completed" : currentStep === step.id ? "active" : ""}`}>
                {currentStep > step.id ? "✓" : step.id}
              </div>
              <span className="step-title">{step.title}</span>
              {index < steps.length - 1 && <div className="step-line" />}
            </div>
          ))}
        </div>

        {/* Current Step Content */}
        <div className="step-content">
          <CurrentStepComponent 
            data={resumeData}
            user={user}
            onPreview={handleTemplatePreview}
            updateData={(section, data) => {
              setResumeData(prev => ({
                ...prev,
                [section]: data
              }));
              setError(""); // Clear error when user makes changes
            }}
          />
        </div>

        {/* Navigation Buttons */}
        <div className="builder-footer">
          <button 
            onClick={handleBack}
            disabled={currentStep === 1 || isLoading}
            className="nav-button secondary"
          >
            <ArrowLeft size={18} />
            Back
          </button>
          
          <div className="action-buttons">
            <button 
              onClick={handleSaveResume}
              disabled={isLoading}
              className="nav-button"
            >
              <Save size={18} />
              {isLoading ? "Saving..." : "Save Draft"}
            </button>
            
            <button 
              onClick={handleNext}
              disabled={isLoading}
              className="nav-button primary"
            >
              {isLoading ? "Saving..." : currentStep === steps.length ? "Finish & Save" : "Next"}
              {currentStep < steps.length && !isLoading && <ArrowRight size={18} />}
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .resume-builder {
          min-height: 100vh;
          background: #f9fafb;
        }
        
        .builder-container {
          max-width: 1000px;
          margin: 2rem auto;
          padding: 0 20px;
        }
        
        .error-alert {
          background: #fee2e2;
          border: 1px solid #fecaca;
          border-left: 4px solid #dc2626;
          border-radius: 8px;
          padding: 1rem;
          margin-bottom: 2rem;
          display: flex;
          align-items: center;
          gap: 12px;
          color: #991b1b;
        }

        .success-alert {
          background: #dcfce7;
          border: 1px solid #86efac;
          border-left: 4px solid #16a34a;
          border-radius: 8px;
          padding: 1rem;
          margin-bottom: 2rem;
          display: flex;
          align-items: center;
          gap: 12px;
          color: #166534;
        }

        .progress-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 3rem;
          position: relative;
          flex-wrap: wrap;
          row-gap: 16px;
          overflow: visible;
          padding: 0 8px;
        }
        
        .step-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          flex: 1;
          position: relative;
        }
        
        .step-circle {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          background: #e5e7eb;
          color: #6b7280;
          margin-bottom: 8px;
          transition: all 0.3s;
        }
        
        .step-circle.active {
          background: #4A70A9;
          color: white;
          box-shadow: 0 0 0 4px rgba(74, 112, 169, 0.2);
        }
        
        .step-circle.completed {
          background: #4A70A9;
          color: white;
        }
        
        .step-title {
          font-size: 14px;
          color: #6b7280;
          text-align: center;
        }
        
        .step-line {
          position: absolute;
          top: 20px;
          left: 55%;
          right: -55%;
          height: 2px;
          background: #e5e7eb;
          z-index: -1;
        }
        
        .step-content {
          background: white;
          border-radius: 12px;
          padding: 2rem;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          min-height: 400px;
        }

        .step-content h2 {
          color: #1f2d3d;
        }
        
        .builder-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 2rem;
          padding: 1.5rem 0;
        }
        
        .nav-button {
          padding: 10px 20px;
          border-radius: 8px;
          border: 1px solid #d1d5db;
          background: white;
          color: #374151;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 500;
          transition: all 0.2s;
        }
        
        .nav-button:hover:not(:disabled) {
          background: #f9fafb;
          border-color: #9ca3af;
        }
        
        .nav-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .nav-button.primary {
          background: #4A70A9;
          color: white;
          border: none;
        }
        
        .nav-button.primary:hover:not(:disabled) {
          background: #2F4F79;
        }
        
        .nav-button.secondary {
          background: #f3f4f6;
        }
        
        .action-buttons {
          display: flex;
          gap: 12px;
        }
      `}</style>
    </div>
  );
};

export default ResumeBuilder;
