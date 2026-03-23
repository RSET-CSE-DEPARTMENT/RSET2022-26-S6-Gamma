import os
import numpy as np
import pandas as pd
from scipy.stats import kurtosis, skew, iqr
from scipy.fft import fft
from tqdm import tqdm

# Sampling parameters
sampling_rate = 23437.5
segment_duration = 0.2  # 200 ms
samples_per_segment = int(sampling_rate * segment_duration)
fft_max_freq = 1500
fft_bin_size = 100

# Data folders
healthy_folder = '/home/nia/model/segment_healthy'
myopathy_folder = '/home/nia/model/segment_myopathy'

# Prepare data list
data_rows = []

def extract_features(signal):
    features = {}

    # Time-domain
    features['MAV'] = np.mean(np.abs(signal))
    features['RMS'] = np.sqrt(np.mean(signal ** 2))
    features['SSI'] = np.sum(signal ** 2)
    features['VAR'] = np.var(signal)
    features['WL'] = np.sum(np.abs(np.diff(signal)))
    features['Skewness'] = skew(signal)
    features['Kurtosis'] = kurtosis(signal)
    features['IQR'] = iqr(signal)

    # FFT features (power in each 100 Hz bin up to 1500 Hz)
    freqs = np.fft.rfftfreq(len(signal), d=1/sampling_rate)
    fft_vals = np.abs(fft(signal))[:len(freqs)]
    for f_start in range(0, fft_max_freq, fft_bin_size):
        f_end = f_start + fft_bin_size
        mask = (freqs >= f_start) & (freqs < f_end)
        features[f'FFT_{f_start}_{f_end}Hz'] = np.sum(fft_vals[mask] ** 2)

    return features

def process_folder(folder_path, label):
    for filename in tqdm(sorted(os.listdir(folder_path)), desc=f"Processing {label}"):
        if filename.endswith('.csv') and filename.startswith('P'):
            filepath = os.path.join(folder_path, filename)
            df = pd.read_csv(filepath)
            signal = df['Channel_1'].values

            # Extract features
            features = extract_features(signal)

            # Metadata
            features['Segment_ID'] = filename.replace('.csv', '')
            features['Patient_ID'] = filename[:3]  # e.g., P01
            features['Label'] = label

            # Add row
            data_rows.append(features)

# Run for both folders
process_folder(healthy_folder, 'H')
process_folder(myopathy_folder, 'M')

# Create DataFrame
features_df = pd.DataFrame(data_rows)

# Reorder columns
cols = ['Segment_ID', 'Patient_ID'] + [col for col in features_df.columns if col not in ['Segment_ID', 'Patient_ID', 'Label']] + ['Label']
features_df = features_df[cols]

# Save
features_df.to_csv('features_dataset.csv', index=False)
print("✅ All features extracted and saved to 'features_dataset.csv'")

