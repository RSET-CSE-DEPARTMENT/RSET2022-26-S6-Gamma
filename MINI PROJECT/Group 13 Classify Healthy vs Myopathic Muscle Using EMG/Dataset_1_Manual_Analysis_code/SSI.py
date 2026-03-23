import os
import pandas as pd
import numpy as np

# Path to the segmented files
folder_path = "/home/nia/emg1/segment"

# Initialize dictionary for patients P01–P12
ssi_data = {f"P{p:02d}": [] for p in range(1, 13)}

# Loop through each patient's segments
for patient in range(1, 13):
    patient_id = f"P{patient:02d}"
    for file_num in range(1, 6):
        for segment_num in range(1, 56):
            file_name = f"{patient_id}F{file_num:02d}S{segment_num:02d}.csv"
            file_path = os.path.join(folder_path, file_name)
            if os.path.exists(file_path):
                df = pd.read_csv(file_path)
                emg_values = df.iloc[:, 1].values  # 'channel' column
                ssi = np.sum(emg_values ** 2)
                ssi_data[patient_id].append(ssi)
            else:
                print(f"Missing: {file_name}")
                ssi_data[patient_id].append(None)

# Generate column names
columns = [f"F{f:02d}S{s:02d}" for f in range(1, 6) for s in range(1, 56)]

# Create and save DataFrame
ssi_df = pd.DataFrame.from_dict(ssi_data, orient="index", columns=columns)
ssi_df.to_csv("SSI.csv", index=True)

print("✅ SSI.csv saved.")

