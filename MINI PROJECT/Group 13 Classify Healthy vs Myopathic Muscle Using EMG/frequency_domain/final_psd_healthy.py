import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from scipy.fftpack import fft, fftfreq
import os
from glob import glob

# Define input and output folders
input_folder = r"C:\Users\USER\Desktop\A_final_data\1.) Data_csv_segmented\csv_healthy"  # Folder containing 90 CSV files
output_folder = r"C:\Users\USER\Desktop\PSD_Results\Healthy"  # Folder to save PSD result CSVs
plot_folder = r"C:\Users\USER\Desktop\PSD_Plots\Healthy"  # Folder to save PSD plots

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
        data = pd.read_csv(file_path)
        
        # Assuming the CSV has columns: "Time" and "Signal"
        x = data['Time (s)'].values  # Time values
        y = data['Channel_1'].values  # Signal values

        # Number of points
        n = len(y)

        # Compute the sampling interval (assuming uniform time steps)
        Lx = x[-1] - x[0]  # Duration of the signal
        dt = np.mean(np.diff(x))  # Average time difference
        fs = 1 / dt  # Sampling frequency

        # Step 2: Compute FFT
        freqs = fftfreq(n, d=dt)  # Compute frequency bins
        fft_vals = fft(y)  # Compute FFT

        # Compute Power Spectral Density
        psd_vals = 2.0 * (np.abs(fft_vals / n) ** 2)  # Compute PSD

        # Step 3: Mask to keep only positive frequencies
        mask = freqs > 0
        freqs_filtered = freqs[mask]
        psd_filtered = psd_vals[mask]

        # Step 4: Save PSD results to CSV
        psd_result_path = os.path.join(output_folder, f"{file_name}_psd.csv")
        psd_results = pd.DataFrame({"Frequency (Hz)": freqs_filtered, "PSD": psd_filtered})
        psd_results.to_csv(psd_result_path, index=False)
        print(f"PSD results saved for {file_name} at: {psd_result_path}")

        # Step 5: Plot and save PSD spectrum
        plt.figure(figsize=(8, 4))
        plt.plot(freqs_filtered, psd_filtered, label="PSD", color="blue")
        plt.title(f"Power Spectral Density - {file_name}")
        plt.xlabel("Frequency (Hz)")
        plt.ylabel("Power")
        plt.legend()
        plt.savefig(os.path.join(plot_folder, f"{file_name}_psd_spectrum.png"), dpi=300)
        plt.close()

    except Exception as e:
        print(f"Error processing {file_name}: {e}")

print("Processing complete for all files.")
