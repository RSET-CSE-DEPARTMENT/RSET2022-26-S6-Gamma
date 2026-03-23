import os
import numpy as np
import joblib 
import keras  # Using native keras for .keras files
# from keras.models import load_model # Standard for .h5
from data_layer.ingestion import execute_query

# Load assets from project root
base_dir = os.path.dirname(__file__)

# --- MODEL LOADING LOGIC ---
# model_path = os.path.join(base_dir, "..", "medical_lstm.h5") # OLD FORMAT
model_path = os.path.join(base_dir, "..", "medical_lstm.keras") # NEW NATIVE FORMAT

classes_path = os.path.join(base_dir, "..", "classes.npy")
scaler_path = os.path.join(base_dir, "..", "scaler.pkl") 

# --- FIX FOR quantization_config ERROR ---
def safe_load_model(path):
    try:
        # First, try a standard load
        return keras.models.load_model(path)
    except TypeError as e:
        if "quantization_config" in str(e):
            print("Found incompatible quantization_config in model. Attempting fix...")
            # We wrap the Dense layer to ignore the extra argument
            from keras.src.layers.core.dense import Dense
            
            original_init = Dense.__init__
            
            def patched_init(self, *args, **kwargs):
                # Remove the offending key if it exists
                kwargs.pop('quantization_config', None)
                return original_init(self, *args, **kwargs)
            
            # Monkeypatch Dense layer temporarily
            Dense.__init__ = patched_init
            model = keras.models.load_model(path)
            # Restore original init
            Dense.__init__ = original_init
            return model
        else:
            raise e

# Load the model using the newer Keras 3 native loader
# If you ever need to go back to .h5, uncomment load_model(model_path)
model = safe_load_model(model_path) 
# model = load_model(model_path) 

classes = np.load(classes_path, allow_pickle=True)
scaler = joblib.load(scaler_path) 

def get_recent_vitals(stay_id):
    """Query the KG for the last 3 vital observations of the active stay."""
    query = f"""
    SELECT ?timestamp ?hr ?sys ?dia ?rr ?temp ?spo2
    WHERE {{
        ex:{stay_id} ex:hasVitalAt ?v .
        ?v ex:timestamp ?timestamp ; 
           ex:heartRate ?hr ; 
           ex:systolicBP ?sys ;
           ex:diastolicBP ?dia ; 
           ex:respiratoryRate ?rr ; 
           ex:temperature ?temp ; 
           ex:spO2 ?spo2 .
    }}
    ORDER BY DESC(?timestamp)
    LIMIT 3
    """
    results = execute_query(query)
    
    if len(results) < 3:
        return None  # LSTM requires a sequence of 3

    # Format the data (Ensure ordering is Past -> Present)
    data = []
    # Reverse to ensure chronological order: [T-2, T-1, T-0]
    for r in reversed(results): 
        # Scale logic requires specific column order: ['sbp', 'dbp', 'hr', 'rr', 'temp', 'spo2']
        row = [
            float(r['sys']['value']), 
            float(r['dia']['value']), 
            float(r['hr']['value']), 
            float(r['rr']['value']),
            float(r['temp']['value']),
            float(r['spo2']['value'])
        ]
        data.append(row)
        
    # Scale the live UI data before giving it to the model
    data_scaled = scaler.transform(data)
    
    # LSTM expects shape (Batch, TimeSteps, Features) -> (1, 3, 6)
    return np.array([data_scaled]) 

def run_prediction(stay_id):
    """Triggered when new data arrives."""
    tensor = get_recent_vitals(stay_id)
    
    if tensor is None:
        return "Collecting Data...", 0.0 # Not enough data yet
    
    # Get real model prediction
    probs = model.predict(tensor, verbose=0)[0]
    risk_idx = np.argmax(probs)
    confidence = float(probs[risk_idx])
    
    # Map prediction index to real class labels (e.g., 'Stable', 'Sepsis')
    risk_label = str(classes[risk_idx])
    
    return risk_label, confidence