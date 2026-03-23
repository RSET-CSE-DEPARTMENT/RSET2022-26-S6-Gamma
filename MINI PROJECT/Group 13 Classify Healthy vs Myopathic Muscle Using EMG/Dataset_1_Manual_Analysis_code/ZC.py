import os
import pandas as pd
import numpy as np

# Path to segmented data
folder_path = "/home/nia/emg1/segment"

# Patients P01–P12
zc_data = {f"P{p:02d}": [] for p in range(1, 13)}

# Loop through each segment: 5 files × 55 segments = 275 per person
for patient in range(1, 13):
    patient_id = f"P{patient:02d}"
    for file_num in range(1, 6):
        for segment_num in range(1, 56):
            file_name = f"{patient_id}F{file_num:02d}S{segment_num:02d}.csv"
            file_path = os.path.join(folder_path, file_name)
            if os.path.exists(file_path):
                df = pd.read_csv(file_path)
                emg_values = df.iloc[:, 1].values  # Channel_1
                # Calculate zero crossings
                zc = np.sum(np.diff(np.sign(emg_values)) != 0)
                zc_data[patient_id].append(zc)
            else:
                print(f"Missing: {file_name}")
                zc_data[patient_id].append(None)

# Create column names: F01S01 to F05S55
columns = [f"F{f:02d}S{s:02d}" for f in range(1, 6) for s in range(1, 56)]

# Create and save DataFrame
zc_df = pd.DataFrame.from_dict(zc_data, orient="index", columns=columns)
zc_df.to_csv("zc.csv", index=True)

print("✅ zc.csv saved.")

