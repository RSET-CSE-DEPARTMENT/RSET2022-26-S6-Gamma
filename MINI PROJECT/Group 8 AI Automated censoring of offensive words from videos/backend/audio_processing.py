import os
import json
import ffmpeg
import subprocess
from pydub import AudioSegment
from pydub.generators import Sine

def extract_audio(video_path, output_audio):
    """Extracts audio from a video file using FFmpeg"""
    try:
        os.makedirs("processed", exist_ok=True)
        ffmpeg.input(video_path).output(output_audio, format='wav', acodec='pcm_s16le', ar='16000').run(overwrite_output=True)
        print(f" Audio extracted to: {output_audio}")
        return output_audio
    except Exception as e:
        print(f" Error extracting audio: {e}")
        return None

def generate_beep(duration=500):
    """Generate a beep sound"""
    beep_path = "static/beep.wav"  #  Use WAV instead of MP3 for compatibility
    if not os.path.exists(beep_path):
        os.makedirs("static", exist_ok=True)
        beep = Sine(1000).to_audio_segment(duration=duration)
        beep.export(beep_path, format="wav")  #  Save as WAV instead of MP3
    return beep_path

def censor_audio(original_audio_path, transcript_json, output_audio_path):
    """Mutes and replaces offensive words with beeps in the audio"""
    print(f"🔹 Censoring Audio: {original_audio_path}")

    audio = AudioSegment.from_wav(original_audio_path)
    beep = AudioSegment.from_file(generate_beep())

    with open(transcript_json, "r", encoding="utf-8") as f:
        offensive_data = json.load(f)

    beep_positions = [(word["start_time"] * 1000, word["end_time"] * 1000) for word in offensive_data["offensive_words"]]

    for start_time, end_time in beep_positions:
        start_time = max(0, int(start_time) - 50)  # Add buffer
        end_time = min(len(audio), int(end_time) + 250)
        duration = end_time - start_time

        silence = AudioSegment.silent(duration=duration)
        beep_sound = beep[:duration] if len(beep) > duration else beep

        audio = audio[:start_time] + silence + audio[end_time:]
        audio = audio.overlay(beep_sound, position=start_time)

    print(f" Saving Censored Audio at: {output_audio_path}")
    audio.export(output_audio_path, format="wav")

    return output_audio_path if os.path.exists(output_audio_path) else None

def merge_audio_with_video(video_path, audio_path, output_video_path):
    """Merges censored audio with video using FFmpeg"""
    print(f"🔹 Merging Audio & Video: {video_path} + {audio_path}")

    try:
        command = [
            "ffmpeg", "-i", video_path, "-i", audio_path, 
            "-c:v", "copy", "-c:a", "aac", "-b:a", "192k",
            "-map", "0:v:0", "-map", "1:a:0", 
            "-y", output_video_path
        ]

        subprocess.run(command, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)

        print(f" Merged video saved at: {output_video_path}")

        return output_video_path if os.path.exists(output_video_path) else None

    except subprocess.CalledProcessError as e:
        print(f" FFmpeg Error: {e.stderr.decode()}")
        return None
