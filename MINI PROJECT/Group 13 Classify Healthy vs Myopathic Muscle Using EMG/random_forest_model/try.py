import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report, precision_recall_curve, log_loss
import joblib

# Load dataset
file_path = "/home/user/emg/merged_features.csv"
df = pd.read_csv(file_path)

# Separate features and labels
X = df.drop(columns=["Label"])
y = df["Label"].map({"healthy": 0, "unhealthy": 1})  # Convert labels to numeric values

# Split dataset into training and testing sets
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

# Normalize features
scaler = StandardScaler()
X_train = scaler.fit_transform(X_train)
X_test = scaler.transform(X_test)

# Train Random Forest Classifier with multiple trees for loss visualization
n_estimators = [10, 50, 100, 200, 300]  # Different tree numbers for loss curve
log_losses = []

for n in n_estimators:
    model = RandomForestClassifier(n_estimators=n, random_state=n)  # Vary random state slightly
    model.fit(X_train, y_train)
    
    y_pred_prob = model.predict_proba(X_test)
    loss = log_loss(y_test, y_pred_prob)
    log_losses.append(loss)

# Final Model Training (100 Trees as Default)
final_model = RandomForestClassifier(n_estimators=100, random_state=42)
final_model.fit(X_train, y_train)

# Evaluate final model
y_pred_train = final_model.predict(X_train)
y_pred_test = final_model.predict(X_test)
accuracy_train = accuracy_score(y_train, y_pred_train)
accuracy_test = accuracy_score(y_test, y_pred_test)
print(f"Train Accuracy: {accuracy_train:.2f}")
print(f"Test Accuracy: {accuracy_test:.2f}")
print("Classification Report:")
print(classification_report(y_test, y_pred_test))

# Save trained model
joblib.dump(final_model, "emg_model.pkl")
joblib.dump(scaler, "scaler.pkl")
print("Model and scaler saved.")

# ---- PLOTTING ----

## 📊 1️⃣ Precision-Recall Curve for Healthy & Unhealthy Classes
y_scores = final_model.predict_proba(X_test)[:, 1]  # Probability of being unhealthy
precision_unhealthy, recall_unhealthy, _ = precision_recall_curve(y_test, y_scores)

precision_healthy, recall_healthy, _ = precision_recall_curve(1 - y_test, 1 - y_scores)  # Fix for healthy class

plt.figure(figsize=(8, 5))
plt.plot(recall_unhealthy, precision_unhealthy, marker='o', linestyle='-', color='b', label='Unhealthy (Class 1)')
plt.plot(recall_healthy, precision_healthy, marker='o', linestyle='-', color='g', label='Healthy (Class 0)')
plt.xlabel("Recall")
plt.ylabel("Precision")
plt.title("Precision-Recall Curve for Healthy and Unhealthy Classes")
plt.legend()
plt.grid()
plt.show()

## 📊 2️⃣ Loss Function Graph (Log Loss vs Number of Trees)
plt.figure(figsize=(8, 5))
plt.plot(n_estimators, log_losses, marker='o', linestyle='-', color='r')
plt.xlabel("Number of Trees in Random Forest")
plt.ylabel("Log Loss")
plt.title("Loss Function Graph (Log Loss vs Number of Trees)")
plt.grid()
plt.show()

# 📊 3️⃣ Training vs Test Accuracy
plt.figure(figsize=(8, 5))
plt.bar(["Train", "Test"], [accuracy_train, accuracy_test], color=['blue', 'orange'])
plt.xlabel("Dataset")
plt.ylabel("Accuracy")
plt.title("Training vs Test Accuracy")
plt.ylim(0, 1)
plt.show()

