# Cyber-Resilient Digital Twin — DC Motor Pump

A full-stack digital twin platform for a DC motor-driven pump that combines physics simulation, Kalman state estimation, XGBoost cyber-attack classification, LSTM remaining-useful-life (RUL) prediction, and SHAP explainability into a single interactive dashboard.

---

## What it does

The system continuously monitors a DC motor pump by comparing what the sensor reports against what the physics model predicts. When those two disagree in a pattern the AI recognises, it raises an alarm and switches to physics-only (defended) speed estimates so the control system is never fed corrupt data.

| Threat / Condition | What the system does |
|--------------------|----------------------|
| Sensor Spoofing | Detects via physics mismatch; Kalman gatekeeper ignores sensor |
| Packet Dropout | Detects via erratic innovation signal; falls back to prediction |
| Freezing Sensor | Detects via flat innovation; holds last good estimate |
| Friction Buildup | Detected by temperature slope + speed sag |
| Bearing Fault | Detected by kurtosis spikes in innovation signal |
| Normal operation | < 10 % false-positive rate confirmed by verification suite |

---

## Architecture

```
DC Motor Physics  ──►  Kalman Filter  ──►  XGBoost Classifier  ──►  Alert / Gatekeeper
  Simulation               (state           (5-class, 9 features)     (freeze sensor
  (simulation.py)          estimation)                                  update step)
                                │
                                ▼
                         LSTM RUL Model  ──►  Health Index (0–100 %)
                         (health-locked        monotonically decreasing
                          during attacks)
                                │
                                ▼
                         SHAP Explainability
                         (feature importance
                          per classification window)
```

**9 XGBoost features** extracted from a rolling 50-timestep window:

| Feature | What it measures |
|---------|-----------------|
| `innov_mean` | Average sensor-vs-physics gap |
| `innov_std` | Variability of that gap |
| `innov_kurtosis` | Rare sharp spikes (bearing / dropout signature) |
| `innov_crest` | Worst single spike vs. typical level |
| `fusion_res_mean` | Ohm's Law cross-check: voltage/current vs. speed |
| `fusion_res_std` | Variability of electrical-mechanical mismatch |
| `temp_mean` | Average motor temperature |
| `temp_slope` | Temperature trend (friction early warning) |
| `res_slope` | Trend in speed residual |

---

## Dashboard modes

| Tab | What it shows |
|-----|--------------|
| **Single Motor** | Full simulation with SHAP explanation for each run |
| **Active Defense** | Per-timestep Kalman gatekeeper — true / sensor / defended speed |
| **Dual Model** | XGBoost confidence scatter + LSTM health index together |
| **Multi-Motor** | Motor A (attacked) vs Motor B (healthy observer) |
| **Verification** | 5 automated pass/fail scenarios |

---

## Project structure

```
MainProject/
├── EmergentUI/                    # Core ML pipeline (do not modify)
│   ├── backend/
│   │   ├── simulation.py          # DC motor physics + fault/attack injection
│   │   ├── kalman_filter.py       # Extended Kalman filter
│   │   └── adaptive_engine.py     # Online parameter estimator
│   └── ml_pipeline/
│       ├── models/
│       │   ├── xgboost_attack_classifier.json
│       │   └── lstm_rul_model.keras
│       ├── features/
│       │   ├── build_windows.py   # Feature extraction pipeline
│       │   └── batch_generate.py  # Training data generator
│       └── utils/
│           └── feature_extractor.py
│
└── pump-twin-standalone/          # Standalone app (this repo)
    ├── backend/
    │   ├── app.py                 # FastAPI server (all 5 endpoints)
    │   └── feature_extractor.py   # Standalone feature extraction
    └── frontend/
        └── src/components/
            ├── Dashboard.jsx
            ├── ControlPanel.jsx
            ├── ResultsViewer.jsx
            ├── ShapViewer.jsx
            ├── ActiveDefenseView.jsx
            ├── DualModelView.jsx
            ├── MultiMotorView.jsx
            └── VerificationView.jsx
```

---

## Running locally

**Backend** (Python 3.10+)
```bash
cd pump-twin-standalone/backend
pip install fastapi uvicorn xgboost tensorflow shap pandas numpy scipy
uvicorn app:app --reload --port 8002
```

**Frontend** (Node 18+)
```bash
cd pump-twin-standalone/frontend
npm install
npm start          # opens http://localhost:3000
```

---

## Models

| Model | Algorithm | Training data | Task |
|-------|-----------|---------------|------|
| `xgboost_attack_classifier.json` | XGBoost (5-class) | Synthetic motor runs with injected attacks/faults | Classify each 50-step window |
| `lstm_rul_model.keras` | LSTM (sequence regression) | Same dataset, health index labels | Predict remaining useful life (0–100 %) |

Both models are pre-trained. Results are deterministic (`np.random.seed(42)` applied before every simulation).

---

## Key design decisions

- **Kalman gatekeeper**: When XGBoost detects a cyber attack with > 70 % confidence, the Kalman update step is skipped — the filter uses its physics prediction only. The sensor is effectively isolated without stopping the control loop.
- **Health locking**: LSTM health index is frozen during detected attack windows — preventing false "recovery" artifacts caused by sensor corruption.
- **Monotonicity guardrail**: Health index is never allowed to increase, matching real degradation physics.
- **Defense-in-depth NaN protection**: `_safe_float()` at feature extraction + `_sanitize()` at JSON serialization — ensures no NaN/inf can reach the HTTP response.
