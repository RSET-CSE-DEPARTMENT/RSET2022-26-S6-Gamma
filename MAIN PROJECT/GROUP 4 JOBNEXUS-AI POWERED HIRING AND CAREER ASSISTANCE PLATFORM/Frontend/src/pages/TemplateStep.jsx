import React from "react";
import { Check } from "lucide-react";

const TemplateStep = ({ data, updateData }) => {
  const templates = [
    {
      id: 1,
      name: "ATS-Friendly",
      description: "Clean structure optimized for applicant tracking systems",
      category: "ATS-Friendly",
      thumbnail: "https://placehold.co/200x280/0f172a/ffffff?text=ATS-Friendly",
      premium: false
    },
    {
      id: 2,
      name: "Professional",
      description: "Classic layout for corporate and business roles",
      category: "Professional",
      thumbnail: "https://placehold.co/200x280/1f2937/ffffff?text=Professional",
      premium: false
    },
    {
      id: 3,
      name: "Creative",
      description: "Unique design for creative fields",
      category: "Creative",
      thumbnail: "https://placehold.co/200x280/7c3aed/ffffff?text=Creative",
      premium: false
    },
    {
      id: 4,
      name: "Minimalist",
      description: "Minimal styling with high readability",
      category: "Minimalist",
      thumbnail: "https://placehold.co/200x280/64748b/ffffff?text=Minimalist",
      premium: false
    }
  ];

  const handleSelectTemplate = (templateId) => {
    updateData("selectedTemplate", templateId);
  };

  return (
    <div className="step-container">
      <h2>Choose a Template</h2>
      <p className="step-description">
        Select a template that best fits your industry and style.
      </p>

      <div className="template-controls">
        <label className="color-label">
          Accent Color
          <input
            type="color"
            value={data.settings?.color || "#2563eb"}
            onChange={(e) =>
              updateData("settings", {
                ...(data.settings || {}),
                color: e.target.value
              })
            }
          />
          <span className="color-value">{(data.settings?.color || "#2563eb").toUpperCase()}</span>
        </label>
      </div>
      
      <div className="templates-grid">
        {templates.map(template => (
          <div 
            key={template.id}
            className={`template-card ${data.selectedTemplate === template.id ? 'selected' : ''}`}
          >
            <img 
              src={template.thumbnail} 
              alt={template.name}
              className="template-thumbnail"
            />
            
            <div className="template-info">
              <h4>{template.name}</h4>
              <p>{template.description}</p>
              
              <div className="template-actions">
                <button 
                  className={`select-btn ${data.selectedTemplate === template.id ? 'selected' : ''}`}
                  onClick={() => handleSelectTemplate(template.id)}
                >
                  {data.selectedTemplate === template.id ? (
                    <>
                      <Check size={16} />
                      Selected
                    </>
                  ) : (
                    "Select"
                  )}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="selected-template-info">
        {data.selectedTemplate ? (
          <>
            <h3>Selected Template</h3>
            <p>
              You have selected the "{templates.find(t => t.id === data.selectedTemplate)?.name}" template.
              Click "Finish & Save" to create your resume.
            </p>
          </>
        ) : (
          <p className="no-selection">Please select a template to continue.</p>
        )}
      </div>
      
      <style jsx>{`
        .step-container {
          padding: 1rem;
        }
        
        .step-description {
          color: #6b7280;
          margin-bottom: 2rem;
        }

        .template-controls {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 1.5rem;
        }

        .color-label {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          font-weight: 500;
          color: #374151;
          background: #f8fafc;
          border: 1px solid #e5e7eb;
          padding: 8px 12px;
          border-radius: 10px;
        }

        .color-label input[type="color"] {
          width: 36px;
          height: 36px;
          border: none;
          background: transparent;
          padding: 0;
          cursor: pointer;
        }

        .color-value {
          font-size: 12px;
          color: #6b7280;
          letter-spacing: 0.4px;
        }
        
        .templates-grid {
          display: flex;
          gap: 16px;
          overflow-x: auto;
          padding-bottom: 6px;
          scroll-snap-type: x proximity;
          margin-bottom: 2rem;
        }
        
        .template-card {
          min-width: 260px;
          max-width: 260px;
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          overflow: hidden;
          transition: all 0.3s;
          position: relative;
          scroll-snap-align: start;
        }
        
        .template-card:hover {
          border-color: #9ca3af;
          transform: translateY(-2px);
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        }
        
        .template-card.selected {
          border-color: #4A70A9;
          box-shadow: 0 0 0 3px rgba(74, 112, 169, 0.2);
        }
        
        .template-thumbnail {
          width: 100%;
          height: 200px;
          object-fit: cover;
          background: #f3f4f6;
        }
        
        .template-info {
          padding: 1.5rem;
        }
        
        .template-info h4 {
          margin: 0 0 8px 0;
          color: #1f2937;
        }
        
        .template-info p {
          margin: 0 0 1rem 0;
          color: #6b7280;
          font-size: 14px;
        }
        
        .template-actions {
          display: flex;
          gap: 10px;
        }
        
        .select-btn {
          width: 100%;
          padding: 8px 12px;
          background: #4A70A9;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }
        
        .select-btn:hover {
          background: #2F4F79;
        }
        
        .select-btn.selected {
          background: #4A70A9;
        }
        
        .selected-template-info {
          padding: 1.5rem;
          background: #ffffff;
          border-radius: 8px;
          border: 1px solid #d7e3f7;
          border-left: 4px solid #4A70A9;
        }
        
        .selected-template-info h3 {
          margin: 0 0 8px 0;
          color: #1f2d3d;
        }
        
        .no-selection {
          text-align: center;
          color: #9ca3af;
          font-style: italic;
        }
        
        @media (max-width: 640px) {
          .template-card {
            min-width: 220px;
            max-width: 220px;
          }
        }
      `}</style>
    </div>
  );
};

export default TemplateStep;
