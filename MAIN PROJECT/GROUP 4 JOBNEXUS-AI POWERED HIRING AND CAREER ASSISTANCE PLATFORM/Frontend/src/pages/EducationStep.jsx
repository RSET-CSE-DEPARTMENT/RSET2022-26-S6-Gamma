import React from "react";
import { Plus, Trash2, GraduationCap, School, Award, Calendar } from "lucide-react";

const EducationStep = ({ data, updateData }) => {
  const education = data.education || [];

  const addEducation = () => {
    const newEdu = {
      id: Date.now(),
      institution: "",
      degree: "",
      field: "",
      graduationDate: "",
      gpa: ""
    };
    updateData("education", [...education, newEdu]);
  };

  const updateEducation = (id, field, value) => {
    const updated = education.map(edu => 
      edu.id === id ? { ...edu, [field]: value } : edu
    );
    updateData("education", updated);
  };

  const removeEducation = (id) => {
    updateData("education", education.filter(edu => edu.id !== id));
  };

  return (
    <div className="step-container">
      <h2>Education</h2>
      <p className="step-description">
        List your educational qualifications in reverse chronological order.
      </p>
      
      {education.map((edu, index) => (
        <div key={edu.id} className="education-card">
          <div className="card-header">
            <h3>Education #{index + 1}</h3>
            {education.length > 1 && (
              <button 
                onClick={() => removeEducation(edu.id)}
                className="delete-btn"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label>
                <School size={16} />
                Institution *
              </label>
              <input
                type="text"
                value={edu.institution}
                onChange={(e) => updateEducation(edu.id, "institution", e.target.value)}
                placeholder="Stanford University"
                required
              />
            </div>
            
            <div className="form-group">
              <label>
                <GraduationCap size={16} />
                Degree *
              </label>
              <select
                value={edu.degree}
                onChange={(e) => updateEducation(edu.id, "degree", e.target.value)}
                required
              >
                <option value="">Select Degree</option>
                <option value="High School">High School</option>
                <option value="Associate">Associate Degree</option>
                <option value="Bachelor">Bachelor's Degree</option>
                <option value="Master">Master's Degree</option>
                <option value="PhD">PhD</option>
                <option value="Diploma">Diploma</option>
                <option value="Certificate">Certificate</option>
              </select>
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label>
                <GraduationCap size={16} />
                Field of Study *
              </label>
              <input
                type="text"
                value={edu.field}
                onChange={(e) => updateEducation(edu.id, "field", e.target.value)}
                placeholder="Computer Science"
                required
              />
            </div>
            
            <div className="form-group">
              <label>
                <Calendar size={16} />
                Graduation Date *
              </label>
              <input
                type="month"
                value={edu.graduationDate}
                onChange={(e) => updateEducation(edu.id, "graduationDate", e.target.value)}
                required
              />
            </div>
          </div>
          
          <div className="form-group">
            <label>
              <Award size={16} />
              GPA (Optional)
            </label>
            <input
              type="text"
              value={edu.gpa || ""}
              onChange={(e) => updateEducation(edu.id, "gpa", e.target.value)}
              placeholder="3.8/4.0"
            />
            <small className="helper-text">
              Format: 3.8/4.0 or 9.5/10
            </small>
          </div>
        </div>
      ))}
      
      <button 
        type="button"
        onClick={addEducation}
        className="add-education-btn"
      >
        <Plus size={20} />
        Add Another Education
      </button>
      
      <style jsx>{`
        /* Similar styles as ExperienceStep, adjust as needed */
      `}</style>
    </div>
  );
};

export default EducationStep;