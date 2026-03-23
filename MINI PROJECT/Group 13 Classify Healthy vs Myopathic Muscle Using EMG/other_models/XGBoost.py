import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from sklearn.model_selection import GroupShuffleSplit
from sklearn.metrics import (
    accuracy_score, classification_report, roc_curve,
    roc_auc_score, precision_recall_curve, average_precision_score,
    log_loss
)
import xgboost as xgb
import joblib

# --- Load dataset ---
df = pd.read_csv("features_dataset.csv")  # Update path if needed

# --- Drop rows with NaNs ---
df = df.dropna()

# --- Prepare data ---
X = df.drop(columns=["Segment_ID", "Label", "Patient_ID"])
y = df["Label"].map({'H': 0, 'M': 1})
groups = df["Patient_ID"]

# --- Group-aware split ---
gss = GroupShuffleSplit(n_splits=1, test_size=0.3, random_state=42)
for train_idx, test_idx in gss.split(X, y, groups):
    X_train, X_test = X.iloc[train_idx], X.iloc[test_idx]
    y_train, y_test = y.iloc[train_idx], y.iloc[test_idx]

# --- XGBoost Classifier ---
model = xgb.XGBClassifier(
    n_estimators=300,
    learning_rate=0.05,
    max_depth=6,
    subsample=0.8,
    colsample_bytree=0.8,
    use_label_encoder=False,
    eval_metric='logloss',
    random_state=42
)
model.fit(X_train, y_train)

# --- Predictions ---
y_pred = model.predict(X_test)
y_prob = model.predict_proba(X_test)[:, 1]

# --- Metrics ---
acc = accuracy_score(y_test, y_pred)
logloss = log_loss(y_test, y_prob)
roc_auc = roc_auc_score(y_test, y_prob)
avg_precision = average_precision_score(y_test, y_prob)

print(f"\nAccuracy: {acc:.4f}")
print(f"Log Loss: {logloss:.4f}")
print(f"ROC AUC: {roc_auc:.4f}")
print(f"Average Precision (PR AUC): {avg_precision:.4f}")
print("\nClassification Report:\n", classification_report(y_test, y_pred))

# --- Save model ---
joblib.dump(model, "results/xgboost_model.pkl")

# --- ROC Curve ---
fpr, tpr, _ = roc_curve(y_test, y_prob)
plt.figure()
plt.plot(fpr, tpr, label=f"ROC Curve (AUC = {roc_auc:.2f})", color='darkorange')
plt.plot([0, 1], [0, 1], linestyle="--", color="gray")
plt.xlabel("False Positive Rate")
plt.ylabel("True Positive Rate")
plt.title("ROC Curve")
plt.legend()
plt.grid(True)
plt.savefig("results/roc_curve_xgb.png")
plt.close()

# --- Precision-Recall Curve ---
precision, recall, _ = precision_recall_curve(y_test, y_prob)
plt.figure()
plt.plot(recall, precision, label=f"AP = {avg_precision:.2f}", color='blue')
plt.xlabel("Recall")
plt.ylabel("Precision")
plt.title("Precision-Recall Curve")
plt.legend()
plt.grid(True)
plt.savefig("results/precision_recall_xgb.png")
plt.close()

# --- Log Loss (Line Plot) ---
losses = []
for i in range(len(y_prob)):
    loss = - (y_test.iloc[i]*np.log(y_prob[i]) + (1 - y_test.iloc[i])*np.log(1 - y_prob[i]))
    losses.append(loss)

plt.figure()
plt.plot(losses, color='red')
plt.xlabel("Sample Index")
plt.ylabel("Log Loss")
plt.title("Sample-wise Log Loss")
plt.grid(True)
plt.savefig("results/log_loss_line_xgb.png")
plt.close()

print("\n✅ XGBoost training complete. All results saved to `results/` folder.")

