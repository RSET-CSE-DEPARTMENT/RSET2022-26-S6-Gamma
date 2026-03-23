import pandas as pd
import numpy as np
import xgboost as xgb
import os
import sys
import matplotlib.pyplot as plt
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

# Load Classifier
MODEL_PATH = CURRENT_DIR / "ml_pipeline" / "models" / "xgboost_attack_classifier.json"
clf = xgb.XGBClassifier()
clf.load_model(str(MODEL_PATH))

# ==========================================
# MULTI-MOTOR SIMULATION ENGINE
# ==========================================
def run_swarm_simulation():
    # Motor A: Under Attack
    params_a = {
        "duration": 6.0, "dt": 0.02,
        "attack_type": "Sensor Spoofing", "attack_magnitude": 3.0,
        "attack_start_time": 3.0, "fault_type": "None"
    }
    
    # Motor B: Healthy (but affected by system noise)
    params_b = {
        "duration": 6.0, "dt": 0.02,
        "attack_type": "None", "fault_type": "None"
    }

    sim_a = DigitalTwinSimulation(params_a)
    sim_b = DigitalTwinSimulation(params_b)
    
    kf_a = MotorKalmanFilter(dt=0.02)
    kf_b = MotorKalmanFilter(dt=0.02)
    
    results = []
    buffer_a, buffer_b = [], []
    window_size = 15

    print("Running Swarm Simulation (Motor A = Attacked, Motor B = Healthy)...")

    for t in np.arange(0, 6.0, 0.02):
        # 1. Get States
        state_a = sim_a.step(t)
        state_b = sim_b.step(t)
        
        # 2. Kalman Filtering for both
        est_a, innov_a = kf_a.filter(12.0, state_a["omega_sensor"])
        est_b, innov_b = kf_b.filter(12.0, state_b["omega_sensor"])
        
        # 3. Physics Check for Motor A
        KE, R_OHMS = 0.1, 2.0
        expected_curr_a = (12.0 - KE * state_a["omega_sensor"]) / R_OHMS
        curr_res_a = np.abs(state_a["current_sensor"] - expected_curr_a)
        
        # 4. Decision Logic for Motor A
        defended_a = state_a["omega_sensor"]
        buffer_a.append({
            "res": np.abs(state_a["omega_sensor"] - est_a), 
            "innov": innov_a, 
            "est": est_a,
            "curr_res": curr_res_a
        })
        
        if len(buffer_a) >= window_size:
            win_df = pd.DataFrame(buffer_a[-window_size:])
            
            # Use unified feature extractor
            import sys
            sys.path.insert(0, str(CURRENT_DIR / "ml_pipeline"))
            from utils.feature_extractor import extract_features_from_window
            feat = extract_features_from_window(win_df)
            
            pred_a = clf.predict(feat)[0]
            if pred_a in [2, 3, 4]: defended_a = est_a # Apply Active Defense
            buffer_a.pop(0)

        results.append({
            "time": t,
            "A_sensor": state_a["omega_sensor"],
            "A_defended": defended_a,
            "B_sensor": state_b["omega_sensor"],
            "A_attack": (t >= 3.0)
        })

    return pd.DataFrame(results)

# ==========================================
# SWARM VISUALIZATION
# ==========================================
def plot_swarm(df):
    plt.figure(figsize=(12, 7))
    
    plt.subplot(2, 1, 1)
    plt.plot(df['time'], df['A_sensor'], 'r', label='Motor A: Hacked Sensor', alpha=0.5)
    plt.plot(df['time'], df['A_defended'], 'g', label='Motor A: Self-Healed', linewidth=2)
    plt.title("Swarm Member A (Target of Attack)")
    plt.legend()
    plt.grid(True)

    plt.subplot(2, 1, 2)
    plt.plot(df['time'], df['B_sensor'], 'blue', label='Motor B: Healthy Neighbor')
    plt.title("Swarm Member B (The Reliable Observer)")
    plt.xlabel("Time (s)")
    plt.legend()
    plt.grid(True)
    
    plt.tight_layout()
    plt.show()

if __name__ == "__main__":
    swarm_data = run_swarm_simulation()
    plot_swarm(swarm_data)