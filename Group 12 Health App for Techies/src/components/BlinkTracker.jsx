import React, { useState, useEffect, useRef } from 'react';
import { Button, Card, Progress, Typography, Alert, Space, Statistic } from 'antd';
import { EyeOutlined, EyeInvisibleOutlined, ClockCircleOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

const BlinkTracker = () => {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [blinkRate, setBlinkRate] = useState(0);
  const [status, setStatus] = useState('Ready to start monitoring');
  const [notification, setNotification] = useState(null);
  const [glassesDetected, setGlassesDetected] = useState(false);
  const [earValue, setEarValue] = useState(0);
  const [threshold, setThreshold] = useState(0);
  const [nextNotification, setNextNotification] = useState(0);
  const [calibrationProgress, setCalibrationProgress] = useState(0);
  const [headTilt, setHeadTilt] = useState({ pitch: 0, yaw: 0, roll: 0 });
  const videoRef = useRef(null);
  const pythonProcess = useRef(null);

  // Start the blink monitoring
  const startMonitoring = async () => {
    try {
      setIsMonitoring(true);
      setStatus('Initializing camera...');
      
      // In a real implementation, you would start the Python process here
      // For example using Electron's child_process or a web API if running server-side
      // pythonProcess.current = spawn('python', ['blink.py']);
      
      setStatus('Calibrating...');
      setCalibrationProgress(0);
      
      // Simulate calibration progress
      const interval = setInterval(() => {
        setCalibrationProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            setStatus('Monitoring active');
            return 100;
          }
          return prev + 5;
        });
      }, 300);
      
      // Simulate receiving data from Python process
      simulateDataUpdates();
      
    } catch (error) {
      console.error('Error starting monitoring:', error);
      setStatus(`Error: ${error.message}`);
      setIsMonitoring(false);
    }
  };

  // Stop monitoring
  const stopMonitoring = () => {
    setIsMonitoring(false);
    setStatus('Monitoring stopped');
    
    // In a real implementation, you would terminate the Python process
    // if (pythonProcess.current) {
    //   pythonProcess.current.kill();
    //   pythonProcess.current = null;
    // }
    
    // Clear any active notifications
    setNotification(null);
  };

  // Simulate receiving data from the Python script
  const simulateDataUpdates = () => {
    let blinkCount = 0;
    
    // Simulate blink rate updates
    const blinkInterval = setInterval(() => {
      if (!isMonitoring) {
        clearInterval(blinkInterval);
        return;
      }
      
      // Random blink rate between 5-30 for simulation
      const newRate = Math.floor(Math.random() * 25) + 5;
      setBlinkRate(newRate);
      
      // Simulate notifications
      if (newRate < 10) {
        setNotification({
          type: 'warning',
          message: `Low blink rate detected (${newRate} BPM). You may be fatigued.`
        });
      } else if (newRate > 25) {
        setNotification({
          type: 'error',
          message: `High blink rate detected (${newRate} BPM). You may be stressed.`
        });
      }
      
      // Random glasses detection
      if (Math.random() > 0.8) {
        setGlassesDetected(!glassesDetected);
      }
      
      // Simulate EAR values
      setEarValue(0.25 + Math.random() * 0.15);
      setThreshold(0.2 + Math.random() * 0.1);
      
      // Simulate head tilt
      setHeadTilt({
        pitch: (Math.random() * 10 - 5).toFixed(2),
        yaw: (Math.random() * 10 - 5).toFixed(2),
        roll: (Math.random() * 10 - 5).toFixed(2)
      });
      
    }, 2000);
    
    // Simulate next notification time
    const notificationInterval = setInterval(() => {
      if (!isMonitoring) {
        clearInterval(notificationInterval);
        return;
      }
      setNextNotification(prev => (prev > 0 ? prev - 1 : 3600));
    }, 1000);
    
    return () => {
      clearInterval(blinkInterval);
      clearInterval(notificationInterval);
    };
  };

  // Format time for notification countdown
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  // Determine status color based on blink rate
  const getStatusColor = () => {
    if (blinkRate < 10) return '#ff4d4f'; // red for low
    if (blinkRate > 25) return '#faad14'; // orange for high
    return '#52c41a'; // green for normal
  };

  useEffect(() => {
    if (isMonitoring) {
      const cleanup = simulateDataUpdates();
      return cleanup;
    }
  }, [isMonitoring]);

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <Title level={2} style={{ textAlign: 'center', marginBottom: '24px' }}>
        <EyeOutlined /> Blink Rate Tracker
      </Title>
      
      {notification && (
        <Alert
          type={notification.type}
          message={notification.message}
          showIcon
          closable
          onClose={() => setNotification(null)}
          style={{ marginBottom: '20px' }}
        />
      )}
      
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
          <Statistic
            title="Current Blink Rate"
            value={blinkRate}
            suffix="BPM"
            valueStyle={{ color: getStatusColor() }}
          />
          <Statistic
            title="Next Notification"
            value={formatTime(nextNotification)}
            prefix={<ClockCircleOutlined />}
          />
          <Statistic
            title="Glasses Detected"
            value={glassesDetected ? 'Yes' : 'No'}
            prefix={glassesDetected ? <EyeOutlined /> : <EyeInvisibleOutlined />}
          />
        </div>
        
        <div style={{ marginBottom: '20px' }}>
          <Text strong>Status: </Text>
          <Text style={{ color: isMonitoring ? '#52c41a' : '#ff4d4f' }}>
            {status}
          </Text>
          {isMonitoring && calibrationProgress < 100 && (
            <div style={{ marginTop: '10px' }}>
              <Progress percent={calibrationProgress} status="active" />
              <Text type="secondary">Calibrating eye detection...</Text>
            </div>
          )}
        </div>
        
        <div style={{ marginBottom: '20px' }}>
          <Text strong>Eye Aspect Ratio (EAR): </Text>
          <Text>{earValue.toFixed(3)} (Threshold: {threshold.toFixed(3)})</Text>
          <br />
          <Text strong>Head Tilt: </Text>
          <Text>Pitch: {headTilt.pitch}, Yaw: {headTilt.yaw}, Roll: {headTilt.roll}</Text>
        </div>
        
        <div style={{ textAlign: 'center' }}>
          {!isMonitoring ? (
            <Button
              type="primary"
              size="large"
              onClick={startMonitoring}
              icon={<EyeOutlined />}
            >
              Start Monitoring
            </Button>
          ) : (
            <Button
              danger
              size="large"
              onClick={stopMonitoring}
              icon={<EyeInvisibleOutlined />}
            >
              Stop Monitoring
            </Button>
          )}
        </div>
      </Card>
      
      <Card title="Information" style={{ marginTop: '20px' }}>
        <ul>
          <li>Normal blink rate: 10-25 blinks per minute (BPM)</li>
          <li>Low blink rate (&lt;10 BPM) may indicate fatigue or concentration</li>
          <li>High blink rate (&gt;25 BPM) may indicate stress or eye strain</li>
          <li>Notifications will be sent hourly if your blink rate is abnormal</li>
        </ul>
      </Card>
      
      {/* In a real implementation, you would display the webcam feed here */}
      {/* <video ref={videoRef} autoPlay playsInline style={{ display: 'none' }} /> */}
    </div>
  );
};

export default BlinkTracker;