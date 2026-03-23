import os
import pandas as pd
import numpy as np

# Folder containing EMG segment files
folder_path = "/home/nia/emg_project/C/dataset"

# Initialize dictionary for Zero Crossing values
zc_data = {f"P{str(i).zfill(2)}": [] for i in range(1, 21)}

threshold = 0.01  # Set based on your EMG noise level (you can adjust this)

# Loop through each patient and segment
for patient_num in range(1, 21):  # P01 to P20
    patient_id = f"P{str(patient_num).zfill(2)}"
    
    for segment_num in range(1, 51):  # 50 segments
        file_name = f"{patient_id}S{str(segment_num).zfill(2)}.csv"
        file_path = os.path.join(folder_path, file_name)
        
        if os.path.exists(file_path):
            df = pd.read_csv(file_path)
            signal = df.iloc[:, 1].values
            
            # Compute Zero Crossing
            zc = np.sum(
                ((signal[:-1] * signal[1:] < 0) &
                 (np.abs(signal[:-1] - signal[1:]) >= threshold))
            )
            zc_data[patient_id].append(zc)
        else:
            print(f"Missing file: {file_name}")
            zc_data[patient_id].append(None)

# Convert to DataFrame
columns = [f"S{str(i).zfill(2)}" for i in range(1, 51)]
zc_df = pd.DataFrame.from_dict(zc_data, orient='index', columns=columns)

# Save to CSV
output_file = "zero_crossing.csv"
zc_df.to_csv(output_file)
print(f"Zero Crossing values saved to {output_file}")

