import os
import traceback
import cv2
import numpy as np
import tensorflow as tf
from tkinter import Tk, filedialog
import mediapipe as mp
import matplotlib.pyplot as plt
from PIL import Image
import tarfile
import urllib.request
from scipy.spatial import distance

# MediaPipe setup
mp_drawing = mp.solutions.drawing_utils
mp_pose = mp.solutions.pose
mp_drawing_styles = mp.solutions.drawing_styles

# Model details for object detection
MODEL_NAME = "efficientdet_d0_coco17_tpu-32"
MODEL_DIR = f"models/{MODEL_NAME}/saved_model"
MODEL_TAR_URL = f"http://download.tensorflow.org/models/object_detection/tf2/20200711/{MODEL_NAME}.tar.gz"

# Function to save result image
def save_result_image(image, output_path):
    """Saves the result image to the specified path."""
    try:
        # Get just the filename part
        filename = os.path.basename(output_path)
        # Create directory if it doesn't exist
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        # Save the image
        cv2.imwrite(output_path, image)
        return filename
    except Exception as e:
        print(f"Error saving image: {str(e)}")
        return None

# Function to download and extract model - now separate from the class
def download_model():
    """Downloads and extracts the EfficientDet-D7 model if not already present."""
    if not os.path.exists(MODEL_DIR):
        print("Downloading EfficientDet-D7 model...")
        os.makedirs("models", exist_ok=True)
        tar_path = f"models/{MODEL_NAME}.tar.gz"
        
        urllib.request.urlretrieve(MODEL_TAR_URL, tar_path)

        with tarfile.open(tar_path, "r:gz") as tar:
            tar.extractall(path="models")

        print("Model downloaded and extracted successfully!")
    else:
        print("Model already exists, skipping download.")

# Object detection model - load once as a global variable
object_model = None

def load_object_model():
    """Load the object detection model if it's not already loaded."""
    global object_model
    if object_model is None:
        # Ensure the model is downloaded
        download_model()
        print("Loading EfficientDet-D0 model...")
        object_model = tf.saved_model.load(MODEL_DIR)
    return object_model

class AdvancedErgonomicAssessment:
    def __init__(self):
        # Load object detection model for equipment - now using the global model
        self.object_model = load_object_model()

        # Initialize MediaPipe Pose model for body posture
        self.pose = mp_pose.Pose(
            static_image_mode=True,
            model_complexity=2,
            enable_segmentation=True,
            min_detection_confidence=0.5
        )

        # Extended category index for equipment detection
        self.category_index = {
            1: "person",
            56: "desk",
            57: "table",
            58: "cabinet",
            59: "shelf",
            62: "chair",
            63: "laptop",
            64: "mouse",
            66: "keyboard",
            67: "cell phone",
            72: "tv",
            73: "computer",
            76: "clock",
            84: "book",
        }
        
        # Define ergonomic reference values
        self.ergonomic_references = {
            "neck_angle_threshold": 35,  # Degrees - greater is problematic
            "shoulder_angle_threshold": 20,  # Degrees - greater is problematic
            "minimum_viewing_distance": 50,  # Arbitrary units - should calibrate
            "ideal_screen_height_ratio": 0.15,  # Ratio of screen top to eye level
            "brightness_low_threshold": 70,
            "brightness_high_threshold": 210,
        }
    
    def process_image(self, image_path):
        """Process an image and return results in format expected by app.py"""
        try:
            # Analyze image
            image, detected_objects, pose_landmarks, posture_measurements, lighting_info, glare_info = self.analyze_image(image_path)
            
            if image is None:
                return None, "Error processing image: Could not read image.", None
            
            # Evaluate ergonomics
            recommendations, issues = self.evaluate_ergonomics(
                detected_objects, posture_measurements, lighting_info, glare_info
            )
            
            # Create visualization
            result_image = self.visualize_results(
                image, detected_objects, pose_landmarks, recommendations, glare_info[1]
            )
            
            # Prepare response data
            response_data = {
                "recommendations": recommendations,
                "issues": issues,
                "detected_objects": list(detected_objects.keys()) if detected_objects else [],
                "posture_detected": pose_landmarks is not None,
                "lighting_info": {
                    "avg_brightness": float(lighting_info["avg_brightness"]),
                    "brightness_variance": float(lighting_info["brightness_variance"])
                } if lighting_info else {}
            }
            
            return result_image, recommendations, response_data
            
        except Exception as e:
            error_msg = f"Error processing image: {str(e)}"
            print(error_msg)
            traceback.print_exc()
            return None, error_msg, None

    def analyze_image(self, image_path):
        """Perform comprehensive analysis on the image."""
        print("Analyzing image for ergonomic assessment...")

        # Read image
        image = cv2.imread(image_path)
        if image is None:
            print("Error: Could not read image.")
            return None, None, None, None, None, None

        # Convert image to RGB for MediaPipe
        image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        height, width, _ = image.shape

        # Assess lighting
        lighting_info = self.analyze_lighting(image)
        
        # Analyze screen glare
        glare_detected, glare_areas = self.detect_glare(image)
        
        # Detect objects with EfficientDet
        detected_objects = self.detect_objects(image_rgb)
        
        # Analyze posture with MediaPipe
        pose_results = self.pose.process(image_rgb)
        pose_landmarks = pose_results.pose_landmarks
        
        # If no pose detected, try to detect just a face
        if pose_landmarks is None:
            print("No full body pose detected, trying face detection...")
            face_detected = self.detect_face(image_rgb)
            if not face_detected:
                print("No face detected. Posture analysis will be limited.")
        
        # Get posture measurements if landmarks are detected
        posture_measurements = None
        if pose_landmarks:
            posture_measurements = self.measure_posture(pose_landmarks, width, height)
        
        return image, detected_objects, pose_landmarks, posture_measurements, lighting_info, (glare_detected, glare_areas)

    def detect_objects(self, image_rgb):
        """Detect objects in the image using EfficientDet."""
        height, width, _ = image_rgb.shape
        input_tensor = tf.convert_to_tensor(image_rgb)[tf.newaxis, ...]
        detections = self.object_model(input_tensor)

        detected_objects = {}
        num_detections = int(detections["num_detections"].numpy()[0])

        for i in range(num_detections):
            class_id = int(detections["detection_classes"].numpy()[0][i])
            confidence = float(detections["detection_scores"].numpy()[0][i])

            if confidence > 0.5 and class_id in self.category_index:
                obj_class = self.category_index[class_id]
                bbox = detections["detection_boxes"].numpy()[0][i]

                y_min = int(bbox[0] * height)
                x_min = int(bbox[1] * width)
                y_max = int(bbox[2] * height)
                x_max = int(bbox[3] * width)

                # If object already exists with lower confidence, replace it
                if obj_class in detected_objects:
                    if detected_objects[obj_class]["confidence"] < confidence:
                        detected_objects[obj_class] = {
                            "confidence": confidence,
                            "bbox": [x_min, y_min, x_max, y_max],
                            "center": [(x_min + x_max) // 2, (y_min + y_max) // 2],
                            "dimensions": [x_max - x_min, y_max - y_min]
                        }
                else:
                    detected_objects[obj_class] = {
                        "confidence": confidence,
                        "bbox": [x_min, y_min, x_max, y_max],
                        "center": [(x_min + x_max) // 2, (y_min + y_max) // 2],
                        "dimensions": [x_max - x_min, y_max - y_min]
                    }

        # If desk wasn't detected but laptop was, infer a desk surface
        if ("desk" not in detected_objects and "table" not in detected_objects) and "laptop" in detected_objects:
            print("Inferring desk position from laptop location...")
            laptop = detected_objects["laptop"]
            x_min, y_min, x_max, y_max = laptop["bbox"]
            
            # Assume desk extends below the laptop
            desk_y_max = min(y_max + 50, height)
            desk_x_min = max(0, x_min - 100)
            desk_x_max = min(width, x_max + 100)
            
            detected_objects["inferred_desk"] = {
                "confidence": 0.7,
                "bbox": [desk_x_min, y_max, desk_x_max, desk_y_max],
                "center": [(desk_x_min + desk_x_max) // 2, (y_max + desk_y_max) // 2],
                "dimensions": [desk_x_max - desk_x_min, desk_y_max - y_max],
                "inferred": True
            }

        return detected_objects

    def detect_face(self, image_rgb):
        """Detect face when full pose estimation fails."""
        face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
        gray = cv2.cvtColor(image_rgb, cv2.COLOR_RGB2GRAY)
        faces = face_cascade.detectMultiScale(gray, 1.1, 4)
        
        return len(faces) > 0

    def analyze_lighting(self, image):
        """Analyze lighting conditions in the image."""
        # Convert to HSV for better light analysis
        hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
        h, s, v = cv2.split(hsv)
        
        # Analyze value channel (brightness)
        avg_brightness = np.mean(v)
        min_brightness = np.min(v)
        max_brightness = np.max(v)
        std_brightness = np.std(v)
        
        # Calculate brightness distribution across image quadrants
        height, width = v.shape
        quadrants = [
            v[0:height//2, 0:width//2],           # Top-left
            v[0:height//2, width//2:width],       # Top-right
            v[height//2:height, 0:width//2],      # Bottom-left
            v[height//2:height, width//2:width]   # Bottom-right
        ]
        
        quadrant_brightness = [np.mean(q) for q in quadrants]
        brightness_variance = np.var(quadrant_brightness)
        
        lighting_info = {
            "avg_brightness": avg_brightness,
            "min_brightness": min_brightness,
            "max_brightness": max_brightness,
            "std_brightness": std_brightness,
            "quadrant_brightness": quadrant_brightness,
            "brightness_variance": brightness_variance
        }
        
        return lighting_info

    def detect_glare(self, image):
        """Detect potential glare on screens."""
        # Convert to grayscale
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Threshold for bright areas
        _, thresh = cv2.threshold(gray, 240, 255, cv2.THRESH_BINARY)
        
        # Find contours of bright areas
        contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        # Filter contours by size
        glare_areas = []
        min_glare_area = 50  # Minimum pixel area to consider as glare
        
        for contour in contours:
            area = cv2.contourArea(contour)
            if area > min_glare_area:
                glare_areas.append(contour)
        
        return len(glare_areas) > 0, glare_areas

    def measure_posture(self, landmarks, image_width, image_height):
        """Measure various aspects of posture from pose landmarks."""
        # Convert landmarks to pixel coordinates
        landmark_points = {}
        for idx, landmark in enumerate(landmarks.landmark):
            x = min(int(landmark.x * image_width), image_width - 1)
            y = min(int(landmark.y * image_height), image_height - 1)
            landmark_points[idx] = (x, y)
        
        # Get important landmarks
        # Head landmarks
        nose = landmark_points.get(mp_pose.PoseLandmark.NOSE.value)
        left_eye = landmark_points.get(mp_pose.PoseLandmark.LEFT_EYE.value)
        right_eye = landmark_points.get(mp_pose.PoseLandmark.RIGHT_EYE.value)
        left_ear = landmark_points.get(mp_pose.PoseLandmark.LEFT_EAR.value)
        right_ear = landmark_points.get(mp_pose.PoseLandmark.RIGHT_EAR.value)
        
        # Shoulder landmarks
        left_shoulder = landmark_points.get(mp_pose.PoseLandmark.LEFT_SHOULDER.value)
        right_shoulder = landmark_points.get(mp_pose.PoseLandmark.RIGHT_SHOULDER.value)
        
        # Calculate eye midpoint if both eyes detected
        eye_midpoint = None
        if left_eye and right_eye:
            eye_midpoint = ((left_eye[0] + right_eye[0]) // 2, (left_eye[1] + right_eye[1]) // 2)
        
        # Calculate ear midpoint if both ears detected
        ear_midpoint = None
        if left_ear and right_ear:
            ear_midpoint = ((left_ear[0] + right_ear[0]) // 2, (left_ear[1] + right_ear[1]) // 2)
        
        # Calculate shoulder midpoint if both shoulders detected
        shoulder_midpoint = None
        if left_shoulder and right_shoulder:
            shoulder_midpoint = ((left_shoulder[0] + right_shoulder[0]) // 2, 
                                (left_shoulder[1] + right_shoulder[1]) // 2)
        
        # Measure neck angle if we have the necessary points
        neck_angle = None
        if shoulder_midpoint and nose:
            # Vertical line from shoulders
            vertical_line = (shoulder_midpoint[0], 0)
            
            # Calculate angle
            a = np.array(shoulder_midpoint)
            b = np.array(nose)
            c = np.array([shoulder_midpoint[0], 0])  # Vertical reference
            
            ba = a - b
            bc = c - b
            
            cosine_angle = np.dot(ba, bc) / (np.linalg.norm(ba) * np.linalg.norm(bc))
            neck_angle = np.degrees(np.arccos(np.clip(cosine_angle, -1.0, 1.0)))
        
        # Measure shoulder slope (for hunched shoulders)
        shoulder_angle = None
        if left_shoulder and right_shoulder:
            # Calculate angle from horizontal
            dx = right_shoulder[0] - left_shoulder[0]
            dy = right_shoulder[1] - left_shoulder[1]
            shoulder_angle = np.degrees(np.arctan2(dy, dx))
        
        # Approximate viewing distance if we have eye and nose
        viewing_distance = None
        if eye_midpoint and nose:
            # This is just a proxy, needs calibration for real distance
            viewing_distance = distance.euclidean(eye_midpoint, nose)
        
        # Return all measurements
        posture_measurements = {
            "neck_angle": neck_angle,
            "shoulder_angle": abs(shoulder_angle) if shoulder_angle is not None else None,
            "viewing_distance": viewing_distance,
            "eye_midpoint": eye_midpoint,
            "shoulder_midpoint": shoulder_midpoint,
            "ear_midpoint": ear_midpoint,
            "nose": nose
        }
        
        return posture_measurements

    def evaluate_ergonomics(self, detected_objects, posture_measurements, lighting_info, glare_info):
        """Evaluate ergonomic conditions and provide recommendations."""
        recommendations = []
        issues = []
        
        # Check if we have enough data for evaluation
        if not detected_objects and not posture_measurements:
            recommendations.append("Not enough information detected for a complete assessment. Try a clearer image showing both person and workspace.")
            return recommendations, issues
        
        # 1. Neck angle assessment
        if posture_measurements and posture_measurements["neck_angle"] is not None:
            neck_angle = posture_measurements["neck_angle"]
            if neck_angle > self.ergonomic_references["neck_angle_threshold"]:
                recommendations.append(f"Your neck is bent at approximately {neck_angle:.1f}° which exceeds the recommended {self.ergonomic_references['neck_angle_threshold']}°. Raise your screen or adjust your posture to reduce neck strain.")
                issues.append("neck_angle_excessive")
        
        # 2. Shoulder posture assessment
        if posture_measurements and posture_measurements["shoulder_angle"] is not None:
            shoulder_angle = posture_measurements["shoulder_angle"]
            if shoulder_angle > self.ergonomic_references["shoulder_angle_threshold"]:
                recommendations.append(f"Your shoulders appear to be uneven or hunched. Try relaxing your shoulders and sitting up straight.")
                issues.append("shoulders_uneven")
        
        # 3. Screen height assessment
        if posture_measurements and posture_measurements["eye_midpoint"] and ("laptop" in detected_objects or "computer" in detected_objects):
            eye_y = posture_measurements["eye_midpoint"][1]
            
            # Get screen position
            screen = detected_objects.get("laptop", detected_objects.get("computer", None))
            if screen:
                screen_top = screen["bbox"][1]  # Y-min (top) of screen
                screen_bottom = screen["bbox"][3]  # Y-max (bottom) of screen
                
                # Check if screen is too low
                if screen_top > eye_y:
                    recommendations.append("Your screen is positioned too low. The top of your screen should be at or slightly below eye level to maintain proper neck posture.")
                    issues.append("screen_too_low")
                
                # Check if screen is too high
                elif screen_bottom < eye_y:
                    recommendations.append("Your screen is positioned too high. Lower your screen so your eyes align with the top portion of the screen.")
                    issues.append("screen_too_high")
        
        # 4. Desk and laptop detection special case
        if "laptop" in detected_objects and not any(k in detected_objects for k in ["desk", "table", "inferred_desk"]):
            recommendations.append("It appears your laptop is not on a proper desk or table. Using a laptop on your lap or unsuitable surface can lead to poor posture and ergonomic issues.")
            issues.append("improper_laptop_surface")
        
        # 5. Laptop on desk height assessment
        if "laptop" in detected_objects and any(k in detected_objects for k in ["desk", "table", "inferred_desk"]):
            laptop = detected_objects["laptop"]
            desk_key = next((k for k in ["desk", "table", "inferred_desk"] if k in detected_objects), None)
            desk = detected_objects[desk_key]
            
            laptop_bottom = laptop["bbox"][3]  # Y-max (bottom) of laptop
            desk_top = desk["bbox"][1]  # Y-min (top) of desk
            
            # Check if laptop is at correct height on desk
            if posture_measurements and posture_measurements["eye_midpoint"]:
                eye_y = posture_measurements["eye_midpoint"][1]
                laptop_top = laptop["bbox"][1]  # Y-min (top) of laptop
                
                if laptop_top > eye_y + 50:  # Laptop screen is significantly below eye level
                    recommendations.append("Your laptop screen is too low relative to your eye level. Consider using a laptop stand or books to raise it, and a separate keyboard and mouse for typing.")
                    issues.append("laptop_too_low")
        
        # 6. Lighting assessment
        if lighting_info:
            avg_brightness = lighting_info["avg_brightness"]
            brightness_variance = lighting_info["brightness_variance"]
            
            if avg_brightness < self.ergonomic_references["brightness_low_threshold"]:
                recommendations.append("Your workspace appears to be too dark (average brightness: {:.1f}). Increase lighting to reduce eye strain.".format(avg_brightness))
                issues.append("lighting_too_dim")
            
            elif avg_brightness > self.ergonomic_references["brightness_high_threshold"]:
                recommendations.append("Your workspace appears to be too bright (average brightness: {:.1f}). Reduce brightness or adjust lighting to prevent eye strain.".format(avg_brightness))
                issues.append("lighting_too_bright")
            
            if brightness_variance > 1500:  # Threshold needs calibration
                recommendations.append("Your workspace has uneven lighting. Try to distribute light sources more evenly to reduce eye strain from constantly adjusting to different brightness levels.")
                issues.append("uneven_lighting")
        
        # 7. Screen glare assessment
        glare_detected, glare_areas = glare_info
        if glare_detected and ("laptop" in detected_objects or "computer" in detected_objects):
            recommendations.append("Screen glare detected. Adjust your screen angle or light sources to reduce reflections that can cause eye strain.")
            issues.append("screen_glare")
        
        # 8. Viewing distance assessment
        if posture_measurements and posture_measurements["viewing_distance"] is not None:
            view_dist = posture_measurements["viewing_distance"]
            if view_dist < self.ergonomic_references["minimum_viewing_distance"]:
                recommendations.append("You appear to be sitting too close to your screen. Maintain an arm's length distance to reduce eye strain.")
                issues.append("screen_too_close")
        
        # If there are detected objects but no person/posture detected
        if detected_objects and not posture_measurements:
            if "chair" in detected_objects and any(k in detected_objects for k in ["desk", "table"]):
                desk_key = next((k for k in ["desk", "table"] if k in detected_objects), None)
                chair = detected_objects["chair"]
                desk = detected_objects[desk_key]
                
                chair_top = chair["bbox"][1]
                desk_top = desk["bbox"][1]
                
                if abs(chair_top - desk_top) > 50:  # Arbitrary threshold
                    if chair_top > desk_top:
                        recommendations.append("The chair appears to be too low relative to the desk. Adjust chair height so elbows are level with the desk when seated.")
                        issues.append("chair_too_low")
                    else:
                        recommendations.append("The chair appears to be too high relative to the desk. Lower the chair so elbows are level with the desk when seated.")
                        issues.append("chair_too_high")
        
        # If no issues found, provide positive feedback
        if not recommendations:
            recommendations.append("Your workspace appears to be ergonomically well set up!")
        
        return recommendations, issues

    def visualize_results(self, image, detected_objects, pose_landmarks, recommendations, glare_areas=None):
        """Create visualization of assessment results."""
        # Create a copy of the image for drawing
        output_image = image.copy()
        
        # Draw pose landmarks if available
        if pose_landmarks:
            mp_drawing.draw_landmarks(
                output_image,
                pose_landmarks,
                mp_pose.POSE_CONNECTIONS,
                landmark_drawing_spec=mp_drawing_styles.get_default_pose_landmarks_style()
            )
        
        # Draw detected objects
        if detected_objects:
            for obj_name, obj_data in detected_objects.items():
                x_min, y_min, x_max, y_max = obj_data['bbox']
                confidence = obj_data['confidence']
                
                # Use different color if object was inferred
                color = (0, 0, 255) if obj_data.get('inferred', False) else (0, 255, 0)
                thickness = 1 if obj_data.get('inferred', False) else 2
                
                label = f"{obj_name} ({confidence:.2f})"
                
                cv2.rectangle(output_image, (x_min, y_min), (x_max, y_max), color, thickness)
                cv2.putText(output_image, label, (x_min, y_min - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, thickness)
        
        # Draw glare areas if available
        if glare_areas:
            cv2.drawContours(output_image, glare_areas, -1, (255, 0, 255), 2)
        
        # Improve visibility of text by adding a semi-transparent background
        # First, make a copy of the image for the text overlay
        text_overlay = np.zeros_like(output_image)
        
        # Add recommendations with better visibility
        y_offset = 30
        for i, rec in enumerate(recommendations):
            # Format long recommendations to fit on screen
            if len(rec) > 60:
                words = rec.split()
                lines = []
                current_line = words[0]
                
                for word in words[1:]:
                    if len(current_line + " " + word) < 60:
                        current_line += " " + word
                    else:
                        lines.append(current_line)
                        current_line = word
                
                if current_line:
                    lines.append(current_line)
                
                for j, line in enumerate(lines):
                    # Draw background rectangle
                    text_size = cv2.getTextSize(line, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 2)[0]
                    cv2.rectangle(text_overlay, (5, y_offset + j*30 - 20), 
                                 (10 + text_size[0], y_offset + j*30 + 5), (0, 0, 0), -1)
                    # Draw text
                    cv2.putText(text_overlay, line, (10, y_offset + j*30), 
                                cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
                
                y_offset += len(lines) * 30
            else:
                # Draw background rectangle
                text_size = cv2.getTextSize(rec, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 2)[0]
                cv2.rectangle(text_overlay, (5, y_offset - 20), 
                             (10 + text_size[0], y_offset + 5), (0, 0, 0), -1)
                # Draw text
                cv2.putText(text_overlay, rec, (10, y_offset), 
                            cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
                y_offset += 30
        
        # Blend the text overlay with the original image
        alpha = 0.7  # Transparency factor
        output_image = cv2.addWeighted(output_image, 1.0, text_overlay, alpha, 0)
        
        return output_image

    def display_results(self, result_image):
        """Display assessment results with improved visibility."""
        # Resize the image if it's too large for display
        height, width = result_image.shape[:2]
        max_height = 800
        max_width = 1200
        
        if height > max_height or width > max_width:
            scale = min(max_height / height, max_width / width)
            new_width = int(width * scale)
            new_height = int(height * scale)
            result_image = cv2.resize(result_image, (new_width, new_height))
        
        # Create window with specific properties
        cv2.namedWindow("Advanced Ergonomic Assessment", cv2.WINDOW_NORMAL)
        cv2.imshow("Advanced Ergonomic Assessment", result_image)
        
        print("\nImage displayed. Press any key to continue...")
        cv2.waitKey(0)
        cv2.destroyAllWindows()
        
        return result_image

def select_image():
    """Allow user to select an image file."""
    root = Tk()
    root.withdraw()
    return filedialog.askopenfilename(title="Select an image file", filetypes=[("Image Files", "*.jpg;*.jpeg;*.png")])

def batch_process_images(folder_path, output_folder="results"):
    """Process all images in a folder."""
    # Load model once before processing multiple images
    load_object_model()
    
    assessment = AdvancedErgonomicAssessment()
    os.makedirs(output_folder, exist_ok=True)
    
    # Get all image files from the folder
    image_extensions = ['.jpg', '.jpeg', '.png']
    image_files = [f for f in os.listdir(folder_path) if any(f.lower().endswith(ext) for ext in image_extensions)]
    
    results = {}
    
    for image_file in image_files:
        image_path = os.path.join(folder_path, image_file)
        print(f"Processing {image_file}...")
        
        # Process the image
        result_image, recommendations, response_data = assessment.process_image(image_path)
        
        if result_image is not None:
            # Save result image
            output_path = os.path.join(output_folder, f"assessed_{image_file}")
            save_result_image(result_image, output_path)
            
            # Store results
            results[image_file] = {
                "recommendations": recommendations,
                "data": response_data
            }
            
            print(f"Processed {image_file} successfully")
            print(f"Results saved to {output_path}")
        else:
            print(f"Failed to process {image_file}")
    
    return results

def main():
    """Main function to run the ergonomic assessment."""
    print("Advanced Ergonomic Assessment Tool")
    print("----------------------------------")
    print("1. Process a single image")
    print("2. Process all images in a folder")
    choice = input("Enter your choice (1/2): ")
    
    if choice == "1":
        # Process a single image
        image_path = select_image()
        if not image_path:
            print("No image selected. Exiting.")
            return
        
        # Create assessment object and process the image
        assessment = AdvancedErgonomicAssessment()
        result_image, recommendations, _ = assessment.process_image(image_path)
        
        if result_image is not None:
            # Display and save results
            assessment.display_results(result_image)
            
            # Save option
            save_option = input("Save result image? (y/n): ")
            if save_option.lower() == 'y':
                output_dir = "results"
                os.makedirs(output_dir, exist_ok=True)
                output_path = os.path.join(output_dir, f"assessed_{os.path.basename(image_path)}")
                filename = save_result_image(result_image, output_path)
                if filename:
                    print(f"Result saved as {output_path}")
            
            # Print recommendations
            print("\nErgonomic Recommendations:")
            for i, rec in enumerate(recommendations, 1):
                print(f"{i}. {rec}")
        
    elif choice == "2":
        # Process all images in a folder
        root = Tk()
        root.withdraw()
        folder_path = filedialog.askdirectory(title="Select folder containing images")
        
        if not folder_path:
            print("No folder selected. Exiting.")
            return
        
        output_folder = os.path.join(folder_path, "assessment_results")
        results = batch_process_images(folder_path, output_folder)
        
        # Print summary
        print("\nProcessing Summary:")
        print(f"Processed {len(results)} images")
        print(f"Results saved to {output_folder}")
    
    else:
        print("Invalid choice. Please run the program again.")

if __name__ == "__main__":
    main()