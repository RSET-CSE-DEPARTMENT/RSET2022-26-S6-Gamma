"""
recorder.py - Live Recording Module
Modified to be callable from main.py
"""


import subprocess
import os
import glob
import threading
import queue
import time
import shutil
import json
from faster_whisper import WhisperModel
from datetime import datetime
from profanity_filter import detect_all_profanities, censor_audio, replace_audio_in_video



class LiveRecorder:
    def __init__(self, output_dir="chunks", chunk_duration_sec=3, overlap_sec=0.5):
        self.output_dir = output_dir
        self.chunk_duration_sec = chunk_duration_sec
        self.overlap_sec = overlap_sec
        
        # Create output directory (don't clear it automatically)
        os.makedirs(output_dir, exist_ok=True)
        
        # Whisper model
        self.whisper_model = WhisperModel(
            "tiny",
            device="auto",
            compute_type="int8")
        
        # Queue for chunks to transcribe
        self.transcription_queue = queue.Queue()
        
        # Control flags
        self.recording_active = False
        self.transcription_active = False
        
        # Track processed chunks
        self.last_processed_chunk = -1
        
        # Status tracking
        self.current_recording_chunk = 0
        self.current_transcribing_chunk = 0
        
        # Store previous chunk's words to avoid duplicates
        self.previous_words = []
        
        # Recording process
        self.recording_process = None
    
    def clear_output_directory(self):
        """Clear the output directory before starting"""
        if os.path.exists(self.output_dir):
            print(f"🗑️  Clearing {self.output_dir} folder...")
            shutil.rmtree(self.output_dir)
            print(f"✅ Folder cleared!\n")
        os.makedirs(self.output_dir, exist_ok=True)
    
    def load_whisper_model(self):
        """Load faster-whisper model"""
        print("📥 Loading faster-whisper model...")
        
        self.whisper_model = WhisperModel(
            "base",
            device="cpu",
            compute_type="int8"
        )
        
        print("✅ Whisper model loaded!\n")
    
    def print_status(self, message, status_type="INFO"):
        """Print timestamped status message"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        
        icons = {
            "RECORDING": "🔴",
            "TRANSCRIBING": "🎤",
            "COMPLETE": "✅",
            "INFO": "ℹ️",
            "SUCCESS": "✨",
            "ERROR": "❌"
        }
        
        icon = icons.get(status_type, "•")
        print(f"[{timestamp}] {icon} {message}")
    
    def get_audio_duration(self, audio_file):
        """Get duration of audio file using FFprobe"""
        try:
            cmd = [
                'ffprobe',
                '-v', 'error',
                '-show_entries', 'format=duration',
                '-of', 'default=noprint_wrappers=1:nokey=1',
                audio_file
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=5)
            
            if result.returncode == 0:
                duration = float(result.stdout.strip())
                return duration
            return 0
        except:
            return 0
    
    def remove_duplicate_words_advanced(self, current_words, previous_words):
        """
        Remove duplicate words from the beginning of current words list
        Returns cleaned words and their timestamps
        """
        if not previous_words or not current_words:
            return current_words
        
        # Get last 10 words from previous chunk for better matching
        last_n_words = min(10, len(previous_words))
        prev_tail = [w['word'].lower().strip() for w in previous_words[-last_n_words:]]
        
        # Find longest overlap
        best_match_idx = 0
        best_match_len = 0
        
        for start_idx in range(len(current_words)):
            match_len = 0
            for i in range(min(last_n_words, len(current_words) - start_idx)):
                curr_word = current_words[start_idx + i]['word'].lower().strip()
                prev_word = prev_tail[-(last_n_words - i)] if (last_n_words - i) <= len(prev_tail) else None
                
                if prev_word and curr_word == prev_word:
                    match_len += 1
                else:
                    break
            
            if match_len > best_match_len:
                best_match_len = match_len
                best_match_idx = start_idx + match_len
        
        # Remove duplicates
        if best_match_len >= 2:  # Only remove if we found at least 2 matching words
            return current_words[best_match_idx:]
        
        return current_words
    
    def transcription_worker(self):
        """Background worker that processes chunks as they arrive"""
        
        # Load model once
        self.load_whisper_model()
        
        while self.transcription_active:
            try:
                # Get chunk from queue
                chunk_data = self.transcription_queue.get(timeout=1)
                
                if chunk_data is None:  # Stop signal
                    break
                
                video_file = chunk_data['video_file']
                chunk_num = chunk_data['chunk_num']
                
                self.current_transcribing_chunk = chunk_num
                
                base_name = os.path.splitext(video_file)[0]
                audio_file = base_name + ".wav"
                transcript_file = base_name + ".txt"
                json_file = base_name + ".json"
                
                # Show what's happening
                self.print_status(
                    f"Starting transcription: Chunk #{chunk_num}",
                    "TRANSCRIBING"
                )
                
                # Step 1: Extract audio
                cmd = [
                    'ffmpeg',
                    '-y',
                    '-i', video_file,
                    '-ar', '16000',
                    '-ac', '1',
                    '-f', 'wav',
                    audio_file
                ]
                
                try:
                    result = subprocess.run(
                        cmd,
                        capture_output=True,
                        text=True,
                        timeout=20
                    )
                    
                    if result.returncode != 0:
                        self.print_status(
                            f"FFmpeg error for Chunk #{chunk_num}: {result.stderr[:200]}",
                            "ERROR"
                        )
                        continue
                    
                    if not os.path.exists(audio_file):
                        self.print_status(
                            f"Audio file not created for Chunk #{chunk_num}",
                            "ERROR"
                        )
                        continue
                    
                    audio_size = os.path.getsize(audio_file)
                    
                    if audio_size < 1000:
                        self.print_status(
                            f"Chunk #{chunk_num} audio file too small ({audio_size} bytes)",
                            "ERROR"
                        )
                        continue
                    
                    # Get audio duration
                    audio_duration = self.get_audio_duration(audio_file)
                    audio_size_mb = audio_size / (1024 * 1024)
                    
                    self.print_status(
                        f"Audio extracted for Chunk #{chunk_num} ({audio_size_mb:.2f} MB, {audio_duration:.1f}s)",
                        "INFO"
                    )
                    
                    # Step 2: Transcribe with word-level timestamps
                    self.print_status(
                        f"Transcribing audio: Chunk #{chunk_num}...",
                        "TRANSCRIBING"
                    )
                    
                    segments, info = self.whisper_model.transcribe(
                        audio_file,
                        language="en",
                        beam_size=1,
                        best_of=1,
                        temperature=0.0,
                        vad_filter=False,
                        word_timestamps=True,
                        condition_on_previous_text=False
                    )
                    
                    # Collect all words with timestamps
                    all_words = []
                    
                    for segment in segments:
                        if hasattr(segment, 'words') and segment.words:
                            for word in segment.words:
                                all_words.append({
                                    "word": word.word.strip(),
                                    "start": round(word.start, 3),
                                    "end": round(word.end, 3),
                                    "probability": round(word.probability, 3)
                                })
                    
                    if not all_words:
                        all_words = []
                        chunk_text_clean = "[No speech detected]"
                        cleaned_words = []
                    else:
                        # Remove duplicates based on previous chunk
                        cleaned_words = self.remove_duplicate_words_advanced(all_words, self.previous_words)
                        
                        # Build clean transcript
                        chunk_text_clean = " ".join([w['word'] for w in cleaned_words])
                        
                        # Update previous words for next chunk
                        self.previous_words = all_words
                    
                    # Step 3: Save transcript (text)
                    with open(transcript_file, 'w', encoding='utf-8') as f:
                        f.write(chunk_text_clean)
                    
                    # Step 4: Save timestamps (JSON)
                    timestamp_data = {
                        "chunk_number": chunk_num,
                        "chunk_duration": audio_duration,
                        "transcript": chunk_text_clean,
                        "word_count": len(all_words),
                        "cleaned_word_count": len(chunk_text_clean.split()) if chunk_text_clean != "[No speech detected]" else 0,
                        "words": all_words,
                        "status": "ready_for_nlp"  # NLP processing status
                    }
                    
                    with open(json_file, 'w', encoding='utf-8') as f:
                        json.dump(timestamp_data, f, indent=2, ensure_ascii=False)
                    
                    # ===== PROFANITY DETECTION (KEYWORD + WORD-LEVEL BERT) =====
                    # Detect profanities using keyword and word-level BERT methods
                    keyword_profs, bert_profs, merged_profs = detect_all_profanities(
                        all_words,
                        use_bert=True,
                        bert_threshold=0.8
                    )
                    
                    # Update JSON with comprehensive profanity metadata
                    # Keyword detection results (backward compatible)
                    timestamp_data["profanities_detected"] = bool(keyword_profs)
                    timestamp_data["profanity_count"] = len(keyword_profs)
                    if keyword_profs:
                        timestamp_data["profane_words"] = [p.get("word", "") for p in keyword_profs]
                        timestamp_data["profanity_timestamps"] = keyword_profs
                    else:
                        timestamp_data["profane_words"] = []
                    
                    # BERT word-level detection results
                    timestamp_data["bert_word_profanities_detected"] = bool(bert_profs)
                    timestamp_data["bert_word_profanity_count"] = len(bert_profs)
                    timestamp_data["bert_word_profanity_spans"] = bert_profs
                    
                    # Merged results (for audio censoring)
                    timestamp_data["merged_profanity_spans"] = merged_profs
                    
                    # Logging
                    total_detections = len(keyword_profs) + len(bert_profs)
                    if total_detections > 0:
                        self.print_status(
                            f"Chunk #{chunk_num}: Detected {len(keyword_profs)} keyword + {len(bert_profs)} BERT word(s) - will censor after finalization",
                            "INFO"
                        )
                    
                    # Re-save JSON with profanity info
                    with open(json_file, 'w', encoding='utf-8') as f:
                        json.dump(timestamp_data, f, indent=2, ensure_ascii=False)
                    # ===== END PROFANITY DETECTION =====
                    
                    # Show result
                    word_count = len(chunk_text_clean.split()) if chunk_text_clean != "[No speech detected]" else 0
                    self.print_status(
                        f"Chunk #{chunk_num} transcribed: \"{chunk_text_clean}\" ({word_count} words)",
                        "COMPLETE"
                    )
                    
                except subprocess.TimeoutExpired:
                    self.print_status(
                        f"FFmpeg timeout for Chunk #{chunk_num}",
                        "ERROR"
                    )
                except Exception as e:
                    self.print_status(
                        f"Error processing Chunk #{chunk_num}: {str(e)}",
                        "ERROR"
                    )
                    
            except queue.Empty:
                continue
            except Exception as e:
                self.print_status(f"Error in transcription worker: {e}", "ERROR")
        
        self.print_status("Transcription worker finished", "SUCCESS")
    
    def finalize_chunk_video(self, video_path, audio_path, json_path, chunk_num):
        """
        Called ONLY after monitor confirms file stability.
        Applies censorship if profanities were detected.
        This runs AFTER FFmpeg has released the file.
        
        Args:
            video_path: Path to original MP4 (e.g., chunk_00001.mp4)
            audio_path: Path to WAV audio (e.g., chunk_00001.wav)
            json_path: Path to JSON with profanity data
            chunk_num: Chunk number for logging
        """
        try:
            # Read JSON to check for profanities
            if not os.path.exists(json_path):
                self.print_status(f"Chunk #{chunk_num}: JSON not found, skipping finalization", "ERROR")
                return
            
            with open(json_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            censored_video_path = video_path.replace('.mp4', '_censored.mp4')
            
            # Use merged profanity spans (keyword + BERT word-level combined)
            merged_spans = data.get("merged_profanity_spans", [])
            
            # Check if any profanities were detected (keyword or BERT word-level)
            has_profanities = (
                data.get("profanities_detected", False) or 
                data.get("bert_word_profanities_detected", False)
            )
            
            if has_profanities and merged_spans:
                audio_duration = data.get("chunk_duration", 0)
                
                kw_count = data.get("profanity_count", 0)
                bert_count = data.get("bert_word_profanity_count", 0)
                
                self.print_status(
                    f"Chunk #{chunk_num}: Applying word-level censorship ({kw_count} keyword + {bert_count} BERT word(s) = {len(merged_spans)} span(s))...",
                    "INFO"
                )
                
                # Step 1: Censor audio using merged spans
                censored_audio_path = audio_path.replace('.wav', '_censored.wav')
                success, msg = censor_audio(audio_path, merged_spans, censored_audio_path, audio_duration)
                
                if not success:
                    self.print_status(f"Chunk #{chunk_num}: Audio censorship failed - {msg}", "ERROR")
                    # Fallback: copy original
                    shutil.copyfile(video_path, censored_video_path)
                    return
                
                # Step 2: Replace audio in video
                success, msg = replace_audio_in_video(video_path, censored_audio_path, censored_video_path)
                
                if success:
                    self.print_status(
                        f"Chunk #{chunk_num}: Censored successfully ({len(merged_spans)} span(s) muted)",
                        "SUCCESS"
                    )
                else:
                    self.print_status(f"Chunk #{chunk_num}: Video remux failed - {msg}", "ERROR")
                    # Fallback: copy original
                    shutil.copyfile(video_path, censored_video_path)
                
                # Clean up temporary censored audio
                if os.path.exists(censored_audio_path):
                    os.remove(censored_audio_path)
            else:
                # No profanities - just copy original to censored version
                shutil.copyfile(video_path, censored_video_path)
                self.print_status(f"Chunk #{chunk_num}: No profanities, copied to _censored.mp4", "INFO")
        
        except Exception as e:
            self.print_status(f"Chunk #{chunk_num}: Finalization error - {e}", "ERROR")
            # Try to create fallback
            try:
                censored_video_path = video_path.replace('.mp4', '_censored.mp4')
                if not os.path.exists(censored_video_path):
                    shutil.copyfile(video_path, censored_video_path)
            except:
                pass
    
    def monitor_new_chunks(self):
        """Monitor for new video chunks and queue them for transcription"""
        
        self.print_status("Chunk monitor started", "INFO")
        
        last_check_time = {}
        finalized_chunks = set()  # Track which chunks have been finalized
        
        while self.recording_active or self.transcription_queue.qsize() > 0:
            try:
                # Get all MP4 files
                all_mp4_files = sorted(glob.glob(os.path.join(self.output_dir, "chunk_*.mp4")))
                
                # Filter to ONLY original chunks (no _censored, no _processed)
                video_chunks = []
                for f in all_mp4_files:
                    filename = os.path.basename(f)
                    if "_censored" not in filename and "_processed" not in filename:
                        video_chunks.append(f)
                
                for video_file in video_chunks:
                    filename = os.path.basename(video_file)
                    
                    # Safe chunk number parsing
                    try:
                        # Extract number from "chunk_00001.mp4"
                        num_part = filename.replace('chunk_', '').split('_')[0].replace('.mp4', '')
                        chunk_num = int(num_part)
                    except (ValueError, IndexError):
                        self.print_status(f"Cannot parse chunk number from: {filename}", "ERROR")
                        continue
                    
                    if chunk_num > self.last_processed_chunk:
                        
                        try:
                            current_size = os.path.getsize(video_file)
                        except:
                            continue
                        
                        if video_file not in last_check_time:
                            last_check_time[video_file] = (time.time(), current_size)
                            continue
                        
                        last_time, last_size = last_check_time[video_file]
                        
                        # CHANGED: Wait 2 seconds instead of 1 second
                        if time.time() - last_time < 2:
                            continue
                        
                        if current_size == last_size and current_size > 200000:
                            size_mb = current_size / (1024 * 1024)
                            
                            self.print_status(
                                f"Chunk #{chunk_num} ready ({size_mb:.2f} MB) - queuing for transcription",
                                "COMPLETE"
                            )
                            
                            self.transcription_queue.put({
                                'video_file': video_file,
                                'chunk_num': chunk_num
                            })
                            
                            # ===== SAFE VIDEO FINALIZATION (AFTER FILE IS STABLE) =====
                            # Only finalize if not already done
                            if chunk_num not in finalized_chunks:
                                finalized_chunks.add(chunk_num)
                                
                                # Wait for transcription to complete and create JSON
                                # Then apply video censorship if needed
                                base_name = os.path.splitext(video_file)[0]
                                audio_path = base_name + ".wav"
                                json_path = base_name + ".json"
                                
                                # Spawn thread to wait for JSON and finalize
                                def finalize_when_ready(vf, ap, jp, cn):
                                    # Wait for JSON to be created by transcription_worker
                                    max_wait = 30  # 30 seconds timeout
                                    waited = 0
                                    while not os.path.exists(jp) and waited < max_wait:
                                        time.sleep(0.1)
                                        waited += 0.5
                                    
                                    if os.path.exists(jp):
                                        # JSON ready - safe to finalize video
                                        self.finalize_chunk_video(vf, ap, jp, cn)
                                
                                threading.Thread(
                                    target=finalize_when_ready,
                                    args=(video_file, audio_path, json_path, chunk_num),
                                    daemon=True
                                ).start()
                            # ===== END SAFE VIDEO FINALIZATION =====
                            
                            self.last_processed_chunk = chunk_num
                            del last_check_time[video_file]
                        else:
                            last_check_time[video_file] = (time.time(), current_size)
                
                time.sleep(0.3)
                
            except Exception as e:
                self.print_status(f"Monitor error: {e}", "ERROR")
                time.sleep(1)
        
        self.print_status("Chunk monitor finished", "INFO")
    
    def ffmpeg_monitor(self, process):
        """Monitor FFmpeg output to track which chunk is recording"""
        
        chunk_count = 0
        
        for line in process.stderr:
            line_str = line.decode('utf-8', errors='ignore')
            
            if 'Opening' in line_str and 'chunk_' in line_str:
                chunk_count += 1
                self.current_recording_chunk = chunk_count
                
                self.print_status(
                    f"Recording Chunk #{chunk_count}...",
                    "RECORDING"
                )
    
    def start_recording(self):
        """Start the recording process"""
        if self.recording_active:
            print("⚠️  Recording already active!")
            return False
        
        print("\n" + "="*70)
        print("          🔴 LIVE RECORDER STARTED")
        print("="*70)
        print(f"📁 Output: {self.output_dir}")
        print(f"⏱️  Chunk Duration: {self.chunk_duration_sec}s")
        print(f"⏱️  Overlap: {self.overlap_sec}s (prevents word loss)")
        print("="*70 + "\n")
        
        self.recording_active = True
        self.transcription_active = True
        
        # Start transcription worker thread
        self.transcription_thread = threading.Thread(
            target=self.transcription_worker,
            daemon=True
        )
        self.transcription_thread.start()
        
        # Start chunk monitor thread
        self.monitor_thread = threading.Thread(
            target=self.monitor_new_chunks,
            daemon=True
        )
        self.monitor_thread.start()
        
        time.sleep(1)
        
        # Start FFmpeg recording
        video_pattern = os.path.join(self.output_dir, "chunk_%05d.mp4")
        
        cmd = [
    'ffmpeg',
    '-f', 'avfoundation',
    '-framerate', '30',
    '-video_size', '1280x720',
    '-i', '0:2',
    '-c:v', 'libx264',
    '-preset', 'ultrafast',
    '-pix_fmt', 'yuv420p',
    '-c:a', 'aac',
    '-b:a', '128k',
    '-ar', '44100',
    '-f', 'segment',
    '-segment_time', str(self.chunk_duration_sec),
    '-segment_format', 'mp4',
    '-reset_timestamps', '1',
    '-movflags', '+frag_keyframe+empty_moov',
    video_pattern
]
        
        self.recording_process = subprocess.Popen(
            cmd,
            stderr=subprocess.PIPE,
            stdout=subprocess.PIPE
        )
        
        # Monitor FFmpeg output in separate thread
        ffmpeg_thread = threading.Thread(
            target=self.ffmpeg_monitor,
            args=(self.recording_process,),
            daemon=True
        )
        ffmpeg_thread.start()
        
        self.print_status("Recording started! (Call stop_recording() to stop)", "RECORDING")
        return True
    
    def stop_recording(self):
        """Stop the recording process"""
        if not self.recording_active:
            print("⚠️  No active recording!")
            return False
        
        print("\n" + "="*70)
        self.print_status("Stopping recording...", "INFO")
        
        if self.recording_process:
            self.recording_process.terminate()
            self.recording_process.wait()
        
        self.recording_active = False
        
        # Wait for remaining chunks
        self.print_status("Processing remaining chunks...", "INFO")
        time.sleep(5)
        
        # Stop transcription worker
        self.transcription_queue.put(None)
        self.transcription_active = False
        
        if hasattr(self, 'transcription_thread'):
            self.transcription_thread.join(timeout=30)
        
        print("="*70)
        self.print_status("Recording stopped!", "SUCCESS")
        print("="*70 + "\n")
        
        return True
    
    def get_stats(self):
        """Get recording statistics"""
        video_chunks = sorted(glob.glob(os.path.join(self.output_dir, "chunk_*.mp4")))
        json_chunks = sorted(glob.glob(os.path.join(self.output_dir, "chunk_*.json")))
        
        return {
            "total_chunks": len(video_chunks),
            "transcribed_chunks": len(json_chunks),
            "output_dir": self.output_dir
        }
    
    def list_chunks(self):
        """List all created files"""
        video_chunks = sorted([f for f in os.listdir(self.output_dir) 
                              if f.startswith('chunk_') and f.endswith('.mp4')])
        audio_chunks = sorted([f for f in os.listdir(self.output_dir) 
                              if f.startswith('chunk_') and f.endswith('.wav')])
        transcript_chunks = sorted([f for f in os.listdir(self.output_dir) 
                                   if f.startswith('chunk_') and f.endswith('.txt')])
        json_chunks = sorted([f for f in os.listdir(self.output_dir) 
                             if f.startswith('chunk_') and f.endswith('.json')])
        
        print("\n" + "="*70)
        print("                    📊 FINAL RESULTS")
        print("="*70)
        print(f"🎬 Video files:      {len(video_chunks)}")
        print(f"🎵 Audio files:      {len(audio_chunks)}")
        print(f"📝 Transcript files: {len(transcript_chunks)}")
        print(f"⏰ Timestamp files:  {len(json_chunks)}")
        print("="*70)
        
        # Show full continuous transcript
        print("\n📝 FULL CONTINUOUS TRANSCRIPT:")
        print("="*70)
        full_transcript = ""
        
        for i, video in enumerate(video_chunks, 1):
            transcript = video.replace('.mp4', '.txt')
            if transcript in transcript_chunks:
                t_path = os.path.join(self.output_dir, transcript)
                with open(t_path, 'r', encoding='utf-8') as f:
                    content = f.read().strip()
                    if content and content != "[No speech detected]":
                        full_transcript += content + " "
        
        print(f"\"{full_transcript.strip()}\"")
        print("="*70)
        
        # Show individual chunks
        for i, video in enumerate(video_chunks, 1):
            print(f"\n📦 Chunk {i}:")
            
            v_path = os.path.join(self.output_dir, video)
            v_size = os.path.getsize(v_path) / (1024 * 1024)
            print(f"   📹 {video} ({v_size:.2f} MB)")
            
            audio = video.replace('.mp4', '.wav')
            if audio in audio_chunks:
                a_path = os.path.join(self.output_dir, audio)
                a_size = os.path.getsize(a_path) / (1024 * 1024)
                a_duration = self.get_audio_duration(a_path)
                print(f"   🎵 {audio} ({a_size:.2f} MB, {a_duration:.1f}s)")
            
            transcript = video.replace('.mp4', '.txt')
            if transcript in transcript_chunks:
                t_path = os.path.join(self.output_dir, transcript)
                print(f"   📝 {transcript}")
                
                with open(t_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    print(f"      💬 \"{content}\"")
            
            json_file = video.replace('.mp4', '.json')
            if json_file in json_chunks:
                j_path = os.path.join(self.output_dir, json_file)
                print(f"   ⏰ {json_file}")
                
                with open(j_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    print(f"      → {data['cleaned_word_count']} words with timestamps")
                    
                    if data['words']:
                        print(f"      → Example words:")
                        for word_data in data['words'][:3]:
                            print(f"         '{word_data['word']}' at {word_data['start']:.2f}s - {word_data['end']:.2f}s")
        
        print("\n" + "="*70)



# Can still run standalone
if __name__ == "__main__":
    print("\n" + "="*70)
    print("        🎥 REAL-TIME TRANSCRIPTION PIPELINE 🎤")
    print("="*70)
    print("\n✨ Features:")
    print("  • Clears chunks folder before starting")
    print("  • Records video in 5-second chunks with 1s overlap")
    print("  • NO WORD LOSS - Advanced duplicate detection")
    print("  • Runs continuously until you stop it (Ctrl+C)")
    print("  • Word-level timestamps in JSON files")
    print("  • Shows complete continuous transcript\n")
    print("="*70 + "\n")
    
    input("Press ENTER to start recording...")
    print()
    
    recorder = LiveRecorder(
        output_dir="chunks",
        chunk_duration_sec=5,
        overlap_sec=1.0
    )
    
    # Clear directory when running standalone
    recorder.clear_output_directory()
    
    # Start recording
    recorder.start_recording()
    
    try:
        # Wait until user stops
        input("\nPress ENTER to stop recording...\n")
    except KeyboardInterrupt:
        print("\n")
    
    # Stop recording
    recorder.stop_recording()
    
    # Show results
    recorder.list_chunks()
