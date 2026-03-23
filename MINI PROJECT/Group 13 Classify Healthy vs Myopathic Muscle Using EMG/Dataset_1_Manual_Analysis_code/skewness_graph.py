import pandas as pd
import matplotlib.pyplot as plt

# Load data
df = pd.read_csv("skewness.csv", index_col=0)

# Create plot
plt.figure(figsize=(15, 6))

# Shades of green for P01–P06
green_shades = ['#006400', '#228B22', '#32CD32', '#66CDAA', '#90EE90', '#98FB98']
# Shades of red for P07–P12
red_shades = ['#8B0000', '#B22222', '#DC143C', '#FF6347', '#FA8072', '#FF7F7F']

# Plot healthy (P01–P06)
for i in range(6):
    plt.plot(df.columns, df.iloc[i], label=f"P0{i+1}", color=green_shades[i])

# Plot myopathy (P07–P12)
for i in range(6):
    plt.plot(df.columns, df.iloc[i+6], label=f"P0{i+7}", color=red_shades[i])

plt.title("Skewness of EMG Signal Segments")
plt.xlabel("File (F01 to F05)")
plt.ylabel("Skewness")

# Reduce x-axis ticks: F01 to F05
tick_positions = [0, 55, 110, 165, 220]
tick_labels = ["F01", "F02", "F03", "F04", "F05"]
plt.xticks(tick_positions, tick_labels)

plt.legend()
plt.grid(True, linestyle='--', alpha=0.5)
plt.tight_layout()

# Save and show
plt.savefig("skewness_plot.png", dpi=300)
plt.show()
print("skewness_plot.png saved successfully.")

