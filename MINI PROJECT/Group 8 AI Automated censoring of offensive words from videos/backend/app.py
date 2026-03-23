from flask import Flask, request, jsonify, send_file
import os
import time
import uuid
import json
from flask_cors import CORS
from transcribe import transcribe_audio
from process_transcript import detect_offensive_words
from audio_processing import extract_audio, censor_audio, merge_audio_with_video

#  Initialize Flask App
app = Flask(__name__)
CORS(app)

#  Define directories
UPLOAD_FOLDER = "uploads"
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
PROCESSED_FOLDER = os.path.join(BASE_DIR, "processed")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(PROCESSED_FOLDER, exist_ok=True)

#  Paths for JSON Files
UPDATED_JSON_FILE_PATH = os.path.join(PROCESSED_FOLDER, "censored_words_updated.json")

#  Debugging helper: Log requests
def log_request():
    print("\n🔹 Received Request at:", request.path)
    print("🔹 Request Method:", request.method)
    print("🔹 Request Headers:", request.headers)
    print("🔹 Request Files:", request.files.keys())

@app.route("/upload", methods=["POST"])
def upload_video():
    """Handles file upload, transcription, and offensive word detection"""
    log_request()

    #  Ensure a file was uploaded
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files["file"]
    original_filename, original_ext = os.path.splitext(file.filename)
    unique_id = uuid.uuid4().hex[:8]  # Generate a unique ID for processing

    video_path = os.path.join(UPLOAD_FOLDER, file.filename)
    file.save(video_path)  #  Save uploaded file
    print(f" Video File saved at: {video_path}")

    #  Generate a unique filename for extracted audio
    extracted_audio_filename = f"{original_filename}_{unique_id}.wav"
    extracted_audio_path = os.path.join(PROCESSED_FOLDER, extracted_audio_filename)

    #  Step 1: Extract Audio from Video
    audio_path = extract_audio(video_path, extracted_audio_path)
    if not audio_path:
        return jsonify({"error": "Failed to extract audio"}), 500

    #  Step 2: Transcribe the Extracted Audio
    transcript_output = transcribe_audio(audio_path)
    transcript_text = transcript_output["original_text"]
    word_timestamps = transcript_output["word_timestamps"]

    #  Step 3: Detect Offensive Words
    offensive_words_output = detect_offensive_words(transcript_text, word_timestamps)
    transcript_json = offensive_words_output["output_json"]

    #  Step 4: Check if Offensive Words are Found
    contains_offensive_words = len(offensive_words_output["offensive_words"]) > 0  

    #  Prepare Response (Without Censoring Yet)
    response = {
        "original_text": transcript_text,
        "censored_text": offensive_words_output["censored_text"],
        "censored_words": offensive_words_output["offensive_words"],
        "contains_offensive_words": contains_offensive_words,
        "video_path": video_path,
        "audio_path": audio_path,
        "transcript_json": transcript_json,
        "unique_id": unique_id
    }

    return jsonify(response)

#  File Download Route
@app.route("/download/<filename>")
def download_file(filename):
    """Allows users to download processed files"""
    file_path = os.path.join(PROCESSED_FOLDER, filename)

    print(f"🔹 Download requested: {file_path}")

    for _ in range(10):
        if os.path.exists(file_path):
            print(f" Serving file: {file_path}")
            return send_file(file_path, as_attachment=True)
        print(" Waiting for file to be available...")
        time.sleep(1)

    print(f" ERROR: File not found - {filename}")
    return jsonify({"error": f"File {filename} not found"}), 404

from flask_cors import cross_origin

@app.route("/censor_and_merge", methods=["POST", "OPTIONS"])
@cross_origin(origin='*', headers=['Content-Type', 'Authorization'])
def censor_and_merge():
    """Censors the audio and merges it with video only when requested"""
    
    #  Handle Preflight OPTIONS Request for CORS
    if request.method == "OPTIONS":
        print(" OPTIONS request received. Sending CORS headers.")
        return '', 200  #  Send a valid response for preflight check

    #  Parse JSON Data from Frontend
    data = request.json
    if not data:
        return jsonify({"error": "Invalid request"}), 400

    video_path = data.get("video_path")
    audio_path = data.get("audio_path")
    transcript_json = data.get("transcript_json")
    unique_id = data.get("unique_id")

    if not video_path or not audio_path or not transcript_json:
        return jsonify({"error": "Missing required data"}), 400

    original_filename, _ = os.path.splitext(os.path.basename(video_path))

    #  Step 1: Censor the Audio
    censored_audio_filename = f"{original_filename}_{unique_id}_censored.wav"
    censored_audio_path = os.path.join(PROCESSED_FOLDER, censored_audio_filename)

    censored_audio_path = censor_audio(audio_path, transcript_json, censored_audio_path)
    if not os.path.exists(censored_audio_path):
        return jsonify({"error": "Failed to create censored audio"}), 500

    #  Step 2: Merge Censored Audio with Video
    censored_video_filename = f"{original_filename}_{unique_id}_censored.mp4"
    censored_video_path = os.path.join(PROCESSED_FOLDER, censored_video_filename)

    censored_video_path = merge_audio_with_video(video_path, censored_audio_path, censored_video_path)
    if not os.path.exists(censored_video_path):
        return jsonify({"error": "Failed to create censored video"}), 500

    print(f" Censored Video Ready: {censored_video_path}")

    #  Send Response with Download Link
    response = {
        "censored_audio": f"http://127.0.0.1:5000/download/{censored_audio_filename}",
        "censored_video": f"http://127.0.0.1:5000/download/{censored_video_filename}",
        "message": "Censorship and merging completed successfully!"
    }

    return jsonify(response)


@app.route("/save_updated_json", methods=["POST"])
def save_updated_json():
    """Deletes the existing offensive_words.json file and saves a new one without the undone word."""
    data = request.json
    OFFENSIVE_WORDS_JSON_PATH = os.path.join(PROCESSED_FOLDER, "offensive_words.json")


    if "censored_words" not in data:
        return jsonify({"error": "No censored words provided"}), 400

    #  Ensure processed folder exists
    os.makedirs(PROCESSED_FOLDER, exist_ok=True)

    #  Delete the old offensive_words.json file if it exists
    if os.path.exists(OFFENSIVE_WORDS_JSON_PATH):
        try:
            os.remove(OFFENSIVE_WORDS_JSON_PATH)
            print(f" Deleted old JSON file: {OFFENSIVE_WORDS_JSON_PATH}")
        except Exception as e:
            print(f" Error deleting old JSON file: {e}")
            return jsonify({"error": "Failed to delete old JSON file"}), 500

    #  Save a new JSON file, renaming "censored_words" to "offensive_words"
    try:
        updated_data = {"offensive_words": data["censored_words"]}  #  Fix key name

        with open(OFFENSIVE_WORDS_JSON_PATH, "w", encoding="utf-8") as f:
            json.dump(updated_data, f, indent=2)
        
        print(f" New JSON file saved at: {OFFENSIVE_WORDS_JSON_PATH}")
        return jsonify({"message": "Updated JSON saved successfully", "file": OFFENSIVE_WORDS_JSON_PATH})

    except Exception as e:
        print(f" Error saving JSON: {e}")
        return jsonify({"error": "Failed to save updated JSON"}), 500

    
#  Run Flask App
if __name__ == "__main__":
    app.run(debug=True)
