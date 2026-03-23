import os
import pandas as pd

def merge_feature_files(healthy_dir, unhealthy_dir, output_file):
    all_data = []
    
    # Process healthy files
    for file in os.listdir(healthy_dir):
        if file.endswith(".csv"):
            file_path = os.path.join(healthy_dir, file)
            df = pd.read_csv(file_path)
            df["Label"] = "healthy"  # Add label column
            all_data.append(df)
    
    # Process unhealthy files
    for file in os.listdir(unhealthy_dir):
        if file.endswith(".csv"):
            file_path = os.path.join(unhealthy_dir, file)
            df = pd.read_csv(file_path)
            df["Label"] = "unhealthy"  # Add label column
            all_data.append(df)
    
    # Merge all data into a single DataFrame
    merged_df = pd.concat(all_data, ignore_index=True)
    merged_df.to_csv(output_file, index=False)
    print(f"Merged file saved to {output_file}")

# Example usage
merge_feature_files("/home/user/emg/output_folder1", "/home/user/emg/output_folder", "/home/user/emg/merged_features.csv")

