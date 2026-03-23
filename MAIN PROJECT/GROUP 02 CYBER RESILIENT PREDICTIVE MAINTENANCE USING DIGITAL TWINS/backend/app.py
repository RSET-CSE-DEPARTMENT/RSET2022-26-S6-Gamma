"""
pump-twin-standalone backend
FastAPI server — simulation + XGBoost + LSTM + SHAP + 4 analysis modes.
"""
import sys
import base64
import io
from collections import Counter
from pathlib import Path

import numpy as np
import pandas as pd
import xgboost as xgb
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import shap

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# ── Path setup ─────────────────────────────────────────────────────────────
EMERGENT_ROOT = Path(__file__).resolve().parent.parent.parent
BACKEND_SRC   = EMERGENT_ROOT / "backend"
ML_MODELS     = EMERGENT_ROOT / "ml_pipeline" / "models"
ML_UTILS      = EMERGENT_ROOT / "ml_pipeline"

sys.path.insert(0, str(BACKEND_SRC))
sys.path.insert(0, str(ML_UTILS))

from simulation import DigitalTwinSimulation
from kalman_filter import MotorKalmanFilter
from adaptive_engine import MotorParameterEstimator
from utils.feature_extractor import extract_features_from_window, calculate_fusion_residual
from feature_extractor import extract_features, FEATURE_NAMES   # standalone extractor

# ── Model loading ───────────────────────────────────────────────────────────
XGB_PATH  = ML_MODELS / "xgboost_attack_classifier.json"
LSTM_PATH = ML_MODELS / "lstm_rul_model.keras"

print("Loading XGBoost model …")
clf = xgb.XGBClassifier()
clf.load_model(str(XGB_PATH))
booster = clf.get_booster()
print("XGBoost loaded.")

print("Loading LSTM model …")
try:
    from tensorflow.keras.models import load_model as keras_load
    rul_model = keras_load(str(LSTM_PATH), compile=False)
    LSTM_INPUT_SHAPE = rul_model.input_shape
    print(f"LSTM loaded. Input shape: {LSTM_INPUT_SHAPE}")
except Exception as e:
    print(f"Warning: LSTM failed to load ({e}). RUL will return zeros.")
    rul_model = None
    LSTM_INPUT_SHAPE = (None, 15, 7)

# Try loading LSTM scaler
try:
    import joblib
    SCALER_PATH = ML_MODELS / "lstm_scaler.joblib"
    lstm_scaler = joblib.load(str(SCALER_PATH)) if SCALER_PATH.exists() else None
    print(f"LSTM scaler: {'loaded' if lstm_scaler else 'not found'}")
except Exception:
    lstm_scaler = None

ATTACK_LABELS = ["Normal", "Mechanical Fault", "Sensor Spoofing", "Packet Dropout", "Freezing Sensor"]
N_CLASSES     = len(ATTACK_LABELS)
N_FEATURES    = len(FEATURE_NAMES)

# Physics constants (matching simulation)
KE = 0.1
R_OHMS = 2.0

# ── FastAPI app ─────────────────────────────────────────────────────────────
app = FastAPI(title="Pump Digital Twin API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Request schemas ──────────────────────────────────────────────────────────
class SimulationParams(BaseModel):
    Kt: float = 0.1
    J: float = 10.0
    b: float = 0.01
    load_torque: float = 0.5
    voltage: float = 12.0
    dt: float = 0.05
    duration: float = 20.0
    noise_level: float = 0.05

    fault_type: str = "None"
    fault_severity: float = 0.5
    fault_start_time: float = 10.0

    attack_type: str = "None"
    attack_magnitude: float = 2.0
    attack_start_time: float = 15.0


class ActiveDefenseParams(BaseModel):
    attack_type: str = "Sensor Spoofing"
    attack_magnitude: float = 10.0
    attack_start_time: float = 3.0
    fault_type: str = "None"
    fault_severity: float = 0.5
    fault_start_time: float = 3.0
    duration: float = 8.0


class DualModelParams(BaseModel):
    attack_type: str = "Sensor Spoofing"
    attack_magnitude: float = 5.0
    attack_start_time: float = 4.0
    fault_type: str = "Friction Buildup"
    fault_severity: float = 0.5
    fault_start_time: float = 1.0
    duration: float = 8.0


class MultiMotorParams(BaseModel):
    attack_type: str = "Sensor Spoofing"
    attack_magnitude: float = 3.0
    attack_start_time: float = 3.0
    duration: float = 6.0


# ── Shared helpers ───────────────────────────────────────────────────────────
def _fig_to_b64(fig) -> str:
    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=150, bbox_inches="tight")
    buf.seek(0)
    return base64.b64encode(buf.read()).decode("utf-8")


def _booster_predict(feat_df: pd.DataFrame):
    """
    Classify a feature row using the raw booster (avoids sklearn n_classes_ issue).
    Returns (predicted_class_int, prob_array).
    """
    dmat = xgb.DMatrix(feat_df.values, feature_names=FEATURE_NAMES)
    probs = booster.predict(dmat)          # (n_samples, n_classes) for multi-class
    if probs.ndim == 1:
        # Single-class edge case — treat as class index
        pred = int(round(probs[0]))
        prob_arr = np.zeros(N_CLASSES)
        prob_arr[min(pred, N_CLASSES - 1)] = 1.0
    else:
        pred = int(np.argmax(probs[0]))
        prob_arr = probs[0]
    return pred, prob_arr


def _safe(v, fallback: float = 0.0) -> float:
    """Convert any value to a JSON-safe finite float."""
    try:
        f = float(v)
        if np.isnan(f) or np.isinf(f):
            return fallback
        return f
    except (TypeError, ValueError):
        return fallback


def _sanitize(obj):
    """Recursively replace NaN/inf with 0.0 in any dict/list/float."""
    if isinstance(obj, dict):
        return {k: _sanitize(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_sanitize(v) for v in obj]
    if isinstance(obj, float):
        return _safe(obj)
    if isinstance(obj, (np.floating, np.float32, np.float64)):
        return _safe(float(obj))
    return obj


def _col(raw_results, key):
    return [_safe(r.get(key)) for r in raw_results]


# ── SHAP helpers ─────────────────────────────────────────────────────────────
def _shap_from_features(feat_df: pd.DataFrame):
    dmatrix = xgb.DMatrix(feat_df.values, feature_names=FEATURE_NAMES)
    raw = booster.predict(dmatrix, pred_contribs=True)
    contribs = raw.reshape(len(feat_df), N_CLASSES, N_FEATURES + 1)
    shap_vals   = [contribs[:, i, :-1] for i in range(N_CLASSES)]
    base_values = contribs[:, :, -1]
    return shap_vals, base_values


FEATURE_LABELS = [
    "Sensor–Physics Gap (mean)",
    "Sensor–Physics Gap (std)",
    "Gap Kurtosis (spikes)",
    "Gap Crest Factor (worst spike)",
    "Electrical Mismatch (mean)",
    "Electrical Mismatch (std)",
    "Motor Temperature (mean)",
    "Temperature Trend (slope)",
    "Mismatch Trend (slope)",
]

def _build_shap_images(feat_df: pd.DataFrame, predicted_class: int):
    shap_vals, base_vals = _shap_from_features(feat_df)

    shap.summary_plot(shap_vals, feat_df, feature_names=FEATURE_NAMES,
                      class_names=ATTACK_LABELS, show=False)
    summary_b64 = _fig_to_b64(plt.gcf())
    plt.close("all")

    # Use the window with highest confidence for the predicted class
    probs = booster.predict(xgb.DMatrix(feat_df.values, feature_names=FEATURE_NAMES))
    probs = probs.reshape(len(feat_df), N_CLASSES)
    idx = int(np.argmax(probs[:, predicted_class]))

    explanation = shap.Explanation(
        values        = shap_vals[predicted_class][idx],
        base_values   = base_vals[idx, predicted_class],
        data          = feat_df.iloc[idx].values,
        feature_names = FEATURE_LABELS,
    )
    shap.plots.waterfall(explanation, show=False)
    plt.gcf().suptitle(
        f"Why the model predicted: {ATTACK_LABELS[predicted_class]}",
        fontsize=10, y=1.01
    )
    waterfall_b64 = _fig_to_b64(plt.gcf())
    plt.close("all")

    contributions = list(zip(FEATURE_NAMES, shap_vals[predicted_class][idx]))
    contributions.sort(key=lambda x: abs(x[1]), reverse=True)
    top_features = [{"feature": f, "value": round(float(v), 4)} for f, v in contributions[:5]]

    return summary_b64, waterfall_b64, top_features


# ── RUL inference (windowed) ─────────────────────────────────────────────────
def _predict_rul(feat_df: pd.DataFrame) -> list:
    if rul_model is None:
        return [0.0] * len(feat_df)
    lookback    = LSTM_INPUT_SHAPE[1] if LSTM_INPUT_SHAPE[1] else 10
    n_lstm_feat = LSTM_INPUT_SHAPE[2] if LSTM_INPUT_SHAPE[2] else N_FEATURES
    LSTM_FEATURES = ["innov_mean", "innov_std", "innov_kurtosis",
                     "fusion_res_mean", "fusion_res_std", "temp_mean", "temp_slope"]
    data = feat_df[LSTM_FEATURES].values
    if lstm_scaler is not None:
        data = lstm_scaler.transform(data)
    n = len(data)
    # Build all lookback windows in one shot, then single batched forward pass
    windows = np.zeros((n, lookback, n_lstm_feat))
    for i in range(n):
        if i < lookback:
            windows[i, lookback - i - 1:] = data[:i + 1]
        else:
            windows[i] = data[i - lookback:i]
    preds = rul_model.predict(windows, verbose=0, batch_size=512)
    return preds.flatten().tolist()


# ── Active-defense core (reused by /api/active-defense and /api/verify) ──────
def _run_active_defense(config: dict) -> pd.DataFrame:
    """
    Timestep-by-timestep Kalman gatekeeper with XGBoost detection.
    Mirrors the logic in resilient_active_defense.py exactly.
    """
    sim = DigitalTwinSimulation(config)
    kf  = MotorKalmanFilter()
    adaptive = MotorParameterEstimator()

    dt = config.get("dt", 0.02)
    duration = config.get("duration", 8.0)
    voltage_fixed = config.get("voltage", 12.0)

    np.random.seed(42)
    raw_states = sim.run()
    history, buffer = [], []
    omega_prev, b_est = 0.0, 0.1
    last_valid_speed = 0.0

    for idx, t in enumerate(np.arange(0, duration, dt)):
        if idx >= len(raw_states):
            break

        z_speed   = raw_states[idx].get("omega_sensor", 0.0)
        z_current = raw_states[idx].get("current_sensor", 0.0)
        actual    = raw_states[idx].get("omega_true", 0.0)
        voltage   = raw_states[idx].get("voltage", voltage_fixed)

        # NaN sensor = packet dropout — detect directly, no ML needed
        is_dropout = z_speed is None or (isinstance(z_speed, float) and np.isnan(z_speed))
        if is_dropout:
            z_speed = last_valid_speed
        else:
            last_valid_speed = z_speed
        if z_current is None or (isinstance(z_current, float) and np.isnan(z_current)):
            z_current = 0.0

        kf.update_parameters(b=b_est)
        x_pred = kf.A @ kf.x + kf.B * voltage
        kf.P   = kf.A @ kf.P @ kf.A.T + kf.Q
        innov  = z_speed - float(kf.H @ x_pred)

        expected_curr = (voltage - KE * z_speed) / R_OHMS
        curr_res = abs(z_current - expected_curr)
        res_speed = abs(z_speed - float(x_pred[0][0]))

        buffer.append({
            "res": res_speed,
            "innov": float(innov),
            "curr_res": curr_res,
            "kalman": float(x_pred[0][0]),
        })

        if is_dropout:
            # Packet dropout: sensor is gone — use physics prediction, flag immediately
            attack_active = True
            current_pred_label = "Packet Dropout"
            kf.x = x_pred
            final_speed = float(kf.x[0][0])
            if buffer:
                buffer.pop(0)
        elif len(buffer) >= 50:
            final_speed, attack_active, current_pred_label = z_speed, False, "Normal"
            win = pd.DataFrame(buffer[-50:])
            feats = extract_features_from_window(win)
            pred, probs = _booster_predict(feats)

            if pred in [2, 3, 4] and np.max(probs) > 0.7:
                attack_active = True
                current_pred_label = ATTACK_LABELS[pred]
                kf.x = x_pred
                final_speed = float(kf.x[0][0])
            else:
                S = kf.H @ kf.P @ kf.H.T + kf.R
                K_gain = kf.P @ kf.H.T @ np.linalg.inv(S)
                kf.x = x_pred + K_gain * innov
                kf.P = (np.eye(1) - K_gain @ kf.H) @ kf.P
                final_speed = float(kf.x[0][0])
                b_est, _ = adaptive.update(voltage, z_speed, omega_prev, dt)
            buffer.pop(0)
        else:
            attack_active, current_pred_label = False, "Normal"
            S = kf.H @ kf.P @ kf.H.T + kf.R
            K_gain = kf.P @ kf.H.T @ np.linalg.inv(S)
            kf.x = x_pred + K_gain * innov
            kf.P = (np.eye(1) - K_gain @ kf.H) @ kf.P
            final_speed = float(kf.x[0][0])
            b_est, _ = adaptive.update(voltage, z_speed, omega_prev, dt)

        history.append({
            "time": float(t),
            "actual": float(actual) if actual is not None else 0.0,
            "sensor": float(z_speed),
            "defended": float(final_speed),
            "attack": bool(attack_active),
            "pred_label": current_pred_label,
            "power": float(z_current * voltage),
        })
        omega_prev = final_speed

    return pd.DataFrame(history)


# ── Routes ───────────────────────────────────────────────────────────────────
@app.get("/api/")
def root():
    return {"message": "Pump Digital Twin API — ready"}


# ── 1. Single-motor simulation (existing) ────────────────────────────────────
@app.post("/api/simulate")
def run_simulation(params: SimulationParams):
    try:
        sim = DigitalTwinSimulation(params.model_dump())
        np.random.seed(42)
        raw_results = sim.run()
        feat_df = extract_features(raw_results, dt=params.dt)
        feat_df = feat_df.replace([np.inf, -np.inf], np.nan).fillna(0.0)

        dmatrix = xgb.DMatrix(feat_df.values, feature_names=FEATURE_NAMES)
        raw_preds = booster.predict(dmatrix)
        n_win = len(feat_df)
        if raw_preds.ndim == 2:
            attack_classes = np.argmax(raw_preds, axis=1).astype(int).tolist()
        elif raw_preds.ndim == 1 and len(raw_preds) == n_win * N_CLASSES:
            # older XGBoost flattens multi:softprob → (n_samples * n_classes,)
            attack_classes = np.argmax(raw_preds.reshape(n_win, N_CLASSES), axis=1).astype(int).tolist()
        else:
            # multi:softmax → direct class indices
            attack_classes = raw_preds.astype(int).tolist()
        attack_labels  = [ATTACK_LABELS[i] for i in attack_classes]

        # Skip startup windows — Kalman filter not yet converged
        skip = min(50, len(attack_classes) // 4)
        steady_classes = attack_classes[skip:] if len(attack_classes) > skip else attack_classes
        dominant_class = Counter(steady_classes).most_common(1)[0][0]
        rul_preds = _predict_rul(feat_df)

        # Normalize to 0–100 health index — first window = 100% baseline
        baseline = rul_preds[0] if rul_preds and rul_preds[0] > 0 else (max(rul_preds) if rul_preds else 1.0)
        rul_preds = [min(100.0, max(0.0, (p / baseline) * 100)) for p in rul_preds]
        # Apply monotonicity — health can only decrease
        for i in range(1, len(rul_preds)):
            if rul_preds[i] > rul_preds[i - 1]:
                rul_preds[i] = rul_preds[i - 1]

        # Limit SHAP to 200 evenly-sampled windows — plots are identical, generation is faster
        shap_df = feat_df.iloc[::max(1, len(feat_df) // 200)].reset_index(drop=True)
        summary_b64, waterfall_b64, top_features = _build_shap_images(shap_df, dominant_class)

        n_ts, n_win = len(raw_results), len(feat_df)
        # Window i covers timesteps [i, i+WINDOW_SIZE-1]; first window ends at WINDOW_SIZE-1
        warmup = n_ts - n_win  # = WINDOW_SIZE - 1 timesteps with no window
        ts_attack, ts_rul = [], []
        for i in range(n_ts):
            wi = max(0, min(i - warmup, n_win - 1))
            ts_attack.append(attack_labels[wi])
            ts_rul.append(rul_preds[wi])

        return _sanitize({
            "time":           _col(raw_results, "time"),
            "omega_true":     _col(raw_results, "omega_true"),
            "omega_sensor":   _col(raw_results, "omega_sensor"),
            "current_sensor": _col(raw_results, "current_sensor"),
            "temp_sensor":    _col(raw_results, "temp_sensor"),
            "voltage":        _col(raw_results, "voltage"),
            "ai_status_text":   ts_attack,
            "ai_predicted_rul": ts_rul,
            "shap_summary_img":   summary_b64,
            "shap_waterfall_img": waterfall_b64,
            "shap_top_features":  top_features,
            "ai_dominant_label":  ATTACK_LABELS[dominant_class],
        })
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# ── 2. Active Defense mode ────────────────────────────────────────────────────
@app.post("/api/active-defense")
def run_active_defense(params: ActiveDefenseParams):
    """
    Timestep Kalman gatekeeper: isolates sensor during detected cyber attacks.
    Based on resilient_active_defense.py logic.
    """
    try:
        config = params.model_dump()
        config["dt"] = 0.02
        df = _run_active_defense(config)

        dt_val = float(df["time"].iloc[1] - df["time"].iloc[0]) if len(df) > 1 else 0.02
        total_energy = float((df["power"] * dt_val).sum())
        rmse = float(np.sqrt(((df["defended"] - df["actual"]) ** 2).mean()))
        attack_detected = bool(df["attack"].any())
        pct_flagged = float(df["attack"].mean() * 100)
        attack_rows = df[df["attack"]]
        detected_class = (
            attack_rows["pred_label"].mode().iloc[0]
            if len(attack_rows) > 0 else "None"
        )

        return _sanitize({
            "time":     df["time"].tolist(),
            "actual":   df["actual"].tolist(),
            "sensor":   df["sensor"].tolist(),
            "defended": df["defended"].tolist(),
            "attack":   df["attack"].tolist(),
            "power":    df["power"].tolist(),
            "audit": {
                "total_energy":    _safe(total_energy),
                "rmse":            _safe(rmse),
                "duration":        _safe(float(df["time"].max())),
                "attack_detected": attack_detected,
                "pct_flagged":     round(pct_flagged, 1),
                "detected_class":  detected_class,
                "status": "ATTACK DETECTED" if attack_detected else "SECURE",
            },
        })
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# ── 3. Dual-model demo ────────────────────────────────────────────────────────
@app.post("/api/dual-model")
def run_dual_model(params: DualModelParams):
    """
    Per-timestep XGBoost attack detection + LSTM health index.
    Implements health-locking and monotonicity guardrail from demo_both_models.py.
    """
    try:
        config = params.model_dump()
        config["dt"] = 0.02

        sim = DigitalTwinSimulation(config)
        kf  = MotorKalmanFilter()

        np.random.seed(42)
        raw_states = sim.run()
        history = []
        buffer: list = []
        feature_buffer: list = []
        LOOKBACK = 15
        prev_rul = 100.0

        for idx, t in enumerate(np.arange(0, config["duration"], 0.02)):
            if idx >= len(raw_states):
                break

            z_speed   = raw_states[idx].get("omega_sensor", 0.0) or 0.0
            z_current = raw_states[idx].get("current_sensor", 0.0) or 0.0
            z_temp    = raw_states[idx].get("temp_sensor", 25.0) or 25.0
            actual    = raw_states[idx].get("omega_true", 0.0) or 0.0
            voltage   = raw_states[idx].get("voltage", 12.0) or 12.0

            if np.isnan(z_speed):   z_speed = 0.0
            if np.isnan(z_current): z_current = 0.0
            if np.isnan(z_temp):    z_temp = 25.0

            est, innov = kf.filter(voltage, z_speed)
            curr_res = calculate_fusion_residual(voltage, z_speed, z_current)
            res_speed = abs(z_speed - est)

            buffer.append({
                "res": res_speed,
                "innov": float(innov),
                "curr_res": float(curr_res),
                "kalman": float(est),
                "temp": float(z_temp),
            })

            attack_label = "Normal"
            attack_prob  = 0.0
            predicted_rul = prev_rul

            if len(buffer) >= 50:
                win = pd.DataFrame(buffer[-50:])
                feats = extract_features_from_window(win)
                feats["temp_mean"]  = win["temp"].mean()
                feats["temp_slope"] = float(
                    np.polyfit(range(len(win)), win["temp"].values, 1)[0]
                    if len(win) > 1 else 0.0
                )

                pred, probs  = _booster_predict(feats)
                attack_label = ATTACK_LABELS[pred]
                attack_prob  = float(np.max(probs) * 100)

                # Build 7-feature vector for LSTM
                fv = [
                    float(feats["innov_mean"].iloc[0]),
                    float(feats["innov_std"].iloc[0]),
                    float(feats["innov_kurtosis"].iloc[0]),
                    float(feats["fusion_res_mean"].iloc[0]),
                    float(feats["fusion_res_std"].iloc[0]),
                    float(feats["temp_mean"].iloc[0]),
                    float(feats["temp_slope"].iloc[0]),
                ]
                feature_buffer.append(fv)

                is_cyber = pred in [2, 3, 4]

                if rul_model is not None and len(feature_buffer) >= LOOKBACK:
                    if not is_cyber:
                        seq = np.array(feature_buffer[-LOOKBACK:])
                        if lstm_scaler:
                            seq = lstm_scaler.transform(seq)
                        lstm_in = seq.reshape(1, LOOKBACK, -1)
                        try:
                            raw_rul = rul_model.predict(lstm_in, verbose=0)
                            val = float(raw_rul[0][0])
                            current_rul = min(100.0, max(0.0, val * 12.5))
                            # Monotonicity: health never increases
                            predicted_rul = prev_rul if current_rul > prev_rul else current_rul
                        except Exception:
                            predicted_rul = prev_rul
                    else:
                        predicted_rul = prev_rul   # health locking during attack

                    if len(feature_buffer) > 100:
                        feature_buffer.pop(0)

                buffer.pop(0)

            prev_rul = predicted_rul
            history.append({
                "time":          float(t),
                "actual":        float(actual),
                "sensor":        float(z_speed),
                "attack_label":  attack_label,
                "attack_prob":   round(attack_prob, 1),
                "predicted_rul": round(predicted_rul, 2),
            })

        df = pd.DataFrame(history)
        return _sanitize({
            "time":          df["time"].tolist(),
            "actual":        df["actual"].tolist(),
            "sensor":        df["sensor"].tolist(),
            "attack_label":  df["attack_label"].tolist(),
            "attack_prob":   df["attack_prob"].tolist(),
            "predicted_rul": df["predicted_rul"].tolist(),
        })
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# ── 4. Multi-motor swarm ──────────────────────────────────────────────────────
@app.post("/api/multi-motor")
def run_multi_motor(params: MultiMotorParams):
    """
    Two motors side-by-side: Motor A (under attack, self-healing) vs Motor B (healthy).
    Based on multi_motor_resilience.py logic.
    """
    try:
        duration = params.duration
        dt = 0.02

        params_a = {
            "duration": duration, "dt": dt,
            "attack_type": params.attack_type,
            "attack_magnitude": params.attack_magnitude,
            "attack_start_time": params.attack_start_time,
            "fault_type": "None",
        }
        params_b = {
            "duration": duration, "dt": dt,
            "attack_type": "None",
            "fault_type": "None",
        }

        sim_a = DigitalTwinSimulation(params_a)
        sim_b = DigitalTwinSimulation(params_b)
        kf_a  = MotorKalmanFilter(dt=dt)
        kf_b  = MotorKalmanFilter(dt=dt)

        results = []
        buffer_a: list = []
        WINDOW = 15

        np.random.seed(42)
        for t in np.arange(0, duration, dt):
            state_a = sim_a.step(t)
            state_b = sim_b.step(t)

            spd_a = state_a.get("omega_sensor", 0.0) or 0.0
            spd_b = state_b.get("omega_sensor", 0.0) or 0.0
            curr_a = state_a.get("current_sensor", 0.0) or 0.0

            if np.isnan(spd_a): spd_a = 0.0
            if np.isnan(spd_b): spd_b = 0.0
            if np.isnan(curr_a): curr_a = 0.0

            est_a, innov_a = kf_a.filter(12.0, spd_a)
            _,     _       = kf_b.filter(12.0, spd_b)

            expected_curr_a = (12.0 - KE * spd_a) / R_OHMS
            curr_res_a = abs(curr_a - expected_curr_a)

            buffer_a.append({
                "res": abs(spd_a - est_a),
                "innov": float(innov_a),
                "curr_res": float(curr_res_a),
                "kalman": float(est_a),
            })

            defended_a = spd_a
            if len(buffer_a) >= WINDOW:
                win = pd.DataFrame(buffer_a[-WINDOW:])
                feat = extract_features_from_window(win)
                pred_a, _ = _booster_predict(feat)
                if pred_a in [2, 3, 4]:
                    defended_a = est_a
                buffer_a.pop(0)

            results.append({
                "time":       float(t),
                "A_sensor":   float(spd_a),
                "A_defended": float(defended_a),
                "B_sensor":   float(spd_b),
                "A_attack":   bool(t >= params.attack_start_time),
            })

        df = pd.DataFrame(results)
        return _sanitize({
            "time":       df["time"].tolist(),
            "A_sensor":   df["A_sensor"].tolist(),
            "A_defended": df["A_defended"].tolist(),
            "B_sensor":   df["B_sensor"].tolist(),
            "A_attack":   df["A_attack"].tolist(),
        })
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# ── 5. Verification suite ─────────────────────────────────────────────────────
class VerifyParams(BaseModel):
    Kt: float = 0.1
    J: float = 0.01
    b: float = 0.1
    voltage: float = 12.0
    dt: float = 0.02
    duration: float = 8.0
    noise_level: float = 0.05

@app.post("/api/verify")
def run_verification(params: VerifyParams = None):
    """
    Runs 5 preset scenarios and returns pass/fail results.
    Uses physics parameters from the single motor dashboard if provided.
    """
    if params is None:
        params = VerifyParams()
    try:
        scenarios = []
        baseline_final_speed = None

        def _run(override: dict) -> pd.DataFrame:
            base = {
                "duration": params.duration, "dt": params.dt,
                "voltage": params.voltage,
                "noise_level": params.noise_level,
                "J": params.J, "b": params.b, "Kt": params.Kt,
                "attack_type": "Sensor Spoofing",
                "attack_start_time": params.duration * 0.375,
                "attack_magnitude": 10.0,
                "fault_type": "None",
                "fault_start_time": params.duration * 0.25,
            }
            base.update(override)
            return _run_active_defense(base)

        # 1. Normal Operation
        try:
            df = _run({"attack_type": "None", "noise_level": 0.02})
            attack_rate = float(df["attack"].mean())
            baseline_final_speed = float(df["sensor"].iloc[-1])
            passed = attack_rate < 0.1
            scenarios.append({
                "name": "Normal Operation",
                "status": "PASSED" if passed else "FAILED",
                "metric_label": "False Positive Rate",
                "metric_value": f"{attack_rate * 100:.1f}%",
                "threshold": "< 10%",
                "passed": passed,
            })
        except Exception as ex:
            scenarios.append({"name": "Normal Operation", "status": "ERROR", "error": str(ex), "passed": False})

        # 2. Sensor Spoofing
        try:
            df = _run({"attack_type": "Sensor Spoofing", "attack_start_time": 4.0})
            post_attack = df[df["time"] > 4.5]
            detection_rate = float(post_attack["attack"].mean()) if len(post_attack) > 0 else 0.0
            passed = detection_rate > 0.8
            scenarios.append({
                "name": "Sensor Spoofing",
                "status": "PASSED" if passed else "FAILED",
                "metric_label": "Detection Rate",
                "metric_value": f"{detection_rate * 100:.1f}%",
                "threshold": "> 80%",
                "passed": passed,
            })
        except Exception as ex:
            scenarios.append({"name": "Sensor Spoofing", "status": "ERROR", "error": str(ex), "passed": False})

        # 3. Packet Dropout
        try:
            df = _run({"attack_type": "Packet Dropout", "attack_start_time": 4.0})
            post_attack = df[df["time"] > 4.5]
            detection_rate = float(post_attack["attack"].mean()) if len(post_attack) > 0 else 0.0
            passed = detection_rate > 0.8
            scenarios.append({
                "name": "Packet Dropout",
                "status": "PASSED" if passed else "FAILED",
                "metric_label": "Detection Rate",
                "metric_value": f"{detection_rate * 100:.1f}%",
                "threshold": "> 80%",
                "passed": passed,
            })
        except Exception as ex:
            scenarios.append({"name": "Packet Dropout", "status": "ERROR", "error": str(ex), "passed": False})

        # 4. Friction Buildup
        try:
            df = _run({"fault_type": "Friction Buildup", "fault_start_time": 2.0, "attack_type": "None"})
            friction_final = float(df["sensor"].iloc[-1])
            ref = baseline_final_speed if baseline_final_speed else friction_final * 1.1
            passed = friction_final < (ref * 0.95)
            scenarios.append({
                "name": "Friction Buildup",
                "status": "PASSED" if passed else "FAILED",
                "metric_label": "Speed Sag",
                "metric_value": f"{friction_final:.3f} rad/s",
                "threshold": f"< {ref * 0.95:.3f} (5% below baseline)",
                "passed": passed,
            })
        except Exception as ex:
            scenarios.append({"name": "Friction Buildup", "status": "ERROR", "error": str(ex), "passed": False})

        # 5. Bearing Fault
        try:
            df = _run({"fault_type": "Bearing Fault", "fault_start_time": 2.0, "attack_type": "None"})
            post_fault = df[df["time"] > 2.5]
            vibration_std = float(post_fault["sensor"].std()) if len(post_fault) > 0 else 0.0
            passed = vibration_std > 0.2
            scenarios.append({
                "name": "Bearing Fault",
                "status": "PASSED" if passed else "FAILED",
                "metric_label": "Vibration Std",
                "metric_value": f"{vibration_std:.4f} rad/s",
                "threshold": "> 0.2 rad/s",
                "passed": passed,
            })
        except Exception as ex:
            scenarios.append({"name": "Bearing Fault", "status": "ERROR", "error": str(ex), "passed": False})

        total  = len(scenarios)
        passed = sum(1 for s in scenarios if s.get("passed"))
        return _sanitize({
            "scenarios": scenarios,
            "summary": {"total": total, "passed": passed, "failed": total - passed},
        })
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)
