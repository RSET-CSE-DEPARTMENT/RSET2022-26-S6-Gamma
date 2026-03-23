"""
Ensemble / Stable Prediction Test — Verifies that the /predict_stable endpoint
gives identical outputs for identical inputs, and validates the multi-pass mechanism.
Run: python test_ensemble.py
"""

import os
import sys
import numpy as np

_torch_pkgs = r"C:\Users\VolwinSHAJI\torch_pkgs"
if os.path.isdir(_torch_pkgs) and _torch_pkgs not in sys.path:
    sys.path.insert(0, _torch_pkgs)

import torch
from fastapi.testclient import TestClient
from app import app
from test_preprocessing import make_sine_wav, make_synthetic_video


def test_endpoints():
    print("=" * 60)
    print("Ensemble Prediction Validation")
    print("=" * 60)

    wav_bytes = make_sine_wav()
    vid_bytes = make_synthetic_video(n_frames=48)

    with TestClient(app) as client:
        print("\n1. Testing Single-Pass Fast Prediction (/predict_realtime)")
        fast_resp = client.post(
            "/predict_realtime",
            data={"context_text": "Neutral test"},
            files={
                "audio_file": ("test.wav", wav_bytes, "audio/wav"),
                "video_file": ("test.mp4", vid_bytes, "video/mp4"),
            }
        )

        if fast_resp.status_code != 200:
            print(f"  ❌ Fast fail: {fast_resp.text}")
            return

        fast_data = fast_resp.json()
        fast_pred = fast_data["predicted_emotion"]
        fast_conf = fast_data["confidence"]
        print(f"  ✅ Fast: [{fast_pred}] @ {fast_conf:.2%} confidence")


        print("\n2. Testing Multi-Pass Stable Prediction (/predict_stable)")
        stable_resp = client.post(
            "/predict_stable",
            data={
                "context_text": "Neutral test",
                "enable_tta": "true",
                "num_windows": 4
            },
            files={
                "audio_file": ("test.wav", wav_bytes, "audio/wav"),
                "video_file": ("test.mp4", vid_bytes, "video/mp4"),
            }
        )

        if stable_resp.status_code != 200:
            print(f"  ❌ Stable fail: {stable_resp.text}")
            return

        stable_data = stable_resp.json()
        stable_pred = stable_data["predicted_emotion"]
        stable_conf = stable_data["confidence"]
        passes = stable_data["num_passes"]
        wins = stable_data["num_windows"]
        tta = stable_data["tta_enabled"]
        elapsed = stable_data["elapsed_seconds"]

        print(f"  ✅ Stable: [{stable_pred}] @ {stable_conf:.2%} confidence")
        print(f"     Stats: {passes} total forward passes | {wins} windows | TTA: {tta} | {elapsed}s")


        print("\n3. Testing Stability (Duplicate Inference)")
        stable_resp2 = client.post(
            "/predict_stable",
            data={"context_text": "Neutral test", "enable_tta": "true", "num_windows": 4},
            files={
                "audio_file": ("test.wav", wav_bytes, "audio/wav"),
                "video_file": ("test.mp4", vid_bytes, "video/mp4"),
            }
        )
        stable_data2 = stable_resp2.json()

        print(f"  First run:  {stable_data['probabilities']}")
        print(f"  Second run: {stable_data2['probabilities']}")

        diff = sum(abs(stable_data["probabilities"][k] - stable_data2["probabilities"][k])
                   for k in stable_data["probabilities"])
        if diff < 1e-4:
            print("  ✅ Determinstic: predictions match exactly across runs")
        else:
            print(f"  ❌ Non-deterministic: diff = {diff}")


if __name__ == '__main__':
    test_endpoints()
