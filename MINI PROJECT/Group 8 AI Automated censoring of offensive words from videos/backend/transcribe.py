import whisper
import json
import os

#  Load Whisper Model
WHISPER_MODEL = whisper.load_model("base")

def transcribe_audio(audio_path):
    """Transcribes audio using Whisper and extracts word timestamps"""
    result = WHISPER_MODEL.transcribe(audio_path, word_timestamps=True)

    word_timestamps = [
        {"word": word["word"], "start": round(word["start"], 2), "end": round(word["end"], 2)}
        for segment in result.get("segments", []) for word in segment.get("words", [])
    ]

    #  Save output to JSON file
    output_json_path = "processed/output.json"
    os.makedirs("processed", exist_ok=True)
    with open(output_json_path, "w", encoding="utf-8") as f:
        json.dump(word_timestamps, f, indent=2)

    return {
        "original_text": result["text"],
        "word_timestamps": word_timestamps,
        "output_json": output_json_path
    }
