# code used to convert older lsttm .h5 model to new .keras model
import tensorflow as tf
from tensorflow.keras.models import load_model

H5_PATH = "medical_lstm.h5"
NEW_PATH = "medical_lstm.keras"

def main():
    print("Loading legacy H5 model...")
    model = load_model(H5_PATH, compile=False)

    print("Saving in new Keras format (.keras)...")
    model.save(NEW_PATH)

    print(f"✅ Conversion complete! Saved as {NEW_PATH}")

if __name__ == "__main__":
    main()