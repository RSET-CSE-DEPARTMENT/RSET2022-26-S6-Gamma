import os
import pandas as pd
import numpy as np

# Folder containing all segment files (P01S01.csv to P20S50.csv)
folder_path = "/home/nia/emg_project/C/dataset"

# Initialize dictionary for all 20 patients
mav_data = {f"P{i:02d}": [] for i in range(1, 21)}  # P01 to P20

# Iterate through each patient
for patient in range(1, 21):
    patient_id = f"P{patient:02d}"
    
    # Iterate through 50 segments (S01 to S50)
    for segment in range(1, 51):
        segment_id = f"S{segment:02d}"
        file_name = f"{patient_id}{segment_id}.csv"
        file_path = os.path.join(folder_path, file_name)
        
        if os.path.exists(file_path):
            df = pd.read_csv(file_path)
            signal_values = df.iloc[:, 1].values  # Assume 2nd column has EMG values
            mav_value = np.mean(np.abs(signal_values))
            mav_data[patient_id].append(mav_value)
        else:
            print(f"Missing file: {file_name}")
            mav_data[patient_id].append(None)

# Create DataFrame with columns F01S01 to F01S50 (or just S01 to S50)
columns = [f"S{s:02d}" for s in range(1, 51)]
mav_df = pd.DataFrame.from_dict(mav_data, orient='index', columns=columns)

# Save to CSV
output_csv = "MAV.csv"
mav_df.to_csv(output_csv, index=True)
print(f"MAV table saved as {output_csv}")

