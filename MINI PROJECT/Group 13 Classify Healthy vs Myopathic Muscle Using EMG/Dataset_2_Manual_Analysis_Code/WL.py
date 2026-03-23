import os
import pandas as pd
import numpy as np

# Folder containing segmented EMG files
folder_path = "/home/nia/emg_project/C/dataset"

# Initialize dictionary to store WL values
wl_data = {f"P{i:02d}": [] for i in range(1, 21)}  # P01 to P20

# Loop through patients and segments
for patient in range(1, 21):
    patient_id = f"P{patient:02d}"

    for segment in range(1, 51):  # S01 to S50
        segment_id = f"S{segment:02d}"
        file_name = f"{patient_id}{segment_id}.csv"
        file_path = os.path.join(folder_path, file_name)

        if os.path.exists(file_path):
            df = pd.read_csv(file_path)
            signal = df.iloc[:, 1].values  # EMG signal (2nd column)
            wl_value = np.sum(np.abs(np.diff(signal)))
            wl_data[patient_id].append(wl_value)
        else:
            print(f"Missing file: {file_name}")
            wl_data[patient_id].append(None)

# Create DataFrame and save to CSV
columns = [f"S{s:02d}" for s in range(1, 51)]
wl_df = pd.DataFrame.from_dict(wl_data, orient='index', columns=columns)

output_csv = "WL.csv"
wl_df.to_csv(output_csv, index=True)
print(f"Wavelength values saved to {output_csv}")

