import { useState, useEffect, useRef } from 'react';


export default function BlinkMonitor() {
  // State variables
  const [blinkCount, setBlinkCount] = useState(0);
  const [blinkRate, setBlinkRate] = useState(0);
  const [calibrating, setCalibrating] = useState(true);
  const [calibrationProgress, setCalibrationProgress] = useState(0);
  const [status, setStatus] = useState("Starting up...");
  const [earValue, setEarValue] = useState(0);
  const [threshold, setThreshold] = useState(0);
  const [headPitch, setHeadPitch] = useState(0);
  const [headYaw, setHeadYaw] = useState(0);
  const [glassesDetected, setGlassesDetected] = useState(false);
  const [nextNotification, setNextNotification] = useState("00:00");
  const [detectorState, setDetectorState] = useState("OPEN");
  
  // Constants
  const CALIBRATION_FRAMES = 30;
  const BLINK_DURATION_MIN_FRAMES = 1;
  const BLINK_DURATION_MAX_FRAMES = 7;
  const SLOW_BLINK_THRESHOLD = 10;
  const FAST_BLINK_THRESHOLD = 25;
  const NOTIFICATION_INTERVAL = 3600; // 1 hour in seconds
  const EAR_THRESHOLD_ADJUSTMENT = 0.78;
  
  // Refs for webcam and canvas
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  
  // Refs for state management
  const frameCounterRef = useRef(0);
  const baselineEARRef = useRef(null);
  const earHistoryRef = useRef([]);
  const prevEarRef = useRef(null);
  const blinkFramesRef = useRef(0);
  const openFramesRef = useRef(0);
  const blinksInWindowRef = useRef([]);
  const lastNotificationTimeRef = useRef(Date.now());
  const debugModeRef = useRef(true);
  const animationRef = useRef(null);
  const modelRef = useRef(null);
  
  // Eye landmarks indices
  const LEFT_EYE = [33, 160, 158, 133, 153, 144];
  const RIGHT_EYE = [362, 385, 387, 263, 373, 380];
  const LEFT_EYE_CONTOUR = [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246];
  const RIGHT_EYE_CONTOUR = [362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384, 398];
  
  // Face orientation landmarks
  const NOSE_TIP = 4;
  const LEFT_EAR = 234;
  const RIGHT_EAR = 454;
  const FOREHEAD = 10;
  const CHIN = 152;
  
  // Calculate distance between two points
  const calculateDistance = (point1, point2) => {
    const dx = point1[0] - point2[0];
    const dy = point1[1] - point2[1];
    return Math.sqrt(dx * dx + dy * dy);
  };
  
  // Calculate EAR (Eye Aspect Ratio)
  const calculateEAR = (eyeLandmarks, faceLandmarks, headRotation) => {
    try {
      // Traditional EAR calculation
      const A = calculateDistance(faceLandmarks[eyeLandmarks[1]], faceLandmarks[eyeLandmarks[5]]);
      const B = calculateDistance(faceLandmarks[eyeLandmarks[2]], faceLandmarks[eyeLandmarks[4]]);
      const C = calculateDistance(faceLandmarks[eyeLandmarks[0]], faceLandmarks[eyeLandmarks[3]]);
      
      // Basic EAR
      let ear = (A + B) / (2.0 * C);
      
      // Apply head tilt compensation
      ear = ear * (1.0 + 0.2 * Math.abs(headRotation.pitch));
      
      // Glasses compensation
      if (glassesDetected) {
        ear = ear * 0.92;
      }
      
      return ear;
    } catch (error) {
      return 1.0; // Default value on error
    }
  };
  
  // Detect if user is wearing glasses
  const detectGlasses = (faceLandmarks, eyeContourLandmarks) => {
    try {
      const contourPoints = eyeContourLandmarks.map(i => faceLandmarks[i]);
      const contourDists = [];
      
      for (let i = 0; i < contourPoints.length - 1; i++) {
        contourDists.push(calculateDistance(contourPoints[i], contourPoints[i + 1]));
      }
      
      const mean = contourDists.reduce((sum, val) => sum + val, 0) / contourDists.length;
      const variance = contourDists.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / contourDists.length;
      
      return variance > 60; // Threshold determined empirically
    } catch (error) {
      return false;
    }
  };
  
  // Calculate head rotation for tilt compensation
  const calculateHeadRotation = (landmarks, frameWidth, frameHeight) => {
    try {
      const nose = [landmarks[NOSE_TIP].x, landmarks[NOSE_TIP].y, landmarks[NOSE_TIP].z];
      const leftEar = [landmarks[LEFT_EAR].x, landmarks[LEFT_EAR].y, landmarks[LEFT_EAR].z];
      const rightEar = [landmarks[RIGHT_EAR].x, landmarks[RIGHT_EAR].y, landmarks[RIGHT_EAR].z];
      const forehead = [landmarks[FOREHEAD].x, landmarks[FOREHEAD].y, landmarks[FOREHEAD].z];
      const chin = [landmarks[CHIN].x, landmarks[CHIN].y, landmarks[CHIN].z];
      
      // Calculate yaw (horizontal rotation)
      const yaw = rightEar[0] - leftEar[0];
      
      // Calculate roll (tilting head side to side)
      const dy = rightEar[1] - leftEar[1];
      const dx = rightEar[0] - leftEar[0];
      const roll = dx !== 0 ? Math.atan2(dy, dx) : 0;
      
      // Calculate pitch (nodding up/down)
      const pitch = forehead[1] - chin[1];
      
      return { yaw, pitch, roll };
    } catch (error) {
      return { yaw: 0, pitch: 0, roll: 0 };
    }
  };
  
  // Send notification
  const sendNotification = (title, message) => {
    try {
      if ('Notification' in window) {
        if (Notification.permission === 'granted') {
          new Notification(title, { body: message });
        } else if (Notification.permission !== 'denied') {
          Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
              new Notification(title, { body: message });
            }
          });
        }
      }
      console.log(`Notification: ${title} - ${message}`);
    } catch (error) {
      console.log(`Failed to send notification: ${error}`);
    }
  };
  
  // Update blink detector state machine
  const updateBlinkDetector = (isClosed) => {
    let blinkDetected = false;
    let debugInfo = "";
    
    switch (detectorState) {
      case "OPEN":
        if (isClosed) {
          setDetectorState("CLOSING");
          blinkFramesRef.current = 1;
          debugInfo = "OPEN→CLOSING";
        } else {
          debugInfo = "OPEN";
        }
        break;
        
      case "CLOSING":
        if (isClosed) {
          blinkFramesRef.current += 1;
          if (blinkFramesRef.current >= BLINK_DURATION_MIN_FRAMES) {
            setDetectorState("CLOSED");
          }
          debugInfo = `CLOSING (${blinkFramesRef.current})`;
        } else {
          setDetectorState("OPEN");
          debugInfo = "CLOSING→OPEN (too brief)";
        }
        break;
        
      case "CLOSED":
        if (isClosed) {
          blinkFramesRef.current += 1;
          if (blinkFramesRef.current > BLINK_DURATION_MAX_FRAMES) {
            setDetectorState("HELD_CLOSED");
          }
          debugInfo = `CLOSED (${blinkFramesRef.current})`;
        } else {
          setDetectorState("OPENING");
          debugInfo = "CLOSED→OPENING";
        }
        break;
        
      case "OPENING":
        if (!isClosed) {
          openFramesRef.current += 1;
          if (openFramesRef.current >= 2) { // Min open frames
            setBlinkCount(prev => prev + 1);
            blinkDetected = true;
            setDetectorState("OPEN");
            openFramesRef.current = 0;
            debugInfo = "BLINK DETECTED!";
          } else {
            debugInfo = `OPENING (${openFramesRef.current})`;
          }
        } else {
          setDetectorState("CLOSED");
          debugInfo = "OPENING→CLOSED";
        }
        break;
        
      case "HELD_CLOSED":
        if (!isClosed) {
          setDetectorState("OPENING");
          openFramesRef.current = 1;
          debugInfo = "HELD_CLOSED→OPENING";
        } else {
          debugInfo = "HELD_CLOSED";
        }
        break;
        
      default:
        setDetectorState("OPEN");
    }
    
    return { blinkDetected, debugInfo };
  };
  
  // Draw eye landmarks on canvas
  const drawEyeLandmarks = (ctx, landmarks, isClosed) => {
    // Draw eye contours with color based on state
    const eyeColor = isClosed ? '#ff0000' : '#00ff00';
    
    // Draw eye landmarks
    [...LEFT_EYE, ...RIGHT_EYE].forEach(i => {
      ctx.beginPath();
      ctx.arc(landmarks[i][0], landmarks[i][1], 2, 0, 2 * Math.PI);
      ctx.fillStyle = eyeColor;
      ctx.fill();
    });
    
    // Draw eye contours
    [LEFT_EYE_CONTOUR, RIGHT_EYE_CONTOUR].forEach(eye => {
      ctx.beginPath();
      ctx.moveTo(landmarks[eye[0]][0], landmarks[eye[0]][1]);
      for (let i = 1; i < eye.length; i++) {
        ctx.lineTo(landmarks[eye[i]][0], landmarks[eye[i]][1]);
      }
      ctx.lineTo(landmarks[eye[0]][0], landmarks[eye[0]][1]);
      ctx.strokeStyle = eyeColor;
      ctx.lineWidth = 1;
      ctx.stroke();
    });
  };
  
  // Main detection loop
  const detect = async () => {
    if (!modelRef.current || !videoRef.current || videoRef.current.paused || videoRef.current.ended) {
      return;
    }
    
    try {
      const predictions = await modelRef.current.estimateFaces({
        input: videoRef.current,
        returnTensors: false,
        flipHorizontal: false,
        predictIrises: true
      });
      
      const ctx = canvasRef.current.getContext('2d');
      const videoWidth = videoRef.current.videoWidth;
      const videoHeight = videoRef.current.videoHeight;
      
      // Set canvas dimensions to match video
      canvasRef.current.width = videoWidth;
      canvasRef.current.height = videoHeight;
      
      // Clear canvas
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      
      // Draw video frame on canvas
      ctx.drawImage(videoRef.current, 0, 0, videoWidth, videoHeight);
      
      frameCounterRef.current += 1;
      const currentTime = Date.now();
      
      if (predictions.length > 0) {
        const face = predictions[0];
        
        // Convert landmarks to format expected by our functions
        const landmarks = face.mesh.map(point => [point[0], point[1]]);
        
        // Calculate head rotation
        const headRotation = calculateHeadRotation(face.mesh, videoWidth, videoHeight);
        setHeadPitch(headRotation.pitch.toFixed(2));
        setHeadYaw(headRotation.yaw.toFixed(2));
        
        // Check for glasses
        const leftGlasses = detectGlasses(landmarks, LEFT_EYE_CONTOUR);
        const rightGlasses = detectGlasses(landmarks, RIGHT_EYE_CONTOUR);
        setGlassesDetected(leftGlasses || rightGlasses);
        
        // Calculate EAR for both eyes
        const leftEar = calculateEAR(LEFT_EYE, landmarks, headRotation);
        const rightEar = calculateEAR(RIGHT_EYE, landmarks, headRotation);
        let avgEar = (leftEar + rightEar) / 2;
        
        // Fast response smoothing
        if (prevEarRef.current !== null) {
          avgEar = 0.7 * avgEar + 0.3 * prevEarRef.current;
        }
        prevEarRef.current = avgEar;
        
        setEarValue(avgEar.toFixed(3));
        
        // Calibration phase
        if (frameCounterRef.current <= CALIBRATION_FRAMES) {
          earHistoryRef.current.push(avgEar);
          const progress = Math.round((frameCounterRef.current / CALIBRATION_FRAMES) * 100);
          setCalibrationProgress(progress);
          setStatus(`Calibrating... ${progress}%`);
          
          if (frameCounterRef.current === CALIBRATION_FRAMES) {
            // Calculate baseline EAR from calibration
            const sortedEars = [...earHistoryRef.current].sort((a, b) => a - b);
            const percentileIdx = Math.floor(sortedEars.length * 0.7);
            baselineEARRef.current = sortedEars[percentileIdx];
            
            // Calculate standard deviation
            const mean = earHistoryRef.current.reduce((sum, val) => sum + val, 0) / earHistoryRef.current.length;
            const variance = earHistoryRef.current.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / earHistoryRef.current.length;
            const stdDev = Math.sqrt(variance);
            
            console.log(`Calibration complete - Baseline EAR: ${baselineEARRef.current.toFixed(4)}, StdDev: ${stdDev.toFixed(4)}`);
            
            // Notify user
            sendNotification("Calibration Complete", "Blink monitor has been calibrated and is now tracking your blink rate.");
            setCalibrating(false);
          }
        }
        
        // Only process blinks after calibration
        if (baselineEARRef.current !== null) {
          // Calculate threshold - adjust based on glasses
          let currentThresholdAdjustment = EAR_THRESHOLD_ADJUSTMENT;
          if (glassesDetected) {
            currentThresholdAdjustment += 0.03; // More sensitive for glasses
          }
          
          const blinkThreshold = baselineEARRef.current * currentThresholdAdjustment;
          setThreshold(blinkThreshold.toFixed(3));
          
          // Detect if eyes are closed based on EAR
          const isClosed = avgEar < blinkThreshold;
          
          // Update blink detector
          const { blinkDetected, debugInfo } = updateBlinkDetector(isClosed);
          
          // Draw eye landmarks
          drawEyeLandmarks(ctx, landmarks, isClosed);
          
          if (blinkDetected) {
            blinksInWindowRef.current.push(Date.now());
            setStatus(`Blink Detected! Total: ${blinkCount + 1}`);
          }
          
          // Update UI with state info if in debug mode
          if (debugModeRef.current) {
            setStatus(prev => debugInfo ? `${prev} | State: ${debugInfo}` : prev);
          }
          
          // Calculate BPM over last 60 seconds
          const oneMinuteAgo = Date.now() - 60000;
          blinksInWindowRef.current = blinksInWindowRef.current.filter(t => t >= oneMinuteAgo);
          setBlinkRate(blinksInWindowRef.current.length);
          
          // Check for notifications
          if (currentTime - lastNotificationTimeRef.current >= NOTIFICATION_INTERVAL * 1000) {
            lastNotificationTimeRef.current = currentTime;
            
            const bpm = blinksInWindowRef.current.length;
            
            if (bpm < SLOW_BLINK_THRESHOLD) {
              setStatus(`Slow Blink Rate! (${bpm} BPM) - You may be fatigued.`);
              sendNotification(
                "Low Blink Rate Detected",
                `Your current blink rate is ${bpm} blinks per minute. This is below the recommended rate and may indicate fatigue. Consider taking a break.`
              );
            } else if (bpm > FAST_BLINK_THRESHOLD) {
              setStatus(`Fast Blink Rate! (${bpm} BPM) - You may be stressed.`);
              sendNotification(
                "High Blink Rate Detected",
                `Your current blink rate is ${bpm} blinks per minute. This is above the normal rate and may indicate stress. Consider taking a short break to relax.`
              );
            } else {
              setStatus(`Normal Blink Rate (${bpm} BPM)`);
              sendNotification(
                "Normal Blink Rate",
                `Your current blink rate is ${bpm} blinks per minute, which is within the normal range.`
              );
            }
          }
          
          // Update next notification time
          const timeUntilNext = NOTIFICATION_INTERVAL - Math.floor((currentTime - lastNotificationTimeRef.current) / 1000);
          const minutes = Math.floor(timeUntilNext / 60);
          const seconds = timeUntilNext % 60;
          setNextNotification(`${minutes}m ${seconds}s`);
        }
        
        // Draw status text
        ctx.font = '16px Arial';
        ctx.fillStyle = '#00ff00';
        ctx.fillText(`Blink Rate: ${blinkRate} BPM`, 30, 30);
        
        if (glassesDetected) {
          ctx.fillStyle = '#0000ff';
          ctx.fillText("Glasses Detected", 30, 60);
        }
        
        ctx.fillStyle = '#ffa500';
        ctx.fillText(status, 30, 90);
        
        ctx.fillStyle = '#ffffff';
        ctx.fillText(`EAR: ${earValue} / Threshold: ${threshold}`, 30, 120);
        ctx.fillText(`Pitch: ${headPitch}, Yaw: ${headYaw}`, 30, 150);
        ctx.fillText(`Next notification in: ${nextNotification}`, 30, 180);
      }
      
    } catch (error) {
      console.error("Error in detection loop:", error);
    }
    
    animationRef.current = requestAnimationFrame(detect);
  };
  
  // Initialize webcam and ML model
  useEffect(() => {
    async function setupCamera() {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('Browser API navigator.mediaDevices.getUserMedia not available');
        return;
      }
      
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480 }
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          
          // Wait for video to be loaded
          videoRef.current.onloadedmetadata = async () => {
            videoRef.current.play();
            
            // Set canvas size
            if (canvasRef.current) {
              canvasRef.current.width = videoRef.current.videoWidth;
              canvasRef.current.height = videoRef.current.videoHeight;
            }
            
            // Load face detection model
            try {
              // This is a placeholder - in a real app you'd use the actual TensorFlow.js model
              // model = await faceLandmarksDetection.load(
              //   faceLandmarksDetection.SupportedPackages.mediapipeFacemesh,
              //   { maxFaces: 1 }
              // );
              
              // For demo purposes, we're simulating the model
              modelRef.current = {
                estimateFaces: async () => {
                  // Return a simulated face mesh
                  // In a real app, this would come from the ML model
                  return [{
                    mesh: Array(468).fill().map(() => [
                      Math.random() * videoRef.current.videoWidth,
                      Math.random() * videoRef.current.videoHeight,
                      0
                    ])
                  }];
                }
              };
              
              sendNotification("Blink Monitor Started", "Monitoring your blink rate. Will notify you hourly if your blink rate is abnormal.");
              
              // Start detection loop
              detect();
            } catch (error) {
              console.error('Failed to load face detection model:', error);
              setStatus('Failed to load face detection model');
            }
          };
        }
      } catch (error) {
        console.error('Failed to access webcam:', error);
        setStatus('Failed to access webcam');
      }
    }
    
    // Request notification permission
    if ('Notification' in window) {
      Notification.requestPermission();
    }
    
    setupCamera();
    
    // Cleanup
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach(track => track.stop());
      }
      
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      
      sendNotification("Blink Monitor Stopped", "Blink rate monitoring has been stopped.");
    };
  }, []);
  
  return (
    <div className="flex flex-col items-center w-full max-w-4xl mx-auto p-4 bg-gray-100 rounded-lg shadow-lg">
      <h1 className="text-2xl font-bold mb-4">Blink Rate Monitor</h1>
      
      <div className="relative mb-4 w-full">
        <video 
          ref={videoRef} 
          className="hidden"
          playsInline 
        />
        <canvas 
          ref={canvasRef} 
          className="w-full h-auto border border-gray-300 rounded-lg"
        />
        
        {calibrating && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-50 text-white">
            <div className="text-xl mb-2">Calibrating...</div>
            <div className="w-64 h-4 bg-gray-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500" 
                style={{ width: `${calibrationProgress}%` }}
              ></div>
            </div>
            <div className="mt-2">{calibrationProgress}%</div>
          </div>
        )}
      </div>
      
      <div className="grid grid-cols-2 gap-4 w-full">
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-bold mb-2">Blink Statistics</h2>
          <div className="flex flex-col space-y-2">
            <div className="flex justify-between">
              <span>Total Blinks:</span>
              <span className="font-bold">{blinkCount}</span>
            </div>
            <div className="flex justify-between">
              <span>Blink Rate:</span>
              <span className={`font-bold ${
                blinkRate < SLOW_BLINK_THRESHOLD ? 'text-red-500' : 
                blinkRate > FAST_BLINK_THRESHOLD ? 'text-orange-500' : 'text-green-500'
              }`}>
                {blinkRate} bpm
              </span>
            </div>
            <div className="flex justify-between">
              <span>Status:</span>
              <span>{status}</span>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-bold mb-2">Technical Data</h2>
          <div className="flex flex-col space-y-2">
            <div className="flex justify-between">
              <span>EAR Value:</span>
              <span>{earValue}</span>
            </div>
            <div className="flex justify-between">
              <span>Threshold:</span>
              <span>{threshold}</span>
            </div>
            <div className="flex justify-between">
              <span>Head Orientation:</span>
              <span>P: {headPitch} Y: {headYaw}</span>
            </div>
            <div className="flex justify-between">
              <span>Glasses:</span>
              <span>{glassesDetected ? 'Detected' : 'Not detected'}</span>
            </div>
            <div className="flex justify-between">
              <span>Next Notification:</span>
              <span>{nextNotification}</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="mt-4 w-full bg-white p-4 rounded-lg shadow">
        <h2 className="text-lg font-bold mb-2">Information</h2>
        <p className="text-sm">
          This app monitors your blink rate and provides notifications if it detects abnormal patterns.
          A normal blink rate is between {SLOW_BLINK_THRESHOLD} and {FAST_BLINK_THRESHOLD} blinks per minute.
          Low blink rates may indicate fatigue, while high rates can suggest stress.
        </p>
      </div>
    </div>
  );
}