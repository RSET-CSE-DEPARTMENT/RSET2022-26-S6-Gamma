import os
import pandas as pd
import re

# Input and output directories
input_dir = "/home/nia/emg1/dataset"  # Folder with original CSVs
output_dir = "/home/nia/emg1/segment"  # Folder for segmented data
os.makedirs(output_dir, exist_ok=True)

# EMG Sampling Rate
fs = 23437.5  # Hz
segment_size = int(0.2 * fs)  # 200ms → 4687 samples

# Function to extract subject number and file number from filename (e.g., "P01H01.csv" → (1, 1))
def extract_numbers(filename):
    match = re.search(r'P(\d+)([HM])(\d+)', filename)
    return (int(match.group(1)), match.group(2), int(match.group(3))) if match else (None, None, None)

# Get list of CSV files and sort them numerically
csv_files = sorted([f for f in os.listdir(input_dir) if f.endswith(".csv")], key=extract_numbers)

for file in csv_files:
    file_path = os.path.join(input_dir, file)
    df = pd.read_csv(file_path)  # Read CSV file
    
    # Extract subject ID, label, and file number (P01, P02, ..., P12)
    subject_num, label, file_num = extract_numbers(file)
    if subject_num is None or file_num is None:
        print(f"⚠️ Skipping invalid file: {file}")
        continue
    
    subject_id = f"P{subject_num:02d}"
    file_id = f"F{file_num:02d}"
    
    # Find the total number of samples in the file
    total_samples = len(df)
    
    # Calculate the number of segments
    num_segments = total_samples // segment_size

    for i in range(num_segments):
        # Get the segment of 4687 samples (200ms)
        segment = df.iloc[i * segment_size : (i + 1) * segment_size].reset_index(drop=True)
        
        # Update Segment_ID
        segment["Segment_ID"] = f"{subject_id}{file_id}S{i+1:02d}"
        
        # Ensure Label is correctly set
        segment["Label"] = label
        
        # Format segment filename correctly (P01F01S01, P01F01S02, ..., P12F05SXX)
        segment_filename = f"{subject_id}{file_id}S{i+1:02d}.csv"
        segment.to_csv(os.path.join(output_dir, segment_filename), index=False)

    print(f"✅ {file}: {num_segments} segments saved under {subject_id}{file_id}.")

print("🎉 Segmentation complete! All 200ms segments are saved.")

