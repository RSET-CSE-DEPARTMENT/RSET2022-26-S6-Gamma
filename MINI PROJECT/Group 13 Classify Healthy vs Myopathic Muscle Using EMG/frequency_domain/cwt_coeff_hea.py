import numpy as np 
import pandas as pd
import matplotlib
matplotlib.use('Agg')  # Use a non-interactive backend before importing pyplot
import matplotlib.pyplot as plt
import pywt
import os
from glob import glob

# Define input and output folders
input_folder = r"C:\Users\USER\Desktop\A_final_data\1.) Data_csv_segmented\csv_healthy"  # Folder containing 90 CSV files
output_folder = r"C:\Users\USER\Desktop\A_final_data\CWT\hea"  # Folder to save CWT result .npy files
plot_folder = r"C:\Users\USER\Desktop\A_final_data\CWT\hea_plots"  # Folder to save CWT plots

# Ensure output directories exist
os.makedirs(output_folder, exist_ok=True)
os.makedirs(plot_folder, exist_ok=True)

# Get list of all CSV files in the folder
csv_files = glob(os.path.join(input_folder, "*.csv"))

# Loop through each file and process it
for file_path in csv_files:
    try:
        # Extract filename without extension
        file_name = os.path.basename(file_path).replace(".csv", "")
        
        # Load the CSV file
        data = pd.read_csv(file_path, low_memory=False)  # Optimized file reading
        
        # Assuming the CSV has columns: "Time (s)" and "Channel_1"
        x = data['Time (s)'].values  # Time values
        y = data['Channel_1'].values  # Signal values

        # Define wavelet parameters
        scales = np.arange(1, 128)  # Define scales for CWT
        wavelet = 'morl'  # Morlet wavelet

        # Compute Continuous Wavelet Transform (CWT)
        coefficients, frequencies = pywt.cwt(y, scales, wavelet, 1/np.mean(np.diff(x)))

        # Save CWT results to .npy format (faster than CSV)
        cwt_result_path = os.path.join(output_folder, f"{file_name}_cwt.npy")
        np.save(cwt_result_path, coefficients)  # Save as NumPy array
        print(f"CWT results saved for {file_name} at: {cwt_result_path}")

        # Plot and save CWT scalogram
        plt.figure(figsize=(8, 6))
        plt.imshow(np.abs(coefficients), aspect='auto', extent=[x.min(), x.max(), scales.min(), scales.max()], cmap='jet', origin='lower')
        plt.colorbar(label='Magnitude')
        plt.xlabel("Time (s)")
        plt.ylabel("Scale")
        plt.title(f"CWT Scalogram - {file_name}")
        plt.savefig(os.path.join(plot_folder, f"{file_name}_cwt.png"), dpi=300)
        plt.close()

    except Exception as e:
        print(f"Error processing {file_name}: {e}")

print("Processing complete for all files.")
