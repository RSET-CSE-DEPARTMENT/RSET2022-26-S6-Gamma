"""
profanity_filter.py - Profanity Detection and Audio Censorship
Detects profane words from Whisper timestamps and mutes them using FFmpeg
Integrates word-level BERT detection with keyword fallback
"""

import subprocess
import os
import shutil
from typing import List, Dict, Tuple

# Import BERT word-level detection (with graceful fallback if unavailable)
try:
    from bert_profanity import detect_bert_profanities
    BERT_AVAILABLE = True
except ImportError:
    BERT_AVAILABLE = False
    print("⚠️  BERT module not available - using keyword-only detection")


# Configurable profanity word list (case-insensitive)
PROFANITY_LIST = {
    # Common profanities
     "fuck", "fucking", "fucked", "fucker", "fucks",
    "shit", "shits", "shitty", "bullshit",
    "bitch", "bitches", "bitching",
    "ass", "asshole", "asses",
    "damn", "damned", "goddamn",
    "hell",
    "crap", "crappy",
    "piss", "pissed",
    "bastard", "bastards",
    "dick", "dicks",
    "cock", "cocks",
    "pussy", "pussies",
   
    # Add more as needed
}


def detect_profanities(words: List[Dict]) -> List[Dict]:
    """
    Detect profane words from Whisper word-level timestamps.
    
    Args:
        words: List of word dicts from Whisper transcription
               [{ "word": str, "start": float, "end": float, ... }]
    
    Returns:
        List of profane word dicts with start/end timestamps
        [{ "word": str, "start": float, "end": float }]
    """
    profane_words = []
    
    for word_data in words:
        # Extract word text and clean it
        word = word_data.get("word", "").strip().lower()
        
        # Remove punctuation for matching
        word_clean = word.strip(".,!?;:\"'()[]{}").lower()
        
        # Check if word is in profanity list
        if word_clean in PROFANITY_LIST:
            profane_words.append({
                "word": word_data.get("word", ""),  # Original word with punctuation
                "start": word_data.get("start", 0.0),
                "end": word_data.get("end", 0.0)
            })
    
    return profane_words


def merge_profanity_detections(
    keyword_profanities: List[Dict],
    bert_profanities: List[Dict]
) -> List[Dict]:
    """
    Merge keyword-based and BERT word-level profanity detections.
    Deduplicates identical time ranges and adds safety padding.
    
    Args:
        keyword_profanities: List from detect_profanities()
                           [{"word": str, "start": float, "end": float}]
        bert_profanities: List from detect_bert_profanities()
                         [{"start": float, "end": float, "confidence": float}]
    
    Returns:
        Merged list of profanity spans with safety padding
        [{"start": float, "end": float, "source": str}]
    """
    all_spans = []
    
    # Safety padding to ensure complete word muting
    SAFETY_PADDING = 0.05  # 50ms on each side
    
    # Add keyword detections with padding
    for kw in keyword_profanities:
        all_spans.append({
            "start": max(0, kw["start"] - SAFETY_PADDING),
            "end": kw["end"] + SAFETY_PADDING,
            "source": "keyword",
            "original_start": kw["start"],
            "original_end": kw["end"]
        })
    
    # Add BERT word-level detections with padding
    for bert in bert_profanities:
        all_spans.append({
            "start": max(0, bert["start"] - SAFETY_PADDING),
            "end": bert["end"] + SAFETY_PADDING,
            "source": "bert",
            "original_start": bert["start"],
            "original_end": bert["end"]
        })
    
    if not all_spans:
        return []
    
    # Sort by start time
    all_spans.sort(key=lambda x: x["start"])
    
    # Remove exact duplicates (same start+end after padding)
    unique_spans = []
    seen = set()
    
    for span in all_spans:
        key = (round(span["start"], 3), round(span["end"], 3))
        if key not in seen:
            seen.add(key)
            unique_spans.append(span)
    
    # Merge overlapping spans
    if not unique_spans:
        return []
    
    merged = [unique_spans[0]]
    
    for current in unique_spans[1:]:
        last = merged[-1]
        
        # Check if overlapping
        if current["start"] <= last["end"]:
            # Merge: extend the end time and combine sources
            last["end"] = max(last["end"], current["end"])
            if current["source"] not in last["source"]:
                last["source"] = f"{last['source']}+{current['source']}"
        else:
            # No overlap - add as new span
            merged.append(current)
    
    return merged


def detect_all_profanities(
    words: List[Dict],
    use_bert: bool = True,
    bert_threshold: float = 0.8
) -> Tuple[List[Dict], List[Dict], List[Dict]]:
    """
    Detect profanities using both keyword and word-level BERT methods.
    
    Args:
        words: List of word dicts from Whisper transcription
        use_bert: Whether to use BERT detection (default: True)
        bert_threshold: Confidence threshold for BERT (default: 0.8)
    
    Returns:
        Tuple of (keyword_profanities, bert_profanities, merged_profanities)
    """
    # Step 1: Keyword detection (always runs)
    keyword_profanities = detect_profanities(words)
    
    # Step 2: BERT word-level detection (if available and enabled)
    bert_profanities = []
    if use_bert and BERT_AVAILABLE:
        try:
            bert_profanities = detect_bert_profanities(
                words,
                threshold=bert_threshold
            )
        except Exception as e:
            print(f"⚠️  BERT detection failed: {e}")
            bert_profanities = []
    
    # Step 3: Merge and deduplicate
    merged_profanities = merge_profanity_detections(
        keyword_profanities,
        bert_profanities
    )
    
    return keyword_profanities, bert_profanities, merged_profanities


def build_ffmpeg_volume_filter(profanities: List[Dict], audio_duration: float) -> str:
    """
    Build FFmpeg volume filter string to mute profane time ranges.
    
    Uses FFmpeg's volume filter with enable expression:
    volume=enable='between(t,start,end)':volume=0
    
    Args:
        profanities: List of profane word dicts with start/end times
        audio_duration: Total duration of audio (for validation)
    
    Returns:
        FFmpeg filter string (e.g., "volume=enable='between(t,1.2,1.5)':volume=0,...")
    """
    if not profanities:
        return None
    
    # Build individual volume filters for each profanity
    filters = []
    for prof in profanities:
        start = prof["start"]
        end = prof["end"]
        
        # Clamp to audio duration boundaries
        start = max(0, start)
        end = min(audio_duration, end)
        
        # FFmpeg volume filter: mute (volume=0) during time range
        filter_expr = f"volume=enable='between(t,{start:.3f},{end:.3f})':volume=0"
        filters.append(filter_expr)
    
    # Chain all filters with comma
    return ",".join(filters)


def censor_audio(
    input_wav: str,
    profanities: List[Dict],
    output_wav: str,
    audio_duration: float = None
) -> Tuple[bool, str]:
    """
    Mute profane portions of audio using FFmpeg.
    
    Args:
        input_wav: Path to original WAV file
        profanities: List of profane word dicts with start/end timestamps
        output_wav: Path to output censored WAV file
        audio_duration: Total audio duration (optional, will probe if not provided)
    
    Returns:
        Tuple of (success: bool, message: str)
    """
    if not profanities:
        # No profanities - just copy the file
        try:
            shutil.copyfile(input_wav, output_wav)
            return True, "No profanities detected - audio copied"
        except Exception as e:
            return False, f"Failed to copy audio: {e}"
    
    # Get audio duration if not provided
    if audio_duration is None:
        try:
            result = subprocess.run(
                [
                    "ffprobe", "-v", "error",
                    "-show_entries", "format=duration",
                    "-of", "default=noprint_wrappers=1:nokey=1",
                    input_wav
                ],
                capture_output=True,
                text=True,
                check=True
            )
            audio_duration = float(result.stdout.strip())
        except (subprocess.CalledProcessError, ValueError) as e:
            return False, f"Failed to probe audio duration: {e}"
    
    # Build volume filter
    volume_filter = build_ffmpeg_volume_filter(profanities, audio_duration)
    
    if not volume_filter:
        return False, "Failed to build volume filter"
    
    # Run FFmpeg to mute profanities
    # ffmpeg -i input.wav -af "volume_filter_chain" output.wav
    try:
        # Build beep filter: generate 1000Hz sine tone during profanity ranges
        beep_filters = []
        for prof in profanities:
            start = max(0, prof["start"])
            end = min(audio_duration, prof["end"])
            beep_filters.append(
                f"sine=frequency=1000:duration={end-start:.3f},adelay={int(start*1000)}|{int(start*1000)}"
            )

        # Mix beep tones over original audio (muting original during beep)
        mute_filter = build_ffmpeg_volume_filter(profanities, audio_duration)
        beep_mix = ";".join([f"[b{i}]" for i in range(len(beep_filters))])
        inputs = ["-i", input_wav]

        filter_complex = ""
        for i, bf in enumerate(beep_filters):
            filter_complex += f"{bf}[b{i}];"
        filter_complex += f"[0:a]{mute_filter}[muted];"
        filter_complex += f"[muted]{''.join([f'[b{i}]' for i in range(len(beep_filters))])}amix=inputs={len(beep_filters)+1}:normalize=0[out]"

        subprocess.run(
            [
                "ffmpeg", "-y",
                "-i", input_wav,
                "-filter_complex", filter_complex,
                "-map", "[out]",
                "-c:a", "pcm_s16le",
                output_wav
            ],
            check=True,
            capture_output=True
        )
        return True, f"Censored {len(profanities)} profanity(ies)"
    
    except subprocess.CalledProcessError as e:
        error_msg = e.stderr.decode() if e.stderr else str(e)
        return False, f"FFmpeg audio censoring failed: {error_msg}"


def replace_audio_in_video(
    input_video: str,
    censored_audio: str,
    output_video: str
) -> Tuple[bool, str]:
    """
    Replace audio track in video with censored audio.
    
    Args:
        input_video: Path to original MP4 file
        censored_audio: Path to censored WAV file
        output_video: Path to output censored MP4 file
    
    Returns:
        Tuple of (success: bool, message: str)
    """
    # FFmpeg command to replace audio:
    # -i original.mp4 -i censored.wav
    # -c:v copy (copy video stream without re-encoding)
    # -map 0:v:0 (use video from first input)
    # -map 1:a:0 (use audio from second input)
    # output.mp4
    
    try:
        subprocess.run(
            [
                "ffmpeg", "-y",  # Overwrite output
                "-i", input_video,
                "-i", censored_audio,
                "-c:v", "copy",  # Copy video without re-encoding
                "-map", "0:v:0",  # Video from input 0
                "-map", "1:a:0",  # Audio from input 1
                "-shortest",  # Match shortest stream duration
                output_video
            ],
            check=True,
            capture_output=True
        )
        return True, "Audio track replaced successfully"
    
    except subprocess.CalledProcessError as e:
        error_msg = e.stderr.decode() if e.stderr else str(e)
        return False, f"FFmpeg video/audio merge failed: {error_msg}"
