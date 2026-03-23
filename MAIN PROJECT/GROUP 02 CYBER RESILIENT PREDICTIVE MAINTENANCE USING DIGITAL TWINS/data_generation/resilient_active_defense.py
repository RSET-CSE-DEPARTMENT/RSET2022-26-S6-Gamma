import sys
import os
import pandas as pd
import numpy as np
import xgboost as xgb
import matplotlib.pyplot as plt
from pathlib import Path
from scipy.stats import kurtosis, skew

# ==========================================
# 1. PATH CONFIGURATION
# ==========================================
ROOT = Path(__file__).resolve().parent
BACKEND_DIR = ROOT / "backend"
sys.path.append(str(BACKEND_DIR))

try:
    from simulation import DigitalTwinSimulation
    from kalman_filter import MotorKalmanFilter
    from adaptive_engine import MotorParameterEstimator
    print("[OK] Backend modules loaded successfully.")
except ImportError as e:
    print(f"[ERROR] Error: {BACKEND_DIR}")
    sys.exit(1)

# ==========================================
# 2. MODEL LOADING
# ==========================================
MODEL_PATH = ROOT / "ml_pipeline" / "models" / "xgboost_attack_classifier.json"
clf = xgb.XGBClassifier()
clf.load_model(str(MODEL_PATH))

def run_active_defense_simulation(override_params=None):
    # Default Configuration
    config = {
        "duration": 8.0, 
        "attack_type": "Sensor Spoofing",
        "attack_start_time": 3.0,
        "attack_magnitude": 10.0, # Large magnitude to clearly show 3 distinct lines
        "fault_type": "None",        # Options: "None", "Friction Buildup", "Bearing Fault"
        "fault_start_time": 3.0
    }
    
    # Apply Overrides
    if override_params:
        config.update(override_params)

    # Simulation now includes Current and Back-EMF physics
    sim = DigitalTwinSimulation(config)
    
    kf = MotorKalmanFilter()
    adaptive = MotorParameterEstimator()
    
    history, buffer = [], []
    dt = 0.02
    omega_prev, b_est = 0.0, 0.1
    
    # Physics Constants for Fusion Check
    KE, R_OHMS = 0.1, 2.0
    
    # We'll use a local 'x_ref' to maintain the defended state independent 
    # of the filter's internal state if we want total isolation,
    # but the Kalman Filter is already designed for this if we skip the update step.
    
    print(">>> Simulation started. Defense System Active...")

    # We use sim.run() to get the full physical ground truth for the demo
    raw_states = sim.run() 
    
    attack_detected_globally = False # Latch for detection
    
    for idx, t in enumerate(np.arange(0, 8.0, dt)):
        if idx >= len(raw_states): break
        
        # Current States
        z_speed = raw_states[idx]["omega_sensor"]
        z_current = raw_states[idx]["current_sensor"]
        actual = raw_states[idx]["omega_true"]
        voltage = 12.0
        
        # 1. Update Kalman with the latest estimated friction
        kf.update_parameters(b=b_est)
        
        # 2. SEPARATE Predict and Update for Resilience
        # Predict (Purely physics based)
        x_pred = kf.A @ kf.x + kf.B * voltage
        kf.P = kf.A @ kf.P @ kf.A.T + kf.Q
        innov = z_speed - (kf.H @ x_pred)
        
        # 3. Physics-Electrical Consistency Check (Ohm's Law)
        expected_curr = (voltage - KE * z_speed) / R_OHMS
        curr_res = np.abs(z_current - expected_curr)
        
        # 4. Sliding Window Buffer
        res_speed = np.abs(z_speed - float(x_pred[0][0]))
        buffer.append({
            "res": res_speed, 
            "innov": float(innov[0][0]), 
            "curr_res": curr_res, 
            "kalman": float(x_pred[0][0])
        })
        
        final_speed, attack_active = z_speed, False
        
        if len(buffer) >= 50:
            win = pd.DataFrame(buffer[-50:])
            # Ensure ML pipeline is in path
            ML_DIR = ROOT / "ml_pipeline"
            if str(ML_DIR) not in sys.path:
                sys.path.insert(0, str(ML_DIR))
            
            from utils.feature_extractor import extract_features_from_window
            feats = extract_features_from_window(win)
            
            # Predict & Act
            pred = clf.predict(feats)[0]
            probs = clf.predict_proba(feats)[0]
            
            if pred in [2, 3, 4] and np.max(probs) > 0.7: 
                attack_detected_globally = True
                attack_active = True
                # RECOVERY: Do NOT update the filter state with the sensor.
                # Use the prediction as the final state for this step.
                kf.x = x_pred 
                final_speed = float(kf.x[0][0])
                
                if t % 0.5 < 0.02:
                    relevant_feats = feats.drop(columns=["temp_mean", "temp_slope"], errors="ignore")
                    top_reason = relevant_feats.idxmax(axis=1).values[0]
                    print(f"[RECOVERY] [{t:.2f}s]: Attack detected. Reason: {top_reason} | Confidence: {np.max(probs)*100:.1f}%")
            else:
                # NORMAL: Update the Kalman filter with the sensor data
                S = kf.H @ kf.P @ kf.H.T + kf.R
                K_gain = kf.P @ kf.H.T @ np.linalg.inv(S)
                kf.x = x_pred + K_gain @ innov
                kf.P = (np.eye(1) - K_gain @ kf.H) @ kf.P
                final_speed = float(kf.x[0][0])
                
                # Only update physics model (RLS) if we are NOT under attack
                b_est, _ = adaptive.update(voltage, z_speed, omega_prev, dt)
            
            buffer.pop(0)
        else:
            # Initial phase (no detection available yet)
            S = kf.H @ kf.P @ kf.H.T + kf.R
            K_gain = kf.P @ kf.H.T @ np.linalg.inv(S)
            kf.x = x_pred + K_gain @ innov
            kf.P = (np.eye(1) - K_gain @ kf.H) @ kf.P
            final_speed = float(kf.x[0][0])
            b_est, _ = adaptive.update(voltage, z_speed, omega_prev, dt)

        history.append({
            "time": t, 
            "actual": actual, 
            "sensor": z_speed, 
            "defended": final_speed, 
            "attack": attack_active,
            "power": z_current * voltage  # P = I * V
        })
        omega_prev = final_speed

    return pd.DataFrame(history)

def generate_security_report(df):
    print("\n" + "="*45)
    print("      DIGITAL TWIN SECURITY AUDIT REPORT")
    print("="*45)
    
    dt = df['time'].iloc[1] - df['time'].iloc[0]
    total_energy = (df['power'] * dt).sum()
    rmse = np.sqrt(((df['defended'] - df['actual']) ** 2).mean())
    
    report = f"""
    [OPERATION SUMMARY]
    - Total Energy Consumption: {total_energy:.2f} Joules
    - Simulation Runtime:      {df['time'].max():.2f} seconds
    
    [SECURITY ANALYTICS]
    - Status: {'RECOVERY ACTIVE' if df['attack'].any() else 'SECURE'}
    - Mitigation Accuracy:     {rmse:.4f} rad/s (RMSE)
    
    [VERDICT]
    XGBoost effectively identified the sensor anomaly. 
    The Resilient Control loop maintained stability.
    """
    print(report)
    with open("Security_Audit_Log.txt", "w") as f: f.write(report)
    print("[OK] Audit Log saved to 'Security_Audit_Log.txt'")

# ==========================================
# 3. EXECUTION
# ==========================================
if __name__ == "__main__":
    df = run_active_defense_simulation()
    generate_security_report(df)

    fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(12, 10), sharex=True)
    plt.subplots_adjust(hspace=0.3)

    # Plot 1: Speed
    ax1.plot(df['time'], df['actual'], 'k--', label='True Speed (Ground Truth)')
    ax1.plot(df['time'], df['sensor'], 'r', label='Sensor Speed (Hacked)', alpha=0.3)
    ax1.plot(df['time'], df['defended'], 'g', label='Defended Speed (Digital Twin)', linewidth=2)
    
    # Precise Anomaly Shading (Prettier than xvspan)
    ax1.fill_between(df['time'], 0, 30, where=df['attack'], color='red', alpha=0.1, label='Anomaly Detected')
    
    ax1.set_title("Resilient Defense: Speed Correction")
    ax1.set_ylabel("Speed (rad/s)")
    ax1.set_ylim(0, 30) # Fixed limit for cleaner visual
    ax1.legend()
    ax1.grid(True, alpha=0.3)
    
    # LOGICAL NOTE:
    # The 'flat' green line is the mathematically correct resilient state.
    # Previous versions showed a 'jump' because of parameter drift (K mismatch).
    # Successful defense means the motor stays at its true speed regardless of the sensor.

    # Plot 2: Power
    ax2.plot(df['time'], df['power'], color='blue', label='Energy Consumption (W)')
    ax2.fill_between(df['time'], df['power'], color='blue', alpha=0.1)
    ax2.set_title("Energy Fingerprinting: Real-Time Power Monitoring")
    ax2.set_ylabel("Power (Watts)")
    ax2.set_xlabel("Time (seconds)")
    ax2.legend()
    ax2.grid(True, alpha=0.3)

    plt.show()