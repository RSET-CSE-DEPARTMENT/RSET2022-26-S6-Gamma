import pandas as pd
import matplotlib.pyplot as plt

# Load the WL.csv
df = pd.read_csv("WL.csv", index_col=0)

# Extract segment names
segments = df.columns

# Shades of green for P01–P06
green_shades = [f'#00{hex(100 + i*25)[2:]}00' for i in range(6)]

# Shades of red for P07–P12
red_shades = [f'#{hex(200 - i*25)[2:]}0000' for i in range(6)]

# Plot setup
plt.figure(figsize=(15, 6))

# Plot healthy patients
for i in range(6):
    plt.plot(segments, df.iloc[i], color=green_shades[i], label=f"P{(i+1):02d}")

# Plot myopathy patients
for i in range(6):
    plt.plot(segments, df.iloc[i+6], color=red_shades[i], label=f"P{(i+7):02d}")

# Format x-axis labels
file_labels = [seg.split("S")[0] for seg in segments]
unique_files = sorted(set(file_labels), key=file_labels.index)
file_indices = [file_labels.index(f) for f in unique_files]

plt.xticks(file_indices, unique_files, rotation=45)
plt.xlabel("Files (F01 to F05)")
plt.ylabel("WL (Wavelength)")
plt.title("Wavelength of EMG Segments (P01–P06 Healthy, P07–P12 Myopathy)")
plt.grid(True, linestyle='--', alpha=0.5)
plt.legend()
plt.tight_layout()
plt.savefig("WL_plot.png", dpi=300)
plt.show()

print("📊 WL_plot.png saved.")

