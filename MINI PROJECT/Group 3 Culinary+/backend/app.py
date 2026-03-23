from flask import Flask, request, send_file, jsonify
from flask_cors import CORS
import os
import uuid
import time
import yt_dlp

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Directory to store downloaded audio files
DOWNLOAD_DIR = "downloads"
if not os.path.exists(DOWNLOAD_DIR):
    os.makedirs(DOWNLOAD_DIR)

@app.route('/', methods=['GET'])
def index():
    return jsonify({"status": "Server is running"})

@app.route('/download', methods=['POST'])
def download_audio():
    try:
        print("Received download request!")
        # Get YouTube URL from request
        data = request.get_json()
        youtube_url = data.get('youtube_url')
        
        if not youtube_url:
            return jsonify({'error': 'No YouTube URL provided'}), 400
        
        print(f"Processing YouTube URL: {youtube_url}")
        
        # Create unique filename
        file_id = str(uuid.uuid4())
        output_file = os.path.join(DOWNLOAD_DIR, f"{file_id}.mp3")
        
        # Set up yt-dlp options
        ydl_opts = {
            'format': 'bestaudio/best',
            'outtmpl': os.path.join(DOWNLOAD_DIR, f"{file_id}.%(ext)s"),
            'postprocessors': [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'mp3',
                'preferredquality': '192',
            }],
            'quiet': False,
            'no_warnings': False,
        }
        
        # Download the video
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(youtube_url, download=True)
            title = info.get('title', 'Unknown Title')
        
        # Find the actual output file (yt-dlp might have modified the filename)
        for file in os.listdir(DOWNLOAD_DIR):
            if file.startswith(file_id) and file.endswith('.mp3'):
                output_file = os.path.join(DOWNLOAD_DIR, file)
                break
        
        if not os.path.exists(output_file):
            return jsonify({'error': 'Failed to download audio file'}), 500
        
        print(f"Download complete: {output_file}")
        
        # Return download URL
        download_url = f"/get_audio/{os.path.basename(output_file)}"
        return jsonify({
            'success': True,
            'download_url': download_url,
            'title': title
        })
        
    except Exception as e:
        print(f"Error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/get_audio/<filename>', methods=['GET'])
def get_audio(filename):
    try:
        file_path = os.path.join(DOWNLOAD_DIR, filename)
        if not os.path.exists(file_path):
            return jsonify({'error': 'File not found'}), 404
        
        return send_file(file_path, as_attachment=True)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Clean up old files periodically
@app.route('/cleanup', methods=['POST'])
def cleanup():
    try:
        # Delete files older than 1 hour
        cutoff_time = time.time() - 3600
        deleted_count = 0
        
        for filename in os.listdir(DOWNLOAD_DIR):
            file_path = os.path.join(DOWNLOAD_DIR, filename)
            if os.path.isfile(file_path) and os.path.getmtime(file_path) < cutoff_time:
                os.remove(file_path)
                deleted_count += 1
                
        return jsonify({'success': True, 'deleted_files': deleted_count})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    print("Starting server on http://0.0.0.0:5000")
    app.run(host='0.0.0.0', port=5000, debug=True)