import pandas as pd
import joblib
from sklearn.ensemble import RandomForestRegressor
import os
# ===============================
# LOAD DATA
# ===============================
BASE_DIR = os.path.dirname(__file__)
csv_path = os.path.join(BASE_DIR, "MI_Temporal_Augmented.csv")

df = pd.read_csv(csv_path)
# ===============================
# INPUT FEATURES
# ===============================
X = df[["Troponin", "CK_MB"]]

# ===============================
# TARGETS
# ===============================
y_1h = df["Troponin_1h"]
y_2h = df["Troponin_2h"]

# ===============================
# TRAIN 1H MODEL
# ===============================
model_1h = RandomForestRegressor(
    n_estimators=300,
    max_depth=10,
    random_state=42
)

model_1h.fit(X, y_1h)

# ===============================
# TRAIN 2H MODEL
# ===============================
model_2h = RandomForestRegressor(
    n_estimators=300,
    max_depth=10,
    random_state=42
)

model_2h.fit(X, y_2h)

# ===============================
# SAVE MODELS
# ===============================
joblib.dump(model_1h, "troponin_1h_model.pkl")
joblib.dump(model_2h, "troponin_2h_model.pkl")

print("✅ Troponin temporal models trained successfully")
print("Saved files:")
print(" - troponin_1h_model.pkl")
print(" - troponin_2h_model.pkl")
