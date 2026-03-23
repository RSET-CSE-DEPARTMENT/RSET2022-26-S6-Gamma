import pandas as pd
import matplotlib.pyplot as plt

# Load Zero Crossing data
df = pd.read_csv("zc.csv", index_col=0)

# Create plot
plt.figure(figsize=(15, 6))

# Define colors
green_shades = ['#006400', '#228B22', '#32CD32', '#66CDAA', '#90EE90', '#98FB98']  # P01–P06
red_shades = ['#8B0000', '#B22222', '#DC143C', '#FF6347', '#FA8072', '#FF7F7F']     # P07–P12

# Plot healthy (P01–P06)
for i in range(6):
    plt.plot(df.columns, df.iloc[i], label=f"P0{i+1}", color=green_shades[i])

# Plot myopathy (P07–P12)
for i in range(6):
    plt.plot(df.columns, df.iloc[i+6], label=f"P0{i+7}", color=red_shades[i])

plt.title("Zero Crossing (ZC) of EMG Signal Segments")
plt.xlabel("Segment (S01 to S55 for each File Group F01–F05)")
plt.ylabel("Zero Crossings")

# Show every 5th tick to avoid crowding
xticks = df.columns[::5]  # every 5th segment
plt.xticks(ticks=range(0, len(df.columns), 5), labels=xticks, rotation=45)

plt.legend(loc='upper right')
plt.grid(True, linestyle='--', alpha=0.5)
plt.tight_layout()

# Save and show
plt.savefig("zc_plot_segments1.png", dpi=300)
plt.show()
print("✅ zc_plot_segments1.png saved.")
