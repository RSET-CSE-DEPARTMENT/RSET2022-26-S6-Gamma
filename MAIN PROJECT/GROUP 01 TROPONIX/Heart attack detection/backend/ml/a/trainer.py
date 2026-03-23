import pandas as pd
import numpy as np
import joblib
from sklearn.preprocessing import StandardScaler
from interpret.glassbox import ExplainableBoostingClassifier
import os
# ===============================
# LOAD DATA
# ===============================
BASE_DIR = os.path.dirname(__file__)
csv_path = os.path.join(BASE_DIR, "MI_Temporal_Augmented.csv")

df = pd.read_csv(csv_path)
# ===============================
# FEATURES & LABEL
# ===============================
FEATURES = [
    "Age",
    "Gender",
    "Troponin",
    "Troponin_1h",
    "Troponin_2h",
    "CK_MB"
]

TARGET = "MI_Label"

X = df[FEATURES]
y = df[TARGET]

# ===============================
# SCALE FEATURES
# ===============================
scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)

# ===============================
# CCEAM / EBM MODEL
# ===============================
model = ExplainableBoostingClassifier(
    max_bins=256,
    learning_rate=0.01,
    interactions=0,
    random_state=42
)

model.fit(X_scaled, y)

# ===============================
# SAVE MODEL & SCALER
# ===============================
joblib.dump(model, "cceam_temporal_model.pkl")
joblib.dump(scaler, "cceam_temporal_scaler.pkl")

print("✅ CCEAM Temporal MI Risk Model trained successfully")
print("Saved files:")
print(" - cceam_temporal_model.pkl")
print(" - cceam_temporal_scaler.pkl")
