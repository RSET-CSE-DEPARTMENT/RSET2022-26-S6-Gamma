"""
Unified Feature Extractor for Digital Twin System
Provides consistent feature extraction across all scripts.
"""
import pandas as pd
import numpy as np
from scipy.stats import kurtosis

# Physics Constants
KE = 0.1  # Back-EMF constant
R = 2.0   # Resistance (Ohms)
WINDOW_SIZE = 50  # Standard window size for feature extraction

def extract_features_from_window(window_df):
    """
    Extract features from a window of simulation data.
    
    Args:
        window_df: DataFrame with columns ['res', 'innov', 'curr_res', 'kalman'] or similar
        
    Returns:
        pd.DataFrame with single row containing 9 features matching build_windows.py
    """
    # Ensure window has required columns
    required_cols = ['innov', 'curr_res', 'res']
    for col in required_cols:
        if col not in window_df.columns:
            raise ValueError(f"Missing required column: {col}")
    
    # --- 1. KALMAN INNOVATION FEATURES ---
    innov = window_df["innov"].fillna(0)
    rms_innov = np.sqrt(np.mean(innov**2))
    
    # --- 2. RESIDUAL FEATURES ---
    res_vals = window_df["res"].fillna(0)
    
    # --- 3. FUSION FEATURES (Physics-based) ---
    fusion_res = window_df["curr_res"].fillna(0)
    
    # Build feature dictionary matching build_windows.py exactly
    features = {
        # Kalman Innovation Statistics
        "innov_mean": innov.mean(),
        "innov_std": innov.std(),
        "innov_kurtosis": kurtosis(innov),
        "innov_crest": np.max(np.abs(innov)) / (rms_innov + 1e-6),
        
        # Physics Fusion Features
        "fusion_res_mean": fusion_res.mean(),
        "fusion_res_std": fusion_res.std(),
        
        # Thermal/Trend Features (placeholders if not tracked)
        "temp_mean": 25.0,  # Default room temp
        "temp_slope": 0.0,  # No thermal trend in simplified sim
        
        # Residual Trend
        "res_slope": np.polyfit(range(len(res_vals)), res_vals, 1)[0] if len(res_vals) > 1 else 0.0,
    }
    
    return pd.DataFrame([features])

def calculate_fusion_residual(voltage, omega_sensor, current_sensor):
    """
    Calculate physics-based fusion residual using Ohm's Law.
    Expected Current = (V - Ke*omega) / R
    Residual = |Measured Current - Expected Current|
    """
    expected_current = (voltage - KE * omega_sensor) / R
    return np.abs(current_sensor - expected_current)
