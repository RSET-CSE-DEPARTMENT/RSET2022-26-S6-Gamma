import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "./Profile.css";

const API_BASE = "http://localhost/JobNexus/Backend-PHP/api";

export default function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("personal");
  
  // Form state
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    // Candidate
    skills: [],
    currentSkill: "",
    preferredLocation: "",
    salaryExpectation: "",
    experienceYears: "",
    currentCompany: "",
    // Recruiter
    companyName: "",
    companySize: "",
    industry: "",
    website: "",
    // Admin
    collegeName: "",
    department: "",
    position: "",
    studentCount: "",
    // Security
    currentPassword: "",
    newPassword: "",
    confirmNewPassword: ""
  });

  const resolveUserId = useCallback((candidateUser) => {
    const rawId =
      candidateUser?.id ??
      candidateUser?.userId ??
      candidateUser?.user_id;
    const numericId = Number(rawId);
    return Number.isFinite(numericId) && numericId > 0 ? numericId : null;
  }, []);

  const resolveUserRole = useCallback((candidateUser) => {
    return candidateUser?.role || null;
  }, []);

  const loadProfileData = useCallback(async (userData) => {
    const resolvedUserId = resolveUserId(userData);
    if (!resolvedUserId) {
      console.error("Missing user id while loading profile", userData);
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE}/get-profile.php?userId=${resolvedUserId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.profile) {
          setProfile(data.profile);
          const rawSkills = data.profile.skills;
          let normalizedSkills = [];
          if (Array.isArray(rawSkills)) {
            normalizedSkills = rawSkills;
          } else if (typeof rawSkills === "string" && rawSkills.trim()) {
            try {
              const parsedSkills = JSON.parse(rawSkills);
              normalizedSkills = Array.isArray(parsedSkills)
                ? parsedSkills
                : rawSkills.split(",").map((s) => s.trim()).filter(Boolean);
            } catch {
              normalizedSkills = rawSkills.split(",").map((s) => s.trim()).filter(Boolean);
            }
          }

          // Update form data with profile info
          setFormData(prev => ({
            ...prev,
            firstName: data.profile.first_name || data.profile.firstName || prev.firstName,
            lastName: data.profile.last_name || data.profile.lastName || prev.lastName,
            phone: data.profile.phone || "",
            currentCompany: data.profile.current_company || data.profile.currentCompany || "",
            experienceYears: data.profile.experience_years ?? data.profile.experienceYears ?? "",
            preferredLocation: data.profile.preferred_location || data.profile.preferredLocation || "",
            salaryExpectation: data.profile.salary_expectation ?? data.profile.salaryExpectation ?? "",
            companyName: data.profile.company_name || data.profile.companyName || "",
            companySize: data.profile.company_size || data.profile.companySize || "",
            industry: data.profile.industry || "",
            website: data.profile.website || "",
            collegeName: data.profile.college_name || data.profile.collegeName || "",
            department: data.profile.department || "",
            position: data.profile.position || "",
            studentCount: data.profile.student_count ?? data.profile.studentCount ?? "",
            skills: normalizedSkills
          }));
        }
      }
    } catch (error) {
      console.error("Error loading profile:", error);
    }
  }, [resolveUserId]);

  useEffect(() => {
    // Check if user is logged in
    const loggedIn = localStorage.getItem("loggedIn");
    if (!loggedIn) {
      navigate("/login");
      return;
    }

    // Load user data
    const userData = localStorage.getItem("user");
    if (userData) {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      setFormData(prev => ({
        ...prev,
        email: parsedUser.email,
        firstName: parsedUser.profile?.firstName || "",
        lastName: parsedUser.profile?.lastName || "",
        phone: parsedUser.profile?.phone || ""
      }));
      
      // Load additional profile data based on role
      loadProfileData(parsedUser);
    }
    
    setLoading(false);
  }, [navigate, loadProfileData]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSkillAdd = () => {
    if (formData.currentSkill.trim()) {
      setFormData(prev => ({
        ...prev,
        skills: [...prev.skills, prev.currentSkill.trim()],
        currentSkill: ""
      }));
    }
  };

  const handleSkillRemove = (index) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const storedUserRaw = localStorage.getItem("user");
    const storedUser = storedUserRaw ? JSON.parse(storedUserRaw) : null;
    const resolvedUserId = resolveUserId(user) || resolveUserId(storedUser);
    const resolvedRole = resolveUserRole(user) || resolveUserRole(storedUser);

    if (!resolvedUserId) {
      alert("Unable to update profile: missing user ID. Please log out and log in again.");
      return;
    }

    const hasSecurityInput =
      formData.currentPassword?.trim() ||
      formData.newPassword?.trim() ||
      formData.confirmNewPassword?.trim();

    if (hasSecurityInput) {
      if (!formData.currentPassword || !formData.newPassword || !formData.confirmNewPassword) {
        alert("Please fill current password, new password, and confirm password.");
        return;
      }
      if (formData.newPassword !== formData.confirmNewPassword) {
        alert("New password and confirm password do not match.");
        return;
      }
    }

    setSaving(true);

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE}/update-profile.php`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          userId: resolvedUserId,
          role: resolvedRole,
          ...formData,
          currentPassword: hasSecurityInput ? formData.currentPassword : "",
          newPassword: hasSecurityInput ? formData.newPassword : ""
        })
      });

      const raw = await response.text();
      let data;
      try {
        data = JSON.parse(raw);
      } catch {
        throw new Error(raw || "Invalid server response");
      }
      
      if (data.success) {
        // Update user in localStorage
        const updatedUser = {
          ...user,
          profile: {
            ...user.profile,
            firstName: formData.firstName,
            lastName: formData.lastName,
            phone: formData.phone
          }
        };
        localStorage.setItem("user", JSON.stringify(updatedUser));
        setUser(updatedUser);
        setFormData(prev => ({
          ...prev,
          currentPassword: "",
          newPassword: "",
          confirmNewPassword: ""
        }));
        
        alert("Profile updated successfully!");
      } else {
        alert(data.message || "Failed to update profile");
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      alert(error.message || "Error updating profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="profile-loading">
        <div className="spinner"></div>
        <p>Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="profile-page">
      {/* Header */}
      <div className="profile-header">
        <div className="profile-back">
          <button onClick={() => navigate(-1)} className="back-button">
            Back
          </button>
        </div>
        <h1>My Profile</h1>
        <div className="profile-actions">
          <button 
            className="save-button"
            onClick={handleSubmit}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      <div className="profile-container">
        {/* Left Sidebar */}
        <div className="profile-sidebar">
          <div className="profile-summary">
            <div className="profile-avatar-large">
              {user?.profile?.avatarUrl ? (
                <img src={user.profile.avatarUrl} alt="Profile" />
              ) : (
                <div className="avatar-initials">
                  {(formData.firstName?.charAt(0) || "") + (formData.lastName?.charAt(0) || "") || user?.email?.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="profile-info">
              <h2>{formData.firstName && formData.lastName ? `${formData.firstName} ${formData.lastName}` : "Complete Your Profile"}</h2>
              <p className="profile-email">{user?.email}</p>
              <p className="profile-role">
                {user?.role === "candidate" && "Candidate"}
                {user?.role === "recruiter" && "Recruiter"}
                {user?.role === "admin" && "College Admin"}
              </p>
              {user?.role === "candidate" && profile?.resumeUrl && (
                <a href={profile.resumeUrl} target="_blank" rel="noopener noreferrer" className="resume-link">
                  View Resume
                </a>
              )}
            </div>
          </div>

          <div className="profile-tabs">
            <button 
              className={`profile-tab ${activeTab === "personal" ? "active" : ""}`}
              onClick={() => setActiveTab("personal")}
            >
              Personal Info
            </button>
            
            {user?.role === "candidate" && (
              <button 
                className={`profile-tab ${activeTab === "professional" ? "active" : ""}`}
                onClick={() => setActiveTab("professional")}
              >
                Professional Details
              </button>
            )}
            
            {user?.role === "recruiter" && (
              <button 
                className={`profile-tab ${activeTab === "company" ? "active" : ""}`}
                onClick={() => setActiveTab("company")}
              >
                Company Info
              </button>
            )}
            
            {(user?.role === "admin" || user?.role === "database_admin") && (
              <button 
                className={`profile-tab ${activeTab === "college" ? "active" : ""}`}
                onClick={() => setActiveTab("college")}
              >
                College Info
              </button>
            )}
            
            <button 
              className={`profile-tab ${activeTab === "security" ? "active" : ""}`}
              onClick={() => setActiveTab("security")}
            >
              Security
            </button>
          </div>
        </div>

        {/* Right Content */}
        <div className="profile-content">
          {activeTab === "personal" && (
            <div className="profile-section">
              <h3>Personal Information</h3>
              <p className="section-description">Update your personal details and contact information.</p>
              
              <div className="form-grid">
                <div className="form-group">
                  <label>First Name</label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    placeholder="Enter your first name"
                  />
                </div>
                
                <div className="form-group">
                  <label>Last Name</label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    placeholder="Enter your last name"
                  />
                </div>
                
                <div className="form-group">
                  <label>Email Address</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    disabled
                    className="disabled-input"
                  />
                  <p className="input-note">Email cannot be changed</p>
                </div>
                
                <div className="form-group">
                  <label>Phone Number</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="Enter your phone number"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === "professional" && user?.role === "candidate" && (
            <div className="profile-section">
              <h3>Professional Details</h3>
              <p className="section-description">Update your professional information for better job matching.</p>
              
              <div className="form-grid">
                <div className="form-group">
                  <label>Current Company</label>
                  <input
                    type="text"
                    name="currentCompany"
                    value={formData.currentCompany}
                    onChange={handleInputChange}
                    placeholder="Where do you work?"
                  />
                </div>
                
                <div className="form-group">
                  <label>Years of Experience</label>
                  <input
                    type="number"
                    name="experienceYears"
                    value={formData.experienceYears}
                    onChange={handleInputChange}
                    placeholder="0"
                    min="0"
                  />
                </div>
                
                <div className="form-group">
                  <label>Preferred Location</label>
                  <input
                    type="text"
                    name="preferredLocation"
                    value={formData.preferredLocation}
                    onChange={handleInputChange}
                    placeholder="City, Country"
                  />
                </div>
                
                <div className="form-group">
                  <label>Salary Expectation (â‚¹)</label>
                  <input
                    type="number"
                    name="salaryExpectation"
                    value={formData.salaryExpectation}
                    onChange={handleInputChange}
                    placeholder="Expected annual salary"
                  />
                </div>
                
                <div className="form-group full-width">
                  <label>Skills</label>
                  <div className="skills-input">
                    <input
                      type="text"
                      value={formData.currentSkill}
                      onChange={(e) => setFormData(prev => ({ ...prev, currentSkill: e.target.value }))}
                      onKeyPress={(e) => e.key === 'Enter' && handleSkillAdd()}
                      placeholder="Add a skill and press Enter"
                    />
                    <button type="button" onClick={handleSkillAdd} className="add-skill-btn">
                      Add
                    </button>
                  </div>
                  
                  <div className="skills-list">
                    {formData.skills.map((skill, index) => (
                      <span key={index} className="skill-tag">
                        {skill}
                        <button type="button" onClick={() => handleSkillRemove(index)} className="remove-skill">
                          ×
                        </button>
                      </span>
                    ))}
                    {formData.skills.length === 0 && (
                      <p className="no-skills">No skills added yet. Add your first skill above.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
           )}

          {activeTab === "security" && (
            <div className="profile-section">
              <h3>Security Settings</h3>
              <p className="section-description">Update your password and click Save Changes.</p>

              <div className="form-grid">
                <div className="form-group full-width">
                  <label>Current Password</label>
                  <input
                    type="password"
                    name="currentPassword"
                    value={formData.currentPassword || ""}
                    onChange={handleInputChange}
                    placeholder="Enter current password"
                  />
                </div>

                <div className="form-group">
                  <label>New Password</label>
                  <input
                    type="password"
                    name="newPassword"
                    value={formData.newPassword || ""}
                    onChange={handleInputChange}
                    placeholder="Enter new password"
                  />
                </div>

                <div className="form-group">
                  <label>Confirm New Password</label>
                  <input
                    type="password"
                    name="confirmNewPassword"
                    value={formData.confirmNewPassword || ""}
                    onChange={handleInputChange}
                    placeholder="Confirm new password"
                  />
                </div>
              </div>

              <div className="security-info">
                <h4>Last Login</h4>
                <p>Your last login was: {new Date().toLocaleDateString()}</p>

                <h4>Active Sessions</h4>
                <p>You are currently logged in on this device.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}




