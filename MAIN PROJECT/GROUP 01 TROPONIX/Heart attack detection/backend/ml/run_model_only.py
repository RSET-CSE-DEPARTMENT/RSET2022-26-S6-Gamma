import pandas as pd

from model import ExplainableAdditiveModel
from temporal_features import extract_temporal_troponin_features


# ================================
# Load trained CC-EAM model
# ================================
model = ExplainableAdditiveModel.load_model("models/model_eam.pkl")


# ================================
# Example patient (temporal)
# ================================
troponin_values = [0.02, 0.11, 0.38]
troponin_times = [0, 60, 120]

temporal = extract_temporal_troponin_features(
    troponin_values,
    troponin_times
)

patient = {
    "Age": 58,
    "Gender": 1,
    "CK_MB": 32,
    **temporal
}

X = pd.DataFrame([patient])


# ================================
# Run prediction
# ================================
prob = float(model.predict_proba(X)[0])
label = "MI" if prob >= 0.5 else "No MI"

explanation, prob_check = model.explain_instance(X.iloc[0])


# ================================
# Output
# ================================
print("\n--- CC-EAM Prediction (Standalone) ---")
print(f"Predicted MI Risk: {prob*100:.2f}%")
print(f"Decision: {label}")

print("\nFeature-level contributions:")
for f, v, c in explanation:
    print(f"  {f}: value={v}, contribution={c:.4f}")
