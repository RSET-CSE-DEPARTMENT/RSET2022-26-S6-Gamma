import cv2
import numpy as np
import logging
import sqlite3
import tenseal as ts
import os
from deepface import DeepFace

logging.basicConfig(level=logging.INFO)

def load_context():
    with open("ckks_context.tenseal", "rb") as f:
        return ts.context_from(f.read())

context = load_context()

def connect_to_db():
    return sqlite3.connect("new_encrypted_dataset.db")

def detect_faces(image):
    # Use a combination of face detectors for better accuracy
    face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30))
    
    # Additional check - use stricter parameters for validation
    if len(faces) > 0:
        # Try stricter parameters to filter false positives
        faces_stricter = face_cascade.detectMultiScale(gray, scaleFactor=1.05, minNeighbors=8, minSize=(50, 50))
        if len(faces_stricter) == 0:
            logging.info("Failed stricter face detection - likely false positive")
            return []
    return faces

def extract_face_embeddings(image, faces):
    embeddings = []
    extracted_faces = []
    
    for (x, y, w, h) in faces:
        # Add margin to face detection for better results
        margin_x = int(w * 0.1)
        margin_y = int(h * 0.1)
        # Ensure boundaries are within image
        x1 = max(0, x - margin_x)
        y1 = max(0, y - margin_y)
        x2 = min(image.shape[1], x + w + margin_x)
        y2 = min(image.shape[0], y + h + margin_y)
        face = image[y1:y2, x1:x2]
        face_resized = cv2.resize(face, (160, 160))
        face_rgb = cv2.cvtColor(face_resized, cv2.COLOR_BGR2RGB)
        
        try:
            embedding = DeepFace.represent(face_rgb, model_name="Facenet", enforce_detection=False)
            # Basic validation of embedding quality
            emb_vector = embedding[0]["embedding"]
            if np.isnan(np.sum(emb_vector)) or np.std(emb_vector) < 0.1:
                logging.warning("Low quality embedding detected - skipping face")
                continue
            
            embeddings.append(emb_vector)
            extracted_faces.append(face)  # Store the extracted face
            
        except Exception as e:
            logging.error(f"❌ Error getting embedding: {e}")
            
    return embeddings, extracted_faces

def encrypt_embeddings(embeddings):
    return [ts.ckks_vector(context, emb).serialize() for emb in embeddings]

def recognize_face(encrypted_embeddings):
    conn = connect_to_db()
    cursor = conn.cursor()
    cursor.execute("SELECT label, encrypted_embedding FROM encrypted_embeddings")
    stored_data = cursor.fetchall()
    conn.close()
    
    # Set a threshold for similarity score - adjust based on testing
    SIMILARITY_THRESHOLD = 0.75
    results = []
    
    for i, encrypted_blob in enumerate(encrypted_embeddings):
        user_vec = ts.ckks_vector_from(context, encrypted_blob).decrypt()
        best_match, best_score = "No match found", -1
        
        # Normalize the user vector
        user_vec_norm = np.linalg.norm(user_vec)
        if user_vec_norm < 1e-10:  # Vector is essentially zero
            logging.warning(f"Embedding vector for face #{i+1} is near zero - likely not a real face")
            results.append((i+1, "No match found", 0))
            continue
            
        # Normalize user vector
        user_vec = user_vec / user_vec_norm
        
        for label, stored_blob in stored_data:
            try:
                stored_vec = ts.ckks_vector_from(context, stored_blob).decrypt()
                stored_vec_norm = np.linalg.norm(stored_vec)
                
                if stored_vec_norm < 1e-10:  # Bad reference vector
                    continue
                    
                # Normalize stored vector
                stored_vec = stored_vec / stored_vec_norm
                
                # Calculate cosine similarity
                similarity = np.dot(user_vec, stored_vec)
                
                if similarity > best_score:
                    best_score, best_match = similarity, label
                    
            except Exception as e:
                logging.error(f"⚠ Error comparing with {label}: {e}")
                
        # Only consider it a match if above threshold
        if best_score < SIMILARITY_THRESHOLD:
            best_match = "No match found"
            
        results.append((i+1, best_match, best_score))
        
    return results

def process_user_image(image):
    if image is None:
        logging.error("No image provided")
        return None
        
    # Check if image is mostly blank (has very little variance)
    if image.size > 0:
        std_dev = np.std(image)
        if std_dev < 10:  # Threshold for "blankness"
            logging.info("Image appears to be blank or nearly blank")
            return None
            
    faces = detect_faces(image)
    
    if faces is None or len(faces) == 0:
        logging.info("No faces detected.")
        return None
        
    # Additional validation - check face size relative to image
    valid_faces = []
    for face in faces:
        x, y, w, h = face
        face_area = w * h
        image_area = image.shape[0] * image.shape[1]
        face_ratio = face_area / image_area
        
        # Reject if face is too small or too large (likely false positive)
        if 0.01 < face_ratio < 0.9:
            valid_faces.append(face)
            
    if not valid_faces:
        logging.info("No valid faces found after size filtering")
        return None
        
    embeddings, extracted_faces = extract_face_embeddings(image, valid_faces)
    
    if not embeddings:
        logging.info("Failed to extract facial embeddings")
        return None
        
    encrypted = encrypt_embeddings(embeddings)
    results = recognize_face(encrypted)
    
    # Save extracted faces for display
    face_paths = []
    for i, face in enumerate(extracted_faces):
        # Create directory if it doesn't exist
        os.makedirs('static/uploads', exist_ok=True)
        # Save the face image
        face_path = f'static/uploads/user_face_{i}.jpg'
        cv2.imwrite(face_path, face)
        face_paths.append(face_path)
    
    # Create combined results with face paths
    combined_results = []
    for i, (face_num, name, score) in enumerate(results):
        if i < len(face_paths):
            combined_results.append((face_num, name, score, face_paths[i]))
        else:
            combined_results.append((face_num, name, score, None))
    
    # Check if any match exceeds threshold
    has_valid_match = any(match[1] != "No match found" for match in results)
    
    if not has_valid_match:
        logging.info("No matches found above threshold")
        # Return results anyway to display "No match found"
        return combined_results
        
    return combined_results

def get_database_image_path(person_name):
    """Get the path to the first image of the matched person in the LFW dataset"""
    # Update this path to match your LFW dataset location
    dataset_path = r"C:\Users\sandr\cryptovisison\image\lfw-deepfunneled"
    person_path = os.path.join(dataset_path, person_name)
    
    if not os.path.exists(person_path):
        logging.warning(f"No directory found for {person_name}")
        return None
        
    # Get the first image file
    try:
        for img_file in os.listdir(person_path):
            if img_file.lower().endswith(('.jpg', '.jpeg', '.png')):
                # Create directory if it doesn't exist
                os.makedirs('static/matches', exist_ok=True)
                # Copy the image to our static directory
                img_path = os.path.join(person_path, img_file)
                img = cv2.imread(img_path)
                if img is not None:
                    saved_path = f'static/matches/{person_name.replace(" ", "_")}.jpg'
                    cv2.imwrite(saved_path, img)
                    return saved_path
    except Exception as e:
        logging.error(f"Error retrieving database image for {person_name}: {e}")
        
    return None