import React, { useEffect, useRef, useState } from 'react';
import { Pose } from '@mediapipe/pose';
import { FaceMesh } from '@mediapipe/face_mesh';
import { Camera } from '@mediapipe/camera_utils';

const PostureCorrector = () => {
  // Refs
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const poseRef = useRef(null);
  const faceMeshRef = useRef(null);
  const cameraRef = useRef(null);
  const lastBlinkTime = useRef(0);
  const blinkHistory = useRef([]);

  // State variables
  const [cameraActive, setCameraActive] = useState(false);
  const [isPostureMonitoring, setIsPostureMonitoring] = useState(false);
  const [isBlinkMonitoring, setIsBlinkMonitoring] = useState(false);
  const [postureStatus, setPostureStatus] = useState("Not Monitoring");
  const [blinkRate, setBlinkRate] = useState(0);
  const [referencePosture, setReferencePosture] = useState(null);
  const [shoulderAngle, setShoulderAngle] = useState(0);
  const [neckAngle, setNeckAngle] = useState(0);
  const [leanAngle, setLeanAngle] = useState(0);
  const [screenDistance, setScreenDistance] = useState(0);
  const [distanceStatus, setDistanceStatus] = useState("Unknown");
  const [notification, setNotification] = useState(null);
  const [earValue, setEarValue] = useState(0.3);

  // Constants
  const POSTURE_THRESHOLD = 15;
  const IDEAL_DISTANCE = 60;
  const DISTANCE_THRESHOLD = 15;
  const EAR_THRESHOLD = 0.2;
  const BLINK_RATE_INTERVAL = 5000;
  const EAR_SMOOTHING_FACTOR = 0.1;

  // Initialize models
  useEffect(() => {
    // Initialize Pose detection
    const pose = new Pose({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
    });

    pose.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      enableSegmentation: false,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    pose.onResults(onPoseResults);
    poseRef.current = pose;

    // Initialize Face Mesh
    const faceMesh = new FaceMesh({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
    });

    faceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    faceMesh.onResults(onFaceResults);
    faceMeshRef.current = faceMesh;

    return () => {
      if (poseRef.current) poseRef.current.close();
      if (faceMeshRef.current) faceMeshRef.current.close();
      if (cameraRef.current) cameraRef.current.stop();
    };
  }, []);

  // Update blink rate periodically
  useEffect(() => {
    if (!isBlinkMonitoring) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const recentBlinks = blinkHistory.current.filter(t => now - t < 60000).length;
      setBlinkRate(recentBlinks);
    }, BLINK_RATE_INTERVAL);

    return () => clearInterval(interval);
  }, [isBlinkMonitoring]);

  // Handle pose results
  const onPoseResults = (results) => {
    if (!isPostureMonitoring || !results.poseLandmarks) return;
    
    const postureData = calculatePostureData(results.poseLandmarks);
    updatePostureMetrics(postureData);
  };

  // Enhanced EAR calculation with more landmarks
  const calculateEAR = (eyePoints) => {
    // Vertical distances (more points for better accuracy)
    const A1 = distance(eyePoints[1], eyePoints[5]);
    const A2 = distance(eyePoints[2], eyePoints[4]);
    const A3 = distance(eyePoints[3], eyePoints[7]);
    const A4 = distance(eyePoints[0], eyePoints[8]);
    
    // Horizontal distances
    const B1 = distance(eyePoints[0], eyePoints[3]);
    const B2 = distance(eyePoints[1], eyePoints[2]);
    const B3 = distance(eyePoints[4], eyePoints[5]);
    
    // Calculate average vertical and horizontal distances
    const avgVertical = (A1 + A2 + A3 + A4) / 4;
    const avgHorizontal = (B1 + B2 + B3) / 3;
    
    return avgVertical / avgHorizontal;
  };

  // Handle face results with enhanced blink detection
  const onFaceResults = (results) => {
    if (!isBlinkMonitoring || !results.multiFaceLandmarks) return;

    if (results.multiFaceLandmarks.length > 0) {
      const landmarks = results.multiFaceLandmarks[0];
      
      // Enhanced left eye landmarks (more points around the eyelid)
      const leftEyeEAR = calculateEAR([
        landmarks[33],  // Left eye corner
        landmarks[160], // Upper lid
        landmarks[158], // Upper lid
        landmarks[133], // Lower lid
        landmarks[153], // Lower lid
        landmarks[144], // Left eye corner
        landmarks[145], // Additional points
        landmarks[159], // Additional points
        landmarks[154]  // Additional points
      ]);
      
      // Enhanced right eye landmarks (more points around the eyelid)
      const rightEyeEAR = calculateEAR([
        landmarks[263], // Right eye corner
        landmarks[387], // Upper lid
        landmarks[385], // Upper lid
        landmarks[362], // Lower lid
        landmarks[380], // Lower lid
        landmarks[373], // Right eye corner
        landmarks[374], // Additional points
        landmarks[386], // Additional points
        landmarks[381]  // Additional points
      ]);
      
      // Apply smoothing to EAR values
      const avgEAR = (leftEyeEAR + rightEyeEAR) / 2;
      const smoothedEAR = earValue * (1 - EAR_SMOOTHING_FACTOR) + avgEAR * EAR_SMOOTHING_FACTOR;
      setEarValue(smoothedEAR);

      // Enhanced blink detection with hysteresis
      if (smoothedEAR < EAR_THRESHOLD * 0.9 && Date.now() - lastBlinkTime.current > 200) {
        lastBlinkTime.current = Date.now();
        blinkHistory.current = [...blinkHistory.current, Date.now()].slice(-100); // Keep last 100 blinks
      }
    }
  };

  // Calculate distance between points
  const distance = (p1, p2) => {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
  };

  // Calculate posture metrics
  const calculatePostureData = (landmarks) => {
    const nose = landmarks[0];
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    const leftEar = landmarks[7];
    const rightEar = landmarks[8];
    const leftHip = landmarks[23];
    const rightHip = landmarks[24];

    // Calculate angles
    const shoulderAngle = Math.atan2(
      leftShoulder.y - rightShoulder.y,
      leftShoulder.x - rightShoulder.x
    ) * (180 / Math.PI);

    const shoulderCenterX = (leftShoulder.x + rightShoulder.x) / 2;
    const shoulderCenterY = (leftShoulder.y + rightShoulder.y) / 2;
    
    const neckAngle = Math.atan2(
      nose.y - shoulderCenterY,
      nose.x - shoulderCenterX
    ) * (180 / Math.PI);

    const leanAngle = Math.atan2(
      ((leftHip.x + rightHip.x) / 2) - shoulderCenterX,
      ((leftHip.y + rightHip.y) / 2) - shoulderCenterY
    ) * (180 / Math.PI);

    // Estimate distance
    const faceWidth = Math.abs(leftEar.x - rightEar.x) * videoRef.current.videoWidth;
    const distance = faceWidth > 0 ? (1000 / faceWidth) * 10 : 0;

    return { shoulderAngle, neckAngle, leanAngle, distance };
  };

  // Update posture metrics
  const updatePostureMetrics = (postureData) => {
    setShoulderAngle(postureData.shoulderAngle);
    setNeckAngle(postureData.neckAngle);
    setLeanAngle(postureData.leanAngle);
    setScreenDistance(postureData.distance);

    // Update distance status
    if (postureData.distance < IDEAL_DISTANCE - DISTANCE_THRESHOLD) {
      setDistanceStatus("Too Close!");
    } else if (postureData.distance > IDEAL_DISTANCE + DISTANCE_THRESHOLD) {
      setDistanceStatus("Too Far!");
    } else {
      setDistanceStatus("Good Distance");
    }

    // Check posture status
    if (referencePosture && isPostureMonitoring) {
      const shoulderDiff = Math.abs(postureData.shoulderAngle - referencePosture.shoulderAngle);
      const neckDiff = Math.abs(postureData.neckAngle - referencePosture.neckAngle);
      const leanDiff = Math.abs(postureData.leanAngle - referencePosture.leanAngle);

      if (shoulderDiff > POSTURE_THRESHOLD || neckDiff > POSTURE_THRESHOLD || leanDiff > POSTURE_THRESHOLD) {
        setPostureStatus("POOR POSTURE DETECTED");
      } else {
        setPostureStatus("Good Posture");
      }
    }
  };

  // Toggle camera
  const toggleCamera = async () => {
    try {
      if (cameraActive) {
        // Turn off
        cameraRef.current.stop();
        if (videoRef.current.srcObject) {
          videoRef.current.srcObject.getTracks().forEach(track => track.stop());
        }
        setCameraActive(false);
        setIsPostureMonitoring(false);
        setIsBlinkMonitoring(false);
        setPostureStatus("Not Monitoring");
        showNotification("Camera Off", "Webcam has been turned off.");
      } else {
        // Turn on
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'user', width: 640, height: 480 } 
        });
        videoRef.current.srcObject = stream;
        
        cameraRef.current = new Camera(videoRef.current, {
          onFrame: async () => {
            try {
              if (poseRef.current) await poseRef.current.send({ image: videoRef.current });
              if (faceMeshRef.current) await faceMeshRef.current.send({ image: videoRef.current });
            } catch (err) {
              console.error("Error processing frame:", err);
            }
          },
          width: 640,
          height: 480,
        });
        cameraRef.current.start();
        
        setCameraActive(true);
        showNotification("Camera Active", "Your webcam is now on.");
      }
    } catch (err) {
      console.error("Camera error:", err);
      showNotification("Camera Error", "Could not access camera. Please check permissions.");
    }
  };

  // Calibrate posture
  const calibratePosture = () => {
    if (!cameraActive) {
      showNotification("Camera Required", "Please turn on the camera first.");
      return;
    }

    showNotification("Calibrating", "Please sit in your ideal posture...");
    setIsPostureMonitoring(true);
    
    // Temporary handler for calibration
    const calibrationHandler = (results) => {
      if (results.poseLandmarks) {
        const postureData = calculatePostureData(results.poseLandmarks);
        setReferencePosture(postureData);
        setPostureStatus("Calibrated. Monitoring...");
        showNotification("Calibration Complete", "Posture calibrated!");
        
        // Restore original handler
        poseRef.current.onResults(onPoseResults);
      }
    };

    poseRef.current.onResults(calibrationHandler);
  };

  // Toggle blink monitoring
  const toggleBlinkMonitoring = () => {
    if (!cameraActive) {
      showNotification("Camera Required", "Please turn on the camera first.");
      return;
    }

    const newState = !isBlinkMonitoring;
    setIsBlinkMonitoring(newState);
    showNotification(
      "Blink Monitor", 
      newState ? "Blink monitoring started" : "Blink monitoring stopped"
    );
    
    // Reset blink history when starting monitoring
    if (newState) {
      blinkHistory.current = [];
      setBlinkRate(0);
    }
  };

  // Show notification
  const showNotification = (title, message) => {
    setNotification({ title, message });
    setTimeout(() => setNotification(null), 5000);
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-3xl font-bold text-center mb-6">Posture & Blink Monitor</h1>
      
      {/* Controls */}
      <div className="flex justify-center gap-4 mb-4 flex-wrap">
        <button
          onClick={toggleCamera}
          className={`px-4 py-2 rounded ${cameraActive ? 'bg-red-500' : 'bg-blue-500'} text-white`}
        >
          {cameraActive ? 'Turn Off Camera' : 'Turn On Camera'}
        </button>
        
        {cameraActive && (
          <>
            <button
              onClick={calibratePosture}
              className={`px-4 py-2 rounded ${isPostureMonitoring ? 'bg-green-500' : 'bg-yellow-500'} text-white`}
            >
              {isPostureMonitoring ? 'Monitoring Posture' : 'Calibrate Posture'}
            </button>
            <button
              onClick={toggleBlinkMonitoring}
              className={`px-4 py-2 rounded ${isBlinkMonitoring ? 'bg-green-500' : 'bg-blue-500'} text-white`}
            >
              {isBlinkMonitoring ? 'Stop Blink Monitor' : 'Start Blink Monitor'}
            </button>
          </>
        )}
      </div>

      {/* Canvas Display - Now hidden since we don't want to show landmarks */}
      <div className="hidden">
        <video ref={videoRef} playsInline autoPlay muted />
        <canvas ref={canvasRef} />
      </div>
      
      {/* Status Display */}
      <div className="bg-gray-100 rounded-lg p-6 shadow-md mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-lg">
            <h3 className="font-semibold mb-2">Posture Status</h3>
            <div className={`p-2 rounded ${
              postureStatus.includes("POOR") ? 'bg-red-500' : 
              postureStatus.includes("Good") ? 'bg-green-500' : 'bg-gray-500'
            } text-white text-center`}>
              {postureStatus}
            </div>
            <div className="mt-2 space-y-1">
              <div>Shoulder: {shoulderAngle.toFixed(1)}°</div>
              <div>Neck: {neckAngle.toFixed(1)}°</div>
              <div>Lean: {leanAngle.toFixed(1)}°</div>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg">
            <h3 className="font-semibold mb-2">Screen Distance</h3>
            <div className={`p-2 rounded ${
              distanceStatus === "Good Distance" ? 'bg-green-500' :
              distanceStatus === "Too Close!" ? 'bg-red-500' : 'bg-yellow-500'
            } text-white text-center`}>
              {distanceStatus}
            </div>
            <div className="mt-2">
              Distance: {screenDistance.toFixed(0)} cm
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg">
            <h3 className="font-semibold mb-2">Eye Health</h3>
            <div className={`p-2 rounded ${
              blinkRate < 10 ? 'bg-red-500' : 
              blinkRate > 30 ? 'bg-yellow-500' : 'bg-green-500'
            } text-white text-center`}>
              Blink Rate: {blinkRate}/min
            </div>
            <div className="mt-2 space-y-1">
              <div>EAR: {earValue.toFixed(2)}</div>
              <div className="text-sm">
                {blinkRate < 10 ? "Blink more frequently!" : 
                 blinkRate > 30 ? "You're blinking excessively" : "Normal blink rate"}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Notification - Fixed styling and positioning */}
      {notification && (
        <div className="fixed bottom-4 right-4 bg-blue-600 text-white p-4 rounded-lg shadow-lg max-w-xs z-50">
          <h3 className="font-bold">{notification.title}</h3>
          <p>{notification.message}</p>
        </div>
      )}
    </div>
  );
};

export default PostureCorrector;