import React from "react";
import { User, Mail, Phone, MapPin, Linkedin, Link, FileText } from "lucide-react";

const PersonalInfoStep = ({ data, updateData, user }) => {
  const personalInfo = data.personalInfo || {};
  const [photoUploading, setPhotoUploading] = React.useState(false);

  const handleChange = (e) => {
    updateData("personalInfo", {
      ...personalInfo,
      [e.target.name]: e.target.value
    });
  };

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file.");
      return;
    }
    if (!user?.id) {
      alert("Please log in again.");
      return;
    }
    setPhotoUploading(true);
    try {
      const formData = new FormData();
      formData.append("candidate_id", user.id);
      formData.append("photo", file);
      const response = await fetch("http://localhost/JobNexus/Backend-PHP/api/upload-resume-photo.php", {
        method: "POST",
        body: formData
      });
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || "Failed to upload photo");
      }
      updateData("personalInfo", {
        ...personalInfo,
        photo: data.photo_url
      });
    } catch (error) {
      console.error(error);
      alert(error.message || "Failed to upload photo");
    } finally {
      setPhotoUploading(false);
    }
  };

  return (
    <div className="step-container">
      <h2>Personal Information</h2>
      <p className="step-description">
        Enter your basic information. This will appear at the top of your resume.
      </p>
      
      <div className="form-grid">
        <div className="form-group">
          <label>
            <User size={16} />
            First Name *
          </label>
          <input
            type="text"
            name="firstName"
            value={personalInfo.firstName || ""}
            onChange={handleChange}
            placeholder="John"
            required
          />
        </div>
        
        <div className="form-group">
          <label>
            <User size={16} />
            Last Name *
          </label>
          <input
            type="text"
            name="lastName"
            value={personalInfo.lastName || ""}
            onChange={handleChange}
            placeholder="Doe"
            required
          />
        </div>
        
        <div className="form-group">
          <label>
            <Mail size={16} />
            Email *
          </label>
          <input
            type="email"
            name="email"
            value={personalInfo.email || ""}
            onChange={handleChange}
            placeholder="john@example.com"
            required
          />
        </div>
        
        <div className="form-group">
          <label>
            <Phone size={16} />
            Phone *
          </label>
          <input
            type="tel"
            name="phone"
            value={personalInfo.phone || ""}
            onChange={handleChange}
            placeholder="(123) 456-7890"
            required
          />
        </div>
        
        <div className="form-group full-width">
          <label>
            <MapPin size={16} />
            Address
          </label>
          <input
            type="text"
            name="address"
            value={personalInfo.address || ""}
            onChange={handleChange}
            placeholder="City, State, Country"
          />
        </div>
        
        <div className="form-group">
          <label>
            <Linkedin size={16} />
            LinkedIn Profile
          </label>
          <input
            type="url"
            name="linkedIn"
            value={personalInfo.linkedIn || ""}
            onChange={handleChange}
            placeholder="https://linkedin.com/in/username"
          />
        </div>
        
        <div className="form-group">
          <label>
            <Link size={16} />
            Portfolio Website
          </label>
          <input
            type="url"
            name="portfolio"
            value={personalInfo.portfolio || ""}
            onChange={handleChange}
            placeholder="https://yourportfolio.com"
          />
        </div>

        <div className="form-group">
          <label>
            <FileText size={16} />
            Profile Photo (Creative Template)
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={handlePhotoChange}
          />
          {photoUploading && (
            <small className="helper-text">Uploading photo...</small>
          )}
          {personalInfo.photo && (
            <div className="photo-preview">
              <img src={personalInfo.photo} alt="Profile preview" />
            </div>
          )}
        </div>
        
        <div className="form-group full-width">
          <label>
            <FileText size={16} />
            Professional Summary *
          </label>
          <textarea
            name="summary"
            value={personalInfo.summary || ""}
            onChange={handleChange}
            placeholder="Experienced professional with 5+ years in..."
            rows={4}
            required
          />
          <small className="helper-text">
            Write 2-3 sentences highlighting your key achievements and career goals.
          </small>
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
        
        .form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
        }
        
        .form-group.full-width {
          grid-column: span 2;
        }
        
        .form-group label {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 500;
          margin-bottom: 8px;
          color: #374151;
        }
        
        .form-group input,
        .form-group textarea {
          width: 100%;
          padding: 10px 14px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          font-size: 14px;
          transition: all 0.2s;
        }

        .photo-preview {
          margin-top: 10px;
          width: 88px;
          height: 88px;
          border-radius: 50%;
          overflow: hidden;
          border: 2px solid #e5e7eb;
        }

        .photo-preview img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        
        .form-group input:focus,
        .form-group textarea:focus {
          outline: none;
          border-color: #4A70A9;
          box-shadow: 0 0 0 3px rgba(74, 112, 169, 0.15);
        }
        
        .helper-text {
          display: block;
          margin-top: 4px;
          color: #9ca3af;
          font-size: 12px;
        }
        
        @media (max-width: 768px) {
          .form-grid {
            grid-template-columns: 1fr;
          }
          
          .form-group.full-width {
            grid-column: span 1;
          }
        }
      `}</style>
    </div>
  );
};

export default PersonalInfoStep;
