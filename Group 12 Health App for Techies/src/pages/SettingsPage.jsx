import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const SettingsPage = () => {
  const navigate = useNavigate();
  const [settings, setSettings] = useState({
    theme: 'light',
    notifications: true,
    waterReminderInterval: 60,
    stretchReminderInterval: 45,
  });

  useEffect(() => {
    // Load settings from localStorage
    const savedSettings = localStorage.getItem('appSettings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
  }, []);

  const handleSettingChange = (key, value) => {
    const newSettings = {
      ...settings,
      [key]: value
    };
    setSettings(newSettings);
    localStorage.setItem('appSettings', JSON.stringify(newSettings));
  };

  const handleLogout = () => {
    // Clear user session and redirect to login
    localStorage.removeItem('authToken');
    navigate('/login');
  };

  return (
    <div className={`settings-page ${settings.theme}`}>
      <h1>Settings</h1>
      
      

      <div className="settings-section">
        <h2>Notifications</h2>
        <div className="setting-item">
          <label>
            <input
              type="checkbox"
              checked={settings.notifications}
              onChange={(e) => handleSettingChange('notifications', e.target.checked)}
            />
            Enable Notifications
          </label>
        </div>
      </div>

      <div className="settings-section">
        <h2>Reminders</h2>
        <div className="setting-item">
          <label>Water Reminder (minutes):</label>
          <input
            type="number"
            min="15"
            max="180"
            value={settings.waterReminderInterval}
            onChange={(e) => handleSettingChange('waterReminderInterval', parseInt(e.target.value))}
          />
        </div>
        <div className="setting-item">
          <label>Stretch Reminder (minutes):</label>
          <input
            type="number"
            min="15"
            max="180"
            value={settings.stretchReminderInterval}
            onChange={(e) => handleSettingChange('stretchReminderInterval', parseInt(e.target.value))}
          />
        </div>
      </div>

      <div className="settings-actions">
        <button className="logout-button" onClick={handleLogout}>
          Logout
        </button>
      </div>
    </div>
  );
};

export default SettingsPage;