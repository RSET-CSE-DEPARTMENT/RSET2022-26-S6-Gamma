# EBM Model 1 – Chol/Trig/CRP Biomarker Model (Clean Version)

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
# 0. Path setup (IMPORTANT FIX)
# ==============================
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

DATA_PATH = os.path.join(
    BASE_DIR,
    "a",
    "Balanced_Chol_Trig_CRPL_Dataset.csv"
)

MODEL_DIR = os.path.join(BASE_DIR, "models")
os.makedirs(MODEL_DIR, exist_ok=True)

# ==============================
# 1. Load dataset
# ==============================
df = pd.read_csv(DATA_PATH)
df = df.dropna(subset=["Heart Disease Status"])
# Encode target labels: No = 0, Yes = 1
df["Heart Disease Status"] = df["Heart Disease Status"].map({
    "No": 0,
    "Yes": 1
})

# Features & labels
X = df.drop("Heart Disease Status", axis=1)
y = df["Heart Disease Status"]

EXPECTED_COLS = [
    "Age", "Gender", "BMI",
    "Cholesterol Level", "Triglyceride Level",
    "CRP Level", "Homocysteine Level"
]

assert list(X.columns) == EXPECTED_COLS, (
    f"Dataset columns must be {EXPECTED_COLS}"
)

# ==============================
# 2. Train-test split
# ==============================
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

# Scaling
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)

# ==============================
# 3. Train EBM model
# ==============================
ebm = ExplainableBoostingClassifier(
    random_state=42,
    interactions=0
)

ebm.fit(X_train_scaled, y_train)

# ==============================
# 4. Evaluation
# ==============================
y_pred = ebm.predict(X_test_scaled)
y_prob = ebm.predict_proba(X_test_scaled)[:, 1]

print("\n=== EBM MODEL 1 (Biomarker Model) ===")
print("Accuracy:", accuracy_score(y_test, y_pred))
print("Precision:", precision_score(y_test, y_pred))
print("Recall:", recall_score(y_test, y_pred))
print("F1-Score:", f1_score(y_test, y_pred))
print("AUC:", roc_auc_score(y_test, y_prob))
print("Confusion Matrix:\n", confusion_matrix(y_test, y_pred))

# ==============================
# 5. Save model & scaler
# ==============================
joblib.dump(
    ebm,
    os.path.join(MODEL_DIR, "ebm_model_dataset1.pkl")
)
joblib.dump(
    scaler,
    os.path.join(MODEL_DIR, "scaler_dataset1.pkl")
)

print("\n✔ Model & scaler saved to models/ folder")

# ==============================
# 6. SHAP Global Explanation
# ==============================
explainer = shap.Explainer(ebm, X_train_scaled)
shap_values = explainer(X_test_scaled)

shap.summary_plot(
    shap_values,
    X_test,
    feature_names=EXPECTED_COLS
)

# ==============================
# 7. Test sample prediction
# ==============================
sample = np.array([[45, 0, 34, 172, 377, 13.3, 19.7]])
sample_scaled = scaler.transform(sample)

pred = ebm.predict(sample_scaled)[0]
prob = ebm.predict_proba(sample_scaled)[0][1]

print("\n🔎 NEW SAMPLE PREDICTION")
print("Prediction:", "Positive" if pred == 1 else "Negative")
print("Probability:", round(prob, 4))

# ==============================
# 8. Local SHAP Explanation
# ==============================
shap_single = explainer(sample_scaled)
shap.plots.waterfall(shap_single[0])
