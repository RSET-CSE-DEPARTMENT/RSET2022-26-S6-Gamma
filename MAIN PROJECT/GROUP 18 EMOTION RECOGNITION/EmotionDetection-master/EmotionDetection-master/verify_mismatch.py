import os
import sys
import pickle

_torch_pkgs = r"C:\Users\VolwinSHAJI\torch_pkgs"
if os.path.isdir(_torch_pkgs) and _torch_pkgs not in sys.path:
    sys.path.insert(0, _torch_pkgs)

import torch
import numpy as np
import pandas as pd

from fastapi.testclient import TestClient
import app as main_app

def verify_mismatch():
    out = open("mismatch_results.txt", "w", encoding="utf-8")
    
    def log(msg):
        out.write(msg + "\n")
        out.flush()

    log("=" * 60)
    log("SYSTEMATIC INFERENCE VERIFICATION")
    log("=" * 60)
    
    # 1. Load Model
    log("\n[1] Checking Model Configuration...")
    try:
        main_app.load_model()
        model = main_app.model
        processor = main_app.av_processor
        model.eval()
        log("  ✅ Model and processor loaded successfully.")
    except Exception as e:
        log(f"  ❌ Error loading model: {e}")
        out.close()
        return

    # 2. Check Preprocessing params
    log("\n[2] Checking Preprocessing Parameters...")
    audio_params_ok = (processor.mel_transform.sample_rate == 48000 and 
                       processor.mel_transform.n_fft == 2048 and
                       processor.mel_transform.hop_length == 512 and
                       processor.mel_transform.n_mels == 128 and
                       processor.mel_transform.f_min == 20 and
                       processor.mel_transform.f_max == 8000)
    log(f"  {'✅' if audio_params_ok else '❌'} Audio params match training: sr={processor.mel_transform.sample_rate}, n_fft={processor.mel_transform.n_fft}, hop={processor.mel_transform.hop_length}, mels={processor.mel_transform.n_mels}")
    
    # 3. Load Kaggle Pickle Data
    log("\n[3] Loading training features pickle file...")
    pkl_path = r"C:\Users\VolwinSHAJI\Downloads\enhanced_rule_based_features_FIXED.pkl"
    if not os.path.exists(pkl_path):
        log("  ❌ Pickle file not found!")
        out.close()
        return

    df = pd.read_pickle(pkl_path)
    log(f"  ✅ Pickle loaded: {df.shape[0]} rows, {df.shape[1]} columns")
    
    # 4. Find RAVDESS Sample
    sample_filename = "01-01-03-02-01-01-06.mp4"
    video_path = r"C:\Users\VolwinSHAJI\.gemini\antigravity\scratch\chat\test_video.webm"
    
    if not os.path.exists(video_path):
        log(f"  ❌ Sample video not found: {video_path}")
        out.close()
        return
        
    row = df[df['video_filepath'].str.endswith(sample_filename, na=False)]
    
    if row.empty:
        log(f"  ❌ Could not find {sample_filename} in the pickle file.")
        out.close()
        return
        
    log(f"  ✅ Found {sample_filename} in Kaggle features.")
    row = row.iloc[0]
    
    # 5. Extract Live Features
    log("\n[5] Extracting live features via processor.py...")
    with open(video_path, 'rb') as f:
        video_bytes = f.read()
    
    # Use standard single-pass processing for direct comparison
    video_tensor = processor.process_video(video_bytes)
    
    # Needs a wav file. We can extract it or use the wav file if it exists.
    wav_path = rf"C:\Users\VolwinSHAJI\Downloads\{sample_filename.replace('.mp4', '.wav')}"
    if os.path.exists(wav_path):
        with open(wav_path, 'rb') as f:
            audio_bytes = f.read()
        audio_tensor = processor.process_audio(audio_bytes)
    else:
        log("  ⚠️ Wav file not found for extraction, audio check skipped.")
        audio_tensor = None
    
    # Text
    context_text = "Visual: No description Audio: No description"
    text_input = [context_text]
    
    # Blendshapes / Prosody Live
    try:
        bs_live = main_app.extract_blendshapes_live(video_bytes, main_app.BLENDSHAPE_COLS, main_app.LANDMARKER_PATH)
        pr_live = main_app.extract_prosody_live(audio_bytes, main_app.PROSODY_COLS) if audio_bytes else [0.0]*8
        
        # Handle Nans
        bs_live = torch.tensor([0.0 if (v != v) else v for v in bs_live], dtype=torch.float32)
        pr_live = torch.tensor([0.0 if (v != v) else v for v in pr_live], dtype=torch.float32)
        bs_live = bs_live.unsqueeze(0)
        pr_live = pr_live.unsqueeze(0)
    except Exception as e:
        log(f"  ❌ Error running live extraction: {e}")
        bs_live, pr_live = None, None

    # 6. Compare Feature Discrepancies
    log("\n[6] Feature Value Comparison (Pickle vs Live)")
    
    log("\n  --- Blendshapes ---")
    bs_cols = main_app.BLENDSHAPE_COLS
    if bs_live is not None:
        missing_in_pkl = [c for c in bs_cols if c not in row.index]
        if missing_in_pkl:
            log(f"  ❌ Missing {len(missing_in_pkl)} blendshape columns in pickle!")
        else:
            bs_pkl = row[bs_cols].fillna(0).values.astype(np.float32)
            bs_pkl_tensor = torch.tensor(bs_pkl).unsqueeze(0)
            log(f"  Pickle mean: {bs_pkl.mean():.4f}, std: {bs_pkl.std():.4f}")
            log(f"  Live   mean: {bs_live.mean().item():.4f}, std: {bs_live.std().item():.4f}")
            log(f"  Max Diff: {np.abs(bs_pkl - bs_live.numpy()[0]).max():.4f}")
    else:
        bs_pkl_tensor = torch.zeros((1, 204))

    log("\n  --- Prosody ---")
    pr_cols = main_app.PROSODY_COLS
    if pr_live is not None:
        missing_in_pkl = [c for c in pr_cols if c not in row.index]
        if missing_in_pkl:
            log(f"  ❌ Missing {len(missing_in_pkl)} prosody columns in pickle!")
        else:
            pr_pkl = row[pr_cols].fillna(0).values.astype(np.float32)
            pr_pkl_tensor = torch.tensor(pr_pkl).unsqueeze(0)
            log(f"  Pickle mean: {pr_pkl.mean():.4f}, std: {pr_pkl.std():.4f}")
            log(f"  Live   mean: {pr_live.mean().item():.4f}, std: {pr_live.std().item():.4f}")
            log(f"  Max Diff: {np.abs(pr_pkl - pr_live.numpy()[0]).max():.4f}")
    else:
        pr_pkl_tensor = torch.zeros((1, 8))

    # 7. Model Inference Comparison
    log("\n[7] Inference Comparison")
    model.eval()
    device = main_app.device
    
    with torch.no_grad():
        # A) Hybrid Inference (Live AV + Pickle Metadata)
        if audio_tensor is not None:
            out_pkl_meta = model(
                audio_tensor.unsqueeze(0).to(device),
                video_tensor.unsqueeze(0).to(device),
                bs_pkl_tensor.to(device),
                pr_pkl_tensor.to(device),
                text_input,
                training=False
            )
            prob_pkl_meta = torch.softmax(out_pkl_meta, dim=1).cpu().numpy()[0]
            log(f"  Prediction (Live A/V + Pickle Metadata): Emotion {np.argmax(prob_pkl_meta)} ({np.max(prob_pkl_meta):.2f})")
            log(f"    Probs: {np.round(prob_pkl_meta, 3)}")
        
        # B) Fully Live Inference
        if audio_tensor is not None and bs_live is not None:
            out_live = model(
                audio_tensor.unsqueeze(0).to(device),
                video_tensor.unsqueeze(0).to(device),
                bs_live.to(device),
                pr_live.to(device),
                text_input,
                training=False
            )
            prob_live = torch.softmax(out_live, dim=1).cpu().numpy()[0]
            log(f"  Prediction (Fully Live): Emotion {np.argmax(prob_live)} ({np.max(prob_live):.2f})")
            log(f"    Probs: {np.round(prob_live, 3)}")

    log("\nDone. If Pickle Metadata and Fully Live predictions differ massively,")
    log("the issue is in extraction of Prosody/Blendshapes.")
    log("=" * 60)
    out.close()

if __name__ == "__main__":
    verify_mismatch()
