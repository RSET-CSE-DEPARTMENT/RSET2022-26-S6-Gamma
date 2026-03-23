import React, { useState } from "react";
import { Plus, Tag, Search, X } from "lucide-react";

const SkillsStep = ({ data, updateData }) => {
  const skills = data.skills || [];
  const [newSkill, setNewSkill] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const predefinedSkills = [
    "JavaScript", "React", "Node.js", "Python", "Java", "SQL", 
    "AWS", "Docker", "Git", "HTML/CSS", "TypeScript", "MongoDB",
    "Communication", "Leadership", "Problem Solving", "Teamwork",
    "Project Management", "Agile/Scrum", "Data Analysis", "Machine Learning"
  ];

  const addSkill = () => {
    if (newSkill.trim() && !skills.includes(newSkill.trim())) {
      updateData("skills", [...skills, newSkill.trim()]);
      setNewSkill("");
    }
  };

  const removeSkill = (skillToRemove) => {
    updateData("skills", skills.filter(skill => skill !== skillToRemove));
  };

  const addPredefinedSkill = (skill) => {
    if (!skills.includes(skill)) {
      updateData("skills", [...skills, skill]);
    }
  };

  const filteredSkills = predefinedSkills.filter(skill =>
    skill.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="step-container">
      <h2>Skills</h2>
      <p className="step-description">
        Add your key skills. Include technical, soft, and language skills.
      </p>
      
      {/* Current Skills */}
      <div className="skills-container">
        <h3>Your Skills ({skills.length})</h3>
        {skills.length === 0 ? (
          <p className="no-skills">No skills added yet. Add some skills below.</p>
        ) : (
          <div className="skills-list">
            {skills.map((skill, index) => (
              <div key={index} className="skill-tag">
                <Tag size={14} />
                {skill}
                <button 
                  onClick={() => removeSkill(skill)}
                  className="remove-skill"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Add Skill Form */}
      <div className="add-skill-form">
        <h3>Add New Skill</h3>
        <div className="input-group">
          <input
            type="text"
            value={newSkill}
            onChange={(e) => setNewSkill(e.target.value)}
            placeholder="Enter a skill (e.g., 'Public Speaking')"
            onKeyPress={(e) => e.key === 'Enter' && addSkill()}
          />
          <button onClick={addSkill} className="add-button">
            <Plus size={20} />
            Add
          </button>
        </div>
      </div>
      
      {/* Predefined Skills */}
      <div className="predefined-skills">
        <h3>Popular Skills</h3>
        <div className="search-box">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search skills..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="predefined-list">
          {filteredSkills.map((skill, index) => (
            <button
              key={index}
              onClick={() => addPredefinedSkill(skill)}
              disabled={skills.includes(skill)}
              className={`skill-button ${skills.includes(skill) ? 'disabled' : ''}`}
            >
              {skill}
              {skills.includes(skill) && <span className="checkmark">✓</span>}
            </button>
          ))}
        </div>
      </div>
      
      <style jsx>{`
        .step-container {
          padding: 1rem;
        }
        
        .step-description {
          color: #6b7280;
          margin-bottom: 2rem;
        }
        
        .skills-container {
          margin-bottom: 2rem;
        }
        
        .skills-container h3 {
          margin-bottom: 1rem;
          color: #374151;
        }
        
        .no-skills {
          color: #9ca3af;
          font-style: italic;
        }
        
        .skills-list {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }
        
        .skill-tag {
          background: #eaf1fb;
          color: #1f2d3d;
          padding: 8px 12px;
          border-radius: 20px;
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 14px;
        }
        
        .remove-skill {
          background: none;
          border: none;
          color: #6b7280;
          cursor: pointer;
          padding: 2px;
          display: flex;
          align-items: center;
        }
        
        .remove-skill:hover {
          color: #dc2626;
        }
        
        .add-skill-form {
          margin-bottom: 2rem;
          padding: 1.5rem;
          background: #f9fafb;
          border-radius: 8px;
        }
        
        .add-skill-form h3 {
          margin-bottom: 1rem;
          color: #374151;
        }
        
        .input-group {
          display: flex;
          gap: 10px;
        }
        
        .input-group input {
          flex: 1;
          padding: 10px 14px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          font-size: 14px;
        }
        
        .add-button {
          padding: 10px 20px;
          background: #4A70A9;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .add-button:hover {
          background: #2F4F79;
        }
        
        .predefined-skills {
          margin-bottom: 1rem;
        }
        
        .predefined-skills h3 {
          margin-bottom: 1rem;
          color: #374151;
        }
        
        .search-box {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          margin-bottom: 1rem;
          background: white;
        }
        
        .search-box input {
          flex: 1;
          border: none;
          outline: none;
          font-size: 14px;
        }
        
        .predefined-list {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }
        
        .skill-button {
          padding: 8px 16px;
          background: #f3f4f6;
          border: 1px solid #e5e7eb;
          border-radius: 20px;
          color: #374151;
          cursor: pointer;
          font-size: 14px;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        
        .skill-button:hover:not(.disabled) {
          background: #e5e7eb;
        }
        
        .skill-button.disabled {
          background: #eaf1fb;
          color: #2F4F79;
          border-color: #b9cceb;
          cursor: default;
        }
        
        .checkmark {
          font-weight: bold;
        }
      `}</style>
    </div>
  );
};

export default SkillsStep;
