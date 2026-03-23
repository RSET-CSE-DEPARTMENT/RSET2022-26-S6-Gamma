import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./ProfileIcon.css";

export default function ProfileIcon() {
  const [user, setUser] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Load user data from localStorage
    const userData = localStorage.getItem("user");
    console.log("User data from localStorage:", userData);
    if (userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (error) {
        console.error("Error parsing user data:", error);
      }
    }
    
    // Close dropdown when clicking outside
    const handleClickOutside = (event) => {
      console.log("Click detected, showDropdown:", showDropdown);
      console.log("Clicked element:", event.target);
      console.log("Dropdown ref:", dropdownRef.current);
      console.log("Button ref:", buttonRef.current);
      
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        console.log("Click outside dropdown, closing");
        setShowDropdown(false);
      }
    };
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showDropdown]);

  const handleButtonClick = (e) => {
    console.log("Profile button clicked!");
    console.log("Event target:", e.target);
    console.log("Current showDropdown:", showDropdown);
    e.stopPropagation(); // Prevent event bubbling
    setShowDropdown(prev => !prev);
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  const getInitials = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
    }
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return "U";
  };

  const getAvatarColor = () => {
    return "#4A70A9";
  };

  const handleMenuItemClick = (path) => {
    console.log("Navigating to:", path);
    setShowDropdown(false);
    navigate(path);
  };

  return (
    <div className="profile-icon-container" ref={dropdownRef}>
      <button 
        ref={buttonRef}
        className="profile-icon-button"
        onClick={handleButtonClick}
        aria-label="User profile"
      >
        {user?.avatarUrl ? (
          <img 
            src={user.avatarUrl} 
            alt="Profile" 
            className="profile-avatar"
          />
        ) : (
          <div 
            className="profile-initials" 
            style={{ backgroundColor: getAvatarColor() }}
          >
            {getInitials()}
          </div>
        )}
        <span className="profile-name">
          {user?.firstName || user?.email?.split("@")[0] || "User"}
        </span>
        <svg 
          className={`dropdown-arrow ${showDropdown ? "open" : ""}`} 
          width="16" 
          height="16" 
          viewBox="0 0 24 24"
        >
          <path fill="currentColor" d="M7 10l5 5 5-5z" />
        </svg>
      </button>

      {showDropdown && (
        <div className="profile-dropdown" style={{ display: 'block' }}>
          <div className="dropdown-header">
            <div className="dropdown-avatar">
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt="Profile" />
              ) : (
                <div style={{ backgroundColor: getAvatarColor() }}>
                  {getInitials()}
                </div>
              )}
            </div>
            <div className="dropdown-user-info">
              <h4>{user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : user?.email}</h4>
              <p className="user-email">{user?.email}</p>
              <p className="user-role">
                {user?.role === "candidate" && "Candidate"}
                {user?.role === "recruiter" && "Recruiter"}
                {user?.role === "admin" && "College Admin"}
              </p>
            </div>
          </div>

          <div className="dropdown-divider"></div>

          <div className="dropdown-menu">
            <button 
              className="dropdown-item"
              onClick={() => handleMenuItemClick("/profile")}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12ZM12 14C9.33 14 4 15.34 4 18V20H20V18C20 15.34 14.67 14 12 14Z" fill="currentColor"/>
              </svg>
              <span>My Profile</span>
            </button>

            <div className="dropdown-divider"></div>

            <button 
              className="dropdown-item logout"
              onClick={handleLogout}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M17 7L15.59 8.41L18.17 11H8V13H18.17L15.59 15.58L17 17L22 12L17 7ZM4 5H12V3H4C2.9 3 2 3.9 2 5V19C2 20.1 2.9 21 4 21H12V19H4V5Z" fill="currentColor"/>
              </svg>
              <span>Log Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

