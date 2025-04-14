from flask import Flask, render_template, request, redirect, url_for
import numpy as np
import cv2
import logging
from face_recognition import process_user_image, get_database_image_path
import os

# Configure logging
logging.basicConfig(level=logging.INFO,
                   format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = Flask(__name__, static_folder="static")

# Home Page
@app.route("/")
def index():
    return render_template("index.html")

# Upload Page
@app.route("/upload", methods=["GET", "POST"])
def upload_page():
    if request.method == "POST":
        if "file" not in request.files:
            return render_template("upload.html", error="No file uploaded.")
            
        file = request.files["file"]
        
        if file.filename == "":
            return render_template("upload.html", error="No file selected.")
            
        # Check file extension
        allowed_extensions = {'png', 'jpg', 'jpeg'}
        if not '.' in file.filename or file.filename.rsplit('.', 1)[1].lower() not in allowed_extensions:
            return render_template("upload.html", error="Invalid file format. Please upload a JPEG or PNG image.")
            
        try:
            # Convert file to OpenCV image
            file_bytes = np.asarray(bytearray(file.read()), dtype=np.uint8)
            image = cv2.imdecode(file_bytes, cv2.IMREAD_COLOR)
            
            if image is None:
                return render_template("upload.html", error="Could not process image. Please try another.")
                
            # Check image dimensions
            if image.shape[0] < 10 or image.shape[1] < 10:
                return render_template("upload.html", error="Image is too small.")
                
            # Process the image
            results = process_user_image(image)
            
            # No results means no valid faces were found
            if not results:
                return render_template("matchresult.html", match_found=False)
                
            # Get database image paths for matches
            processed_results = []
            for face_num, name, score, user_face_path in results:
                db_image_path = None
                if name != "No match found":
                    db_image_path = get_database_image_path(name)
                processed_results.append((face_num, name, score, user_face_path, db_image_path))
                
            # Check if any face was successfully matched
            match_found = any(match[1] != "No match found" for match in results)
            
            return render_template("matchresult.html", 
                                  match_found=match_found, 
                                  results=processed_results)
                                  
        except Exception as e:
            logger.error(f"Error processing upload: {e}", exc_info=True)
            return render_template("upload.html", error="An error occurred while processing your image.")
            
    return render_template("upload.html")

# About Page
@app.route("/about")
def about():
    return render_template("about.html")

# Privacy Policy Page
@app.route("/privacy")
def privacy():
    return render_template("privacy.html")

# Support Page
@app.route("/support")
def support():
    return render_template("support.html")

# Match Result Page
@app.route("/matchresult")
def match_result():
    # This is just for direct URL access, actual results come from upload
    return render_template("matchresult.html", match_found=False)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080, debug=True)
