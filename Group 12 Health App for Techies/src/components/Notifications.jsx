// src/components/Notifications.jsx
import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const Notifications = ({ postureStatus, distance }) => {
  const [settings, setSettings] = useState({
    desktop: true,
    sound: true,
    visual: true,
    minDistance: 50,
    maxDistance: 80
  });

  // Posture alerts
  useEffect(() => {
    if (postureStatus === 'Poor Posture' && settings.visual) {
      toast.warning('⚠️ Poor posture detected! Straighten your back.', {
        position: 'top-right',
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
      
      if (settings.sound) {
        new Audio('/alert.mp3').play().catch(e => console.log('Sound blocked:', e));
      }
    }
  }, [postureStatus, settings]);

  // Distance alerts
  useEffect(() => {
    if (distance < settings.minDistance && settings.visual) {
      toast.info('📱 Move back from screen!', {
        autoClose: 3000
      });
    }
  }, [distance, settings]);

  return (
    <div className="notification-settings">
      <h3>Alert Settings</h3>
      <label>
        <input 
          type="checkbox" 
          checked={settings.desktop}
          onChange={() => setSettings({...settings, desktop: !settings.desktop})}
        />
        Desktop Notifications
      </label>
      
      <label>
        <input 
          type="checkbox" 
          checked={settings.sound}
          onChange={() => setSettings({...settings, sound: !settings.sound})}
        />
        Sound Alerts
      </label>
      
      <div className="distance-settings">
        <h4>Ideal Screen Distance (cm)</h4>
        <input 
          type="range" 
          min="40" 
          max="100" 
          value={settings.minDistance}
          onChange={(e) => setSettings({...settings, minDistance: e.target.value})}
        />
        <span>{settings.minDistance}cm - {settings.maxDistance}cm</span>
      </div>
    </div>
  );
};

export default Notifications;