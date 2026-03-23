"""
Comprehensive Demo: XGBoost Attack Detection + LSTM RUL Prediction
This script demonstrates both AI models working together in the Digital Twin system.
"""
import sys
import pandas as pd
import numpy as np
import xgboost as xgb
import matplotlib.pyplot as plt
import joblib
from pathlib import Path
from scipy.stats import kurtosis
from tensorflow.keras.models import load_model

# Path Configuration
ROOT = Path(__file__).resolve().parent
BACKEND_DIR = ROOT / "backend"
sys.path.append(str(BACKEND_DIR))
sys.path.append(str(ROOT / "ml_pipeline"))

from simulation import DigitalTwinSimulation
from kalman_filter import MotorKalmanFilter
from utils.feature_extractor import extract_features_from_window, calculate_fusion_residual

# Model Loading
MODEL_DIR = ROOT / "ml_pipeline" / "models"
XGB_PATH = MODEL_DIR / "xgboost_attack_classifier.json"
LSTM_PATH = MODEL_DIR / "lstm_rul_model.keras"
SCALER_PATH = MODEL_DIR / "lstm_scaler.joblib"

print("[LOADING] XGBoost Attack Classifier...")
clf = xgb.XGBClassifier()
clf.load_model(str(XGB_PATH))

print("[LOADING] LSTM RUL Predictor...")
rul_model = load_model(str(LSTM_PATH), compile=False)

print("[LOADING] LSTM Scaler...")
scaler = None
if SCALER_PATH.exists():
    scaler = joblib.load(str(SCALER_PATH))

ATTACK_LABELS = ["Normal", "Mechanical Fault", "Sensor Spoofing", "Packet Dropout", "Freezing Sensor"]

def run_dual_model_demo():
    """Run simulation with both XGBoost and LSTM predictions."""
    # Simulation with Sensor Spoofing Attack at t=4s
    sim = DigitalTwinSimulation({
        "duration": 8.0, 
        "attack_type": "Sensor Spoofing",
        "attack_start_time": 4.0,
        "attack_magnitude": 5.0,       # ALIGNED: Matches retraining magnitude
        "fault_type": "Friction Buildup",
        "fault_start_time": 1.0
    })
    
    kf = MotorKalmanFilter()
    history = []
    buffer = []        # Raw data buffer
    feature_buffer = [] # Buffer for LSTM sequences
    dt = 0.02
    
    # LSTM Config
    LOOKBACK = 15      # Matches train_lstm.py
    
    print("[RUNNING] Simulation with sensor spoofing at t=4.0s...")
    raw_states = sim.run() 
    
    for idx, t in enumerate(np.arange(0, 8.0, dt)):
        if idx >= len(raw_states): break
        
        # Get current states
        z_speed = raw_states[idx]["omega_sensor"]
        z_current = raw_states[idx]["current_sensor"]
        z_temp = raw_states[idx]["temp_sensor"]
        actual = raw_states[idx]["omega_true"]
        voltage = raw_states[idx]["voltage"]
        
        # Kalman Filter
        est, innov = kf.filter(voltage, z_speed)
        
        # Physics-based residual
        curr_res = calculate_fusion_residual(voltage, z_speed, z_current)
        res_speed = np.abs(z_speed - est)
        
        # Buffer for feature extraction
        buffer.append({
            "res": res_speed, 
            "innov": innov, 
            "curr_res": curr_res, 
            "kalman": est,
            "temp": z_temp
        })
        
        attack_label = "Normal"
        attack_prob = 0.0
        predicted_rul = 100.0  # Default
        
        if len(buffer) >= 50:
            win = pd.DataFrame(buffer[-50:])
            
            # 1. XGBoost Attack Detection
            feats = extract_features_from_window(win)
            
            # FIXED: Pass real temperature data to XGBoost
            feats["temp_mean"] = win["temp"].mean()
            feats["temp_slope"] = np.polyfit(range(len(win)), win["temp"], 1)[0] if len(win) > 1 else 0.0
            
            pred = clf.predict(feats)[0]
            probs = clf.predict_proba(feats)[0]
            attack_label = ATTACK_LABELS[int(pred)]
            attack_prob = np.max(probs) * 100

            # 2. LSTM RUL Prediction
            feature_vector = [
                feats["innov_mean"].values[0],
                feats["innov_std"].values[0],
                feats["innov_kurtosis"].values[0],
                feats["fusion_res_mean"].values[0],
                feats["fusion_res_std"].values[0],
                feats["temp_mean"].values[0],
                feats["temp_slope"].values[0]
            ]
            
            feature_buffer.append(feature_vector)
            
            if len(feature_buffer) >= LOOKBACK:
                # HEALTH LOCKING LOGIC
                # If a cyber attack is detected, we freeze the RUL to prevent "fake recovery"
                # Cyber attacks mask the friction signatures, so we keep the last clean health state.
                is_cyber_attack = (pred in [2, 3, 4]) 
                
                if not is_cyber_attack:
                    # Only predict health when we have a clean signal
                    sequence = np.array(feature_buffer[-LOOKBACK:])
                    
                    # NORMALIZATION
                    if scaler:
                        sequence_scaled = scaler.transform(sequence)
                        lstm_input = sequence_scaled.reshape(1, LOOKBACK, -1)
                    else:
                        lstm_input = sequence.reshape(1, LOOKBACK, -1)
                    
                    try:
                        rul_raw = rul_model.predict(lstm_input, verbose=0)
                        val = float(rul_raw[0][0])
                        # LSTM predicts 0-8s range. Transform to 0-100 index
                        current_rul = min(100.0, max(0.0, val * 12.5)) 
                        
                        # MONOTONICITY GUARDRAIL: Health should never increase.
                        # This prevents the "fake recovery" rise seen when spoofing masks friction.
                        if history:
                            prev_rul = history[-1]["predicted_rul"]
                            # If current prediction is higher than previous, stick to previous.
                            # We allow a tiny tolerance (0.1) for noise, but generally health only goes down.
                            if current_rul > prev_rul:
                                predicted_rul = prev_rul
                            else:
                                predicted_rul = current_rul
                        else:
                            predicted_rul = current_rul
                            
                    except Exception as e:
                        print(f"[LSTM ERROR] {e}")
                else:
                    # Attack detected: Keep last predicted RUL
                    if history:
                        predicted_rul = history[-1]["predicted_rul"]
                    else:
                        predicted_rul = 100.0
                
                if len(feature_buffer) > 100:
                    feature_buffer.pop(0)

            buffer.pop(0)
        
        history.append({
            "time": t, 
            "actual": actual, 
            "sensor": z_speed,
            "attack_label": attack_label,
            "attack_prob": attack_prob,
            "predicted_rul": predicted_rul
        })
    
    return pd.DataFrame(history)

def visualize_results(df):
    """Create comprehensive visualization with refined detection areas."""
    fig, axes = plt.subplots(3, 1, figsize=(14, 12), sharex=True)
    plt.subplots_adjust(hspace=0.3)
    
    # Plot 1: Speed Comparison
    ax1 = axes[0]
    ax1.plot(df['time'], df['actual'], 'k--', label='True Speed', linewidth=2)
    ax1.plot(df['time'], df['sensor'], 'r', label='Sensor (Hacked)', alpha=0.5)
    
    attack_mask = df['attack_label'] != 'Normal'
    ax1.fill_between(df['time'], 0, 20, where=attack_mask, color='red', alpha=0.1, label='Anomaly Detected')
    
    ax1.set_title("Motor Speed: Actual vs Sensor Reading", fontsize=14, fontweight='bold')
    ax1.set_ylabel("Speed (rad/s)")
    ax1.set_ylim(0, 18)
    ax1.legend()
    ax1.grid(True, alpha=0.3)
    
    # Plot 2: XGBoost Attack Classification
    ax2 = axes[1]
    attack_colors = {
        "Normal": "green",
        "Mechanical Fault": "orange",
        "Sensor Spoofing": "red",
        "Packet Dropout": "purple",
        "Freezing Sensor": "brown"
    }
    for label in df['attack_label'].unique():
        mask = df['attack_label'] == label
        ax2.scatter(df[mask]['time'], df[mask]['attack_prob'], 
                   c=attack_colors.get(label, 'gray'), label=label, s=10, alpha=0.6)
    
    ax2.axhline(y=70, color='gray', linestyle=':', alpha=0.5, label='Alarm Threshold')
    ax2.set_title("XGBoost Attack Classifier Output", fontsize=14, fontweight='bold')
    ax2.set_ylabel("Confidence (%)")
    ax2.legend(loc='lower right')
    ax2.grid(True, alpha=0.3)
    
    # Plot 3: LSTM RUL Prediction
    ax3 = axes[2]
    plot_df = df[df['predicted_rul'] < 100.0].copy()
    if not plot_df.empty:
        ax3.plot(plot_df['time'], plot_df['predicted_rul'], 'b-', linewidth=2, label='Health Index (%)')
        ax3.fill_between(plot_df['time'], plot_df['predicted_rul'], alpha=0.2)
    else:
        ax3.plot(df['time'], [100.0]*len(df), 'b--', alpha=0.3)
        
    ax3.set_title("LSTM Remaining Useful Life (RUL) Index", fontsize=14, fontweight='bold')
    ax3.set_ylabel("Health Index (%)")
    ax3.set_xlabel("Time (seconds)")
    ax3.set_ylim(0, 110)
    ax3.legend()
    ax3.grid(True, alpha=0.3)
    
    print("\n[DISPLAY] Showing logical explanation graph...")
    plt.tight_layout()
    plt.show()

def print_summary(df):
    """Print summary of both model outputs with detailed logical explanations."""
    print("\n" + "="*70)
    print("           DIGITAL TWIN RESILIENCE - DUAL MODEL ANALYSIS")
    print("="*70)
    
    anomalies = df[df['attack_label'] != 'Normal']
    
    print(f"\n[XGBoost] SECURITY CLASSIFIER:")
    if not anomalies.empty:
        # Get the sequence of detections to explain the logic
        start_time = anomalies['time'].min()
        primary_label = anomalies['attack_label'].mode()[0]
        
        print(f"   - Initial Anomaly Detected at: {start_time:.2f}s")
        print(f"   - Primary Diagnosis: {primary_label}")
        
        print(f"\n   [LOGICAL EXPLANATION FOR USER]")
        if "Fault" in primary_label:
            print("   - SCENARIO: Physical Degradation (Friction Buildup)")
            print("   - OBSERVATION: The 'Hacked' and 'True' speed lines overlap.")
            print("   - REASON: This is CORRECT behavior. The motor has a physical fault,")
            print("             causing it to slow down. The sensor is reporting this")
            print("             truthfully. The AI detects the hidden friction signature.")
        elif "Spoofing" in primary_label:
            print("   - SCENARIO: Cyber Attack (Sensor Spoofing)")
            print("   - OBSERVATION: The 'Hacked' line deviates from the 'True' line.")
            print("   - REASON: This is an ATTACK. A hacker is forcing the sensor to report")
            print("             a higher speed than reality. The AI detects the violation")
            print("              of motor physics (voltage/current vs speed inconsistency).")
        else:
            print(f"   - SCENARIO: {primary_label}")
            print("   - REASON: The AI identified a signature matching documented attack patterns.")
    else:
        print("   - STATUS: All systems operating within normal parameters.")
    
    print(f"\n[LSTM] HEALTH MONITOR (RUL):")
    valid_rul = df[df['predicted_rul'] < 100.0]
    if not valid_rul.empty:
        health_start = valid_rul['predicted_rul'].iloc[0]
        health_end = valid_rul['predicted_rul'].iloc[-1]
        print(f"   - Initial Health Index: {health_start:.1f}%")
        print(f"   - Final Health Index: {health_end:.1f}%")
        
        trend = "STABLE" if health_end > health_start - 5 else "DEGRADING"
        print(f"   - HEALTH TREND: {trend}")
        
        # Explain Health Locking
        if df['attack_label'].str.contains("Spoofing|Dropout|Freeze").any():
            print(f"   - [SECURITY FEATURE] Health Index Locked: The RUL is held constant during")
            print(f"     the cyber-attack phase to prevent misinformation. AI reports health")
            print(f"     only from trusted sensor signatures.")
        else:
            print(f"   - INSIGHT: Friction buildup reduces the Remaining Useful Life (RUL).")
    
    print("\n" + "="*70)
    print("  The graph below shows how the Digital Twin differentiates between")
    print("  real physical problems (matching lines) and cyber attacks (deviating lines).")
    print("="*70)

if __name__ == "__main__":
    df = run_dual_model_demo()
    print_summary(df)
    visualize_results(df)
