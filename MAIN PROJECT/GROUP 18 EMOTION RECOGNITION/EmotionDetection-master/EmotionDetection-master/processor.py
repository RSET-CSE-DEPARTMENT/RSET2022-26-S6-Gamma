"""
Preprocessing & Live Feature Extraction
Matches the Kaggle notebook pipeline exactly:
- Audio: MelSpectrogram at 48kHz, 3s, n_fft=2048, hop=512, 128 mels
- Video: 16 uniform frames, 112x112, /255.0 only (NO Kinetics norm)
- Blendshapes: MediaPipe FaceLandmarker → 52 × 4 stats → keyword‑filter → sorted → 204
- Prosody: OpenSMILE eGeMAPSv02 Functionals → keyword‑filter → sorted → 8
- NaN → 0.0, NO z‑score normalization (matches training fillna(0))

Extended for inference stabilization:
- Multi-window video processing (temporal ensemble)
- Test-time augmentation (video flip/brightness, audio normalize/gain)
- Prosody median smoothing
- Blendshape face-detection quality filtering
"""

import os
import sys
import tempfile
import json
import numpy as np
import cv2
import torch
import torch.nn.functional as F
import soundfile as sf

_torch_pkgs = r"C:\Users\VolwinSHAJI\torch_pkgs"
if os.path.isdir(_torch_pkgs) and _torch_pkgs not in sys.path:
    sys.path.insert(0, _torch_pkgs)

import torchaudio
import mediapipe as mp
from mediapipe.tasks import python as mp_python
from mediapipe.tasks.python import vision
import opensmile

# ── Constants (must match training) ──────────────────────────────────────────
SAMPLE_RATE = 48000
AUDIO_DURATION = 3.0
N_FFT = 2048
HOP_LENGTH = 512
N_MELS = 128
F_MIN = 20
F_MAX = 8000

VIDEO_RESIZE = (112, 112)
VIDEO_FRAMES = 16

EMOTION_CLASSES = ['angry', 'calm', 'disgust', 'fearful',
                   'happy', 'neutral', 'sad', 'surprise']

# MediaPipe blendshape names (canonical order from MediaPipe)
MP_BLEND_NAMES = [
    "_neutral", "browDownLeft", "browDownRight", "browInnerUp", "browOuterUpLeft",
    "browOuterUpRight", "cheekPuff", "cheekSquintLeft", "cheekSquintRight",
    "eyeBlinkLeft", "eyeBlinkRight", "eyeLookDownLeft", "eyeLookDownRight",
    "eyeLookInLeft", "eyeLookInRight", "eyeLookOutLeft", "eyeLookOutRight",
    "eyeLookUpLeft", "eyeLookUpRight", "eyeSquintLeft", "eyeSquintRight",
    "eyeWideLeft", "eyeWideRight", "jawForward", "jawLeft", "jawOpen", "jawRight",
    "mouthClose", "mouthDimpleLeft", "mouthDimpleRight", "mouthFrownLeft",
    "mouthFrownRight", "mouthFunnel", "mouthLeft", "mouthLowerDownLeft",
    "mouthLowerDownRight", "mouthPressLeft", "mouthPressRight", "mouthPucker",
    "mouthRight", "mouthRollLower", "mouthRollUpper", "mouthShrugLower",
    "mouthShrugUpper", "mouthSmileLeft", "mouthSmileRight", "mouthStretchLeft",
    "mouthStretchRight", "mouthUpperUpLeft", "mouthUpperUpRight", "noseSneerLeft",
    "noseSneerRight"
]

# Keywords used in Kaggle to identify blendshape columns (case‑insensitive)
_BLEND_KEYWORDS = [
    'mouth', 'brow', 'eye', 'nose', 'cheek', 'jaw', 'smile', 'frown',
    'squint', 'blink', 'sneer', 'dimple', 'funnel', 'pucker', 'press',
    'stretch', 'shrug', 'roll', 'wide'
]

# Keywords used in Kaggle to identify prosody columns (case‑sensitive)
_PROSODY_KEYWORDS = [
    'F0', 'Sound', 'alpha', 'spectral', 'loudness', 'jitter', 'shimmer',
    'Flux', 'Ratio', 'Level', 'semitone'
]


# ── Audio / Video preprocessing ─────────────────────────────────────────────

class AudioVideoProcessor:
    """Replicates Kaggle _load_audio / _load_video exactly.
    Extended with multi-window and TTA support for stable inference."""

    def __init__(self):
        self.mel_transform = torchaudio.transforms.MelSpectrogram(
            sample_rate=SAMPLE_RATE, n_fft=N_FFT, hop_length=HOP_LENGTH,
            n_mels=N_MELS, f_min=F_MIN, f_max=F_MAX
        )
        self.amplitude_to_db = torchaudio.transforms.AmplitudeToDB()
        self.audio_length = int(SAMPLE_RATE * AUDIO_DURATION)

    # ── Core audio processing (unchanged from training) ──────────────────

    def process_audio(self, audio_bytes: bytes) -> torch.Tensor:
        """bytes → mel spectrogram tensor  (1, 128, T)"""
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp:
            tmp.write(audio_bytes)
            tmp_path = tmp.name

        try:
            data, sr = sf.read(tmp_path, dtype='float32')

            if data.ndim == 1:
                waveform = torch.from_numpy(data).unsqueeze(0)
            else:
                waveform = torch.from_numpy(data.T)

            if sr != SAMPLE_RATE:
                waveform = torchaudio.transforms.Resample(sr, SAMPLE_RATE)(waveform)

            if waveform.shape[0] > 1:
                waveform = waveform.mean(dim=0, keepdim=True)

            if waveform.shape[1] > self.audio_length:
                waveform = waveform[:, :self.audio_length]
            else:
                waveform = F.pad(waveform, (0, self.audio_length - waveform.shape[1]))

            mel_spec = self.mel_transform(waveform)
            return self.amplitude_to_db(mel_spec)          # (1, 128, T)
        finally:
            os.unlink(tmp_path)

    # ── Core video processing (unchanged from training) ──────────────────

    def process_video(self, video_bytes: bytes) -> torch.Tensor:
        """bytes → video tensor  (3, 16, 112, 112)    /255.0 only"""
        with tempfile.NamedTemporaryFile(suffix='.mp4', delete=False) as tmp:
            tmp.write(video_bytes)
            tmp_path = tmp.name

        try:
            cap = cv2.VideoCapture(tmp_path)
            frames = []
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

            if total_frames > VIDEO_FRAMES:
                indices = np.linspace(0, total_frames - 1, VIDEO_FRAMES, dtype=int)
            else:
                indices = np.pad(np.arange(max(total_frames, 1)),
                                 (0, VIDEO_FRAMES - max(total_frames, 1)), mode='wrap')

            for i in range(total_frames):
                ret, frame = cap.read()
                if not ret:
                    break
                if i in indices:
                    frame = cv2.resize(frame, VIDEO_RESIZE)
                    frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                    frames.append(frame)
            cap.release()

            if len(frames) == 0:
                frames = [np.zeros((*VIDEO_RESIZE, 3), dtype=np.uint8)
                          for _ in range(VIDEO_FRAMES)]

            buffer = np.array(frames)
            if len(buffer) < VIDEO_FRAMES:
                padding = np.tile(buffer[-1], (VIDEO_FRAMES - len(buffer), 1, 1, 1))
                buffer = np.concatenate((buffer, padding), axis=0)
            elif len(buffer) > VIDEO_FRAMES:
                buffer = buffer[:VIDEO_FRAMES]

            tensor = torch.from_numpy(buffer).float().permute(3, 0, 1, 2)
            return tensor / 255.0                           # (3, T, H, W)
        finally:
            os.unlink(tmp_path)

    # ── Multi-window video processing (temporal ensemble) ────────────────

    def process_video_windows(self, video_bytes: bytes,
                              num_windows: int = 4,
                              window_stride: int = 8) -> list[torch.Tensor]:
        """
        Extract multiple overlapping windows of VIDEO_FRAMES frames from a video.
        Each window is processed identically to process_video().

        Returns: list of tensors, each (3, 16, 112, 112).
        Falls back to a single window if the video is too short.
        """
        with tempfile.NamedTemporaryFile(suffix='.mp4', delete=False) as tmp:
            tmp.write(video_bytes)
            tmp_path = tmp.name

        try:
            cap = cv2.VideoCapture(tmp_path)
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

            # Read ALL frames from the video
            all_frames = []
            for _ in range(total_frames):
                ret, frame = cap.read()
                if not ret:
                    break
                frame = cv2.resize(frame, VIDEO_RESIZE)
                frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                all_frames.append(frame)
            cap.release()

            if len(all_frames) == 0:
                all_frames = [np.zeros((*VIDEO_RESIZE, 3), dtype=np.uint8)
                              for _ in range(VIDEO_FRAMES)]

            n_total = len(all_frames)

            # Determine window start indices
            # Windows: [0, stride, 2*stride, ...] up to num_windows
            window_starts = []
            for w in range(num_windows):
                start = w * window_stride
                # If start + VIDEO_FRAMES exceeds total, clamp/wrap
                if start >= n_total:
                    break
                window_starts.append(start)

            # If no valid windows, use a single one at start=0
            if not window_starts:
                window_starts = [0]

            tensors = []
            for start in window_starts:
                # Sample VIDEO_FRAMES uniform frames from [start, start+window_len)
                end = min(start + max(VIDEO_FRAMES, window_stride + VIDEO_FRAMES), n_total)
                window_frames_range = list(range(start, end))

                if len(window_frames_range) >= VIDEO_FRAMES:
                    indices = np.linspace(0, len(window_frames_range) - 1,
                                          VIDEO_FRAMES, dtype=int)
                    selected_indices = [window_frames_range[i] for i in indices]
                else:
                    # Pad by wrapping
                    selected_indices = window_frames_range.copy()
                    while len(selected_indices) < VIDEO_FRAMES:
                        selected_indices.append(window_frames_range[-1])

                frames = [all_frames[i] for i in selected_indices]
                buffer = np.array(frames[:VIDEO_FRAMES])
                tensor = torch.from_numpy(buffer).float().permute(3, 0, 1, 2)
                tensors.append(tensor / 255.0)  # (3, T, H, W)

            return tensors

        finally:
            os.unlink(tmp_path)

    # ── TTA: Video augmentations ─────────────────────────────────────────

    @staticmethod
    def augment_video_flip(video_tensor: torch.Tensor) -> torch.Tensor:
        """Horizontal flip of video tensor (3, T, H, W) → (3, T, H, W)."""
        return video_tensor.flip(dims=[-1])  # flip W dimension

    @staticmethod
    def augment_video_brightness(video_tensor: torch.Tensor,
                                  factor: float = 1.05) -> torch.Tensor:
        """Slight brightness adjustment. Clamp to [0, 1]."""
        return (video_tensor * factor).clamp(0.0, 1.0)

    # ── TTA: Audio augmentations ─────────────────────────────────────────

    @staticmethod
    def augment_audio_normalize(mel_spec: torch.Tensor) -> torch.Tensor:
        """
        Slight amplitude scaling instead of z-score.
        Z-score would destroy the [-80, 0] dB domain the model was trained on!
        """
        return (mel_spec * 0.95).clamp(-80.0, 0.0)

    @staticmethod
    def augment_audio_gain(mel_spec: torch.Tensor,
                           gain_db: float = 2.0) -> torch.Tensor:
        """Add a small dB gain offset to the spectrogram."""
        return mel_spec + gain_db


# ── Feature smoothing helpers ────────────────────────────────────────────────

def smooth_prosody(values: list, method: str = 'median',
                   kernel_size: int = 3) -> list:
    """
    Apply smoothing to prosody feature values (1-D filtering).
    Uses pure numpy to avoid requiring scipy dependency.
    """
    arr = np.array(values, dtype=np.float32)
    if len(arr) < kernel_size:
        return arr.tolist()

    pad = kernel_size // 2
    padded = np.pad(arr, (pad, pad), mode='edge')
    
    # Create sliding windows of size kernel_size
    shape = (arr.shape[0], kernel_size)
    strides = (padded.strides[0], padded.strides[0])
    windows = np.lib.stride_tricks.as_strided(padded, shape=shape, strides=strides)

    if method == 'median':
        smoothed = np.median(windows, axis=1)
    elif method == 'mean':
        smoothed = np.mean(windows, axis=1)
    else:
        smoothed = arr
        
    return smoothed.tolist()


def filter_blendshape_frames(per_frame_scores: list,
                              min_nonzero_ratio: float = 0.1) -> list:
    """
    Filter out frames where face detection likely failed.
    A frame with nearly all-zero blendshape scores indicates no face.

    Args:
        per_frame_scores: list of lists, each inner list is 52 blendshape scores
        min_nonzero_ratio: minimum fraction of non-zero scores to keep a frame

    Returns:
        Filtered list of frame scores (may be empty if all fail).
    """
    if not per_frame_scores:
        return per_frame_scores

    filtered = []
    n_features = len(per_frame_scores[0])
    threshold = n_features * min_nonzero_ratio

    for scores in per_frame_scores:
        nonzero_count = sum(1 for s in scores if abs(s) > 1e-6)
        if nonzero_count >= threshold:
            filtered.append(scores)

    return filtered if filtered else per_frame_scores  # fallback to original


# ── Live blendshape extraction ───────────────────────────────────────────────

def extract_blendshapes_live(video_bytes: bytes,
                             blendshape_cols: list,
                             landmarker) -> list:
    """
    MediaPipe FaceLandmarker → 52 scores/frame → max/mean/min/std
    → keyword‑filter → sorted → 204 floats in training column order.
    Uses the global landmarker provided by app.py.
    """
    with tempfile.NamedTemporaryFile(suffix='.mp4', delete=False) as tmp:
        tmp.write(video_bytes)
        tmp_path = tmp.name

    cap = None
    try:
        cap = cv2.VideoCapture(tmp_path)
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

        if total_frames <= 0:
            cap.release()
            return [0.0] * len(blendshape_cols)

        if total_frames > VIDEO_FRAMES:
            indices = set(np.linspace(0, total_frames - 1, VIDEO_FRAMES, dtype=int))
        else:
            indices = set(range(total_frames))

        per_frame_scores = []

        for i in range(total_frames):
            ret, frame = cap.read()
            if not ret:
                break
            if i in indices:
                rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
                result = landmarker.detect(mp_image)

                scores_dict = {}
                if result.face_blendshapes:
                    for cat in result.face_blendshapes[0]:
                        scores_dict[cat.category_name] = cat.score

                frame_scores = [scores_dict.get(name, 0.0) for name in MP_BLEND_NAMES]
                per_frame_scores.append(frame_scores)

        cap.release()

        if not per_frame_scores:
            return [0.0] * len(blendshape_cols)

        # Filter out frames where face detection failed
        per_frame_scores = filter_blendshape_frames(per_frame_scores)

        arr = np.array(per_frame_scores)           # (N, 52)
        s_max  = np.max(arr, axis=0)
        s_mean = np.mean(arr, axis=0)
        s_min  = np.min(arr, axis=0)
        s_std  = np.std(arr, axis=0)

        # Build stat→name→value lookup
        name_to_idx = {n: i for i, n in enumerate(MP_BLEND_NAMES)}
        features = np.zeros(len(blendshape_cols), dtype=np.float32)

        for i, col in enumerate(blendshape_cols):
            parts = col.split('_', 1)
            if len(parts) != 2:
                continue
            stat, base = parts
            idx = name_to_idx.get(base)
            if idx is None:
                continue
            if   stat == 'max':  features[i] = s_max[idx]
            elif stat == 'mean': features[i] = s_mean[idx]
            elif stat == 'min':  features[i] = s_min[idx]
            elif stat == 'std':  features[i] = s_std[idx]

        return features.tolist()

    finally:
        if cap is not None:
            cap.release()
        try:
            os.unlink(tmp_path)
        except OSError:
            pass


# ── Live prosody extraction ──────────────────────────────────────────────────

def extract_prosody_live(audio_bytes: bytes, prosody_cols: list) -> list:
    """
    OpenSMILE eGeMAPSv02 Functionals → keyword‑filter → sorted → 8 floats.
    """
    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp:
        tmp.write(audio_bytes)
        tmp_path = tmp.name

    try:
        data, sr = sf.read(tmp_path, dtype='float32')
        if data.ndim > 1:
            data = data.mean(axis=1)

        smile = opensmile.Smile(
            feature_set=opensmile.FeatureSet.eGeMAPSv02,
            feature_level=opensmile.FeatureLevel.Functionals)

        df = smile.process_signal(data, sr)

        prosody = np.array(
            [float(df[c].iloc[0]) if c in df.columns else 0.0 for c in prosody_cols],
            dtype=np.float32
        )
        return prosody.tolist()

    except Exception as e:
        print(f"⚠️  Prosody extraction failed: {e}")
        return [0.0] * len(prosody_cols)
    finally:
        os.unlink(tmp_path)
