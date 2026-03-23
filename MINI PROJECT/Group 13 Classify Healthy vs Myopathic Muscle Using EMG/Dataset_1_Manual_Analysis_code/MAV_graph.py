import pandas as pd
import matplotlib.pyplot as plt

# Load the MAV.csv
df = pd.read_csv("MAV.csv", index_col=0)

# Extract segment names
segments = df.columns

# Shades of green for healthy (P01–P06)
green_shades = [f'#00{hex(100 + i*25)[2:]}00' for i in range(6)]

# Shades of red for myopathy (P07–P12)
red_shades = [f'#{hex(200 - i*25)[2:]}0000' for i in range(6)]

# Plot setup
plt.figure(figsize=(15, 6))

# Plot healthy patients
for i in range(6):
    plt.plot(segments, df.iloc[i], color=green_shades[i], label=f"P{(i+1):02d}")

# Plot myopathy patients
for i in range(6):
    plt.plot(segments, df.iloc[i+6], color=red_shades[i], label=f"P{(i+7):02d}")

# Format x-axis (label only F01 to F05)
file_labels = [seg.split("S")[0] for seg in segments]
unique_files = sorted(set(file_labels), key=file_labels.index)
file_indices = [file_labels.index(f) for f in unique_files]

plt.xticks(file_indices, unique_files, rotation=45)
plt.xlabel("Files (F01 to F05)")
plt.ylabel("MAV (Mean Absolute Value)")
plt.title("MAV of EMG Segments (P01–P06 Healthy, P07–P12 Myopathy)")
plt.grid(True, linestyle='--', alpha=0.5)
plt.legend()
plt.tight_layout()
plt.savefig("MAV_plot.png", dpi=300)
plt.show()

print("📊 MAV_plot.png saved.")

