import pandas as pd
import os
import sys
import numpy as np
from pathlib import Path

# ==========================================
# PATH CONFIGURATION - FIXED
# ==========================================
CURRENT_DIR = Path(__file__).resolve().parent # points to ml_pipeline/features
# Move up TWO levels to reach EmergentUI root, then into backend
BACKEND_DIR = CURRENT_DIR.parent.parent / "backend" 
sys.path.append(str(BACKEND_DIR))

try:
    from simulation import DigitalTwinSimulation
    from kalman_filter import MotorKalmanFilter 
except ImportError:
    print(f"Error: Could not find files in {BACKEND_DIR}")
    # This will help you see exactly where it's looking
    print(f"Current Directory: {CURRENT_DIR}")
    sys.exit(1)

# ==========================================
# CONFIGURATION
# ==========================================
OUTPUT_DIR = CURRENT_DIR / "data"
OUTPUT_FILE = OUTPUT_DIR / "all_simulations.csv"

if not os.path.exists(OUTPUT_DIR):
    os.makedirs(OUTPUT_DIR)

N_RUNS = 100 
ALL_ROWS = []

print(f"Starting Data Generation with Kalman Filtering for {N_RUNS} runs...")

for run_id in range(N_RUNS):
    scenario = run_id % 5

    params = {
        "duration": 8.0,
        "dt": 0.02,
        "fault_type": "None",
        "attack_type": "None",
        "attack_magnitude": 5.0, # FIXED: Match demo
        "attack_start_time": 4.0, # FIXED: Match demo
        "fault_start_time": 1.0  # FIXED: Match demo
    }

    if scenario == 1:
        params["fault_type"] = "Friction Buildup" # FIXED: Match simulation.py implementation
    elif scenario == 2:
        params["attack_type"] = "Sensor Spoofing"
    elif scenario == 3:
        params["attack_type"] = "Packet Dropout"
        params["attack_magnitude"] = 0.3 
    elif scenario == 4:
        params["attack_type"] = "Freezing Sensor"

    try:
        sim = DigitalTwinSimulation(params)
        data = sim.run() 
    except Exception as e:
        print(f"Error at Run {run_id}: {e}")
        continue

    df = pd.DataFrame(data)
    
    # ==========================================
    # KALMAN FILTER PROCESSING
    # ==========================================
    # Initialize a fresh filter for each motor run
    kf = MotorKalmanFilter(dt=0.02)
    
    kalman_estimates = []
    innovations = []

    # Apply filter row by row to simulate real-time processing
    for _, row in df.iterrows():
        # Handle Potential NaNs from Packet Dropout for the filter
        z_val = row["omega_sensor"] if not np.isnan(row["omega_sensor"]) else 0.0
        
        # We assume a constant nominal voltage of 12V for the physics prediction
        # or you can use row["voltage"] if your simulation tracks it
        v_input = 12.0 
        
        est, innov = kf.filter(v_input, z_val)
        kalman_estimates.append(est)
        innovations.append(innov)

    df["omega_kalman"] = kalman_estimates
    df["innovation"] = innovations

    # Active indicator columns for feature labeling
    df["attack_active"] = ((df["time"] >= params["attack_start_time"]) & (params[ "attack_type"] != "None")).astype(int)
    df["fault_active"] = ((df["time"] >= params["fault_start_time"]) & (params["fault_type"] != "None")).astype(int)

    # RUL and Identity Tags
    total_time = df["time"].max()
    df["RUL"] = total_time - df["time"]
    df["run_id"] = run_id
    df["scenario_id"] = scenario 

    ALL_ROWS.append(df)

# Combine and Save
if ALL_ROWS:
    final_df = pd.concat(ALL_ROWS, ignore_index=True)
    final_df.to_csv(OUTPUT_FILE, index=False)

    print("-" * 30)
    print(f"SUCCESS: Generated {len(final_df)} rows with Kalman features.")
    print(f"Saved to: {OUTPUT_FILE}")
    print("-" * 30)
else:
    print("Failed to generate any data.")