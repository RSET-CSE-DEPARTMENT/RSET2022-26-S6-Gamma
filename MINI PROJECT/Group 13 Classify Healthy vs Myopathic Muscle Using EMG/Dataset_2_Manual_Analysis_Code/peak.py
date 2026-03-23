import os
import pandas as pd
import numpy as np

# Folder containing EMG segment files
folder_path = "/home/nia/mendely/dataset"

# Initialize dictionary for Peak values
peak_data = {f"P{str(i).zfill(2)}": [] for i in range(1, 21)}

# Loop through each patient and segment
for patient_num in range(1, 21):  # P01 to P20
    patient_id = f"P{str(patient_num).zfill(2)}"
    
    for segment_num in range(1, 51):  # 50 segments
        file_name = f"{patient_id}S{str(segment_num).zfill(2)}.csv"
        file_path = os.path.join(folder_path, file_name)
        
        if os.path.exists(file_path):
            df = pd.read_csv(file_path)
            signal = df.iloc[:, 1].values
            
            # Calculate Peak value (Maximum absolute value)
            peak = np.max(np.abs(signal))
            peak_data[patient_id].append(peak)
        else:
            print(f"Missing file: {file_name}")
            peak_data[patient_id].append(None)

# Convert to DataFrame for Peak values
columns = [f"S{str(i).zfill(2)}" for i in range(1, 51)]
peak_df = pd.DataFrame.from_dict(peak_data, orient='index', columns=columns)

# Save to CSV
peak_output_file = "peak_values.csv"
peak_df.to_csv(peak_output_file)
print(f"Peak values saved to {peak_output_file}")
