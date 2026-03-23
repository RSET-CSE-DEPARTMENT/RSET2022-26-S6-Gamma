import pandas as pd
import matplotlib.pyplot as plt

# Load RMS data
data = pd.read_csv("RMS.csv")  # Update path if needed
segments = data.columns[1:]  # Skip patient ID column

# Shades for plotting
green_shades = [f'#00{hex(100 + i * 15)[2:]}00' for i in range(10)]  # P01–P10
red_shades = [f'#{hex(250 - i * 15)[2:]}0000' for i in range(10)]    # P11–P20

# Plot
plt.figure(figsize=(14, 6))

# Healthy (P01–P10)
for i in range(10):
    plt.plot(segments, data.iloc[i, 1:], color=green_shades[i], label=f'P{(i+1):02d}')

# Myopathy (P11–P20)
for i in range(10):
    plt.plot(segments, data.iloc[i+10, 1:], color=red_shades[i], label=f'P{(i+11):02d}')

# Formatting
plt.xlabel("Segments (S01 to S50)")
plt.ylabel("RMS (Root Mean Square)")
plt.title("EMG RMS Values - Healthy vs Myopathy")
plt.xticks(rotation=45)
plt.grid(True, linestyle='--', alpha=0.5)
plt.legend(ncol=2, fontsize=8)

# Save + Show
plt.tight_layout()
plt.savefig("RMS.png", dpi=300)
plt.show()

print("RMS plot saved as RMS_plot_new_dataset.png")

