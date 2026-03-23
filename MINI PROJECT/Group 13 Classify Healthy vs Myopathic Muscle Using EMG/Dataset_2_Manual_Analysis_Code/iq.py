import os
import pandas as pd
import numpy as np

# Folder where all segment CSVs are stored
folder_path ="/home/nia/emg_project/C/dataset"

# Initialize dictionary to hold IQR values
iqr_data = {f"P{str(i).zfill(2)}": [] for i in range(1, 21)}

# Loop through each patient
for patient_num in range(1, 21):  # P01 to P20
    patient_id = f"P{str(patient_num).zfill(2)}"
    
    for segment_num in range(1, 51):  # 50 segments per patient
        file_name = f"{patient_id}S{str(segment_num).zfill(2)}.csv"
        file_path = os.path.join(folder_path, file_name)
        
        if os.path.exists(file_path):
            df = pd.read_csv(file_path)
            signal = df.iloc[:, 1].values  # Assuming second column = EMG signal
            q3 = np.percentile(signal, 75)
            q1 = np.percentile(signal, 25)
            iqr = q3 - q1
            iqr_data[patient_id].append(iqr)
        else:
            print(f"Missing file: {file_name}")
            iqr_data[patient_id].append(None)

# Convert to DataFrame
columns = [f"S{str(i).zfill(2)}" for i in range(1, 51)]
iqr_df = pd.DataFrame.from_dict(iqr_data, orient='index', columns=columns)

# Save to CSV
output_file = "iqr.csv"
iqr_df.to_csv(output_file)
print(f"IQR values saved to {output_file}")

