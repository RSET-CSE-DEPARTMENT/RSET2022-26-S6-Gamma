# 🎭 Multimodal Emotion Recognition

A production-ready AI demo that detects human emotions from **audio + video + facial features + text context** using a custom deep learning model served via FastAPI.

## 🧠 Model Architecture

**`ImprovedHybridProjectionFusionLLM`** — a hybrid fusion model combining:

| Modality | Encoder | Output |
|---|---|---|
| Audio (mel-spectrogram) | ResNet-18 (2D) | 256-dim embedding |
| Video (frames) | R3D-18 (3D CNN) | 256-dim embedding |
| Facial blendshapes | MLP (204 features) | 64-dim embedding |
| Prosody features | MLP (8 features) | 64-dim embedding |
| Context text | DistilRoBERTa (LLM) | 768-dim CLS token |

All modalities are fused via a learned attention gate and classified into **8 emotion classes**.

## 📁 Project Structure

```
chat/
├── app.py                  # FastAPI server (main entry point)
├── model.py                # Model architecture definition
├── processor.py            # Audio/video preprocessing & feature extraction
├── cols_utf8.json          # Ordered blendshape feature column names
├── prosody_utf8.json       # Ordered prosody feature column names
├── face_landmarker.task    # MediaPipe face landmarker model file
├── static/
│   ├── index.html          # Frontend demo UI
│   └── style.css           # UI styles
└── test_preprocessing.py   # Preprocessing unit tests
```

## 🚀 Getting Started

### Prerequisites

- Python 3.9+
- PyTorch (with CUDA recommended)
- Trained model weights: `best_improved_hybrid_model.pth`

### Install Dependencies

```bash
pip install fastapi uvicorn torch torchvision torchaudio transformers mediapipe opensmile numpy
```

### Run the Server

```bash
uvicorn app:app --host 0.0.0.0 --port 8000
```

Then open **http://localhost:8000/app** in your browser.

## 🔌 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | Service info & available emotion classes |
| `GET` | `/app` | Serves the frontend demo UI |
| `GET` | `/feature_info` | Lists blendshape & prosody feature names |
| `POST` | `/predict` | Inference with pre-extracted features |
| `POST` | `/predict_realtime` | Inference with live feature extraction |
| `POST` | `/predict_stable` | Temporally ensembled + TTA inference |

### `/predict_stable` (Recommended)

The most accurate endpoint. Runs overlapping temporal windows across the full media duration and applies **Test-Time Augmentation (TTA)**:

- **Audio**: 3-second windows with 2-second hop
- **Video**: overlapping 16-frame windows
- **TTA**: flip, brightness jitter, gain adjustments
- **Result**: averaged probabilities across all passes

## 🎯 Emotion Classes

`angry` · `disgust` · `fear` · `happy` · `neutral` · `sad` · `surprise` · `contempt`

## ⚙️ Configuration

Key paths are set in `app.py`:

```python
MODEL_PATH     = r"C:\...\best_improved_hybrid_model.pth"
LANDMARKER_PATH = os.path.join(BASE_DIR, "face_landmarker.task")
```

Update `MODEL_PATH` to point to your trained weights file.

## 🧪 Testing

```bash
python test_preprocessing.py   # Audio/video preprocessing tests
python test_ensemble.py        # Ensemble prediction tests
```
