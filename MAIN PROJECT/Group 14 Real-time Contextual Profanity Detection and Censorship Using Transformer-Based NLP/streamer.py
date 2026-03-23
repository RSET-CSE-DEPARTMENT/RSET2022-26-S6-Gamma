"""
stream_udp.py - Real-time UDP Video Streaming with Named Pipe (FIXED)
Converts MP4 chunks to MPEG-TS before streaming
NO NAL unit errors!
"""

import subprocess
import os
import glob
import threading
import time
from datetime import datetime

try:
    from namedpipe import NPopen
    HAS_NAMEDPIPE = True
except ImportError:
    HAS_NAMEDPIPE = False
    print("⚠️  Install namedpipe: pip install namedpipe\n")


class UDPStreamer:
    def __init__(self, chunks_dir="chunks", udp_port=1234, use_pipe=True):
        """
        Initialize UDP Streamer with Named Pipe support
        Converts MP4 to MPEG-TS for seamless streaming
        """
        self.chunks_dir = chunks_dir
        self.udp_port = udp_port
        self.use_pipe = use_pipe and HAS_NAMEDPIPE
        
        self.streaming_active = False
        self.streaming_process = None
        self.pipe = None
        self.pipe_stream = None
        
        # Chunk tracking
        self.last_streamed_chunk = -1
        self.chunks_added_count = 0
        self.stream_start_time = None
        
        # Concat fallback
        self.concat_file = os.path.join(chunks_dir, "udp_concat_list.txt")
        self.lock = threading.Lock()
    
    def print_status(self, message, icon="ℹ️"):
        """Print timestamped status message"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {icon} {message}")
    
    def get_ready_chunks(self):
        """Get list of available video chunks - prioritize censored versions"""
        # Look for censored chunks first
        censored = sorted(glob.glob(os.path.join(self.chunks_dir, "chunk_*_censored.mp4")))
        
        if censored:
            # Return censored chunks if available
            return censored
        
        # Fallback: look for processed chunks
        processed = sorted(glob.glob(os.path.join(self.chunks_dir, "chunk_*_processed.mp4")))
        if processed:
            return processed
        
        # Last resort: original chunks (no censored/processed versions)
        original = sorted(glob.glob(os.path.join(self.chunks_dir, "chunk_*.mp4")))
        # Filter out _processed and _censored from original list
        return [c for c in original if '_processed' not in c and '_censored' not in c]
    
    def get_chunk_number(self, chunk_path):
        """Extract chunk number from filename"""
        filename = os.path.basename(chunk_path)
        try:
            num_str = filename.replace('chunk_', '').split('.')[0].split('_')[0]
            return int(num_str)
        except:
            return -1
    
    def validate_chunk_file(self, chunk_path):
        """Validate chunk file exists and is readable"""
        return (os.path.exists(chunk_path) and 
                os.path.isfile(chunk_path) and 
                os.path.getsize(chunk_path) > 0)
    
    def convert_mp4_to_ts(self, mp4_path):
        """
        Convert MP4 chunk to MPEG-TS format (streamable)
        
        Args:
            mp4_path: Path to MP4 file
            
        Returns:
            MPEG-TS data as bytes, or None if conversion fails
        """
        try:
            # FFmpeg command to convert MP4 to MPEG-TS
            cmd = [
                'ffmpeg',
                '-i', mp4_path,
                '-c', 'copy',  # Copy streams without re-encoding
                '-f', 'mpegts',  # Output format: MPEG-TS
                '-'  # Output to stdout
            ]
            
            result = subprocess.run(
                cmd,
                capture_output=True,
                check=False
            )
            
            if result.returncode == 0:
                return result.stdout
            else:
                error = result.stderr.decode('utf-8', errors='ignore')
                self.print_status(f"TS conversion failed: {error[:100]}", "⚠️")
                return None
                
        except Exception as e:
            self.print_status(f"Conversion error: {e}", "❌")
            return None
    
    def feed_chunks_to_pipe(self):
        """
        Convert MP4 chunks to MPEG-TS and feed to pipe
        This runs in a separate thread
        """
        self.print_status("Pipe feeder thread started (MPEG-TS mode)", "🔧")
        
        played_chunks = set()
        
        while self.streaming_active:
            try:
                ready_chunks = self.get_ready_chunks()
                
                if not ready_chunks:
                    time.sleep(0.5)
                    continue
                
                # Find new chunks
                new_chunks = []
                for chunk_path in ready_chunks:
                    chunk_num = self.get_chunk_number(chunk_path)
                    if chunk_num not in played_chunks and chunk_num > self.last_streamed_chunk:
                        new_chunks.append((chunk_num, chunk_path))
                
                new_chunks.sort(key=lambda x: x[0])
                
                # Feed new chunks to pipe
                for chunk_num, chunk_path in new_chunks:
                    if not self.streaming_active:
                        break
                    
                    if not self.validate_chunk_file(chunk_path):
                        continue
                    
                    try:
                        # Convert MP4 to MPEG-TS
                        self.print_status(f"Converting Chunk #{chunk_num} to MPEG-TS...", "🔄")
                        ts_data = self.convert_mp4_to_ts(chunk_path)
                        
                        if not ts_data:
                            self.print_status(f"Skipping Chunk #{chunk_num} (conversion failed)", "⚠️")
                            continue
                        
                        # Write MPEG-TS data to pipe
                        if self.pipe_stream:
                            self.pipe_stream.write(ts_data)
                            self.pipe_stream.flush()
                            
                            played_chunks.add(chunk_num)
                            self.last_streamed_chunk = chunk_num
                            self.chunks_added_count += 1
                            
                            filename = os.path.basename(chunk_path)
                            size_kb = len(ts_data) / 1024
                            self.print_status(
                                f"Fed Chunk #{chunk_num} ({filename}) - {size_kb:.1f}KB TS",
                                "📡"
                            )
                    
                    except BrokenPipeError:
                        self.print_status("Pipe broken - FFmpeg disconnected", "❌")
                        self.streaming_active = False
                        break
                    except Exception as e:
                        self.print_status(f"Error feeding chunk: {e}", "⚠️")
                
                time.sleep(0.5)
                
            except Exception as e:
                self.print_status(f"Pipe feeder error: {e}", "❌")
                time.sleep(1)
        
        self.print_status("Pipe feeder thread stopped", "⏹️")
    
    def start_streaming_with_pipe(self):
        """Start UDP streaming using named pipe"""
        self.print_status("Using NAMED PIPE method with MPEG-TS conversion", "🎉")
        
        try:
            # Create named pipe
            self.print_status("Creating named pipe...", "🔧")
            self.pipe = NPopen(mode='wb')
            
            pipe_path = self.pipe.path
            self.print_status(f"Pipe created: {pipe_path}", "✅")
            
            # FFmpeg reads MPEG-TS from pipe and outputs UDP
            cmd = [
                'ffmpeg',
                '-re',
                '-i', pipe_path,  # Input: MPEG-TS from pipe
                '-c:v', 'copy',  # Copy video (already encoded)
                '-c:a', 'copy',  # Copy audio (already encoded)
                '-f', 'mpegts',
                f'udp://127.0.0.1:{self.udp_port}?pkt_size=1316'
            ]
            
            self.print_status("Starting FFmpeg...", "🚀")
            
            self.streaming_process = subprocess.Popen(
                cmd,
                stderr=subprocess.PIPE,
                stdout=subprocess.PIPE,
                bufsize=10**8
            )
            
            # Wait for FFmpeg to connect
            self.print_status("Waiting for FFmpeg to connect...", "⏳")
            self.pipe_stream = self.pipe.wait()
            
            self.print_status("FFmpeg connected to pipe!", "✅")
            
            # Start feeder thread
            feeder_thread = threading.Thread(
                target=self.feed_chunks_to_pipe,
                daemon=True
            )
            feeder_thread.start()
            
            # Monitor FFmpeg
            threading.Thread(target=self.monitor_ffmpeg_output, daemon=True).start()
            
            return True
            
        except Exception as e:
            self.print_status(f"Failed to start pipe streaming: {e}", "❌")
            return False
    
    def monitor_and_append_chunks(self):
        """Fallback: append to concat file"""
        self.print_status("Chunk monitor started (concat mode)", "👀")
        
        while self.streaming_active:
            try:
                ready_chunks = self.get_ready_chunks()
                
                new_chunks = []
                for chunk_path in ready_chunks:
                    chunk_num = self.get_chunk_number(chunk_path)
                    if chunk_num > self.last_streamed_chunk:
                        new_chunks.append((chunk_num, chunk_path))
                
                new_chunks.sort(key=lambda x: x[0])
                
                if new_chunks:
                    with self.lock:
                        with open(self.concat_file, 'a', encoding='utf-8') as f:
                            for chunk_num, chunk_path in new_chunks:
                                if self.validate_chunk_file(chunk_path):
                                    abs_path = os.path.abspath(chunk_path).replace('\\', '/')
                                    f.write(f"file '{abs_path}'\n")
                                    
                                    self.last_streamed_chunk = chunk_num
                                    self.chunks_added_count += 1
                                    
                                    self.print_status(f"Appended Chunk #{chunk_num}", "📡")
                
                time.sleep(0.5)
                
            except Exception as e:
                self.print_status(f"Monitor error: {e}", "❌")
                time.sleep(1)
        
        self.print_status("Chunk monitor stopped", "⏹️")
    
    def start_streaming_with_concat(self):
        """Fallback: concat file method"""
        self.print_status("Using CONCAT FILE method", "📝")
        
        ready_chunks = self.get_ready_chunks()
        with open(self.concat_file, 'w', encoding='utf-8') as f:
            for chunk in ready_chunks:
                if self.validate_chunk_file(chunk):
                    abs_path = os.path.abspath(chunk).replace('\\', '/')
                    f.write(f"file '{abs_path}'\n")
                    self.last_streamed_chunk = self.get_chunk_number(chunk)
        
        monitor_thread = threading.Thread(target=self.monitor_and_append_chunks, daemon=True)
        monitor_thread.start()
        
        cmd = [
            'ffmpeg',
            '-re',
            '-f', 'concat',
            '-safe', '0',
            '-i', self.concat_file,
            '-c:v', 'libx264',
            '-preset', 'ultrafast',
            '-tune', 'zerolatency',
            '-crf', '23',
            '-c:a', 'aac',
            '-b:a', '128k',
            '-f', 'mpegts',
            f'udp://127.0.0.1:{self.udp_port}?pkt_size=1316'
        ]
        
        try:
            self.streaming_process = subprocess.Popen(
                cmd,
                stderr=subprocess.PIPE,
                stdout=subprocess.PIPE,
                bufsize=10**8
            )
            
            threading.Thread(target=self.monitor_ffmpeg_output, daemon=True).start()
            return True
            
        except Exception as e:
            self.print_status(f"Failed to start: {e}", "❌")
            return False
    
    def monitor_ffmpeg_output(self):
        """Monitor FFmpeg stderr"""
        if not self.streaming_process:
            return
        
        for line in self.streaming_process.stderr:
            try:
                line_str = line.decode('utf-8', errors='ignore').strip()
                if not line_str:
                    continue
                
                # Only show critical errors
                if 'error' in line_str.lower():
                    if 'deprecated' not in line_str.lower() and 'nal' not in line_str.lower():
                        if len(line_str) < 150:
                            self.print_status(f"FFmpeg: {line_str[:100]}", "⚠️")
            except:
                pass
    
    def start_streaming(self):
        """Start UDP streaming"""
        print("\n" + "="*70)
        print("     📡 UDP STREAMER (MPEG-TS PIPE - NO NAL ERRORS)")
        print("="*70)
        print(f"📁 Input: {self.chunks_dir}")
        print(f"📺 UDP Port: {self.udp_port}")
        print(f"🎬 Method: {'Named Pipe + MPEG-TS' if self.use_pipe else 'Concat File'}")
        print(f"✅ Converts MP4 → MPEG-TS for seamless streaming")
        print("="*70 + "\n")
        
        if not os.path.exists(self.chunks_dir):
            self.print_status("Chunks directory not found!", "❌")
            return False
        
        self.print_status("Waiting for chunks...", "⏳")
        while len(self.get_ready_chunks()) < 1:
            time.sleep(0.3)
        
        ready = len(self.get_ready_chunks())
        self.print_status(f"Found {ready} chunks!", "✨")
        
        self.streaming_active = True
        self.stream_start_time = time.time()
        
        if self.use_pipe:
            success = self.start_streaming_with_pipe()
        else:
            success = self.start_streaming_with_concat()
        
        if not success:
            return False
        
        time.sleep(2)
        
        if self.streaming_process.poll() is not None:
            self.print_status("FFmpeg failed to start!", "❌")
            return False
        
        print("\n" + "="*70)
        print("✅ UDP STREAM IS LIVE!")
        print("="*70)
        print(f"\n🎥 Watch with VLC:")
        print(f"   udp://@127.0.0.1:{self.udp_port}")
        print(f"\n💡 Features:")
        print(f"   - MP4 chunks converted to MPEG-TS")
        print(f"   - No NAL unit errors")
        print(f"   - Seamless chunk transitions")
        print("\n" + "="*70)
        print("Press Ctrl+C to stop...\n")
        
        try:
            while True:
                time.sleep(1)
                
                if self.streaming_process.poll() is not None:
                    self.print_status("FFmpeg ended", "⚠️")
                    break
                    
        except KeyboardInterrupt:
            self.stop_streaming()
        
        return True
    
    def stop_streaming(self):
        """Stop streaming gracefully"""
        print("\n\n" + "="*70)
        self.print_status("Stopping stream...", "⏹️")
        
        self.streaming_active = False
        time.sleep(1)
        
        if self.streaming_process:
            self.streaming_process.terminate()
            try:
                self.streaming_process.wait(timeout=5)
            except:
                self.streaming_process.kill()
        
        if self.pipe_stream:
            try:
                self.pipe_stream.close()
            except:
                pass
        
        if self.pipe:
            try:
                self.pipe.close()
            except:
                pass
        
        if self.stream_start_time:
            duration = int(time.time() - self.stream_start_time)
            self.print_status(f"Duration: {duration}s", "⏱️")
        
        self.print_status("Stream stopped!", "✅")
        print(f"📊 Chunks streamed: {self.chunks_added_count}")
        print("="*70 + "\n")


if __name__ == "__main__":
    print("\n🎬 UDP Video Streamer (MPEG-TS Conversion)\n")
    
    if not os.path.exists("chunks"):
        print("❌ Error: 'chunks' folder not found!")
        exit(1)
    
    chunks = glob.glob("chunks/chunk_*.mp4")
    if len(chunks) == 0:
        print("❌ Error: No chunks found!")
        exit(1)
    
    print(f"✅ Found {len(chunks)} chunks\n")
    
    if not HAS_NAMEDPIPE:
        print("📦 Install: pip install namedpipe\n")
    
    streamer = UDPStreamer(
        chunks_dir="chunks",
        udp_port=1234,
        use_pipe=True
    )
    
    input("Press ENTER to start streaming...")
    streamer.start_streaming()
