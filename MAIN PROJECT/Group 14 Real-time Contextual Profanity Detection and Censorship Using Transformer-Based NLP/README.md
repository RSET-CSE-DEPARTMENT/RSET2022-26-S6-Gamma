# Real-time Contextual Profanity Detection and Censorship

[![Python 3.8+](https://img.shields.io/badge/python-3.8+-blue.svg)](https://www.python.org/downloads/)
[![PyTorch](https://img.shields.io/badge/PyTorch-2.1.2-red.svg)](https://pytorch.org/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

A real-time live video streaming pipeline that automatically detects and censors profane language using transformer-based NLP models. The system performs word-level profanity detection using a hybrid approach combining keyword matching and fine-tuned BERT models, then applies precise audio muting while maintaining video quality.

## 🎯 Project Overview

This system captures live audio-video streams, transcribes speech in real-time using Whisper ASR, detects offensive language with BERT transformers, and streams censored content via UDP with minimal latency (<3 seconds end-to-end).

### Key Features

- ✅ **Real-time Speech Recognition** - faster-whisper with word-level timestamps
- ✅ **Hybrid Profanity Detection** - Keyword matching + fine-tuned BERT transformer
- ✅ **Word-Level Censorship** - Precise audio muting (±50ms safety padding)
- ✅ **Live UDP Streaming** - MPEG-TS format for VLC/media player compatibility
- ✅ **Structured Metadata** - JSON output with timestamps and confidence scores
- ✅ **GPU Acceleration** - CUDA support for faster BERT inference
- ✅ **Windows Compatible** - DirectShow camera/microphone integration

## 📋 Table of Contents

- [System Architecture](#system-architecture)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Usage](#usage)
- [Configuration](#configuration)
- [Output Format](#output-format)
- [Performance](#performance)
- [Troubleshooting](#troubleshooting)
- [Project Structure](#project-structure)
- [License](#license)

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         INPUT CAPTURE LAYER                         │
│  ┌─────────────────────┐          ┌─────────────────────┐          │
│  │  Microphone/Audio   │          │   Webcam/Video      │          │
│  │   (FFmpeg dshow)    │          │   Frames (FFmpeg)   │          │
│  └──────────┬──────────┘          └──────────┬──────────┘          │
│             └─────────────┬─────────────────┘                       │
│                           ▼                                         │
│                  ┌────────────────────┐                             │
│                  │   Media Decoder    │                             │
│                  └─────────┬──────────┘                             │
└──────────────────────────┼─────────────────────────────────────────┘
                            │
            ┌───────────────┴───────────────┐
            ▼                               ▼
┌─────────────────────────┐    ┌─────────────────────────┐
│   AUDIO PROCESSING      │    │   VIDEO PROCESSING      │
│                         │    │                         │
│  1. Whisper ASR         │    │  1. Frame Buffering     │
│  2. BERT Detection      │    │  2. Timestamp Sync      │
│  3. Audio Censorship    │    │                         │
└───────────┬─────────────┘    └───────────┬─────────────┘
            │                               │
            └───────────────┬───────────────┘
                            ▼
            ┌───────────────────────────────┐
            │  SYNCHRONIZATION & DISPLAY    │
            │                               │
            │  1. Audio-Video Mixer         │
            │  2. UDP Streaming (MPEG-TS)   │
            │  3. Local Display Engine      │
            └───────────────┬───────────────┘
                            ▼
                    Censored Live Feed
                   (VLC/Media Player)
```

### Processing Pipeline

1. **Capture** - FFmpeg captures audio (16kHz) and video (30fps) from devices
2. **Chunk** - 5-second segments with 1-second overlap to prevent word loss
3. **Transcribe** - Whisper ASR generates word-level timestamps
4. **Detect** - Keyword + BERT hybrid detection flags profane words
5. **Censor** - FFmpeg mutes flagged words (±50ms padding)
6. **Merge** - Censored audio replaces original in video (no re-encoding)
7. **Stream** - UDP broadcast in MPEG-TS format for real-time viewing

## 🚀 Installation

### Prerequisites

- **Python 3.8+** - [Download](https://www.python.org/downloads/)
- **FFmpeg** - Must be installed and in PATH
- **Webcam & Microphone** - For live capture
- **GPU (Optional)** - NVIDIA CUDA for faster BERT inference

### Step 1: Install FFmpeg

**Windows (Chocolatey):**
```bash
choco install ffmpeg
```

**Windows (Manual):**
1. Download from [https://www.gyan.dev/ffmpeg/builds/](https://www.gyan.dev/ffmpeg/builds/)
2. Extract to `C:\ffmpeg`
3. Add `C:\ffmpeg\bin` to System PATH
4. Restart terminal and verify: `ffmpeg -version`

**macOS:**
```bash
brew install ffmpeg
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get update
sudo apt-get install ffmpeg
```

### Step 2: Clone Repository

```bash
git clone https://github.com/yourusername/profanity-detection-pipeline.git
cd profanity-detection-pipeline
```

### Step 3: Create Virtual Environment

```bash
python -m venv venv

# Windows
venv\Scripts\activate

# macOS/Linux
source venv/bin/activate
```

### Step 4: Install Dependencies

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

**For GPU Support (NVIDIA CUDA 11.8):**
```bash
pip uninstall torch torchvision torchaudio
pip install torch==2.1.2+cu118 torchvision==0.16.2+cu118 torchaudio==2.1.2+cu118 --index-url https://download.pytorch.org/whl/cu118
```

### Step 5: Configure BERT Model

Edit `bert_profanity.py` line 21:

```python
# WRONG (Windows path issue):
MODEL_NAME = "C:\project\cleanvid-offensive-detector"

# CORRECT (use raw string):
MODEL_NAME = r"C:\project\cleanvid-offensive-detector"

# Or use forward slashes:
MODEL_NAME = "C:/project/cleanvid-offensive-detector"
```

### Step 6: Configure Camera/Microphone (Windows)

Find your device names:
```bash
ffmpeg -list_devices true -f dshow -i dummy
```

Edit `recorder.py` line 443 with your device names:
```python
'-i', 'video=YOUR_CAMERA_NAME:audio=YOUR_MICROPHONE_NAME',
```

## ⚡ Quick Start

### Automated Setup (Windows)

```bash
setup_windows.bat
```

This script will:
- Check Python and FFmpeg installation
- Create virtual environment
- Install all dependencies
- Verify installation

### Manual Start

```bash
# Activate environment
venv\Scripts\activate  # Windows
source venv/bin/activate  # macOS/Linux

# Run pipeline
python main.py
```

### View the Stream

**Using VLC Media Player:**
1. Open VLC
2. Media → Open Network Stream (Ctrl+N)
3. Enter: `udp://@127.0.0.1:1234`
4. Set caching to 1000-3000ms
5. Click Play

**Using FFplay:**
```bash
ffplay udp://127.0.0.1:1234
```

## 📖 Usage

### Basic Operation

```bash
python main.py
```

**Workflow:**
1. Press ENTER to start
2. Recording begins immediately
3. Transcription runs in background
4. Streaming auto-starts after 2 seconds
5. Press Ctrl+C to stop

### Configuration Options

Edit `main.py` (lines 215-221):

```python
pipeline = LiveStreamingPipeline(
    chunks_dir="chunks",        # Output directory
    chunk_duration=5,           # Seconds per chunk (3-10 recommended)
    overlap=1.0,                # Overlap in seconds (0.5-2.0)
    udp_port=1234              # UDP streaming port
)
```

### Profanity Detection Settings

Edit `recorder.py` (line 294):

```python
keyword_profs, bert_profs, merged_profs = detect_all_profanities(
    all_words,
    use_bert=True,              # Enable/disable BERT
    bert_threshold=0.8          # Confidence threshold (0.5-0.95)
)
```

**Threshold Guide:**
- `0.5` - Very sensitive (more false positives)
- `0.8` - Balanced (recommended)
- `0.95` - Very strict (may miss some profanities)

### Customize Profanity List

Edit `profanity_filter.py` (lines 24-40):

```python
PROFANITY_LIST = {
    "fuck", "fucking", "fucked",
    "shit", "shits",
    # Add your words here
    "custom_word1",
    "custom_word2",
}
```

### Adjust Safety Padding

Edit `profanity_filter.py` (line 91):

```python
SAFETY_PADDING = 0.05  # 50ms (default)
# SAFETY_PADDING = 0.03  # 30ms (minimal)
# SAFETY_PADDING = 0.10  # 100ms (aggressive)
```

## 📊 Output Format

### File Structure

```
chunks/
├── chunk_00001.mp4              # Original recording
├── chunk_00001.wav              # Extracted audio (16kHz)
├── chunk_00001.json             # Metadata with timestamps
├── chunk_00001_censored.mp4     # Censored version (streamed)
├── chunk_00002.mp4
├── chunk_00002.wav
├── chunk_00002.json
├── chunk_00002_censored.mp4
└── ...
```

### JSON Metadata Format

```json
{
  "chunk_number": 1,
  "chunk_duration": 5.2,
  "transcript": "hello this shit is damn good",
  "word_count": 5,
  "words": [
    {"word": "hello", "start": 0.0, "end": 0.3, "probability": 0.95},
    {"word": "this", "start": 0.4, "end": 0.6, "probability": 0.98},
    {"word": "shit", "start": 1.2, "end": 1.5, "probability": 0.96},
    {"word": "is", "start": 1.6, "end": 1.8, "probability": 0.97},
    {"word": "damn", "start": 2.0, "end": 2.3, "probability": 0.94}
  ],
  "profanities_detected": true,
  "profanity_count": 2,
  "profane_words": ["shit", "damn"],
  "bert_word_profanities_detected": true,
  "bert_word_profanity_count": 2,
  "bert_word_profanity_spans": [
    {"start": 1.2, "end": 1.5, "confidence": 0.95},
    {"start": 2.0, "end": 2.3, "confidence": 0.88}
  ],
  "merged_profanity_spans": [
    {"start": 1.15, "end": 1.55, "source": "keyword+bert"},
    {"start": 1.95, "end": 2.35, "source": "keyword+bert"}
  ],
  "status": "censored"
}
```

## ⚙️ Configuration

### System Settings

| Parameter | Default | Range | Description |
|-----------|---------|-------|-------------|
| Chunk Duration | 5s | 3-10s | Length of each video segment |
| Overlap | 1s | 0.5-2s | Overlap to prevent word loss |
| Audio Sample Rate | 16kHz | Fixed | Whisper model requirement |
| Video Frame Rate | 30fps | 15-60fps | Camera-dependent |
| BERT Threshold | 0.8 | 0.5-0.95 | Offensive word confidence |
| Safety Padding | 50ms | 20-100ms | Timestamp buffer |
| UDP Port | 1234 | 1024-65535 | Streaming port |

### Model Configuration

**Whisper Settings** (`recorder.py` line 232):
```python
segments, info = self.whisper_model.transcribe(
    audio_file,
    language="en",          # Language code
    beam_size=5,            # Search width (1-10)
    temperature=0.0,        # Randomness (0.0 = deterministic)
    word_timestamps=True    # MUST be True
)
```

**BERT Settings** (`bert_profanity.py` line 21):
```python
MODEL_NAME = r"C:\path\to\model"  # Local path
# Or HuggingFace model:
# MODEL_NAME = "username/model-name"
```

## 🔧 Performance

### Benchmarks (5-second chunks)

| Component | CPU (i7-8700) | GPU (RTX 3060) |
|-----------|---------------|----------------|
| Video Capture | ~0.1s | ~0.1s |
| Audio Extraction | ~0.5s | ~0.5s |
| Whisper ASR | ~2-3s | ~1-2s |
| Keyword Detection | ~0.01s | ~0.01s |
| BERT Inference | ~0.5s | ~0.1s |
| Audio Censorship | ~1s | ~1s |
| Video Merge | ~0.5s | ~0.5s |
| **Total Latency** | **~5-7s** | **~3-5s** |

### Optimization Tips

**For Faster Transcription:**
- Use smaller Whisper model (`tiny` or `base`)
- Enable GPU acceleration
- Reduce chunk duration to 3 seconds

**For Faster BERT:**
- Use GPU (CUDA)
- Lower threshold to reduce processing
- Use quantized model (int8/float16)

**For Lower Latency:**
- Reduce chunk duration to 3 seconds
- Reduce overlap to 0.5 seconds
- Disable BERT (keyword-only mode)

## 🐛 Troubleshooting

### Common Issues

#### 1. "FFmpeg not found"
```bash
# Solution: Install FFmpeg and add to PATH
ffmpeg -version  # Verify installation
```

#### 2. "BERT model loading failed"
```python
# Solution: Fix Windows path in bert_profanity.py
MODEL_NAME = r"C:\project\cleanvid-offensive-detector"  # Use raw string
```

#### 3. "Camera/Microphone not found"
```bash
# Solution: List devices and update recorder.py
ffmpeg -list_devices true -f dshow -i dummy
```

#### 4. "No video in VLC"
- Increase caching to 3000ms in VLC settings
- Wait 5-10 seconds after stream starts
- Check if `_censored.mp4` files are being created
- Try restarting VLC

#### 5. "CUDA out of memory"
```bash
# Solution: Use CPU version
pip install torch --index-url https://download.pytorch.org/whl/cpu
```

#### 6. "SyntaxError: (unicode error) 'unicodeescape'"
```python
# Solution: Use raw string for Windows paths
MODEL_NAME = r"C:\path\to\model"  # Correct
# NOT: MODEL_NAME = "C:\path\to\model"  # Wrong
```

### Debug Mode

Enable verbose logging in `recorder.py`:
```python
# Add at top of file
import logging
logging.basicConfig(level=logging.DEBUG)
```

### Check Logs

```bash
# View real-time logs
python main.py 2>&1 | tee pipeline.log
```

## 📁 Project Structure

```
profanity-detection-pipeline/
├── main.py                          # Main orchestrator
├── recorder.py                      # Recording + transcription + finalization
├── streamer.py                      # UDP streaming (MPEG-TS)
├── profanity_filter.py              # Keyword + BERT detection + censorship
├── bert_profanity.py                # BERT word-level classifier
├── requirements.txt                 # Python dependencies
├── setup_windows.bat                # Automated setup script
├── README.md                        # This file
├── CRITICAL_FIX_WINDOWS.md          # Windows path fix guide
├── chunks/                          # Output directory (auto-created)
│   ├── chunk_00001.mp4
│   ├── chunk_00001.wav
│   ├── chunk_00001.json
│   └── chunk_00001_censored.mp4
└── models/                          # BERT model directory
    └── cleanvid-offensive-detector/
        ├── config.json
        ├── pytorch_model.bin
        └── ...
```


## 📚 References

1. **faster-whisper** - [https://github.com/guillaumekln/faster-whisper](https://github.com/guillaumekln/faster-whisper)
2. **OpenAI Whisper** - [https://github.com/openai/whisper](https://github.com/openai/whisper)
3. **BERT** - Devlin et al. (2018) - "BERT: Pre-training of Deep Bidirectional Transformers"
4. **PyTorch** - [https://pytorch.org/](https://pytorch.org/)
5. **Transformers (HuggingFace)** - [https://huggingface.co/transformers/](https://huggingface.co/transformers/)
6. **FFmpeg** - [https://ffmpeg.org/](https://ffmpeg.org/)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 🙏 Acknowledgments

- OpenAI for the Whisper ASR model
- HuggingFace for the Transformers library
- FFmpeg team for multimedia processing tools
- Guillaume Klein for faster-whisper implementation


**⭐ If you find this project useful, please consider giving it a star!**

---

*Last Updated: January 2026*
