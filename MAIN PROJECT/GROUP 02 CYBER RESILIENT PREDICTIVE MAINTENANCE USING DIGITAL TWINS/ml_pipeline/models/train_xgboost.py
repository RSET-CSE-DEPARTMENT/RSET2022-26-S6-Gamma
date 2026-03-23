import pandas as pd
import xgboost as xgb
import os
import joblib # Added to save the imputer
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix
from sklearn.impute import SimpleImputer 
from imblearn.over_sampling import SMOTE 
import seaborn as sns
import matplotlib.pyplot as plt

# =====================
# 1. CONFIG & DIRECTORIES
# =====================
DATA_PATH = "ml_pipeline/data/window_features.csv"
MODEL_DIR = "ml_pipeline/models"
MODEL_SAVE_PATH = os.path.join(MODEL_DIR, "xgboost_attack_classifier.json")
IMPUTER_SAVE_PATH = os.path.join(MODEL_DIR, "imputer.joblib")

os.makedirs(MODEL_DIR, exist_ok=True)

# =====================
# 2. LOAD & CLEAN DATA
# =====================
if not os.path.exists(DATA_PATH):
    print(f"[ERROR] Error: {DATA_PATH} not found. Run build_windows.py first.")
    exit()

df = pd.read_csv(DATA_PATH)

# Dropping non-feature columns
# Ensure 'label' is our target and 'RUL'/'run_id' are removed
X = df.drop(columns=["label", "run_id", "RUL"])
y = df["label"]

# FIX: Save the imputer state
# We need the same imputer in the 'active_defense' script to handle live NaNs
imputer = SimpleImputer(strategy='mean')
X_clean = imputer.fit_transform(X)
X_clean = pd.DataFrame(X_clean, columns=X.columns)
joblib.dump(imputer, IMPUTER_SAVE_PATH) # Save for production use

# =====================
# 3. BALANCING (SMOTE)
# =====================
print(f"Original distribution: {dict(y.value_counts())}")
smote = SMOTE(random_state=42)
X_resampled, y_resampled = smote.fit_resample(X_clean, y)
print(f"Balanced distribution: {dict(y_resampled.value_counts())}")



# =====================
# 4. TRAIN / TEST SPLIT
# =====================
X_train, X_test, y_train, y_test = train_test_split(
    X_resampled, y_resampled, test_size=0.20, random_state=42, stratify=y_resampled
)

# =====================
# 5. MULTI-CLASS MODEL
# =====================
# We use 'multi:softprob' to get the confidence levels for the XAI alerts
model = xgb.XGBClassifier(
    objective="multi:softprob",
    num_class=5,
    n_estimators=200,        
    max_depth=6,             
    learning_rate=0.1,      
    subsample=0.8,           
    colsample_bytree=0.8,    
    eval_metric="mlogloss",
    random_state=42
)

print("Training XGBoost Guardkeeper...")
model.fit(X_train, y_train)

# =====================
# 6. EVALUATION
# =====================
y_pred = model.predict(X_test)
target_names = ["Normal", "Fault", "Spoofing", "Dropout", "Freeze"]

print("\n" + "="*35)
print("     SECURITY CLASSIFICATION REPORT")
print("="*35)
print(classification_report(y_test, y_pred, target_names=target_names))

# =====================
# 7. SAVE & VISUALIZE
# =====================
model.save_model(MODEL_SAVE_PATH)
print(f"[OK] Model saved to {MODEL_SAVE_PATH}")

# Confusion Matrix Heatmap
cm = confusion_matrix(y_test, y_pred)
plt.figure(figsize=(10, 7))
sns.heatmap(cm, annot=True, fmt='d', cmap='Greens',
            xticklabels=target_names, 
            yticklabels=target_names)
plt.title("XGBoost Security Classifier Performance")
plt.ylabel("Actual Threat Type")
plt.xlabel("Predicted Threat Type")
plt.show()

# Feature Importance (Crucial for explaining 'Reason' in defense script)
xgb.plot_importance(model, max_num_features=10)
plt.title("Top Security Signal Indicators")
plt.show()