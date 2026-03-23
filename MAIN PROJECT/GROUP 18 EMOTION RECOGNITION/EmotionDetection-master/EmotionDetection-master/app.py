"""
FastAPI Inference Server — Multimodal Emotion Recognition
Serves the ImprovedHybridProjectionFusionLLM model.
Includes /predict_stable for temporal ensemble + TTA.
Launch:  uvicorn app:app --host 0.0.0.0 --port 8000
"""

import os
os.environ["TOKENIZERS_PARALLELISM"] = "false"

import sys
import json
import time
import warnings
warnings.filterwarnings("ignore", category=UserWarning)
warnings.filterwarnings("ignore", category=FutureWarning)

_torch_pkgs = r"C:\Users\VolwinSHAJI\torch_pkgs"
if os.path.isdir(_torch_pkgs) and _torch_pkgs not in sys.path:
    sys.path.insert(0, _torch_pkgs)

import numpy as np
import torch
import torch.nn.functional as F
from fastapi import FastAPI, UploadFile, File, Form, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import uvicorn

from model import ImprovedHybridProjectionFusionLLM
from processor import (
    AudioVideoProcessor,
    extract_blendshapes_live,
    extract_prosody_live,
    smooth_prosody,
    EMOTION_CLASSES,
)

# ── Paths ────────────────────────────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = r"C:\Users\VolwinSHAJI\Downloads\best_improved_hybrid_model.pth"
LANDMARKER_PATH = os.path.join(BASE_DIR, "face_landmarker.task")

_cols_path = os.path.join(BASE_DIR, "cols_utf8.json")
_pros_path = os.path.join(BASE_DIR, "prosody_utf8.json")

with open(_cols_path, "r", encoding="utf-8") as f:
    BLENDSHAPE_COLS = json.load(f)
with open(_pros_path, "r", encoding="utf-8") as f:
    PROSODY_COLS = json.load(f)

NUM_CLASSES = 8
DEEP_FEATURE_DIM = 256
DROPOUT = 0.3          # same as training main()

# ── FastAPI app ──────────────────────────────────────────────────────────────
app = FastAPI(
    title="Multimodal Emotion Recognition API",
    description="Serves ImprovedHybridProjectionFusionLLM — raw + stable predictions.",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

STATIC_DIR = os.path.join(BASE_DIR, "static")
os.makedirs(STATIC_DIR, exist_ok=True)
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

# ── Global state ─────────────────────────────────────────────────────────────
model: ImprovedHybridProjectionFusionLLM = None
device: torch.device = None
av_processor: AudioVideoProcessor = None
mp_landmarker = None

@app.on_event("startup")
def load_model():
    global model, device, av_processor, mp_landmarker
    import mediapipe as mp
    from mediapipe.tasks import python as mp_python
    from mediapipe.tasks.python import vision

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"🖥️  Device: {device}")

    print("🧠 Building model...")
    model = ImprovedHybridProjectionFusionLLM(
        num_classes=NUM_CLASSES,
        deep_feature_dim=DEEP_FEATURE_DIM,
        num_blendshapes=len(BLENDSHAPE_COLS),   # 204
        num_prosody=len(PROSODY_COLS),           # 8
        pretrained_model_path=None,
        dropout=DROPOUT,
        freeze_deep=True,
        freeze_llm_layers=4,
    )

    print(f"⚡ Loading weights from {MODEL_PATH} ...")
    checkpoint = torch.load(MODEL_PATH, map_location=device)
    model.load_state_dict(checkpoint["model_state_dict"])
    model.to(device)
    model.eval()

    val_acc = checkpoint.get("val_acc", "N/A")
    print(f"✅ Model loaded  (val_acc={val_acc})")

    av_processor = AudioVideoProcessor()
    
    # Init global landmarker to prevent ntdll.dll crashes on repeated init/close
    base_options = mp_python.BaseOptions(model_asset_path=LANDMARKER_PATH)
    options = vision.FaceLandmarkerOptions(
        base_options=base_options, output_face_blendshapes=True, num_faces=1)
    mp_landmarker = vision.FaceLandmarker.create_from_options(options)
    print("✅ MediaPipe FaceLandmarker loaded globally.")

@app.on_event("shutdown")
def shutdown_event():
    global mp_landmarker
    # Deliberately skipping mp_landmarker.close() to avoid Windows ntdll.dll thread destruction segfaults
    pass
    print(f"✅ Processor ready. Blendshapes={len(BLENDSHAPE_COLS)}, Prosody={len(PROSODY_COLS)}")
    print("✅ Server ready — http://localhost:8000/app")


# ── Endpoints ────────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {
        "service": "Multimodal Emotion Recognition API",
        "status": "running",
        "emotion_classes": EMOTION_CLASSES,
        "features": {
            "blendshapes": len(BLENDSHAPE_COLS),
            "prosody": len(PROSODY_COLS),
        },
        "endpoints": ["/predict", "/predict_realtime", "/predict_stable"],
    }


@app.get("/feature_info")
def feature_info():
    return {
        "blendshape_cols": BLENDSHAPE_COLS,
        "prosody_cols": PROSODY_COLS,
        "num_blendshapes": len(BLENDSHAPE_COLS),
        "num_prosody": len(PROSODY_COLS),
    }


@app.post("/predict")
async def predict(
    audio_file: UploadFile = File(...),
    video_file: UploadFile = File(...),
    blendshapes: str = Form(...),
    prosody: str = Form(...),
    context_text: str = Form(""),
):
    """Inference with pre-extracted features."""
    audio_bytes = await audio_file.read()
    video_bytes = await video_file.read()

    blend_values = json.loads(blendshapes)
    prosody_values = json.loads(prosody)

    if len(blend_values) != len(BLENDSHAPE_COLS):
        return {"error": f"Expected {len(BLENDSHAPE_COLS)} blendshapes, got {len(blend_values)}"}
    if len(prosody_values) != len(PROSODY_COLS):
        return {"error": f"Expected {len(PROSODY_COLS)} prosody, got {len(prosody_values)}"}

    audio_spec = av_processor.process_audio(audio_bytes)
    video_tensor = av_processor.process_video(video_bytes)

    blend_t = torch.tensor(blend_values, dtype=torch.float32)
    pros_t = torch.tensor(prosody_values, dtype=torch.float32)

    audio_spec = audio_spec.unsqueeze(0).to(device)
    video_tensor = video_tensor.unsqueeze(0).to(device)
    blend_t = blend_t.unsqueeze(0).to(device)
    pros_t = pros_t.unsqueeze(0).to(device)
    text_input = [context_text or ""]

    with torch.no_grad():
        outputs = model(audio_spec, video_tensor, blend_t, pros_t, text_input, training=False)
        probs = F.softmax(outputs, dim=1)[0].cpu().numpy()
        pred_idx = int(outputs.argmax(1).item())

    return {
        "predicted_emotion": EMOTION_CLASSES[pred_idx],
        "predicted_index": pred_idx,
        "confidence": float(probs[pred_idx]),
        "probabilities": {e: float(probs[i]) for i, e in enumerate(EMOTION_CLASSES)},
    }


@app.post("/predict_realtime")
async def predict_realtime(
    audio_file: UploadFile = File(...),
    video_file: UploadFile = File(...),
    context_text: str = Form(""),
):
    """
    Inference with LIVE feature extraction.
    Frontend sends audio (WAV) + video; backend extracts
    blendshapes via MediaPipe and prosody via OpenSMILE.
    """
    audio_bytes = await audio_file.read()
    video_bytes = await video_file.read()

    # Preprocess audio & video (Kaggle pipeline)
    audio_spec = av_processor.process_audio(audio_bytes)
    video_tensor = av_processor.process_video(video_bytes)

    # Extract live features
    blend_values = extract_blendshapes_live(video_bytes, BLENDSHAPE_COLS, mp_landmarker)
    prosody_values = extract_prosody_live(audio_bytes, PROSODY_COLS)

    # NaN → 0  (matches training fillna(0), NO z-score)
    blend_values = [0.0 if (v != v) else v for v in blend_values]
    prosody_values = [0.0 if (v != v) else v for v in prosody_values]

    blend_t = torch.tensor(blend_values, dtype=torch.float32)
    pros_t = torch.tensor(prosody_values, dtype=torch.float32)

    audio_spec = audio_spec.unsqueeze(0).to(device)
    video_tensor = video_tensor.unsqueeze(0).to(device)
    blend_t = blend_t.unsqueeze(0).to(device)
    pros_t = pros_t.unsqueeze(0).to(device)
    text_input = [context_text or ""]

    # Check if any face was detected
    if sum(blend_values) == 0.0:
        pred_idx = -1
        probs = np.zeros(NUM_CLASSES)
    else:
        with torch.no_grad():
            outputs = model(audio_spec, video_tensor, blend_t, pros_t,
                            text_input, training=False)
            probs = F.softmax(outputs, dim=1)[0].cpu().numpy()
            pred_idx = int(outputs.argmax(1).item())

    return {
        "predicted_emotion": "no face" if pred_idx == -1 else EMOTION_CLASSES[pred_idx],
        "predicted_index": pred_idx,
        "confidence": 0.0 if pred_idx == -1 else float(probs[pred_idx]),
        "probabilities": {e: float(probs[i]) for i, e in enumerate(EMOTION_CLASSES)},
    }


# ── Stable Prediction (Temporal Ensemble + TTA) ─────────────────────────────

@app.post("/predict_stable")
async def predict_stable(
    audio_file: UploadFile = File(...),
    video_file: UploadFile = File(...),
    context_text: str = Form(""),
    enable_tta: bool = Form(True),
    num_windows: int = Form(4),
):
    """
    Stabilized inference with temporal ensemble + test-time augmentation.

    Runs the model across multiple overlapping video windows and optional
    augmentations (video flip/brightness, audio normalize/gain), then
    averages all softmax probabilities for a more robust prediction.

    Up to num_windows × 3 (video augs) × 3 (audio augs) = 36 forward passes.
    With TTA disabled: num_windows forward passes.
    """
    t_start = time.time()

    audio_bytes = await audio_file.read()
    video_bytes = await video_file.read()

    # ── 1. Process audio (single pass — audio is the same across windows) ──
    audio_spec_original = av_processor.process_audio(audio_bytes)

    # Build list of audio variants
    if enable_tta:
        audio_variants = [
            ("original", audio_spec_original),
            ("normalized", av_processor.augment_audio_normalize(audio_spec_original)),
            ("gain+2dB", av_processor.augment_audio_gain(audio_spec_original, gain_db=2.0)),
        ]
    else:
        audio_variants = [("original", audio_spec_original)]

    # ── 2. Process video windows (temporal ensemble) ──
    video_windows = av_processor.process_video_windows(
        video_bytes, num_windows=num_windows, window_stride=8
    )

    # Build list of video variants per window
    def get_video_variants(video_tensor):
        if enable_tta:
            return [
                ("original", video_tensor),
                ("hflip", av_processor.augment_video_flip(video_tensor)),
                ("bright", av_processor.augment_video_brightness(video_tensor, factor=1.05)),
            ]
        return [("original", video_tensor)]

    # ── 3. Extract live features (once) ──
    blend_values = extract_blendshapes_live(video_bytes, BLENDSHAPE_COLS, mp_landmarker)
    prosody_values = extract_prosody_live(audio_bytes, PROSODY_COLS)

    # Apply optional prosody smoothing
    prosody_values = smooth_prosody(prosody_values, method='median')

    # NaN → 0 (matches training fillna(0), NO z-score)
    blend_values = [0.0 if (v != v) else v for v in blend_values]
    prosody_values = [0.0 if (v != v) else v for v in prosody_values]

    # Check if any face was detected
    if sum(blend_values) == 0.0:
        return {
            "predicted_emotion": "no face",
            "predicted_index": -1,
            "confidence": 0.0,
            "probabilities": {e: 0.0 for e in EMOTION_CLASSES},
            "num_passes": 0,
            "num_windows": 0,
            "tta_enabled": enable_tta,
            "elapsed_seconds": round(time.time() - t_start, 3),
        }

    blend_t = torch.tensor(blend_values, dtype=torch.float32).unsqueeze(0).to(device)
    pros_t = torch.tensor(prosody_values, dtype=torch.float32).unsqueeze(0).to(device)
    text_input = [context_text or ""]

    # ── 4. Run all combinations ──
    all_probs = []

    with torch.no_grad():
        for w_idx, video_tensor in enumerate(video_windows):
            video_variants = get_video_variants(video_tensor)

            for v_name, v_tensor in video_variants:
                v_batch = v_tensor.unsqueeze(0).to(device)

                for a_name, a_spec in audio_variants:
                    a_batch = a_spec.unsqueeze(0).to(device)

                    outputs = model(a_batch, v_batch, blend_t, pros_t,
                                    text_input, training=False)
                    probs = F.softmax(outputs, dim=1)[0].cpu().numpy()
                    all_probs.append(probs)

    # ── 5. Average all probabilities ──
    stacked = np.stack(all_probs, axis=0)           # (N, 8)
    final_probs = np.mean(stacked, axis=0)          # (8,)
    pred_idx = int(np.argmax(final_probs))

    # Compute per-emotion std across passes (useful for diagnostics)
    prob_std = np.std(stacked, axis=0)

    elapsed = round(time.time() - t_start, 3)

    return {
        "predicted_emotion": EMOTION_CLASSES[pred_idx],
        "predicted_index": pred_idx,
        "confidence": float(final_probs[pred_idx]),
        "probabilities": {e: float(final_probs[i]) for i, e in enumerate(EMOTION_CLASSES)},
        "probability_std": {e: float(prob_std[i]) for i, e in enumerate(EMOTION_CLASSES)},
        "num_passes": len(all_probs),
        "num_windows": len(video_windows),
        "tta_enabled": enable_tta,
        "elapsed_seconds": elapsed,
    }


@app.get("/app")
async def serve_frontend():
    return FileResponse(os.path.join(STATIC_DIR, "index.html"))


# ── Entry point ──────────────────────────────────────────────────────────────
if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=False, log_level="info")
