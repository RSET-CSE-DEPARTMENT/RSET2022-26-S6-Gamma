import pandas as pd
import matplotlib.pyplot as plt

# Load the MAV CSV file
file_path = "MAV.csv"  # Update path if needed
data = pd.read_csv(file_path)

# Extract segment names (S01 to S50)
segments = data.columns[1:]

# Generate green shades for P01–P10 (healthy)
green_shades = [f'#00{hex(100 + i * 15)[2:]}00' for i in range(10)]

# Generate red shades for P11–P20 (myopathy)
red_shades = [f'#{hex(250 - i * 15)[2:]}0000' for i in range(10)]

# Plot setup
plt.figure(figsize=(14, 6))

# Plot healthy patients (rows 0–9)
for i in range(10):
    plt.plot(segments, data.iloc[i, 1:], color=green_shades[i], label=f'P{(i+1):02d}')

# Plot myopathy patients (rows 10–19)
for i in range(10):
    plt.plot(segments, data.iloc[i+10, 1:], color=red_shades[i], label=f'P{(i+11):02d}')

# Formatting
plt.xlabel("Segments (S01 to S50)")
plt.ylabel("MAV (Mean Absolute Value)")
plt.title("EMG MAV Values - Healthy vs Myopathy")
plt.xticks(rotation=45)
plt.grid(True, linestyle='--', alpha=0.5)
plt.legend(ncol=2, fontsize=8)

# Save and show
plt.tight_layout()
plt.savefig("MAV_plot_new_dataset.png", dpi=300)
plt.show()

print("Graph saved as MAV_plot_new_dataset.png")
