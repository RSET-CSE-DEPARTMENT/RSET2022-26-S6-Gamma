import os
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, roc_auc_score

from model import ExplainableAdditiveModel
from temporal_features import extract_temporal_troponin_features


# ================================
# Paths
# ================================
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(BASE_DIR, "a/MI_Temporal_Augmented.csv")
MODEL_DIR = os.path.join(BASE_DIR, "models")
os.makedirs(MODEL_DIR, exist_ok=True)


# ================================
# Load dataset
# ================================
df = pd.read_csv(DATA_PATH)
print("Loaded columns:", df.columns.tolist())


# ================================
# Validate required columns
# ================================
REQUIRED_COLS = [
    "Age",
    "Gender",
    "CK_MB",
    "Troponin",
    "Troponin_1h",
    "Troponin_2h",
    "MI_Label",
]

for col in REQUIRED_COLS:
    if col not in df.columns:
        raise ValueError(f"Missing required column: {col}")

print("All required columns present.")


# ================================
# Label preprocessing (ROBUST)
# ================================
y = df["MI_Label"]

if y.dtype == object:
    y = (
        y.astype(str)
         .str.strip()
         .str.lower()
         .map({
             "positive": 1,
             "yes": 1,
             "true": 1,
             "1": 1,
             "negative": 0,
             "no": 0,
             "false": 0,
             "0": 0
         })
    )

if y.isnull().any():
    bad_vals = df.loc[y.isnull(), "MI_Label"].unique()
    raise ValueError(f"Unexpected MI_Label values: {bad_vals}")

y = y.astype(int)

print("Label distribution:")
print(y.value_counts())


# ================================
# Temporal feature construction
# ================================
rows = []

for _, r in df.iterrows():
    temporal = extract_temporal_troponin_features(
        values=[
            r["Troponin"],
            r["Troponin_1h"],
            r["Troponin_2h"]
        ],
        times=[0, 60, 120]
    )

    rows.append({
        "Age": r["Age"],
        "Gender": r["Gender"],
        "CK_MB": r["CK_MB"],
        **temporal
    })

X = pd.DataFrame(rows)

print("\nFinal training features:")
print(list(X.columns))


# ================================
# Train / test split
# ================================
X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.2,
    random_state=42,
    stratify=y
)


# ================================
# Initialize CC-EAM (TEMPORAL)
# ================================
model = ExplainableAdditiveModel(
    features=list(X.columns),
    n_bins=10,
    lr=0.01,
    epochs=50
)


# ================================
# Medical monotonic constraints
# ================================
model.set_constraints({
    "Age": "increasing",
    "Troponin_Peak": "increasing",
    "Troponin_Delta": "increasing",
    "Troponin_Slope": "increasing",
    "Troponin_AUC": "increasing"
})


# ================================
# Train
# ================================
model.fit(X_train, y_train)


# ================================
# Evaluate
# ================================
probs_test = model.predict_proba(X_test)
preds_test = (probs_test >= 0.5).astype(int)

print("\n--- Evaluation ---")
print("Accuracy:", accuracy_score(y_test, preds_test))
print("Test ROC-AUC:", roc_auc_score(y_test, probs_test))

probs_train = model.predict_proba(X_train)
print("Train ROC-AUC:", roc_auc_score(y_train, probs_train))


# ================================
# Save artifacts (REQUIRED FOR API)
# ================================
model.save_model(os.path.join(MODEL_DIR, "model_eam.pkl"))
X_train.to_csv(os.path.join(MODEL_DIR, "X_train.csv"), index=False)
y_train.to_csv(os.path.join(MODEL_DIR, "y_train.csv"), index=False)

print("\n✅ Temporal CC-EAM training COMPLETE")
print("Saved:")
print(" - models/model_eam.pkl")
print(" - models/X_train.csv")
print(" - models/y_train.csv")
