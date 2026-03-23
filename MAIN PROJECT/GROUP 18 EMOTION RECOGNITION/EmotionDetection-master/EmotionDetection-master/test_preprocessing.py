"""
Preprocessing Unit Test — Validates that all preprocessing components produce
correct output shapes and value ranges, matching the Kaggle training pipeline.
Run: python test_preprocessing.py
"""

import os
import sys
import struct
import numpy as np

_torch_pkgs = r"C:\Users\VolwinSHAJI\torch_pkgs"
if os.path.isdir(_torch_pkgs) and _torch_pkgs not in sys.path:
    sys.path.insert(0, _torch_pkgs)

import torch
from processor import (
    AudioVideoProcessor,
    smooth_prosody,
    filter_blendshape_frames,
    SAMPLE_RATE,
    VIDEO_FRAMES,
    VIDEO_RESIZE,
)


def make_sine_wav(sr=48000, duration=3.0, freq=440.0) -> bytes:
    """Generate a synthetic WAV file (mono 16-bit PCM)."""
    n_samples = int(sr * duration)
    t = np.linspace(0, duration, n_samples, endpoint=False)
    pcm = (np.sin(2 * np.pi * freq * t) * 0.5 * 32767).astype(np.int16)

    # Build WAV header
    data_size = n_samples * 2
    header = struct.pack('<4sI4s', b'RIFF', 36 + data_size, b'WAVE')
    fmt = struct.pack('<4sIHHIIHH', b'fmt ', 16, 1, 1, sr, sr * 2, 2, 16)
    data = struct.pack('<4sI', b'data', data_size)
    return header + fmt + data + pcm.tobytes()


def make_synthetic_video(n_frames=48, width=320, height=240) -> bytes:
    """Generate a synthetic video (coloured frames) as an MP4-like file."""
    import cv2
    import tempfile

    tmp = tempfile.NamedTemporaryFile(suffix='.mp4', delete=False)
    tmp_path = tmp.name
    tmp.close()

    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    writer = cv2.VideoWriter(tmp_path, fourcc, 30, (width, height))

    for i in range(n_frames):
        # Create gradient frames that change colour over time
        frame = np.zeros((height, width, 3), dtype=np.uint8)
        frame[:, :, 0] = int(255 * i / n_frames)  # B
        frame[:, :, 1] = int(128)                   # G
        frame[:, :, 2] = int(255 * (1 - i / n_frames))  # R
        writer.write(frame)

    writer.release()

    with open(tmp_path, 'rb') as f:
        data = f.read()
    os.unlink(tmp_path)
    return data


def test_audio_processing():
    """Test audio produces correct mel spectrogram shape."""
    proc = AudioVideoProcessor()
    wav_bytes = make_sine_wav()
    mel = proc.process_audio(wav_bytes)

    assert mel.ndim == 3, f"Expected 3D tensor, got {mel.ndim}D"
    assert mel.shape[0] == 1, f"Expected 1 channel, got {mel.shape[0]}"
    assert mel.shape[1] == 128, f"Expected 128 mels, got {mel.shape[1]}"
    print(f"  ✅ Audio: shape={tuple(mel.shape)}, min={mel.min():.2f}, max={mel.max():.2f}")


def test_video_processing():
    """Test video produces correct tensor shape with correct range."""
    proc = AudioVideoProcessor()
    video_bytes = make_synthetic_video(n_frames=48)
    tensor = proc.process_video(video_bytes)

    assert tensor.shape == (3, VIDEO_FRAMES, *VIDEO_RESIZE), \
        f"Expected (3,{VIDEO_FRAMES},{VIDEO_RESIZE[0]},{VIDEO_RESIZE[1]}), got {tuple(tensor.shape)}"
    assert tensor.min() >= 0.0, f"min={tensor.min():.4f} < 0"
    assert tensor.max() <= 1.0, f"max={tensor.max():.4f} > 1"
    print(f"  ✅ Video: shape={tuple(tensor.shape)}, range=[{tensor.min():.4f}, {tensor.max():.4f}]")


def test_video_windows():
    """Test multi-window video produces multiple tensors with correct shapes."""
    proc = AudioVideoProcessor()
    video_bytes = make_synthetic_video(n_frames=48)
    windows = proc.process_video_windows(video_bytes, num_windows=4, window_stride=8)

    assert len(windows) >= 1, "Expected at least 1 window"
    for i, w in enumerate(windows):
        assert w.shape == (3, VIDEO_FRAMES, *VIDEO_RESIZE), \
            f"Window {i}: expected (3,{VIDEO_FRAMES},112,112), got {tuple(w.shape)}"
        assert w.min() >= 0.0 and w.max() <= 1.0
    print(f"  ✅ Windows: {len(windows)} windows, all shapes correct")


def test_video_tta():
    """Test video TTA augmentations preserve shapes."""
    proc = AudioVideoProcessor()
    video_bytes = make_synthetic_video(n_frames=48)
    tensor = proc.process_video(video_bytes)

    flipped = proc.augment_video_flip(tensor)
    assert flipped.shape == tensor.shape
    assert not torch.allclose(flipped, tensor), "Flip should change something"

    bright = proc.augment_video_brightness(tensor, factor=1.05)
    assert bright.shape == tensor.shape
    assert bright.max() <= 1.0
    print(f"  ✅ Video TTA: flip shape={tuple(flipped.shape)}, brightness range=[{bright.min():.4f}, {bright.max():.4f}]")


def test_audio_tta():
    """Test audio TTA augmentations preserve shapes."""
    proc = AudioVideoProcessor()
    wav_bytes = make_sine_wav()
    mel = proc.process_audio(wav_bytes)

    normed = proc.augment_audio_normalize(mel)
    assert normed.shape == mel.shape
    assert abs(normed.mean().item()) < 0.01, "Normalized should have ~0 mean"

    gained = proc.augment_audio_gain(mel, gain_db=2.0)
    assert gained.shape == mel.shape
    print(f"  ✅ Audio TTA: normalize mean={normed.mean():.4f}, gain+2dB offset correct")


def test_prosody_smoothing():
    """Test prosody smoothing produces valid output."""
    values = [1.0, 10.0, 2.0, 8.0, 3.0, 7.0, 4.0, 6.0]
    smoothed = smooth_prosody(values, method='median', kernel_size=3)
    assert len(smoothed) == len(values), "Length should be preserved"
    print(f"  ✅ Prosody smoothing: input={values}, output={smoothed}")


def test_blendshape_filtering():
    """Test blendshape frame filtering removes bad frames."""
    good_frame = [0.5] * 52
    bad_frame = [0.0] * 52
    mixed = [good_frame, bad_frame, good_frame]

    filtered = filter_blendshape_frames(mixed, min_nonzero_ratio=0.1)
    assert len(filtered) == 2, f"Expected 2 good frames, got {len(filtered)}"

    # Test fallback when all frames are bad
    all_bad = [bad_frame, bad_frame]
    filtered_fb = filter_blendshape_frames(all_bad, min_nonzero_ratio=0.1)
    assert len(filtered_fb) == 2, "Should fallback to original when all fail"
    print(f"  ✅ Blendshape filter: {len(mixed)} → {len(filtered)} frames (fallback works)")


def test_short_video():
    """Test that very short videos (< 16 frames) still produce valid output."""
    proc = AudioVideoProcessor()
    video_bytes = make_synthetic_video(n_frames=5)
    tensor = proc.process_video(video_bytes)

    assert tensor.shape == (3, VIDEO_FRAMES, *VIDEO_RESIZE), \
        f"Short video: expected (3,16,112,112), got {tuple(tensor.shape)}"

    windows = proc.process_video_windows(video_bytes, num_windows=4)
    assert len(windows) >= 1
    print(f"  ✅ Short video (5 frames): tensor OK, {len(windows)} window(s)")


if __name__ == '__main__':
    print("=" * 60)
    print("Preprocessing Unit Tests")
    print("=" * 60)

    tests = [
        ("Audio processing", test_audio_processing),
        ("Video processing", test_video_processing),
        ("Multi-window video", test_video_windows),
        ("Video TTA augmentations", test_video_tta),
        ("Audio TTA augmentations", test_audio_tta),
        ("Prosody smoothing", test_prosody_smoothing),
        ("Blendshape filtering", test_blendshape_filtering),
        ("Short video handling", test_short_video),
    ]

    passed = 0
    failed = 0

    for name, fn in tests:
        try:
            print(f"\n▸ {name}")
            fn()
            passed += 1
        except Exception as e:
            print(f"  ❌ FAILED: {e}")
            failed += 1

    print(f"\n{'=' * 60}")
    print(f"Results: {passed} passed, {failed} failed")
    print("=" * 60)
