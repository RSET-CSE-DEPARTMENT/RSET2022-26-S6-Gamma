import os
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import cv2
from glob import glob

# Define folders
cwt_folder = r"C:\Users\USER\Desktop\A_final_data\CWT\myo"  # Folder containing CWT coefficient CSVs
output_folder = r"C:\Users\USER\Desktop\A_final_data\CWT\myo_images"  # Folder to save images

# Ensure output directory exists
os.makedirs(output_folder, exist_ok=True)

# Get list of all CSV files
csv_files = glob(os.path.join(cwt_folder, "*.csv"))

# Loop through each file and convert to image
for file_path in csv_files:
    try:
        # Extract filename
        file_name = os.path.basename(file_path).replace(".csv", "")
        
        # Load the CSV file (ignoring time column)
        data = pd.read_csv(file_path).iloc[:, 1:].values  # Ignore the first column (Time)
        
        # Normalize data (min-max scaling)
        norm_data = (data - np.min(data)) / (np.max(data) - np.min(data))
        
        # Convert to image (apply colormap)
        img = (norm_data * 255).astype(np.uint8)  # Scale to 0-255
        img_colored = cv2.applyColorMap(img, cv2.COLORMAP_JET)  # Apply colormap
        
        # Resize image to 227x227 (for CNN input)
        img_resized = cv2.resize(img_colored, (227, 227))
        
        # Save image
        output_path = os.path.join(output_folder, f"{file_name}.jpg")
        cv2.imwrite(output_path, img_resized)
        print(f"Saved: {output_path}")
        
    except Exception as e:
        print(f"Error processing {file_name}: {e}")

print("CWT images generated successfully!")
