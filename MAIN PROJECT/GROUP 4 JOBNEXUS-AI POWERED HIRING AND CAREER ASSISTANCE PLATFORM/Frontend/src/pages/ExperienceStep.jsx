import React from "react";
import { Plus, Trash2, Calendar, Building, Briefcase } from "lucide-react";

const ExperienceStep = ({ data, updateData }) => {
  const experiences = data.experience || [];

  const addExperience = () => {
    const newExp = {
      id: Date.now(),
      company: "",
      position: "",
      startDate: "",
      endDate: "",
      current: false,
      description: [""]
    };
    updateData("experience", [...experiences, newExp]);
  };

  const updateExperience = (id, field, value) => {
    const updated = experiences.map(exp => 
      exp.id === id ? { ...exp, [field]: value } : exp
    );
    updateData("experience", updated);
  };

  const removeExperience = (id) => {
    updateData("experience", experiences.filter(exp => exp.id !== id));
  };

  const addBulletPoint = (expId) => {
    const updated = experiences.map(exp => 
      exp.id === expId 
        ? { ...exp, description: [...exp.description, ""] }
        : exp
    );
    updateData("experience", updated);
  };

  const updateBulletPoint = (expId, index, value) => {
    const updated = experiences.map(exp => {
      if (exp.id === expId) {
        const newDesc = [...exp.description];
        newDesc[index] = value;
        return { ...exp, description: newDesc };
      }
      return exp;
    });
    updateData("experience", updated);
  };

  return (
    <div className="step-container">
      <h2>Work Experience</h2>
      <p className="step-description">
        List your work experience in reverse chronological order (most recent first).
      </p>
      
      {experiences.map((exp, index) => (
        <div key={exp.id} className="experience-card">
          <div className="card-header">
            <h3>Experience #{index + 1}</h3>
            {experiences.length > 1 && (
              <button 
                onClick={() => removeExperience(exp.id)}
                className="delete-btn"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label>
                <Building size={16} />
                Company Name *
              </label>
              <input
                type="text"
                value={exp.company}
                onChange={(e) => updateExperience(exp.id, "company", e.target.value)}
                placeholder="Google Inc."
                required
              />
            </div>
            
            <div className="form-group">
              <label>
                <Briefcase size={16} />
                Position *
              </label>
              <input
                type="text"
                value={exp.position}
                onChange={(e) => updateExperience(exp.id, "position", e.target.value)}
                placeholder="Senior Software Engineer"
                required
              />
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label>
                <Calendar size={16} />
                Start Date *
              </label>
              <input
                type="month"
                value={exp.startDate}
                onChange={(e) => updateExperience(exp.id, "startDate", e.target.value)}
                required
              />
            </div>
            
            <div className="form-group">
              <label>
                <Calendar size={16} />
                End Date
              </label>
              <div className="date-group">
                <input
                  type="month"
                  value={exp.current ? "" : exp.endDate}
                  onChange={(e) => updateExperience(exp.id, "endDate", e.target.value)}
                  disabled={exp.current}
                />
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={exp.current}
                    onChange={(e) => updateExperience(exp.id, "current", e.target.checked)}
                  />
                  Current Position
                </label>
              </div>
            </div>
          </div>
          
          <div className="form-group">
            <label>Responsibilities & Achievements</label>
            {exp.description.map((bullet, bulletIndex) => (
              <div key={bulletIndex} className="bullet-input">
                <span className="bullet-point">•</span>
                <input
                  type="text"
                  value={bullet}
                  onChange={(e) => updateBulletPoint(exp.id, bulletIndex, e.target.value)}
                  placeholder="Increased revenue by 30% through..."
                />
              </div>
            ))}
            <button 
              type="button"
              onClick={() => addBulletPoint(exp.id)}
              className="add-bullet-btn"
            >
              <Plus size={16} />
              Add Another Bullet Point
            </button>
          </div>
        </div>
      ))}
      
      <button 
        type="button"
        onClick={addExperience}
        className="add-experience-btn"
      >
        <Plus size={20} />
        Add Another Experience
      </button>
      
      <style jsx>{`
        .step-container {
          padding: 1rem;
        }
        
        .step-description {
          color: #6b7280;
          margin-bottom: 2rem;
        }
        
        .experience-card {
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 1.5rem;
          margin-bottom: 1.5rem;
        }
        
        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }
        
        .card-header h3 {
          margin: 0;
          color: #374151;
        }
        
        .delete-btn {
          background: #fee2e2;
          color: #dc2626;
          border: none;
          border-radius: 6px;
          padding: 6px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .delete-btn:hover {
          background: #fecaca;
        }
        
        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
          margin-bottom: 1.5rem;
        }
        
        .form-group label {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 500;
          margin-bottom: 8px;
          color: #374151;
        }
        
        .form-group input {
          width: 100%;
          padding: 10px 14px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          font-size: 14px;
        }
        
        .form-group input:focus {
          outline: none;
          border-color: #4A70A9;
          box-shadow: 0 0 0 3px rgba(74, 112, 169, 0.15);
        }
        
        .date-group {
          display: flex;
          gap: 1rem;
        }
        
        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 14px;
          font-weight: normal;
        }
        
        .bullet-input {
          display: flex;
          gap: 10px;
          margin-bottom: 8px;
          align-items: center;
        }
        
        .bullet-point {
          color: #4A70A9;
          font-size: 20px;
        }
        
        .add-bullet-btn {
          background: none;
          border: none;
          color: #4A70A9;
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 0;
          cursor: pointer;
          font-size: 14px;
        }
        
        .add-experience-btn {
          width: 100%;
          padding: 12px;
          background: #f3f4f6;
          border: 2px dashed #d1d5db;
          border-radius: 8px;
          color: #6b7280;
          font-weight: 500;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all 0.2s;
        }
        
        .add-experience-btn:hover {
          background: #e5e7eb;
          border-color: #9ca3af;
        }
        
        @media (max-width: 768px) {
          .form-row {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default ExperienceStep;
