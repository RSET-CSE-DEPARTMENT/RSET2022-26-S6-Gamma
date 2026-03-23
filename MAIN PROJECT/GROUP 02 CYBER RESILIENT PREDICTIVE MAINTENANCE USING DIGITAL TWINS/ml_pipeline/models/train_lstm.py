import pandas as pd
import numpy as np
import joblib
import matplotlib.pyplot as plt
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense, Dropout, BatchNormalization
from tensorflow.keras.callbacks import EarlyStopping
import os

# =====================
# 1. CONFIG & PATHS
# =====================
DATA_PATH = "ml_pipeline/data/window_features.csv"
MODEL_PATH = "ml_pipeline/models/lstm_rul_model.keras"
SCALER_PATH = "ml_pipeline/models/lstm_scaler.joblib"
LOOKBACK = 15 # Sequence length (15 windows of history)

os.makedirs("ml_pipeline/models", exist_ok=True)

# =====================
# 2. DATA PREPARATION
# =====================
if not os.path.exists(DATA_PATH):
    print(f"❌ Error: {DATA_PATH} not found.")
    exit()

df = pd.read_csv(DATA_PATH).dropna()

# ENHANCED FEATURES: Now including Fusion and Thermal data
features = [
    "innov_mean", "innov_std", "innov_kurtosis",
    "fusion_res_mean", "fusion_res_std", # The new "Physics-Electrical" check
    "temp_mean", "temp_slope"             # Crucial for health prediction
]

X_raw = df[features].values
y_raw = df["RUL"].values

# Fit and save scaler for production
scaler = StandardScaler()
X_scaled = scaler.fit_transform(X_raw)
joblib.dump(scaler, SCALER_PATH)

def create_sequences(data, target, lookback):
    X_seq, y_seq = [], []
    for i in range(len(data) - lookback):
        X_seq.append(data[i : i + lookback])
        y_seq.append(target[i + lookback])
    return np.array(X_seq), np.array(y_seq)

X, y = create_sequences(X_scaled, y_raw, LOOKBACK)
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# =====================
# 3. BUILD ENHANCED LSTM
# =====================


model = Sequential([
    # First LSTM layer: Stays wide to capture initial features
    LSTM(64, input_shape=(X_train.shape[1], X_train.shape[2]), return_sequences=True),
    BatchNormalization(),
    Dropout(0.2),
    
    # Second LSTM layer: Compresses sequence info
    LSTM(32, return_sequences=False),
    Dropout(0.2),
    
    # Fully connected layers for the regression output
    Dense(16, activation='relu'),
    Dense(1, activation='linear') # Linear activation for RUL (continuous seconds)
])

model.compile(optimizer='adam', loss='mse', metrics=['mae'])

# =====================
# 4. TRAINING
# =====================
# Patience is set to 7 to allow for some loss fluctuation
stop = EarlyStopping(monitor='val_loss', patience=7, restore_best_weights=True)

print("Training LSTM 'Health Monitor'...")
history = model.fit(
    X_train, y_train,
    validation_data=(X_test, y_test),
    epochs=50,
    batch_size=32,
    callbacks=[stop],
    verbose=1
)

# =====================
# 5. EVALUATION & SAVE
# =====================
model.save(MODEL_PATH)
print(f"✅ LSTM Model saved to {MODEL_PATH}")
print(f"✅ Scaler saved to {SCALER_PATH}")

# Plotting Accuracy Trend
plt.figure(figsize=(10, 5))
plt.plot(history.history['mae'], label='Training Error (MAE)')
plt.plot(history.history['val_mae'], label='Validation Error (MAE)')
plt.title('RUL Prediction Training History')
plt.ylabel('Error in Seconds')
plt.xlabel('Epoch')
plt.legend()
plt.grid(True, alpha=0.3)
plt.show()