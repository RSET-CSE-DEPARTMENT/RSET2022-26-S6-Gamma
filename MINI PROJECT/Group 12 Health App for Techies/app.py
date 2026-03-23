from flask import Flask, request, jsonify, render_template, send_from_directory
import os
import cv2
import numpy as np
from werkzeug.utils import secure_filename
import logging

# Updated import to use the correct class name
from ergonomic_assessment import AdvancedErgonomicAssessment, save_result_image
from flask_cors import CORS  # Add at the top

app = Flask(__name__)
CORS(app)  # Add this right after creating the Flask app


# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Configure upload and results folder
UPLOAD_FOLDER = 'uploads'
RESULTS_FOLDER = 'results'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(RESULTS_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['RESULTS_FOLDER'] = RESULTS_FOLDER

@app.route('/')
def index():
    """Render the homepage."""
    return render_template('index.html')  # Flask automatically looks inside /templates

@app.route('/upload', methods=['POST'])
def upload_file():
    """Handle file upload and analysis."""
    if 'file' not in request.files:
        logger.error("No file part in the request")
        return jsonify({'error': 'No file uploaded'}), 400
    
    file = request.files['file']
    if file.filename == '':
        logger.error("No selected file")
        return jsonify({'error': 'No selected file'}), 400

    # Save uploaded image with secure filename
    filename = secure_filename(file.filename)
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    file.save(filepath)
    logger.info(f"Saved uploaded file to: {filepath}")
    
    try:
        # Initialize the ergonomic assessment
        assessment = AdvancedErgonomicAssessment()
        
        # Process the image
        logger.info(f"Processing image: {filepath}")
        result_image, recommendations, response_data = assessment.process_image(filepath)
        
        if result_image is None:
            logger.error(f"Failed to process image: {recommendations}")
            return jsonify({'error': recommendations}), 500
        
        # Save the result image
        result_path = os.path.join(app.config['RESULTS_FOLDER'], f"assessed_{filename}")
        result_filename = save_result_image(result_image, result_path)
        
        if not result_filename:
            logger.error(f"Failed to save result image to: {result_path}")
            return jsonify({'error': 'Failed to save result image'}), 500
            
        logger.info(f"Result image saved as: {result_path}")
        
        # Add the path to the response data
        result_url = f'/results/{result_filename}'
        response_data['result_path'] = result_url
        logger.info(f"Result URL: {result_url}")
        
        return jsonify(response_data)
        
    except Exception as e:
        logger.exception(f"Error processing image: {str(e)}")
        return jsonify({'error': f'Error processing image: {str(e)}'}), 500
    
    finally:
        # Clean up the temporary file
        if os.path.exists(filepath):
            os.remove(filepath)
            logger.info(f"Removed temporary file: {filepath}")
@app.route('/results/<filename>')
def send_result(filename):
    """Serve result images."""
    try:
        logger.info(f"Request for result image: {filename}")
        return send_from_directory(
            app.config['RESULTS_FOLDER'],
            filename,
            mimetype='image/jpeg'  # or 'image/png' depending on your format
        )
    
    except Exception as e:
        logger.exception(f"Error serving result image: {str(e)}")
        return jsonify({'error': f'Error serving image: {str(e)}'}), 500

@app.route('/debug/results')
def list_results():
    """Debug endpoint to list available result images."""
    try:
        files = os.listdir(app.config['RESULTS_FOLDER'])
        file_info = []
        
        for file in files:
            file_path = os.path.join(app.config['RESULTS_FOLDER'], file)
            file_info.append({
                'name': file,
                'size': os.path.getsize(file_path),
                'path': file_path,
                'url': f'/results/{file}'
            })
            
        return jsonify({
            'results_folder': os.path.abspath(app.config['RESULTS_FOLDER']),
            'files': file_info
        })
        
    except Exception as e:
        logger.exception(f"Error listing result files: {str(e)}")
        return jsonify({'error': f'Error listing files: {str(e)}'}), 500

@app.after_request
def add_header(response):
    """Add headers to prevent caching for development."""
    response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, post-check=0, pre-check=0, max-age=0'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '-1'
    return response

if __name__ == '__main__':
    # Verify folders exist and are writable
    for folder in [UPLOAD_FOLDER, RESULTS_FOLDER]:
        os.makedirs(folder, exist_ok=True)
        if not os.access(folder, os.W_OK):
            logger.error(f"Cannot write to {folder} directory")
    
    app.run(debug=True, host='0.0.0.0', port=5001)  # Changed to 0.0.0.0