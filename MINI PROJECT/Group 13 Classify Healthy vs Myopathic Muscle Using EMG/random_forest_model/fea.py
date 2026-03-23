import os
import numpy as np
import pandas as pd
from scipy.signal import welch
from scipy.fftpack import fft
from statsmodels.tsa.ar_model import AutoReg

# Define feature extraction functions
def integrated_emg(signal):
    return np.sum(np.abs(signal))

def mean_absolute_value(signal):
    return np.mean(np.abs(signal))

def root_mean_square(signal):
    return np.sqrt(np.mean(signal**2))

def waveform_length(signal):
    return np.sum(np.abs(np.diff(signal)))

def zero_crossings(signal, threshold=0.01):
    return np.sum((signal[:-1] * signal[1:] < 0) & (np.abs(signal[:-1] - signal[1:]) > threshold))

def slope_sign_changes(signal, threshold=0.01):
    return np.sum(((signal[:-2] - signal[1:-1]) * (signal[1:-1] - signal[2:]) < 0) & 
                  (np.abs(signal[:-2] - signal[1:-1]) > threshold) & 
                  (np.abs(signal[1:-1] - signal[2:]) > threshold))

def willison_amplitude(signal, threshold=0.01):
    return np.sum(np.abs(signal[:-1] - signal[1:]) > threshold)

def variance_emg(signal):
    return np.var(signal)

def simple_square_integral(signal):
    return np.sum(signal**2)

def mean_frequency(signal, fs=1000):
    f, Pxx = welch(signal, fs=fs, nperseg=len(signal))
    return np.sum(f * Pxx) / np.sum(Pxx)

def median_frequency(signal, fs=1000):
    f, Pxx = welch(signal, fs=fs, nperseg=len(signal))
    cumulative_power = np.cumsum(Pxx)
    return f[np.where(cumulative_power >= cumulative_power[-1] / 2)[0][0]]

def autoregressive_coefficients(signal, order=4):
    model = AutoReg(signal, lags=order, old_names=False).fit()
    return model.params[1:].tolist()

def extract_features(signal, fs=1000):
    features = {
        "IEMG": integrated_emg(signal),
        "MAV": mean_absolute_value(signal),
        "RMS": root_mean_square(signal),
        "WL": waveform_length(signal),
        "ZC": zero_crossings(signal),
        "SSC": slope_sign_changes(signal),
        "WAMP": willison_amplitude(signal),
        "VAR": variance_emg(signal),
        "SSI": simple_square_integral(signal),
        "MNF": mean_frequency(signal, fs),
        "MDF": median_frequency(signal, fs),
    }
    features.update({f"AR{i+1}": coef for i, coef in enumerate(autoregressive_coefficients(signal))})
    return features

# Process all files in dataset and store results in output folder
def process_dataset(input_dir, output_dir, fs=1000):
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
    
    for file in os.listdir(input_dir):
        if file.endswith(".txt") or file.endswith(".csv"):
            file_path = os.path.join(input_dir, file)
            try:
                signal = np.loadtxt(file_path, delimiter=',', skiprows=1, usecols=1)  # Skip header, use column 1
                features = extract_features(signal, fs)
                df = pd.DataFrame([features])
                output_file = os.path.join(output_dir, f"features_{file}.csv")
                df.to_csv(output_file, index=False)
                print(f"Saved features to {output_file}")
            except Exception as e:
                print(f"Error processing {file}: {e}")

# Example usage
process_dataset("/home/user/emg/segmenth", "/home/user/emg/output_folderh")

