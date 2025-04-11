
import cv2
import mediapipe as mp
import numpy as np
import time
import os
from playsound import playsound
import threading
from plyer import notification  # For desktop notifications
import sys

# Initialize MediaPipe Pose and webcam
mp_pose = mp.solutions.pose
mp_drawing = mp.solutions.drawing_utils
mp_face = mp.solutions.face_mesh
pose = mp_pose.Pose(static_image_mode=False, min_detection_confidence=0.5, min_tracking_confidence=0.5)
face_mesh = mp_face.FaceMesh(static_image_mode=False, max_num_faces=1, min_detection_confidence=0.5)
cap = cv2.VideoCapture(0)
session_start_time = time.time()
last_break_reminder = 0
BREAK_INTERVAL = 20 * 60  # 20 minutes in seconds
BREAK_DURATION = 5 * 60  # 5 minutes in seconds
taking_break = False
break_start_time = 0
stretching_exercises = [
    "Stand up and stretch your arms above your head",
    "Roll your shoulders backward and forward",
    "Gently tilt your head toward each shoulder",
    "Clasp hands behind back for a chest stretch",
    "Look away from the screen at something 20 feet away for 20 seconds",
    "Do neck rotations - slowly move your chin toward each shoulder",
    "Stretch your wrists and fingers"
]

if not cap.isOpened():
    print("Error: Could not open webcam.")
    exit()

# Initialize calibration variables
is_calibrated = False
calibration_frames = 0
calibration_shoulder_angles = []
calibration_neck_angles = []
calibration_lean_angles = []
last_alert_time = 0
alert_cooldown = 10  # Cooldown time in seconds
sound_file = ""  # Ensure this file exists in your working directory
running = True  # Flag to control the main loop

# Add improved accuracy variables - MODIFIED
CALIBRATION_SAMPLE_SIZE = 50   #-------> changed 30 to 50
posture_buffer = []  
BUFFER_SIZE = 15  # Increased for more stability (was 10)
THRESHOLD_BUFFER = 3  # Increased to be more forgiving (was 2)
BAD_POSTURE_CONSECUTIVE_FRAMES = 5  # Increased - need more consecutive bad frames for an alert (was 3)
CONFIDENCE_THRESHOLD = 0.6  # ---------->REDUCED: Minimum confidence level for valid measurements (was 0.75)

# Distance estimation constants
KNOWN_FACE_WIDTH = 14 
FOCAL_LENGTH = 600  

notification_active = False

# Debug mode flag - added for easier troubleshooting
DEBUG_MODE = True

def debug_print(message):
    if DEBUG_MODE:
        print(f"[DEBUG] {message}")

def cleanup_and_exit():
    global running
    running = False
    if cap.isOpened():
        cap.release()
    cv2.destroyAllWindows()
    # Make sure windows are properly closed
    for i in range(5):
        cv2.waitKey(1)
    print("Application closed.")
    sys.exit(0)

# Custom handler for window close event
def on_window_close(event, x, y, flags, param):
    if event == cv2.EVENT_LBUTTONDOWN:
        pass

def show_desktop_notification(title, message, timeout=5):
    
    global notification_active
    
    # ------>Only show notification if another one isn't already active
    if not notification_active:
        notification_active = True
        
        def notification_thread():
            global notification_active
            try:
                notification.notify(
                    title=title,
                    message=message,
                    app_name="Posture Corrector",
                    timeout=timeout,  
                    app_icon="",  
                )
            except Exception as e:
                print(f"Error showing notification: {e}")
            finally:
                time.sleep(timeout)
                notification_active = False
        
        threading.Thread(target=notification_thread, daemon=True).start()
def show_break_reminder():
    global last_break_reminder, taking_break, break_start_time
    
    # Select a random stretching exercise
    exercise = np.random.choice(stretching_exercises)
    
    show_desktop_notification(
        "Break Time!",
        f"You've been working for {BREAK_INTERVAL//60} minutes. Time for a {BREAK_DURATION//60} minute break!\n\nTry this: {exercise}",
        timeout=10
    )
    
    print(f"⏰ Break reminder: You've been working for {BREAK_INTERVAL//60} minutes.")
    print(f"Suggested exercise: {exercise}")
    
    last_break_reminder = time.time()
    taking_break = True
    break_start_time = time.time()
    
    # Play sound if available
    if os.path.exists(sound_file):
        try:
            playsound(sound_file)
        except Exception as e:
            print(f"Error playing sound: {e}")


def calculate_angle(a, b, c):
    #shoulder,neck,chin
    a = np.array(a)
    b = np.array(b)
    c = np.array(c)
    ba = a - b
    bc = c - b
    cosine_angle = np.dot(ba, bc) / (np.linalg.norm(ba) * np.linalg.norm(bc))
    cosine_angle = np.clip(cosine_angle, -1.0, 1.0)  # Ensure value is in valid range
    angle = np.degrees(np.arccos(cosine_angle))
    return angle

def estimate_distance(eye_left, eye_right):
    """Estimate distance of face from camera using eye distance."""
    pixel_distance = np.linalg.norm(np.array(eye_left) - np.array(eye_right))
    if pixel_distance == 0:
        return None
    return (KNOWN_FACE_WIDTH * FOCAL_LENGTH) / pixel_distance

def draw_bounding_box(frame, points, color=(0, 255, 0), thickness=2):
    """Draw a bounding box around a set of points."""
    if not points:
        return
    
    # Convert to numpy array for calculations
    points_array = np.array(points)
    
    # Get min/max coordinates to create a bounding box
    x_min = int(np.min(points_array[:, 0]))
    y_min = int(np.min(points_array[:, 1]))
    x_max = int(np.max(points_array[:, 0]))
    y_max = int(np.max(points_array[:, 1]))
    
    # Draw rectangle
    cv2.rectangle(frame, (x_min, y_min), (x_max, y_max), color, thickness)
    
    return (x_min, y_min, x_max, y_max)

# Create a named window and set mouse callback
window_name = 'Posture Corrector'
cv2.namedWindow(window_name, cv2.WINDOW_NORMAL)
cv2.setMouseCallback(window_name, on_window_close)

# Try to show an initial notification to verify the system works
try:
    show_desktop_notification(
        "Posture Corrector Started",
        "The application is now monitoring your posture.",
        timeout=3
    )
except Exception as e:
    print(f"Could not show startup notification: {e}")
    print("Continuing without desktop notifications...")

# Print instructions
print("Posture Corrector is running.")
print("Press 'q' to quit or close the window normally.")

try:
    while running and cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            print("Failed to grab frame")
            break

        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = pose.process(rgb_frame)
        results_face = face_mesh.process(rgb_frame)

        if results.pose_landmarks:
            landmarks = results.pose_landmarks.landmark

            # Extract key body landmarks
            left_shoulder = (int(landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER.value].x * frame.shape[1]),
                            int(landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER.value].y * frame.shape[0]))
            right_shoulder = (int(landmarks[mp_pose.PoseLandmark.RIGHT_SHOULDER.value].x * frame.shape[1]),
                            int(landmarks[mp_pose.PoseLandmark.RIGHT_SHOULDER.value].y * frame.shape[0]))
            left_ear = (int(landmarks[mp_pose.PoseLandmark.LEFT_EAR.value].x * frame.shape[1]),
                        int(landmarks[mp_pose.PoseLandmark.LEFT_EAR.value].y * frame.shape[0]))
            right_ear = (int(landmarks[mp_pose.PoseLandmark.RIGHT_EAR.value].x * frame.shape[1]),
                        int(landmarks[mp_pose.PoseLandmark.RIGHT_EAR.value].y * frame.shape[0]))
            left_hip = (int(landmarks[mp_pose.PoseLandmark.LEFT_HIP.value].x * frame.shape[1]),
                        int(landmarks[mp_pose.PoseLandmark.LEFT_HIP.value].y * frame.shape[0]))
            right_hip = (int(landmarks[mp_pose.PoseLandmark.RIGHT_HIP.value].x * frame.shape[1]),
                        int(landmarks[mp_pose.PoseLandmark.RIGHT_HIP.value].y * frame.shape[0]))
            nose = (int(landmarks[mp_pose.PoseLandmark.NOSE.value].x * frame.shape[1]),
                   int(landmarks[mp_pose.PoseLandmark.NOSE.value].y * frame.shape[0]))
            # Get mouth point (approximated from nose and ears)
            mouth = (nose[0], nose[1] + int(0.03 * frame.shape[0]))  # Slightly below nose

            # Calculate angles
            shoulder_angle = calculate_angle(left_shoulder, right_shoulder, (right_shoulder[0], 0))
            neck_angle = calculate_angle(left_ear, left_shoulder, (left_shoulder[0], 0))
            
            # Calculate leaning angle - using midpoint between shoulders and midpoint between hips
            mid_shoulder = ((left_shoulder[0] + right_shoulder[0]) // 2, (left_shoulder[1] + right_shoulder[1]) // 2)
            mid_hip = ((left_hip[0] + right_hip[0]) // 2, (left_hip[1] + right_hip[1]) // 2)
            vertical_ref = (mid_hip[0], 0)  # Point directly above mid_hip
            lean_angle = calculate_angle(vertical_ref, mid_hip, mid_shoulder)
            
            # Calculate chin angle for forward head posture
            chin_angle = calculate_angle(mouth, left_ear, left_shoulder)

            # Draw bounding boxes
            # Head bounding box
            head_points = [left_ear, right_ear, nose]
            draw_bounding_box(frame, head_points, color=(255, 0, 0), thickness=2)  # Red for head
            
            # Shoulder bounding box
            shoulder_points = [left_shoulder, right_shoulder]
            draw_bounding_box(frame, shoulder_points, color=(0, 255, 0), thickness=2)  # Green for shoulders
            
            # Torso bounding box
            torso_points = [left_shoulder, right_shoulder, left_hip, right_hip]
            draw_bounding_box(frame, torso_points, color=(0, 0, 255), thickness=2)  
            
            # Draw angle lines for visualization
            # Shoulder angle line
            cv2.line(frame, left_shoulder, right_shoulder, (255, 255, 0), 2)
            cv2.line(frame, right_shoulder, (right_shoulder[0], 0), (255, 255, 0), 2)
            
            # Neck angle line
            cv2.line(frame, left_ear, left_shoulder, (0, 255, 255), 2)
            cv2.line(frame, left_shoulder, (left_shoulder[0], 0), (0, 255, 255), 2)
            
            # Leaning angle lines
            cv2.line(frame, mid_hip, mid_shoulder, (255, 0, 255), 2)  # Purple for spine
            cv2.line(frame, mid_hip, vertical_ref, (255, 0, 255), 2)  # Vertical reference
            
            # Chin angle line
            cv2.line(frame, mouth, left_ear, (255, 165, 0), 2)  # Orange for chin
            cv2.line(frame, left_ear, left_shoulder, (255, 165, 0), 2)
            
            # Mark midpoints
            cv2.circle(frame, mid_shoulder, 4, (255, 0, 255), -1)  # Midpoint of shoulders
            cv2.circle(frame, mid_hip, 4, (255, 0, 255), -1)  # Midpoint of hips
            cv2.circle(frame, mouth, 4, (255, 165, 0), -1)  # Mouth point

            # Calculate landmark confidence (average of key landmarks)
            key_landmarks = [
                mp_pose.PoseLandmark.LEFT_SHOULDER.value,
                mp_pose.PoseLandmark.RIGHT_SHOULDER.value,
                mp_pose.PoseLandmark.LEFT_EAR.value,
                mp_pose.PoseLandmark.RIGHT_EAR.value,
                mp_pose.PoseLandmark.LEFT_HIP.value,
                mp_pose.PoseLandmark.RIGHT_HIP.value
            ]
            
            # Calculate average visibility as a confidence measure
            landmark_confidence = np.mean([landmarks[lm].visibility for lm in key_landmarks])
            
            # Debug output for angle calculations - ADDED
            debug_print(f"Angles - Shoulder: {shoulder_angle:.1f}, Neck: {neck_angle:.1f}, Lean: {lean_angle:.1f}, Confidence: {landmark_confidence:.2f}")

            # Calibration step - IMPROVED
            if not is_calibrated and calibration_frames < CALIBRATION_SAMPLE_SIZE:
                # Only add values if they are within reasonable ranges and confidence is high enough
                if 0 < shoulder_angle < 180 and 0 < neck_angle < 180 and 0 < lean_angle < 180 and landmark_confidence > CONFIDENCE_THRESHOLD:
                    calibration_shoulder_angles.append(shoulder_angle)
                    calibration_neck_angles.append(neck_angle)
                    calibration_lean_angles.append(lean_angle)
                    calibration_frames += 1
                    
                    # ADDED: Regular feedback during calibration
                    if calibration_frames % 10 == 0:
                        debug_print(f"Calibration progress: {calibration_frames}/{CALIBRATION_SAMPLE_SIZE}")
                
                cv2.putText(frame, f"Calibrating... {calibration_frames}/{CALIBRATION_SAMPLE_SIZE}", (10, 30),
                            cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 255), 2, cv2.LINE_AA)
                
                # ADDED: Make calibration more obvious with a progress bar
                progress_width = int((calibration_frames / CALIBRATION_SAMPLE_SIZE) * frame.shape[1] * 0.8)
                cv2.rectangle(frame, (int(frame.shape[1]*0.1), 60), 
                              (int(frame.shape[1]*0.1) + progress_width, 80), 
                              (0, 255, 255), -1)
                
            elif not is_calibrated:
                # Filter out obvious outliers before setting thresholds
                filtered_shoulder = [a for a in calibration_shoulder_angles 
                                   if abs(a - np.median(calibration_shoulder_angles)) < 20]
                filtered_neck = [a for a in calibration_neck_angles 
                               if abs(a - np.median(calibration_neck_angles)) < 20]
                filtered_lean = [a for a in calibration_lean_angles 
                              if abs(a - np.median(calibration_lean_angles)) < 20]
                
                # Calculate more robust thresholds using percentiles - ADJUSTED FOR SENSITIVITY
                shoulder_threshold = np.percentile(filtered_shoulder, 25) - THRESHOLD_BUFFER if len(filtered_shoulder) > 5 else 160
                neck_threshold = np.percentile(filtered_neck, 25) - THRESHOLD_BUFFER if len(filtered_neck) > 5 else 100
                lean_threshold = 15  # Increased to be more forgiving (was 10)
                
                is_calibrated = True
                print("✅ CALIBRATION COMPLETE - Posture monitoring is now active!")
                print(f"Calibration values - Shoulder threshold: {shoulder_threshold:.1f}, Neck threshold: {neck_threshold:.1f}, Lean threshold: {lean_threshold:.1f}")
                
                # Initialize posture buffer with "good" values
                posture_buffer = [False] * BUFFER_SIZE
                
                # Show calibration complete notification
                show_desktop_notification(
                    "Setup Complete",
                    "Calibration complete! Your posture will now be monitored."
                )

            # Posture feedback - IMPROVED
            if is_calibrated:
                current_time = time.time()
                
                # Only evaluate posture if confidence is high enough - REDUCED THRESHOLD
                if landmark_confidence > CONFIDENCE_THRESHOLD:
                    # Check posture with more nuanced thresholds that vary by severity
                    shoulder_bad = shoulder_angle < (shoulder_threshold - 3)  # Must be significantly below threshold
                    neck_bad = neck_angle < (neck_threshold - 3)  # Must be significantly below threshold
                    lean_bad = abs(90 - lean_angle) > (lean_threshold + 2)  # Must be significantly above threshold
                    
                    # ADDED: Debug feedback on posture metrics
                    if DEBUG_MODE:
                        debug_print(f"Posture status - Shoulders: {'BAD' if shoulder_bad else 'OK'}, " +
                                  f"Neck: {'BAD' if neck_bad else 'OK'}, " +
                                  f"Lean: {'BAD' if lean_bad else 'OK'}")
                    
                    is_bad_posture = shoulder_bad or neck_bad or lean_bad
                    
                    # Add current state to buffer and remove oldest
                    posture_buffer.append(is_bad_posture)
                    if len(posture_buffer) > BUFFER_SIZE:
                        posture_buffer.pop(0)
                    
                    # FIXED: Lowered threshold for triggering an alert
                    bad_posture_count = sum(posture_buffer)
                    sustained_bad_posture = bad_posture_count >= (BAD_POSTURE_CONSECUTIVE_FRAMES - 1)
                    
                    # Debug posture buffer state
                    debug_print(f"Posture buffer: {bad_posture_count}/{len(posture_buffer)} bad frames")
                    
                    if sustained_bad_posture:
                        color = (0, 0, 255)  # Red for measurements
                        
                        # ADDED: Visual alert on screen
                        cv2.putText(frame, "POOR POSTURE DETECTED", (frame.shape[1]//2 - 150, 30),
                                 cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 255), 2, cv2.LINE_AA)
                        
                        if current_time - last_alert_time > alert_cooldown:
                            posture_issue = ""
                            
                            # More detailed issue identification with REDUCED thresholds for sensitivity
                            if shoulder_bad:
                                shoulder_deviation = ((shoulder_threshold - shoulder_angle) / shoulder_threshold) * 100
                                if shoulder_deviation > 5:  # REDUCED from 10
                                    posture_issue += "Shoulders hunched. "
                            
                            if neck_bad:
                                neck_deviation = ((neck_threshold - neck_angle) / neck_threshold) * 100
                                if neck_deviation > 5:  # REDUCED from 10
                                    posture_issue += "Forward head posture. "
                            
                            lean_deviation = abs(90 - lean_angle)
                            if lean_bad and lean_deviation > (lean_threshold):  # REDUCED buffer
                                posture_issue += "Body leaning. "
                            
                            # Only alert if there are specific issues identified
                            if posture_issue:
                                print(f"🔴 Poor posture detected! {posture_issue}Please correct your position.")
                                
                                # Show desktop notification
                                show_desktop_notification(
                                    "Poor Posture Detected!",
                                    f"{posture_issue}Please adjust your position."
                                )
                                
                                # Play sound if available
                                if os.path.exists(sound_file):
                                    try:
                                        playsound(sound_file)
                                    except Exception as e:
                                        print(f"Error playing sound: {e}")
                                        
                                last_alert_time = current_time
                    else:
                        color = (0, 255, 0)  # Green for measurements
                        
                        # ADDED: Good posture confirmation
                        cv2.putText(frame, "Good Posture", (frame.shape[1]//2 - 80, 30),
                                 cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2, cv2.LINE_AA)
                        
                        # Provide positive reinforcement every 2 minutes if posture has been good
                        if not any(posture_buffer) and current_time - last_alert_time > 120:  # 2 minutes
                            print("✅ Great job maintaining good posture!")
                            
                            # Show positive feedback notification
                            show_desktop_notification(
                                "Good Posture!",
                                "Great job maintaining proper posture. Keep it up!"
                            )
                            last_alert_time = current_time
                    
                    # Display confidence and measurements on screen
                    cv2.putText(frame, f"Confidence: {landmark_confidence:.2f}", (10, 60),
                                cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 1, cv2.LINE_AA)
                    cv2.putText(frame, f"Shoulder Angle: {shoulder_angle:.1f}/{shoulder_threshold:.1f}", (10, 90),
                                cv2.FONT_HERSHEY_SIMPLEX, 0.6, color if shoulder_bad else (0, 255, 0), 1, cv2.LINE_AA)
                    cv2.putText(frame, f"Neck Angle: {neck_angle:.1f}/{neck_threshold:.1f}", (10, 120),
                                cv2.FONT_HERSHEY_SIMPLEX, 0.6, color if neck_bad else (0, 255, 0), 1, cv2.LINE_AA)
                    cv2.putText(frame, f"Leaning Angle: {abs(90-lean_angle):.1f}/{lean_threshold:.1f}", (10, 150),
                                cv2.FONT_HERSHEY_SIMPLEX, 0.6, color if lean_bad else (0, 255, 0), 1, cv2.LINE_AA)
                    cv2.putText(frame, f"Chin Angle: {chin_angle:.1f}", (10, 180),
                                cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 1, cv2.LINE_AA)
                else:
                    # Low confidence - display warning
                    cv2.putText(frame, f"Low detection confidence: {landmark_confidence:.2f}", (10, 30),
                                cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 165, 255), 2, cv2.LINE_AA)
                    cv2.putText(frame, "Move to better lighting or adjust position", (10, 60),
                                cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 165, 255), 1, cv2.LINE_AA)

        # Eye distance detection
        if results_face.multi_face_landmarks:
            for face_landmarks in results_face.multi_face_landmarks:
                left_eye = (int(face_landmarks.landmark[33].x * frame.shape[1]),
                            int(face_landmarks.landmark[33].y * frame.shape[0]))
                right_eye = (int(face_landmarks.landmark[263].x * frame.shape[1]),
                            int(face_landmarks.landmark[263].y * frame.shape[0]))

                # Draw points for eyes
                cv2.circle(frame, left_eye, 3, (0, 255, 255), -1)
                cv2.circle(frame, right_eye, 3, (0, 255, 255), -1)
                
                # Draw line between eyes
                cv2.line(frame, left_eye, right_eye, (0, 255, 255), 2)

                distance = estimate_distance(left_eye, right_eye)

                if distance:
                    if distance < 70:  
                        eye_status = "Too Close!"
                        eye_color = (0, 0, 255)  # Red
                        if time.time() - last_alert_time > alert_cooldown:
                            print("⚠️ You're too close to the screen!")
                            
                            # Show desktop notification for screen distance
                            show_desktop_notification(
                                "Distance Alert",
                                "You're too close to the screen! Please move back."
                            )
                            
                            try:
                                if os.path.exists(sound_file):
                                    playsound(sound_file)
                            except Exception as e:
                                print(f"Error playing sound: {e}")
                            last_alert_time = time.time()
                    elif 70 <= distance <= 120:  
                        eye_status = "Good Distance"
                        eye_color = (0, 255, 0)  # Green
                    else:  
                        eye_status = "Too Far!"
                        eye_color = (0, 255, 255)  # Yellow

                    # MOVED: Position eye distance text lower to avoid overlap
                    cv2.putText(frame, f"Distance: {int(distance)} cm - {eye_status}", (10, 210),
                                cv2.FONT_HERSHEY_SIMPLEX, 0.6, eye_color, 1, cv2.LINE_AA)

        # Add instruction text
        cv2.putText(frame, "Press 'q' to quit", (10, frame.shape[0] - 20),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 1, cv2.LINE_AA)
                
        # Display the frame
        cv2.imshow(window_name, frame)

        # Check for 'q' key press or if the window was closed
        key = cv2.waitKey(1) & 0xFF
        if key == ord('q') or cv2.getWindowProperty(window_name, cv2.WND_PROP_VISIBLE) < 1:
            print("Exiting...")
            break

except KeyboardInterrupt:
    print("Keyboard interrupt detected. Exiting...")
except Exception as e:
    print(f"An error occurred: {e}")
finally:
    # Make sure we properly clean up
    cleanup_and_exit()
