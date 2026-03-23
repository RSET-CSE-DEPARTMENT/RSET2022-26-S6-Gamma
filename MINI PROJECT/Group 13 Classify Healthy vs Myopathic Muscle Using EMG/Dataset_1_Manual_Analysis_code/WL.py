import os
import pandas as pd
import numpy as np

# Path to the segmented files
folder_path = "/home/nia/emg1/segment"

# Initialize dictionary for patients P01–P12
wl_data = {f"P{p:02d}": [] for p in range(1, 13)}

# Loop through each patient's segments
for patient in range(1, 13):
    patient_id = f"P{patient:02d}"
    for file_num in range(1, 6):
        for segment_num in range(1, 56):
            file_name = f"{patient_id}F{file_num:02d}S{segment_num:02d}.csv"
            file_path = os.path.join(folder_path, file_name)
            if os.path.exists(file_path):
                df = pd.read_csv(file_path)
                emg = df.iloc[:, 1].values  # 'channel' column
                wl = np.sum(np.abs(np.diff(emg)))
                wl_data[patient_id].append(wl)
            else:
                print(f"Missing: {file_name}")
                wl_data[patient_id].append(None)

# Generate column names
columns = [f"F{f:02d}S{s:02d}" for f in range(1, 6) for s in range(1, 56)]

# Create and save DataFrame
wl_df = pd.DataFrame.from_dict(wl_data, orient="index", columns=columns)
wl_df.to_csv("WL.csv", index=True)

print("✅ WL.csv saved.")

