import os
import pandas as pd
import numpy as np
from scipy.stats import kurtosis

# Path to your dataset folder
folder_path = "/home/nia/emg_project/C/dataset"  # Update this path if needed

# Create a dictionary to store kurtosis values
kurtosis_data = {f"P{str(i).zfill(2)}": [] for i in range(1, 21)}

# Loop through all patients
for patient_num in range(1, 21):
    patient_id = f"P{patient_num:02d}"
    
    # Loop through all 50 segment files
    for segment_num in range(1, 51):
        file_name = f"{patient_id}S{segment_num:02d}.csv"
        file_path = os.path.join(folder_path, file_name)
        
        if os.path.exists(file_path):
            df = pd.read_csv(file_path)
            signal = df.iloc[:, 1].values  # EMG values column
            kurt = kurtosis(signal)
            kurtosis_data[patient_id].append(kurt)
        else:
            print(f"Missing: {file_name}")
            kurtosis_data[patient_id].append(None)

# Save to CSV
columns = [f"S{str(i).zfill(2)}" for i in range(1, 51)]
kurtosis_df = pd.DataFrame.from_dict(kurtosis_data, orient='index', columns=columns)
kurtosis_df.to_csv("kurtosis.csv")
print("Kurtosis saved as kurtosis.csv")
