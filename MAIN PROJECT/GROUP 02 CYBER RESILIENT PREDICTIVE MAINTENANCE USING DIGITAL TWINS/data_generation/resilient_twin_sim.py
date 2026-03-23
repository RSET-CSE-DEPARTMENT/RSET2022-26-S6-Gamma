import pandas as pd
import numpy as np
import xgboost as xgb
import os
import sys
from pathlib import Path
from scipy.stats import kurtosis, skew

# PATH CONFIGURATION
CURRENT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = CURRENT_DIR / "backend"
sys.path.append(str(BACKEND_DIR))

try:
    from simulation import DigitalTwinSimulation
    from kalman_filter import MotorKalmanFilter
except ImportError:
    print("Error: Ensure simulation.py and kalman_filter.py are in the backend folder.")
    sys.exit(1)

# ==========================================
# LOAD CLASSIFIER
# ==========================================
MODEL_PATH = CURRENT_DIR / "ml_pipeline" / "models" / "xgboost_attack_classifier.json"
clf = xgb.XGBClassifier()
if os.path.exists(MODEL_PATH):
    clf.load_model(str(MODEL_PATH))
else:
    print(f"Error: Model not found at {MODEL_PATH}")
    sys.exit(1)

# ==========================================
# FEATURE EXTRACTION HELPER
# ==========================================
# ==========================================
# FEATURE EXTRACTION HELPER
# ==========================================
sys.path.append(str(CURRENT_DIR / "ml_pipeline"))
from utils.feature_extractor import extract_features_from_window, calculate_fusion_residual

# ==========================================
# ACTIVE DEFENSE SIMULATION
# ==========================================
def run_resilient_demo(attack_type="Sensor Spoofing"):
    print(f"\n--- Starting Active Defense Demo: {attack_type} ---")
    
    params = {
        "duration": 5.0,
        "dt": 0.02,
        "fault_type": "None",
        "attack_type": attack_type,
        "attack_magnitude": 2.0,
        "attack_start_time": 2.0,
        "fault_start_time": 1.0
    }

    sim = DigitalTwinSimulation(params)
    kf = MotorKalmanFilter(dt=0.02)
    
    history = []
    window_buffer = []
    lookback = 15
    defense_active = False

    # Standard loop
    for t in np.arange(0, params["duration"], params["dt"]):
        # 1. Get Physical and Sensor State from Simulation
        # (In a real system, 'sim.step' would be the actual motor hardware)
        raw_state = sim.step(t) 
        z_val = raw_state["omega_sensor"]
        current_sensor = raw_state["current_sensor"]
        
        # 2. Kalman Update
        est, innov = kf.filter(12.0, z_val if not np.isnan(z_val) else 0.0)
        
        # Physics Check (needed for unified features)
        curr_res = calculate_fusion_residual(12.0, z_val, current_sensor)
        res_speed = np.abs(z_val - est)

        # 3. Manage Window for XGBoost
        step_data = {
            "res": res_speed,
            "innov": innov,
            "curr_res": curr_res,
            "kalman": est
        }
        window_buffer.append(step_data)
        if len(window_buffer) > lookback:
            window_buffer.pop(0)

        # 4. XGBOOST GATEKEEPER (Active Defense)
        if len(window_buffer) == lookback:
            win_df = pd.DataFrame(window_buffer)
            feat_df = extract_features_from_window(win_df)
            
            # Prediction: 0=Normal, 1=Fault, 2=Spoofing, 3=Dropout, 4=Freeze
            prediction = clf.predict(feat_df)[0]
            
            if prediction in [2, 3, 4]: # Cyber Attack Detected
                defense_active = True
                # THE OVERRIDE: Trust Kalman more than the Sensor
                final_omega = est 
            else:
                defense_active = False
                final_omega = z_val
        else:
            final_omega = z_val

        history.append({
            "time": t,
            "actual": raw_state["omega_true"],
            "sensor": z_val,
            "defended_output": final_omega,
            "defense_status": defense_active
        })

    return pd.DataFrame(history)

# Run and Print Result
results = run_resilient_demo("Sensor Spoofing")
attack_start = 2.0
after_attack = results[results["time"] > attack_start + 0.5].head(5)

print("\nPost-Attack System Status:")
print(after_attack[["time", "actual", "sensor", "defended_output", "defense_status"]].to_string(index=False))