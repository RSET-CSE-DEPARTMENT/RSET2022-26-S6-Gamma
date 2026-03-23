import os
import pandas as pd
import numpy as np

# Input and output directories
input_dir = r"C:\Users\USER\Desktop\A_final_data\csv_healthy"# Folder with original CSVs
output_dir = r"C:\Users\USER\Desktop\A_final_data\segmented_healthy"  # Folder for segmented data
os.makedirs(output_dir, exist_ok=True)

# EMG Sampling Rate
fs = 23437.5  # Hz
segment_size = int(0.1 * fs)  # 100ms → ~22,300 samples

# Get list of CSV files
csv_files = [f for f in os.listdir(input_dir) if f.endswith(".csv")]

for file in csv_files:
    file_path = os.path.join(input_dir, file)
    df = pd.read_csv(file_path)  # Read CSV file
    
    # Extract Label
    label = df["Label"].iloc[0]  # 'H' or 'M'
    
    # Remove non-signal columns (keep only signals)
    signal_data = df.drop(columns=["Time (s)", "Label"], errors="ignore")
    
    # Segment the data into 100ms windows
    num_segments = len(signal_data) // segment_size

    for i in range(num_segments):
        segment = signal_data.iloc[i * segment_size : (i + 1) * segment_size].reset_index(drop=True)
        
        # Add Segment ID and Label
        segment.insert(0, "Segment_ID", f"{file.replace('.csv', '')}seg{i+1}")
        segment["Label"] = label
        
        # Save each segment as a CSV file
        segment_filename = f"{file.replace('.csv', '')}segment{i+1}.csv"
        segment.to_csv(os.path.join(output_dir, segment_filename), index=False)
    
    print(f"Processed {file}: {num_segments} segments created.")

print("✅ Segmentation complete! All 100ms segments are saved.")
