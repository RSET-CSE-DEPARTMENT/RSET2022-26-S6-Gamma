import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Download, ArrowLeft, Printer } from 'lucide-react';

export default function ResumePreview() {
  const location = useLocation();
  const navigate = useNavigate();
  const resumeData = location.state?.resumeData;
  const resumeDataSafe = resumeData || { resume_data: {} };
  const { resume_data } = resumeDataSafe;
  const [editableResume, setEditableResume] = useState(resume_data || {});
  const [saving, setSaving] = useState(false);
  const resumeId = resumeData?.id ?? resumeData?.resume_id ?? null;
  const user = JSON.parse(localStorage.getItem("user"));

  useEffect(() => {
    setEditableResume(resume_data || {});
  }, [resume_data]);

  if (!resumeData) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p>No resume data found</p>
        <button onClick={() => navigate('/candidate')}>Go Back</button>
      </div>
    );
  }

  const { personalInfo, experience, education, skills, settings } = editableResume;
  const templateId = editableResume?.selectedTemplate ?? resumeData?.template_id ?? 1;

  const templates = {
    1: {
      name: "ATS-Friendly",
      font: "Arial",
      color: "#111827",
      layout: "ats"
    },
    2: {
      name: "Professional",
      font: "Georgia",
      color: "#1f2937",
      layout: "professional"
    },
    3: {
      name: "Creative",
      font: "Trebuchet MS",
      color: "#7c3aed",
      layout: "creative"
    },
    4: {
      name: "Minimalist",
      font: "Calibri",
      color: "#0f172a",
      layout: "minimalist"
    }
  };

  const selectedTemplate = templates[templateId] || templates[1];
  const appliedSettings = {
    font: selectedTemplate.font,
    color: selectedTemplate.color,
    spacing: "normal",
    ...settings
  };
  const spacingClass =
    appliedSettings.spacing === "compact"
      ? "spacing-compact"
      : appliedSettings.spacing === "relaxed"
        ? "spacing-relaxed"
        : "spacing-normal";

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    // Use browser's print dialog with "Save as PDF"
    window.print();
  };

  const updatePersonalInfo = (field, value) => {
    setEditableResume((prev) => ({
      ...prev,
      personalInfo: {
        ...(prev.personalInfo || {}),
        [field]: value
      }
    }));
  };

  const updateExperience = (index, field, value) => {
    setEditableResume((prev) => {
      const next = [...(prev.experience || [])];
      if (!next[index]) return prev;
      next[index] = { ...next[index], [field]: value };
      return { ...prev, experience: next };
    });
  };

  const updateEducation = (index, field, value) => {
    setEditableResume((prev) => {
      const next = [...(prev.education || [])];
      if (!next[index]) return prev;
      next[index] = { ...next[index], [field]: value };
      return { ...prev, education: next };
    });
  };

  const updateSkill = (index, value) => {
    setEditableResume((prev) => {
      const next = [...(prev.skills || [])];
      if (!next[index]) return prev;
      next[index] = value;
      return { ...prev, skills: next };
    });
  };

  const handleSaveEdits = async () => {
    if (!user?.id) {
      alert("Please log in again.");
      return;
    }
    if (!resumeId) {
      alert("Unable to save this resume (missing resume id).");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch("http://localhost/JobNexus/Backend-PHP/api/save-resume.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user.id,
          resume_id: resumeId,
          title: resumeData?.title || null,
          resume_data: editableResume,
          template_id: editableResume?.selectedTemplate ?? resumeData?.template_id ?? 1
        })
      });
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || "Failed to save resume");
      }
      alert("Resume updated successfully!");
    } catch (error) {
      console.error(error);
      alert(error.message || "Failed to save resume");
    } finally {
      setSaving(false);
    }
  };

  const Header = (
    <header className="resume-header">
      <h1 className="name">
        <span
          contentEditable
          suppressContentEditableWarning
          onBlur={(e) => updatePersonalInfo("firstName", e.currentTarget.textContent.trim())}
        >
          {personalInfo?.firstName || ""}
        </span>{" "}
        <span
          contentEditable
          suppressContentEditableWarning
          onBlur={(e) => updatePersonalInfo("lastName", e.currentTarget.textContent.trim())}
        >
          {personalInfo?.lastName || ""}
        </span>
      </h1>
      {personalInfo?.email && (
        <div className="contact-info">
          <span
            contentEditable
            suppressContentEditableWarning
            onBlur={(e) => updatePersonalInfo("email", e.currentTarget.textContent.trim())}
          >
            {personalInfo.email}
          </span>
          {personalInfo?.phone && (
            <span>
              {" | "}
              <span
                contentEditable
                suppressContentEditableWarning
                onBlur={(e) => updatePersonalInfo("phone", e.currentTarget.textContent.trim())}
              >
                {personalInfo.phone}
              </span>
            </span>
          )}
          {personalInfo?.address && (
            <span>
              {" | "}
              <span
                contentEditable
                suppressContentEditableWarning
                onBlur={(e) => updatePersonalInfo("address", e.currentTarget.textContent.trim())}
              >
                {personalInfo.address}
              </span>
            </span>
          )}
        </div>
      )}
      {(personalInfo?.linkedIn || personalInfo?.portfolio) && (
        <div className="contact-info">
          {personalInfo?.linkedIn && (
            <span
              contentEditable
              suppressContentEditableWarning
              onBlur={(e) => updatePersonalInfo("linkedIn", e.currentTarget.textContent.trim())}
            >
              {personalInfo.linkedIn}
            </span>
          )}
          {personalInfo?.linkedIn && personalInfo?.portfolio && <span> {" | "} </span>}
          {personalInfo?.portfolio && (
            <span
              contentEditable
              suppressContentEditableWarning
              onBlur={(e) => updatePersonalInfo("portfolio", e.currentTarget.textContent.trim())}
            >
              {personalInfo.portfolio}
            </span>
          )}
        </div>
      )}
    </header>
  );

  const HeaderNameOnly = (
    <header className="resume-header">
      <h1 className="name">
        <span
          contentEditable
          suppressContentEditableWarning
          onBlur={(e) => updatePersonalInfo("firstName", e.currentTarget.textContent.trim())}
        >
          {personalInfo?.firstName || ""}
        </span>{" "}
        <span
          contentEditable
          suppressContentEditableWarning
          onBlur={(e) => updatePersonalInfo("lastName", e.currentTarget.textContent.trim())}
        >
          {personalInfo?.lastName || ""}
        </span>
      </h1>
    </header>
  );

  const CreativeHeader = (
    <header className="resume-header creative-header">
      <div className="creative-header-left">
        <h1 className="name">
          <span
            contentEditable
            suppressContentEditableWarning
            onBlur={(e) => updatePersonalInfo("firstName", e.currentTarget.textContent.trim())}
          >
            {personalInfo?.firstName || ""}
          </span>{" "}
          <span
            contentEditable
            suppressContentEditableWarning
            onBlur={(e) => updatePersonalInfo("lastName", e.currentTarget.textContent.trim())}
          >
            {personalInfo?.lastName || ""}
          </span>
        </h1>
        <div className="creative-contact">
          {personalInfo?.email && (
            <span
              contentEditable
              suppressContentEditableWarning
              onBlur={(e) => updatePersonalInfo("email", e.currentTarget.textContent.trim())}
            >
              {personalInfo.email}
            </span>
          )}
          {personalInfo?.phone && (
            <span
              contentEditable
              suppressContentEditableWarning
              onBlur={(e) => updatePersonalInfo("phone", e.currentTarget.textContent.trim())}
            >
              {personalInfo.phone}
            </span>
          )}
          {personalInfo?.linkedIn && (
            <span
              contentEditable
              suppressContentEditableWarning
              onBlur={(e) => updatePersonalInfo("linkedIn", e.currentTarget.textContent.trim())}
            >
              {personalInfo.linkedIn}
            </span>
          )}
        </div>
      </div>
      {personalInfo?.photo && (
        <div className="creative-photo">
          <img src={personalInfo.photo} alt="Profile" />
        </div>
      )}
    </header>
  );

  const SummarySection = personalInfo?.summary ? (
    <section className="resume-section">
      <h2 className="section-title">Professional Summary</h2>
      <p
        className="summary"
        contentEditable
        suppressContentEditableWarning
        onBlur={(e) => updatePersonalInfo("summary", e.currentTarget.textContent.trim())}
      >
        {personalInfo.summary}
      </p>
    </section>
  ) : null;

  const ExperienceSection = experience && experience.length > 0 ? (
    <section className="resume-section">
      <h2 className="section-title">Work Experience</h2>
      {experience.map((exp, index) => (
        <div key={index} className="experience-item">
          <div className="experience-header">
            <h3
              className="job-title"
              contentEditable
              suppressContentEditableWarning
              onBlur={(e) => updateExperience(index, "position", e.currentTarget.textContent.trim())}
            >
              {exp.position}
            </h3>
            <span className="date-range">
              <span
                contentEditable
                suppressContentEditableWarning
                onBlur={(e) => updateExperience(index, "startDate", e.currentTarget.textContent.trim())}
              >
                {exp.startDate}
              </span>{" "}
              -{" "}
              <span
                contentEditable
                suppressContentEditableWarning
                onBlur={(e) => updateExperience(index, "endDate", e.currentTarget.textContent.trim())}
              >
                {exp.endDate || "Present"}
              </span>
            </span>
          </div>
          <div
            className="company-name"
            contentEditable
            suppressContentEditableWarning
            onBlur={(e) => updateExperience(index, "company", e.currentTarget.textContent.trim())}
          >
            {exp.company}
          </div>
          {exp.description && (
            <p
              className="description"
              contentEditable
              suppressContentEditableWarning
              onBlur={(e) => updateExperience(index, "description", e.currentTarget.textContent.trim())}
            >
              {exp.description}
            </p>
          )}
        </div>
      ))}
    </section>
  ) : null;

  const EducationSection = education && education.length > 0 ? (
    <section className="resume-section">
      <h2 className="section-title">Education</h2>
      {education.map((edu, index) => (
        <div key={index} className="education-item">
          <div className="education-header">
            <h3
              className="degree"
              contentEditable
              suppressContentEditableWarning
              onBlur={(e) => updateEducation(index, "degree", e.currentTarget.textContent.trim())}
            >
              {edu.degree}
            </h3>
            <span className="date-range">
              <span
                contentEditable
                suppressContentEditableWarning
                onBlur={(e) => updateEducation(index, "startDate", e.currentTarget.textContent.trim())}
              >
                {edu.startDate}
              </span>{" "}
              -{" "}
              <span
                contentEditable
                suppressContentEditableWarning
                onBlur={(e) => updateEducation(index, "endDate", e.currentTarget.textContent.trim())}
              >
                {edu.endDate || "Present"}
              </span>
            </span>
          </div>
          <div
            className="institution"
            contentEditable
            suppressContentEditableWarning
            onBlur={(e) => updateEducation(index, "institution", e.currentTarget.textContent.trim())}
          >
            {edu.institution}
          </div>
          {edu.gpa && (
            <div className="gpa">
              GPA:{" "}
              <span
                contentEditable
                suppressContentEditableWarning
                onBlur={(e) => updateEducation(index, "gpa", e.currentTarget.textContent.trim())}
              >
                {edu.gpa}
              </span>
            </div>
          )}
        </div>
      ))}
    </section>
  ) : null;

  const SkillsSection = skills && skills.length > 0 ? (
    <section className="resume-section">
      <h2 className="section-title">Skills</h2>
      <div className="skills-container">
        {skills.map((skill, index) => (
          <span
            key={index}
            className="skill-tag"
            contentEditable
            suppressContentEditableWarning
            onBlur={(e) => updateSkill(index, e.currentTarget.textContent.trim())}
          >
            {skill}
          </span>
        ))}
      </div>
    </section>
  ) : null;

  const ResumeLayout = () => {
    if (selectedTemplate.layout === "professional") {
      return (
        <div className="resume-grid">
          <aside className="resume-sidebar">
            <div className="sidebar-card">
              <h3 className="sidebar-title">Contact</h3>
              <div className="sidebar-text">
                {personalInfo?.email && (
                  <div
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => updatePersonalInfo("email", e.currentTarget.textContent.trim())}
                  >
                    {personalInfo.email}
                  </div>
                )}
                {personalInfo?.phone && (
                  <div
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => updatePersonalInfo("phone", e.currentTarget.textContent.trim())}
                  >
                    {personalInfo.phone}
                  </div>
                )}
                {personalInfo?.address && (
                  <div
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => updatePersonalInfo("address", e.currentTarget.textContent.trim())}
                  >
                    {personalInfo.address}
                  </div>
                )}
                {personalInfo?.linkedIn && (
                  <div
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => updatePersonalInfo("linkedIn", e.currentTarget.textContent.trim())}
                  >
                    {personalInfo.linkedIn}
                  </div>
                )}
                {personalInfo?.portfolio && (
                  <div
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => updatePersonalInfo("portfolio", e.currentTarget.textContent.trim())}
                  >
                    {personalInfo.portfolio}
                  </div>
                )}
              </div>
            </div>
            {SkillsSection}
          </aside>
          <div className="resume-main">
            {HeaderNameOnly}
            {SummarySection}
            {ExperienceSection}
            {EducationSection}
          </div>
        </div>
      );
    }

    if (selectedTemplate.layout === "creative") {
      return (
        <>
          <div className="creative-band">
            {CreativeHeader}
          </div>
          <div className="creative-body">
            {SummarySection}
            {ExperienceSection}
            {EducationSection}
            {SkillsSection}
          </div>
        </>
      );
    }

    if (selectedTemplate.layout === "minimalist") {
      return (
        <div className="minimal-grid">
          <div className="minimal-sidebar">
            {HeaderNameOnly}
            {SummarySection}
            {SkillsSection}
          </div>
          <div className="minimal-main">
            {ExperienceSection}
            {EducationSection}
          </div>
        </div>
      );
    }

    return (
      <>
        {Header}
        {SummarySection}
        {ExperienceSection}
        {EducationSection}
        {SkillsSection}
      </>
    );
  };

  return (
    <>
      {/* Action Bar - Hidden when printing */}
      <div className="action-bar no-print">
        <button onClick={() => navigate('/candidate')} className="btn-back">
          <ArrowLeft size={20} />
          Back to Dashboard
        </button>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={handleSaveEdits} className="btn-action btn-primary" disabled={saving}>
            {saving ? "Saving..." : "Save Edits"}
          </button>
          <button onClick={handlePrint} className="btn-action">
            <Printer size={20} />
            Print
          </button>
          <button onClick={handleDownloadPDF} className="btn-action btn-primary">
            <Download size={20} />
            Download PDF
          </button>
        </div>
      </div>

      {/* Resume Preview */}
      <div className="resume-container" id="resume-content">
        <div
          className={`resume-paper layout-${selectedTemplate.layout} ${spacingClass}`}
          style={{
            '--accent': appliedSettings.color,
            '--font': appliedSettings.font
          }}
        >
          <ResumeLayout />
        </div>
      </div>

      <style jsx>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: var(--font, Arial), sans-serif;
          background-color: #f3f4f6;
        }

        .action-bar {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          background: white;
          padding: 1rem 2rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          z-index: 100;
        }

        .btn-back, .btn-action {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          border: 1px solid #d1d5db;
          background: white;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          transition: all 0.2s;
        }

        .btn-action:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-back:hover, .btn-action:hover {
          background: #f9fafb;
        }

        .btn-primary {
          background: #4f46e5;
          color: white;
          border-color: #4f46e5;
        }

        .btn-primary:hover {
          background: #4338ca;
        }

        .resume-container {
          padding: 100px 2rem 2rem;
          max-width: 900px;
          margin: 0 auto;
        }

        .resume-paper {
          background: white;
          font-family: var(--font, Arial), sans-serif;
          padding: 60px;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          min-height: 11in;
        }

        .resume-paper [contenteditable="true"] {
          outline: none;
        }

        .resume-paper [contenteditable="true"]:focus {
          outline: 2px solid var(--accent, #2563eb);
          background: #f9fafb;
        }

        .layout-creative {
          padding: 0;
        }

        .resume-header {
          text-align: center;
          border-bottom: 2px solid var(--accent, #2563eb);
          padding-bottom: 20px;
          margin-bottom: 30px;
        }

        .name {
          font-size: 36px;
          font-weight: bold;
          color: #1f2937;
          margin-bottom: 10px;
        }

        .contact-info {
          font-size: 14px;
          color: #6b7280;
          margin-top: 8px;
        }

        .resume-section {
          margin-bottom: 30px;
        }

        .section-title {
          font-size: 20px;
          font-weight: bold;
          color: var(--accent, #2563eb);
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 15px;
          padding-bottom: 8px;
          border-bottom: 2px solid #e5e7eb;
        }

        .summary {
          font-size: 15px;
          line-height: 1.6;
          color: #374151;
        }

        .experience-item, .education-item {
          margin-bottom: 20px;
        }

        .experience-header, .education-header {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          margin-bottom: 5px;
        }

        .job-title, .degree {
          font-size: 18px;
          font-weight: 600;
          color: #1f2937;
        }

        .date-range {
          font-size: 14px;
          color: #6b7280;
          font-style: italic;
        }

        .company-name, .institution {
          font-size: 16px;
          color: #4b5563;
          margin-bottom: 8px;
        }

        .gpa {
          font-size: 14px;
          color: #6b7280;
          margin-top: 4px;
        }

        .description {
          font-size: 15px;
          line-height: 1.6;
          color: #374151;
          margin-top: 8px;
        }

        .skills-container {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }

        .skill-tag {
          padding: 6px 16px;
          background: #f3f4f6;
          border: 1px solid #e5e7eb;
          border-radius: 20px;
          font-size: 14px;
          color: #374151;
        }

        .spacing-compact .resume-section {
          margin-bottom: 18px;
        }

        .spacing-compact .summary,
        .spacing-compact .description {
          line-height: 1.4;
        }

        .spacing-relaxed .resume-section {
          margin-bottom: 36px;
        }

        .spacing-relaxed .summary,
        .spacing-relaxed .description {
          line-height: 1.8;
        }

        .resume-grid {
          display: grid;
          grid-template-columns: 240px 1fr;
          gap: 30px;
        }

        .resume-sidebar {
          border-right: 1px solid #e5e7eb;
          padding-right: 20px;
        }

        .sidebar-card {
          margin-bottom: 24px;
        }

        .sidebar-title {
          font-size: 14px;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: var(--accent, #2563eb);
          margin-bottom: 10px;
        }

        .sidebar-text {
          font-size: 13px;
          color: #4b5563;
          line-height: 1.5;
        }

        .layout-professional .resume-header {
          text-align: left;
          border-bottom: none;
          padding-bottom: 10px;
          margin-bottom: 20px;
        }

        .layout-professional .section-title {
          border-bottom: 1px solid #e5e7eb;
          padding-bottom: 6px;
          margin-bottom: 12px;
        }

        .layout-creative .resume-header {
          text-align: left;
          border-bottom: none;
          margin-bottom: 0;
          padding-bottom: 0;
          color: white;
        }

        .creative-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
        }

        .creative-header-left {
          flex: 1;
        }

        .creative-contact {
          display: flex;
          gap: 14px;
          flex-wrap: wrap;
          font-size: 13px;
          color: rgba(255, 255, 255, 0.85);
        }

        .creative-photo {
          width: 96px;
          height: 96px;
          border-radius: 50%;
          overflow: hidden;
          border: 3px solid rgba(255, 255, 255, 0.6);
          flex-shrink: 0;
          background: rgba(255, 255, 255, 0.2);
        }

        .creative-photo img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .creative-band {
          background: linear-gradient(120deg, var(--accent, #7c3aed), #111827);
          padding: 30px;
          border-radius: 12px 12px 0 0;
        }

        .creative-band .name {
          color: white;
        }

        .creative-band .contact-info {
          color: rgba(255, 255, 255, 0.85);
        }

        .creative-body {
          border: 1px solid #e5e7eb;
          border-top: none;
          padding: 30px;
          border-radius: 0 0 12px 12px;
        }

        .layout-creative .section-title {
          color: #111827;
          border-bottom: none;
          padding: 6px 10px;
          background: #f3f4f6;
          border-radius: 6px;
          text-transform: none;
          letter-spacing: 0.5px;
        }

        .layout-minimalist .resume-header {
          text-align: left;
          border-bottom: 1px solid #e5e7eb;
          margin-bottom: 24px;
        }

        .layout-minimalist .name {
          font-size: 30px;
          font-weight: 600;
          letter-spacing: 0.5px;
        }

        .layout-minimalist .section-title {
          font-size: 14px;
          text-transform: none;
          letter-spacing: 0.5px;
          border-bottom: 1px solid #e5e7eb;
          color: #111827;
        }

        .minimal-grid {
          display: grid;
          grid-template-columns: 220px 1fr;
          gap: 28px;
        }

        .minimal-sidebar {
          border-right: 1px solid #e5e7eb;
          padding-right: 18px;
        }

        .minimal-main .section-title {
          color: #0f172a;
        }

        .layout-ats .resume-header {
          text-align: left;
          border-bottom: 1px solid #111827;
        }

        .layout-ats .section-title {
          color: #111827;
          border-bottom: 1px solid #d1d5db;
          text-transform: none;
          letter-spacing: 0.2px;
          font-size: 16px;
        }

        /* Print Styles */
        @media print {
          .no-print {
            display: none !important;
          }

          .resume-container {
            padding: 0;
            max-width: 100%;
          }

          .resume-paper {
            box-shadow: none;
            padding: 0.5in;
            min-height: auto;
          }

          body {
            background: white;
          }

          @page {
            margin: 0.5in;
            size: letter;
          }
        }

        @media screen and (max-width: 768px) {
          .resume-paper {
            padding: 30px 20px;
          }

          .name {
            font-size: 28px;
          }

          .experience-header, .education-header {
            flex-direction: column;
            align-items: flex-start;
          }

          .date-range {
            margin-top: 4px;
          }

          .resume-grid {
            grid-template-columns: 1fr;
          }

          .resume-sidebar {
            border-right: none;
            padding-right: 0;
            border-bottom: 1px solid #e5e7eb;
            padding-bottom: 16px;
            margin-bottom: 16px;
          }

          .minimal-grid {
            grid-template-columns: 1fr;
          }

          .minimal-sidebar {
            border-right: none;
            padding-right: 0;
            border-bottom: 1px solid #e5e7eb;
            padding-bottom: 16px;
            margin-bottom: 16px;
          }
        }
      `}</style>
    </>
  );
}

