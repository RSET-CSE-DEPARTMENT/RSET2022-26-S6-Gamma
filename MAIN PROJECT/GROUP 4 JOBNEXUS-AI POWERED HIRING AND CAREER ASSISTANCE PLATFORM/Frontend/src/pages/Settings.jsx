// Settings.jsx
import "./Settings.css";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Settings() {
  const navigate = useNavigate();
  const userRole = localStorage.getItem("userRole");
  const [activeTab, setActiveTab] = useState("Account");

  return (
    <div className="settings-page">
      <div className="settings-header">
        <button onClick={() => navigate(-1)} className="back-button">
          Back
        </button>
        <h1>Settings</h1>
      </div>

      <div className="settings-container">
        {/* Sidebar */}
        <aside className="settings-sidebar">
          {["Account", "Notifications", "Privacy", "Billing"].map((tab) => (
            <button
              key={tab}
              className={`settings-tab ${activeTab === tab ? "active" : ""}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </aside>

        {/* Content */}
        <section className="settings-content">
          <div className="settings-card">
            <h2>{activeTab} Settings</h2>
            <p className="settings-subtext">
              Manage your {activeTab.toLowerCase()} preferences for{" "}
              <strong>{userRole}</strong> role.
            </p>

            {/* Placeholder content */}
            <div className="settings-placeholder">
              {activeTab} settings coming soon
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

