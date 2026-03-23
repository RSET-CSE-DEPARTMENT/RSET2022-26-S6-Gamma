import pandas as pd
import numpy as np
import os
from scipy.stats import kurtosis, skew

# =====================
# CONFIG
# =====================
DATA_PATH = "ml_pipeline/features/data/all_simulations.csv"
OUTPUT_PATH = "ml_pipeline/data/window_features.csv"
os.makedirs("ml_pipeline/data", exist_ok=True)

WINDOW_SIZE = 50 
STRIDE = 10

# Physics Constants for Fusion Check
KE = 0.1
R = 2.0

if not os.path.exists(DATA_PATH):
    print(f"Error: {DATA_PATH} not found.")
    exit()

df = pd.read_csv(DATA_PATH)
feature_rows = []

print("Extracting Fusion Features (Kalman + Ohm's Law)...")

for run_id, run_df in df.groupby("run_id"):
    run_df = run_df.sort_values("time").reset_index(drop=True)
    scenario = run_df["scenario_id"].iloc[0]

    for start in range(0, len(run_df) - WINDOW_SIZE, STRIDE):
        window = run_df.iloc[start:start + WINDOW_SIZE]

        # --- 1. KALMAN INNOVATION FEATURES ---
        innov = window["innovation"].fillna(0)
        rms_innov = np.sqrt(np.mean(innov**2))
        peak_innov = np.max(np.abs(innov))

        # --- 2. OHM'S LAW FUSION FEATURES (New Integration) ---
        # V = IR + Ke*w => Expected Current = (V - Ke*w)/R
        # We compare the theoretical current to the actual current_sensor
        expected_current = (12.0 - KE * window["omega_sensor"]) / R
        fusion_residual = np.abs(window["current_sensor"] - expected_current)

        # --- 3. RAW RESIDUAL FEATURES (Production-ready) ---
        sensor_val = window["omega_sensor"].ffill().fillna(0)
        # Use omega_kalman instead of omega_true!
        residual = np.abs(window["omega_kalman"] - sensor_val)

        features = {
            # Statistical Kalman Features
            "innov_mean": innov.mean(),
            "innov_std": innov.std(),
            "innov_kurtosis": kurtosis(innov),
            "innov_crest": peak_innov / rms_innov if rms_innov != 0 else 0,
            
            # Physics Fusion Features (Hard to spoof)
            "fusion_res_mean": fusion_residual.mean(),
            "fusion_res_std": fusion_residual.std(),
            
            # Thermal/Trend Features
            "temp_mean": window["temp_sensor"].mean(),
            "temp_slope": np.polyfit(range(WINDOW_SIZE), window["temp_sensor"], 1)[0],
            "res_slope": np.polyfit(range(WINDOW_SIZE), residual, 1)[0],
            
            # Labels & Meta
            "label": 0, # Placeholder
            "RUL": window["RUL"].iloc[-1],
            "run_id": run_id
        }

        # --- 4. MULTICLASS LABELING ---
        attack_active = window["attack_active"].max() == 1
        fault_active = window["fault_active"].max() == 1

        if attack_active:
            # Map scenarios to specific attack labels
            label_map = {2: 2, 3: 3, 4: 4}
            features["label"] = label_map.get(scenario, 2) 
        elif fault_active:
            features["label"] = 1
        else:
            features["label"] = 0

        feature_rows.append(features)

# Save and Report
features_df = pd.DataFrame(feature_rows)
features_df.to_csv(OUTPUT_PATH, index=False)

print(f"Success! Features saved to {OUTPUT_PATH}")
print("Label Breakdown:")
print(features_df["label"].value_counts().sort_index())