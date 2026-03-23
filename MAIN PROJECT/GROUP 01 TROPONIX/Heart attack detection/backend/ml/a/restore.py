# ============================================================
# 0H → 1H & 2H TROOPNIN PREDICTION (FIXED FOR YOUR DATASET)
# ============================================================

import pandas as pd
import numpy as np

from sklearn.model_selection import train_test_split
from sklearn.multioutput import MultiOutputRegressor
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, r2_score
import joblib

# ------------------------------------------------------------
# 1. LOAD DATASET
# ------------------------------------------------------------
df = pd.read_csv("MI_Temporal_Augmented.csv")

print("Dataset shape:", df.shape)
print(df.head())

# ------------------------------------------------------------
# 2. DEFINE FEATURES (MATCHING YOUR COLUMNS)
# ------------------------------------------------------------
# INPUTS: ONLY 0-hour data
X = df[
    [
        "Troponin",   # 0h
        "CK_MB",      # 0h
        "Age",
        "Gender"
    ]
]

# OUTPUTS: future values
y = df[
    [
        "Troponin_1h",
        "Troponin_2h"
    ]
]

# ------------------------------------------------------------
# 3. TRAIN / TEST SPLIT
# ------------------------------------------------------------
X_train, X_test, y_train, y_test = train_test_split(
    X, y,
    test_size=0.2,
    random_state=42
)

print("Training samples:", X_train.shape[0])
print("Testing samples:", X_test.shape[0])

# ------------------------------------------------------------
# 4. MODEL DEFINITION
# ------------------------------------------------------------
model = MultiOutputRegressor(
    RandomForestRegressor(
        n_estimators=300,
        max_depth=10,
        random_state=42,
        n_jobs=-1
    )
)

# ------------------------------------------------------------
# 5. TRAIN MODEL
# ------------------------------------------------------------
model.fit(X_train, y_train)
print("Model training complete.")

# ------------------------------------------------------------
# 6. EVALUATION
# ------------------------------------------------------------
y_pred = model.predict(X_test)

mae_1h = mean_absolute_error(y_test.iloc[:, 0], y_pred[:, 0])
mae_2h = mean_absolute_error(y_test.iloc[:, 1], y_pred[:, 1])

r2_1h = r2_score(y_test.iloc[:, 0], y_pred[:, 0])
r2_2h = r2_score(y_test.iloc[:, 1], y_pred[:, 1])

print("\n--- MODEL PERFORMANCE ---")
print(f"MAE (1h): {mae_1h:.4f}")
print(f"MAE (2h): {mae_2h:.4f}")
print(f"R²  (1h): {r2_1h:.3f}")
print(f"R²  (2h): {r2_2h:.3f}")

# ------------------------------------------------------------
# 7. SAVE MODEL
# ------------------------------------------------------------
joblib.dump(model, "troponin_0h_to_1h_2h_model.pkl")
print("\nModel saved as troponin_0h_to_1h_2h_model.pkl")

# ------------------------------------------------------------
# 8. PREDICT FOR A NEW PATIENT (ONLY 0H KNOWN)
# ------------------------------------------------------------
# ------------------------------------------------------------
# 8. ACCEPT TEMPORARY PATIENT INPUT (RUNTIME)
# ------------------------------------------------------------
print("\n--- ENTER PATIENT ADMISSION VALUES (0H) ---")

troponin_0h = float(input("Enter Troponin (0h): "))
ckmb_0h = float(input("Enter CK-MB (0h): "))
age = int(input("Enter Age: "))
gender = int(input("Enter Gender (1 = Male, 0 = Female): "))

new_patient_0h = pd.DataFrame([
    {
        "Troponin": troponin_0h,
        "CK_MB": ckmb_0h,
        "Age": age,
        "Gender": gender
    }
])

# ------------------------------------------------------------
# 9. PREDICT 1H & 2H
# ------------------------------------------------------------
pred_1h, pred_2h = model.predict(new_patient_0h)[0]

print("\n--- TEMPORAL PREDICTION RESULT ---")
print(f"Predicted Troponin at 1 hour : {pred_1h:.4f}")
print(f"Predicted Troponin at 2 hours: {pred_2h:.4f}")

# ------------------------------------------------------------
# 10. RISK STRATIFICATION
# ------------------------------------------------------------
def risk_label(trop_2h):
    if trop_2h < 0.04:
        return "LOW RISK"
    elif trop_2h < 0.4:
        return "MODERATE RISK"
    else:
        return "HIGH RISK"

risk = risk_label(pred_2h)

print("\n--- RISK ASSESSMENT ---")
print("Predicted Risk Category:", risk)


# ------------------------------------------------------------
# 9. RISK STRATIFICATION
# ------------------------------------------------------------
def risk_label(trop_2h):
    if trop_2h < 0.04:
        return "LOW RISK"
    elif trop_2h < 0.4:
        return "MODERATE RISK"
    else:
        return "HIGH RISK"

risk = risk_label(pred_2h)
print("Predicted Risk Category:", risk)

# ------------------------------------------------------------
# 10. DISCLAIMER
# ------------------------------------------------------------
print("""
NOTE:
This model predicts expected troponin trajectories using
population-level patterns and does NOT replace serial
laboratory testing or clinical judgment.
""")
