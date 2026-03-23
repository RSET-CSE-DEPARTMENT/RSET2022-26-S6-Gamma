"""
main.py - Main Orchestrator
Runs both recording and streaming simultaneously
Streams 5 seconds after recording starts
"""




import time
import threading
import os
import glob
from recorder import LiveRecorder
from streamer import UDPStreamer





class LiveStreamingPipeline:
    def __init__(self, chunks_dir="chunks", chunk_duration=5, overlap=1.0, udp_port=1234):
        self.chunks_dir = chunks_dir
        self.chunk_duration = chunk_duration
        
        # Initialize recorder
        self.recorder = LiveRecorder(
            output_dir=chunks_dir,
            chunk_duration_sec=chunk_duration,
            overlap_sec=overlap
        )
        
        # Initialize UDP streamer
        self.streamer = UDPStreamer(
            chunks_dir=chunks_dir,
            udp_port=udp_port,
            use_pipe=True  # ✅ Use pipe method for continuous streaming
        )
        
        self.pipeline_active = False
        self.streaming_started = False
    
    def start_streaming_when_ready(self):
        """Start streaming in background thread"""
        try:
            print("🚀 Starting UDP streamer...\n")
            
            # This will block until streaming ends or error occurs
            self.streamer.start_streaming()
            
        except Exception as e:
            print(f"\n❌ Streaming error: {e}")
    
    def start_pipeline(self):
        """Start recording, wait 5 seconds, then start streaming"""
        print("\n" + "="*70)
        print("      🎥📡 LIVE STREAMING PIPELINE")
        print("="*70)
        print("\n📋 Workflow:")
        print("   1. Clear chunks folder")
        print("   2. Start recording")
        print("   3. Wait 5 seconds")
        print("   4. Auto-start UDP streaming")
        print("   5. Continue recording + streaming")
        print("="*70 + "\n")
        
        self.pipeline_active = True
        
        # Step 1: Clear chunks directory
        print("🗑️  Clearing chunks folder...")
        self.recorder.clear_output_directory()
        
        # Step 2: Start recorder
        print("\n▶️  Starting recorder...\n")
        self.recorder.start_recording()
        
        # ============================================================
        # Step 3: Wait 5 seconds
        # ============================================================
        wait_time = 2
        print(f"⏳ Waiting {wait_time} seconds before starting stream...")
        for i in range(wait_time, 0, -1):
            print(f"   ⏱️  {i} seconds remaining...")
            time.sleep(1)
        print()
        
        # Step 4: Start streaming in background thread
        print("="*70)
        print("✅ STARTING STREAM NOW")
        print("="*70 + "\n")
        
        self.streaming_started = True
        
        streaming_thread = threading.Thread(
            target=self.start_streaming_when_ready,
            daemon=True,
            name="StreamingThread"
        )
        streaming_thread.start()
        
        # Give streamer time to initialize
        time.sleep(1)
        
        # Show success message
        print("\n" + "="*70)
        print("✅ PIPELINE FULLY ACTIVE!")
        print("="*70)
        print("\n📹 Recording: Active (new chunks every 5s)")
        print("🎤 Transcription: Active (background)")
        print("📡 UDP Streaming: Active (port 1234)")
        print("\n💡 Watch in VLC:")
        print("   1. Open VLC Media Player")
        print("   2. Media → Open Network Stream (Ctrl+N)")
        print("   3. Enter: udp://@127.0.0.1:1234")
        print("   4. Set network caching to 1000-3000ms")
        print("   5. Click Play")
        print("\n" + "="*70)
        print("\nPress Ctrl+C to stop pipeline...\n")
        
        return True
    
    def stop_pipeline(self):
        """Stop both recording and streaming"""
        print("\n\n" + "="*70)
        print("      ⏹️  STOPPING PIPELINE")
        print("="*70 + "\n")
        
        self.pipeline_active = False
        
        # Stop recorder first
        if self.recorder.recording_active:
            print("⏹️  Stopping recorder...")
            self.recorder.stop_recording()
        
        # Wait for remaining chunks
        print("⏳ Processing remaining chunks...")
        time.sleep(3)
        
        # Stop streamer
        if self.streaming_started:
            print("⏹️  Stopping streamer...")
            self.streamer.stop_streaming()
        
        # Show final stats
        print("\n" + "="*70)
        print("      📊 FINAL STATISTICS")
        print("="*70)
        
        rec_stats = self.recorder.get_stats()
        
        print(f"\n📹 Recording:")
        print(f"   - Total chunks: {rec_stats['total_chunks']}")
        print(f"   - Transcribed: {rec_stats['transcribed_chunks']}")
        
        if self.streaming_started:
            print(f"\n📡 Streaming:")
            print(f"   - Chunks streamed: {self.streamer.last_streamed_chunk + 1}")
            print(f"   - Dynamically added: {self.streamer.chunks_added_count}")
        
        # Show final transcript
        print("\n")
        self.recorder.list_chunks()
        
        print("\n" + "="*70 + "\n")
    
    def run_interactive(self):
        """Run pipeline interactively"""
        try:
            success = self.start_pipeline()
            
            if not success:
                return
            
            # Keep running until interrupted
            while self.pipeline_active:
                time.sleep(1)
                
        except KeyboardInterrupt:
            print("\n\n⏹️  Keyboard interrupt detected")
        finally:
            self.stop_pipeline()





if __name__ == "__main__":
    print("\n" + "="*70)
    print("      🎥 LIVE STREAMING PIPELINE 📡")
    print("="*70)
    print("\n✨ Features:")
    print("   1. ✅ Record video chunks (5s each, 1s overlap)")
    print("   2. ✅ Real-time transcription with word timestamps")
    print("   3. ✅ JSON files with NLP-ready data")
    print("   4. ✅ UDP streaming (auto-starts after 5 seconds)")
    print("   5. ✅ Watch live in VLC player")
    print("\n💡 One-Click Operation:")
    print("   - Press ENTER once")
    print("   - Recording starts immediately")
    print("   - Streaming auto-starts after 5 seconds")
    print("   - Press Ctrl+C to stop everything")
    print("\n" + "="*70 + "\n")
    
    input("Press ENTER to start the live pipeline...")
    print()
    
    pipeline = LiveStreamingPipeline(
        chunks_dir="chunks",
        chunk_duration=2,
        overlap=0.3,
        udp_port=1234
    )
    
    pipeline.run_interactive()
