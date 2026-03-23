import pandas as pd
import numpy as np
from tensorflow import keras
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, log_loss, accuracy_score

# Load training data
train_data = pd.read_csv("train_data.csv")

# Separate features and labels
X = train_data.iloc[:, :-1].values  # All columns except the last one
y = train_data.iloc[:, -1].values   # The last column is the label

# Split into train and test sets
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Define the model
model = keras.models.Sequential([
    keras.layers.Dense(32, activation='relu', input_shape=(X_train.shape[1],)),
    keras.layers.Dense(16, activation='relu'),
    keras.layers.Dense(1, activation='sigmoid')  # Binary classification
])

# Compile the model
model.compile(optimizer='adam', loss='binary_crossentropy', metrics=['accuracy'])

# Train the model
model.fit(X_train, y_train, epochs=50, batch_size=16, verbose=0)

# Predict on test set
y_pred_probs = model.predict(X_test).flatten()
y_pred = (y_pred_probs > 0.5).astype(int)

# Compute metrics
acc = accuracy_score(y_test, y_pred)
loss = log_loss(y_test, y_pred_probs)
print(f"\nAccuracy: {acc:.4f}")
print(f"Log Loss: {loss:.4f}\n")

# Classification report
from sklearn.metrics import classification_report
print("Classification Report:")
print(classification_report(y_test, y_pred))

# Save the trained model
model.save("emg_classifier.keras")
print("✅ Model training complete. Outputs saved as 'emg_classifier.keras'")

