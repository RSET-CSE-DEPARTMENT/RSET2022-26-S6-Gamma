# EBM Model 2 – MI Troponin/CK-MB Model (FINAL CLEAN VERSION)

import os
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from interpret.glassbox import ExplainableBoostingClassifier
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score,
    f1_score, roc_auc_score, confusion_matrix
)
import shap
import joblib
import matplotlib.pyplot as plt

# ==============================
# 0. Path setup (CRITICAL)
# ==============================
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

DATA_PATH = os.path.join(
    BASE_DIR,
    "a",
    "MI_Augmented_10k_Cleaned.csv"
)

MODEL_DIR = os.path.join(BASE_DIR, "models")
os.makedirs(MODEL_DIR, exist_ok=True)

# ==============================
# 1. Load dataset
# ==============================
df = pd.read_csv(DATA_PATH)

# ------------------------------
# FIX LABELS (ROOT CAUSE FIX)
# ------------------------------
# Drop missing labels
df = df.dropna(subset=["MI_Label"])

# Normalize label strings if needed
if df["MI_Label"].dtype == object:
    df["MI_Label"] = (
        df["MI_Label"]
        .astype(str)
        .str.strip()
        .str.lower()
    )

    df["MI_Label"] = df["MI_Label"].map({
        "no": 0,
        "yes": 1,
        "negative": 0,
        "positive": 1,
        "non-mi": 0,
        "mi": 1,
        "0": 0,
        "1": 1
    })

# Drop rows that still failed mapping
df = df.dropna(subset=["MI_Label"])

# Convert to int (sklearn-safe)
df["MI_Label"] = df["MI_Label"].astype(int)

# 🔎 Sanity check (keep once)
print("Label distribution:\n", df["MI_Label"].value_counts())

# ==============================
# 2. Features & labels
# ==============================
X = df.drop("MI_Label", axis=1)
y = df["MI_Label"]

EXPECTED_COLS = ["Age", "Gender", "Troponin", "CK_MB"]
assert list(X.columns) == EXPECTED_COLS, (
    f"Dataset columns must be {EXPECTED_COLS}"
)

# ==============================
# 3. Train-test split
# ==============================
X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.2,
    random_state=42,
    stratify=y
)

# Scaling
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)

# ==============================
# 4. Train EBM model
# ==============================
ebm = ExplainableBoostingClassifier(
    random_state=42,
    interactions=0
)

ebm.fit(X_train_scaled, y_train)

# ==============================
# 5. Evaluation
# ==============================
y_pred = ebm.predict(X_test_scaled)
y_prob = ebm.predict_proba(X_test_scaled)[:, 1]

print("\n=== EBM MODEL 2 (MI Model) ===")
print("Accuracy:", accuracy_score(y_test, y_pred))
print("Precision:", precision_score(y_test, y_pred))
print("Recall:", recall_score(y_test, y_pred))
print("F1-Score:", f1_score(y_test, y_pred))
print("AUC:", roc_auc_score(y_test, y_prob))
print("Confusion Matrix:\n", confusion_matrix(y_test, y_pred))

# ==============================
# 6. Save model & scaler
# ==============================
joblib.dump(
    ebm,
    os.path.join(MODEL_DIR, "ebm_model_dataset2.pkl")
)
joblib.dump(
    scaler,
    os.path.join(MODEL_DIR, "scaler_dataset2.pkl")
)

print("\n✔ Model & scaler saved to models/ folder")

# ==============================
# 7. SHAP Global Explanation
# ==============================
explainer = shap.Explainer(ebm, X_train_scaled)
shap_values = explainer(X_test_scaled)

shap.summary_plot(
    shap_values,
    X_test,
    feature_names=EXPECTED_COLS
)

# ==============================
# 8. Test prediction example
# ==============================
sample = np.array([[45, 0, 0.02, 7.7]])  # Age, Gender, Troponin, CK_MB
sample_scaled = scaler.transform(sample)

pred = ebm.predict(sample_scaled)[0]
prob = ebm.predict_proba(sample_scaled)[0][1]

print("\n🔎 NEW SAMPLE PREDICTION")
print("Prediction:", "Positive (MI)" if pred == 1 else "Negative (No MI)")
print("Probability:", round(prob, 4))

# ==============================
# 9. Local SHAP Explanation
# ==============================
shap_single = explainer(sample_scaled)
shap.plots.waterfall(shap_single[0])
