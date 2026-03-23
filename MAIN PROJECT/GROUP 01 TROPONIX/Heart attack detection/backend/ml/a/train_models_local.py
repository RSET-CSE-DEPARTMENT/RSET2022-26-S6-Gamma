"""
Robust training script for both datasets (Heart + MI).
Saves models and scalers with filenames used by backend:
 - ebm_model.pkl           (Heart model, 7 features)
 - scaler_dataset1.pkl     (Heart scaler)
 - ebm_model1.pkl          (MI model, 4 features)
 - scaler_dataset2.pkl     (MI scaler)

Also saves feature order JSONs:
 - feature_map_heart.json
 - feature_map_mi.json
"""

import json
import os
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score, roc_auc_score
)
from sklearn.model_selection import train_test_split, StratifiedKFold, cross_val_score
from sklearn.preprocessing import StandardScaler
import joblib

# -------------------------
# Config - filenames & columns
# -------------------------
BASE_DIR = Path(__file__).resolve().parent

# Input CSVs (update if needed)
HEART_CSV = BASE_DIR / "Balanced_Chol_Trig_CRPL_Dataset.csv"
MI_CSV = BASE_DIR / "MI_Augmented_10k_Cleaned.csv"

# Output filenames (matching backend expectation)
HEART_MODEL_OUT = BASE_DIR / "ebm_model.pkl"
HEART_SCALER_OUT = BASE_DIR / "scaler_dataset1.pkl"
HEART_FEATURES_JSON = BASE_DIR / "feature_map_heart.json"

MI_MODEL_OUT = BASE_DIR / "ebm_model1.pkl"
MI_SCALER_OUT = BASE_DIR / "scaler_dataset2.pkl"
MI_FEATURES_JSON = BASE_DIR / "feature_map_mi.json"

# Exact feature lists we want (semantic names)
HEART_FEATURES_PREFERRED = [
    "Age", "Gender", "BMI", "Cholesterol", "Triglyceride", "CRP Level", "Homocysteine"
]

# MI features
MI_FEATURES_PREFERRED = [
    "Age", "Gender", "Troponin", "CK_MB"
]

# Label column names (allow alternatives)
HEART_LABEL_COL = "Heart Disease Status"   # values like Yes/No
MI_LABEL_COL = "MI_Label"                  # values like Positive/Negative

# -------------------------
# Utilities
# -------------------------
def find_real_columns(df, preferred_list):
    """
    Given a dataframe and a list of preferred column names, try to match real columns.
    Allows common variations (case-insensitive, underscores, truncated words).
    Returns a list of matched column names in the same order as preferred_list.
    Raises if any required column cannot be matched.
    """
    cols = list(df.columns)
    normalized = {c.lower().replace(" ", "").replace("_", ""): c for c in cols}

    matched = []
    for want in preferred_list:
        key = want.lower().replace(" ", "").replace("_", "")
        # exact/close match
        if key in normalized:
            matched.append(normalized[key])
            continue
        # try heuristics: startswith or contains
        found = None
        for k, orig in normalized.items():
            if k.startswith(key) or key.startswith(k) or key in k or k in key:
                found = orig
                break
        if found:
            matched.append(found)
        else:
            raise KeyError(f"Could not find column matching '{want}' in CSV. Available columns: {cols}")
    return matched


def prepare_Xy(df, feature_names, label_col, label_map=None, dropna_label=True):
    """
    Prepare X, y:
    - df: pandas DataFrame
    - feature_names: list of actual dataframe columns to use (in order)
    - label_col: name of label column in df
    - label_map: optional mapping (e.g., {"Positive":1, "Negative":0})
    """
    df = df.copy()
    # drop rows where label is missing
    if dropna_label:
        df = df.dropna(subset=[label_col])
    # map labels if needed
    if label_map is None:
        # auto map: strings -> 1/0 (Positive/Yes ->1)
        sample = df[label_col].dropna().astype(str).unique().tolist()
        # a simple heuristic
        if any(s.lower().startswith("pos") or s.lower().startswith("yes") for s in sample):
            label_map = {s: (1 if s.lower().startswith("pos") or s.lower().startswith("yes") else 0) for s in sample}
        else:
            # fallback: take two unique values and map first->0 second->1
            vals = sorted(sample)[:2]
            if len(vals) >= 2:
                label_map = {vals[0]: 0, vals[1]: 1}
            else:
                label_map = {sample[0]: 0}

    y = df[label_col].map(label_map).astype(int)
    X = df[feature_names].copy()
    return X, y, label_map


def train_and_save(X, y, scaler_out, model_out, feature_json_out, random_state=42):
    """
    Scale, train, evaluate, and save model + scaler + feature order JSON.
    Returns trained model and scaler.
    """
    # simple missing-value handling: fill numeric NA with median
    X = X.copy()
    for col in X.columns:
        if X[col].dtype.kind in "biufc":  # numeric
            med = X[col].median()
            X[col] = X[col].fillna(med)
        else:
            # try to coerce to numeric if possible
            X[col] = pd.to_numeric(X[col], errors="coerce")
            med = X[col].median()
            X[col] = X[col].fillna(med)

    # train/test split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, stratify=y, test_size=0.2, random_state=random_state
    )

    # scaling
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    # model
    model = RandomForestClassifier(n_estimators=200, random_state=random_state, class_weight="balanced")
    model.fit(X_train_scaled, y_train)

    # evaluation
    y_pred = model.predict(X_test_scaled)
    if hasattr(model, "predict_proba"):
        y_proba = model.predict_proba(X_test_scaled)[:, 1]
    else:
        y_proba = None

    acc = accuracy_score(y_test, y_pred)
    prec = precision_score(y_test, y_pred, zero_division=0)
    rec = recall_score(y_test, y_pred, zero_division=0)
    f1 = f1_score(y_test, y_pred, zero_division=0)
    auc = roc_auc_score(y_test, y_proba) if y_proba is not None else None

    print("Eval: acc=%.4f precision=%.4f recall=%.4f f1=%.4f auc=%s" % (acc, prec, rec, f1, str(auc)))

    # feature importances
    importances = model.feature_importances_
    fi = sorted(zip(X.columns.tolist(), importances), key=lambda x: x[1], reverse=True)
    print("Top feature importances:")
    for name, imp in fi[:10]:
        print("  ", name, imp)

    # Save artifacts
    joblib.dump(model, model_out)
    joblib.dump(scaler, scaler_out)

    feature_map = {"feature_names_in_order": X.columns.tolist()}
    with open(feature_json_out, "w") as f:
        json.dump(feature_map, f, indent=2)

    print("Saved model:", model_out)
    print("Saved scaler:", scaler_out)
    print("Saved feature map:", feature_json_out)
    return model, scaler


# -------------------------
# TRAIN HEART MODEL
# -------------------------
def train_heart():
    print("Loading heart CSV:", HEART_CSV)
    df = pd.read_csv(HEART_CSV)
    # find actual columns for the preferred names
    actual_cols = find_real_columns(df, HEART_FEATURES_PREFERRED)
    print("Heart feature columns mapped to:", actual_cols)
    X, y, label_map = prepare_Xy(df, actual_cols, HEART_LABEL_COL)

    print("Heart label mapping:", label_map)
    print("Training Heart model with shape:", X.shape)

    model, scaler = train_and_save(X, y, HEART_SCALER_OUT, HEART_MODEL_OUT, HEART_FEATURES_JSON)
    return model, scaler


# -------------------------
# TRAIN MI MODEL
# -------------------------
def train_mi():
    print("Loading MI CSV:", MI_CSV)
    df = pd.read_csv(MI_CSV)
    # Map features
    actual_cols = find_real_columns(df, MI_FEATURES_PREFERRED)
    print("MI feature columns mapped to:", actual_cols)
    X, y, label_map = prepare_Xy(df, actual_cols, MI_LABEL_COL)

    print("MI label mapping:", label_map)
    print("Training MI model with shape:", X.shape)

    model, scaler = train_and_save(X, y, MI_SCALER_OUT, MI_MODEL_OUT, MI_FEATURES_JSON)
    return model, scaler


if __name__ == "__main__":
    # Train Heart first (dataset1), then MI (dataset2)
    train_heart()
    train_mi()
    print("All training completed.")
