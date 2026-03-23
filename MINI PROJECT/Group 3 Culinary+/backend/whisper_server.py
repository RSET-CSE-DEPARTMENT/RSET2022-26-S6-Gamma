# whisper_server.py
from flask import Flask, request, jsonify
import whisper
import base64
import os
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

model = whisper.load_model("base")

@app.route('/transcribe', methods=['POST'])
def transcribe():
    try:
        # Get audio data from request
        if 'audio' in request.json:
            audio_bytes = base64.b64decode(request.json['audio'])
            
            # Save to temporary file
            temp_file = "temp_audio.mp3"
            with open(temp_file, "wb") as f:
                f.write(audio_bytes)
            
            # Transcribe
            result = model.transcribe(temp_file)
            
            # Clean up
            if os.path.exists(temp_file):
                os.remove(temp_file)
                
            return jsonify({"text": result["text"]})
        else:
            return jsonify({"error": "No audio data provided"}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001)  # Note: Using port 5001 instead of 5000
    print("Whisper server running on http://127.0.0.1:5001")