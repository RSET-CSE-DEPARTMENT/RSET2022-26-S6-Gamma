import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from scipy.fftpack import fft, fftfreq
import os
from glob import glob

# Define input and output folders
input_folder = r"C:\Users\USER\Desktop\A_final_data\1.) Data_csv_segmented\csv_healthy"  # Folder containing 90 CSV files
output_folder = r"C:\Users\USER\Desktop\FFT_Results\Healthy"  # Folder to save FFT result CSVs
plot_folder = r"C:\Users\USER\Desktop\FFT_Plots\Healthy"  # Folder to save plots

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

        # Normalize and take absolute values for power spectrum
        fft_theo = 2.0 * np.abs(fft_vals / n)

        # Step 3: Mask to keep only positive frequencies
        mask = freqs > 0
        freqs_filtered = freqs[mask]
        fft_filtered = fft_theo[mask]

        # Step 4: Save FFT results to CSV
        fft_result_path = os.path.join(output_folder, f"{file_name}_fft.csv")
        fft_results = pd.DataFrame({"Frequency (Hz)": freqs_filtered, "Magnitude": fft_filtered})
        fft_results.to_csv(fft_result_path, index=False)
        print(f"FFT results saved for {file_name} at: {fft_result_path}")

        # Step 5: Plot and save original signal
        plt.figure(figsize=(8, 4))
        plt.title(f"Original Signal - {file_name}")
        plt.plot(x, y, color="xkcd:salmon", label="Original")
        plt.xlabel("Time (s)")
        plt.ylabel("Amplitude")
        plt.legend()
        original_signal_plot_path = os.path.join(plot_folder, f"{file_name}_original_signal.png")
        plt.savefig(original_signal_plot_path, dpi=300)  # Save figure as PNG
        plt.close()
        print(f"Original signal plot saved for {file_name} at: {original_signal_plot_path}")

        # Step 6: Plot and save FFT spectrum
        plt.figure(figsize=(8, 4))
        plt.plot(freqs_filtered, fft_filtered, label="True FFT Values")
        plt.title(f"FFT Spectrum - {file_name}")
        plt.xlabel("Frequency (Hz)")
        plt.ylabel("Magnitude")
        plt.legend()
        fft_spectrum_plot_path = os.path.join(plot_folder, f"{file_name}_fft_spectrum.png")
        plt.savefig(fft_spectrum_plot_path, dpi=300)  # Save figure as PNG
        plt.close()
        print(f"FFT spectrum plot saved for {file_name} at: {fft_spectrum_plot_path}")

    except Exception as e:
        print(f"Error processing {file_name}: {e}")

print("Processing complete for all files.")
