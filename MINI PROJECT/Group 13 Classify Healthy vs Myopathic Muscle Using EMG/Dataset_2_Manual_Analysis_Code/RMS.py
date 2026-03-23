import os
import pandas as pd
import numpy as np

# Folder with segmented files
folder_path = "/home/nia/emg_project/C/dataset"  # Update if needed

# Initialize dictionary for 20 patients
rms_data = {f"P{i:02d}": [] for i in range(1, 21)}  # P01 to P20

# Loop through patients and segments
for patient in range(1, 21):
    patient_id = f"P{patient:02d}"
    
    for segment in range(1, 51):  # S01 to S50
        segment_id = f"S{segment:02d}"
        file_name = f"{patient_id}{segment_id}.csv"
        file_path = os.path.join(folder_path, file_name)

        if os.path.exists(file_path):
            df = pd.read_csv(file_path)
            signal = df.iloc[:, 1].values  # 2nd column = EMG values
            rms_value = np.sqrt(np.mean(signal**2))  # RMS formula
            rms_data[patient_id].append(rms_value)
        else:
            print(f"Missing file: {file_name}")
            rms_data[patient_id].append(None)

# Save as CSV
columns = [f"S{s:02d}" for s in range(1, 51)]
rms_df = pd.DataFrame.from_dict(rms_data, orient='index', columns=columns)
output_csv = "RMS.csv"
rms_df.to_csv(output_csv, index=True)

print(f"RMS values saved to {output_csv}")

