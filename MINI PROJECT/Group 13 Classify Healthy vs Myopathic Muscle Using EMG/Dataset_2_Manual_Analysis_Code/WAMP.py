import os
import pandas as pd
import numpy as np

# Path to your dataset folder
folder_path = "/home/nia/emg_project/C/dataset"

# WAMP threshold (adjust if needed)
threshold = 0.15

# Initialize dictionary for WAMP values
wamp_data = {f"P{i:02d}": [] for i in range(1, 21)}  # P01 to P20

# Loop through patients and segments
for patient in range(1, 21):
    patient_id = f"P{patient:02d}"

    for segment in range(1, 51):  # S01 to S50
        segment_id = f"S{segment:02d}"
        file_name = f"{patient_id}{segment_id}.csv"
        file_path = os.path.join(folder_path, file_name)

        if os.path.exists(file_path):
            df = pd.read_csv(file_path)
            signal = df.iloc[:, 1].values  # EMG signal
            diffs = np.abs(np.diff(signal))
            wamp = np.sum(diffs > threshold)
            wamp_data[patient_id].append(wamp)
        else:
            print(f"Missing file: {file_name}")
            wamp_data[patient_id].append(None)

# Save to DataFrame and CSV
columns = [f"S{s:02d}" for s in range(1, 51)]
wamp_df = pd.DataFrame.from_dict(wamp_data, orient='index', columns=columns)

output_csv = "WAMP.csv"
wamp_df.to_csv(output_csv, index=True)
print(f"WAMP values saved to {output_csv}")

