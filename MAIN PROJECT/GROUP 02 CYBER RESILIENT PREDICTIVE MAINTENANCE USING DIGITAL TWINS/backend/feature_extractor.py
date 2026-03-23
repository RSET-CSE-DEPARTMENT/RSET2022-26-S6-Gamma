"""
Feature extractor for the pump-twin-standalone backend.
Computes the 9 features the XGBoost model was trained on,
using Kalman filter innovation and physics-based fusion residuals.
"""
import numpy as np
import pandas as pd
from scipy.stats import kurtosis
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent / "EmergentUI" / "backend"))
from kalman_filter import MotorKalmanFilter

# Physics constants matching the simulation
KE = 0.1   # Back-EMF constant
R  = 2.0   # Resistance (Ohms)

FEATURE_NAMES = [
    "innov_mean",
    "innov_std",
    "innov_kurtosis",
    "innov_crest",
    "fusion_res_mean",
    "fusion_res_std",
    "temp_mean",
    "temp_slope",
    "res_slope",
]

WINDOW_SIZE = 50


def extract_features(sim_results: list, dt: float = 0.02) -> pd.DataFrame:
    """
    Run Kalman filter over simulation output and extract windowed features.

    Args:
        sim_results: list of dicts from DigitalTwinSimulation.run()
        dt: simulation time step

    Returns:
        DataFrame with one row per window, columns = FEATURE_NAMES
    """
    df = pd.DataFrame(sim_results)

    # --- Kalman filter pass to get innovation signal ---
    kf = MotorKalmanFilter(dt=dt)
    innovations = []
    residuals = []

    for _, row in df.iterrows():
        voltage = row.get("voltage", 12.0)
        omega_s = row.get("omega_sensor", 0.0)

        # Handle NaN (packet dropout attack)
        if pd.isna(omega_s):
            omega_s = 0.0

        _, innov = kf.filter(voltage, omega_s)
        innovations.append(innov)

        # Physics-based fusion residual: |I_sensor - I_expected|
        I_expected = (voltage - KE * omega_s) / R
        I_sensor   = row.get("current_sensor", I_expected)
        if pd.isna(I_sensor):
            I_sensor = I_expected
        residuals.append(abs(I_sensor - I_expected))

    df["innov"]    = innovations
    df["curr_res"] = residuals

    # --- Sliding window feature extraction ---
    rows = []
    n = len(df)
    for start in range(0, n - WINDOW_SIZE + 1, 1):
        window = df.iloc[start : start + WINDOW_SIZE]
        rows.append(_features_from_window(window))

    if not rows:
        # Simulation too short for a full window — use all available data
        rows.append(_features_from_window(df))

    return pd.DataFrame(rows, columns=FEATURE_NAMES)


def _safe_float(v: float, fallback: float = 0.0) -> float:
    """Return a finite float, replacing NaN/inf with fallback."""
    try:
        f = float(v)
        return fallback if (np.isnan(f) or np.isinf(f)) else f
    except (TypeError, ValueError):
        return fallback


def _features_from_window(window: pd.DataFrame) -> list:
    innov = window["innov"].fillna(0).values
    curr_res = window["curr_res"].fillna(0).values
    temp = window.get("temp_sensor", pd.Series([25.0] * len(window))).fillna(25.0).values
    t_idx = np.arange(len(window))

    rms_innov = np.sqrt(np.mean(innov ** 2)) + 1e-9

    innov_mean     = _safe_float(np.mean(innov))
    innov_std      = _safe_float(np.std(innov))
    innov_kurt     = _safe_float(kurtosis(innov) if len(innov) > 3 else 0.0)
    innov_crest    = _safe_float(np.max(np.abs(innov)) / rms_innov)

    fusion_mean    = _safe_float(np.mean(curr_res))
    fusion_std     = _safe_float(np.std(curr_res))

    temp_mean      = _safe_float(np.mean(temp))
    temp_slope     = _safe_float(np.polyfit(t_idx, temp, 1)[0] if len(temp) > 1 else 0.0)

    res_slope      = _safe_float(np.polyfit(t_idx, curr_res, 1)[0] if len(curr_res) > 1 else 0.0)

    return [
        innov_mean, innov_std, innov_kurt, innov_crest,
        fusion_mean, fusion_std,
        temp_mean, temp_slope,
        res_slope,
    ]
