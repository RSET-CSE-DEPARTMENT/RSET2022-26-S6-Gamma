import os
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt

# 📌 Define Paths
data_folder = r"C:\Users\USER\Desktop\A_final_data\1.) Data_csv_segmented\csv_myopathy"   # Change this to your EMG data folder
output_folder = r"C:\Users\USER\Desktop\A_final_data\1.) Data_csv_segmented\m_plots"
sampling_rate = 23437.5       # Hz (Modify based on your EMG data)
segment_size = 100            # Take average of every 100 samples

# 📌 Create output folder if not exists
os.makedirs(output_folder, exist_ok=True)

# 📌 Define persons and movements
persons = ["P01", "P02", "P03", "P04", "P05", "P06"]  # 6 Persons
movements = [f"M{i:02d}" for i in range(1, 16)]  # ['M01', 'M02', ..., 'M15']

# 📌 Iterate over each person
for person in persons:
    person_folder = os.path.join(output_folder, person)
    os.makedirs(person_folder, exist_ok=True)  # Create person folder

    # Iterate over all 15 movement files
    for i, movement in enumerate(movements, start=1):
        file_name = f"{person}{movement}.csv"
        file_path = os.path.join(data_folder, file_name)

        if os.path.exists(file_path):
            try:
                # Load CSV using pandas and extract EMG column 'Channel_1'
                df = pd.read_csv(file_path)

                # Check if 'Channel_1' exists
                if 'Channel_1' not in df.columns:
                    print(f"⚠️ Skipping {file_name}: 'Channel_1' column not found!")
                    continue

                # Convert 'Channel_1' to float (handling string values with apostrophes)
                df['Channel_1'] = df['Channel_1'].astype(str).str.replace("'", "").astype(float)

                # Extract EMG data
                emg_data = df['Channel_1'].values

                # Reshape to calculate mean without losing data
                num_segments = len(emg_data) // segment_size
                emg_avg = emg_data[:num_segments * segment_size].reshape(-1, segment_size).mean(axis=1)

                # Generate time axis for averaged data
                time_axis = np.arange(0, len(emg_avg)) * (segment_size / sampling_rate)

                # Plot EMG vs. Time
                plt.figure(figsize=(10, 4))
                plt.plot(time_axis, emg_avg, color='b', linewidth=1)
                plt.xlabel("Time (seconds)")
                plt.ylabel("EMG Signal (Averaged)")
                plt.title(f"{person} - {movement}")
                plt.grid(True)

                # Save plot
                plot_filename = os.path.join(person_folder, f"{person}_{movement}.png")
                plt.savefig(plot_filename, dpi=200)
                plt.close()

                # Print progress every 5 files
                if i % 5 == 0:
                    print(f"✅ Processed {i} files for {person}")

            except Exception as e:
                print(f"❌ Error processing {file_name}: {e}")

print("✅ All plots generated successfully!")
