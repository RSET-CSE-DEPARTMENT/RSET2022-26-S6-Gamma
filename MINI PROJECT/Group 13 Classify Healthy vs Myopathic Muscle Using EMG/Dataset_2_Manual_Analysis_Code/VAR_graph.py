import pandas as pd
import matplotlib.pyplot as plt

# Load VAR data
data = pd.read_csv("VAR.csv")
segments = data.columns[1:]

# Colors
green_shades = [f'#00{hex(100 + i * 15)[2:]}00' for i in range(10)]
red_shades = [f'#{hex(250 - i * 15)[2:]}0000' for i in range(10)]

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
plt.ylabel("Variance (VAR)")
plt.title("EMG Variance (VAR) - Healthy vs Myopathy")
plt.xticks(rotation=45)
plt.grid(True, linestyle='--', alpha=0.5)
plt.legend(ncol=2, fontsize=8)

# Save and show
plt.tight_layout()
plt.savefig("VAR.png", dpi=300)
plt.show()

print("VAR plot saved as VAR_plot_new_dataset.png")

