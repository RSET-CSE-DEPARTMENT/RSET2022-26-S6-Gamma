import numpy as np
import tensorflow as tf
from keras.models import Sequential
from keras.layers import LSTM, Dense, Dropout
from keras.utils import to_categorical
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix
import matplotlib.pyplot as plt
import seaborn as sns
import os

def train_lstm_model():
    # 1. Load Data
    print("Loading datasets...")
    if not os.path.exists("X_data.npy"):
        print("Error: Data files not found.")
        return

    X = np.load("X_data.npy")
    y = np.load("y_data.npy")
    classes = np.load("classes.npy", allow_pickle=True)
    
    num_classes = len(classes)
    y_encoded = to_categorical(y, num_classes=num_classes)

    # 2. Split Data
    X_train, X_test, y_train, y_test = train_test_split(X, y_encoded, test_size=0.2, random_state=42)

    # 3. Build Model
    model = Sequential()
    model.add(LSTM(units=64, input_shape=(X.shape[1], X.shape[2]), return_sequences=False))
    model.add(Dropout(0.2))
    model.add(Dense(32, activation='relu'))
    model.add(Dense(num_classes, activation='softmax'))

    model.compile(optimizer='adam', loss='categorical_crossentropy', metrics=['accuracy'])

    # 4. Train
    print("Starting Training...")
    history = model.fit(X_train, y_train, epochs=20, batch_size=32, validation_data=(X_test, y_test), verbose=1)

    # 5. EVALUATION

    print("\nGenering Medical Metrics Report...")
    
    # model's predictions (Probabilities)
    y_pred_probs = model.predict(X_test)
    
    # Convert Probabilities to Class IDs (e.g., [0.1, 0.9, 0.0] -> 1)
    y_pred = np.argmax(y_pred_probs, axis=1)
    y_true = np.argmax(y_test, axis=1)

    # A. Text Report (Precision, Recall, F1)
    print("\n--- Classification Report ---")
    print(classification_report(y_true, y_pred, target_names=classes))

    # B. Confusion Matrix (The Table)
    cm = confusion_matrix(y_true, y_pred)
    
    # Plotting the Matrix
    plt.figure(figsize=(10, 8))
    sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', xticklabels=classes, yticklabels=classes)
    plt.title('Confusion Matrix: Actual vs Predicted Risk')
    plt.ylabel('Actual Patient State')
    plt.xlabel('AI Predicted State')
    plt.show() 

    # Save Model
    model.save("medical_lstm.h5")
    print("Model saved.")

if __name__ == "__main__":
    train_lstm_model()