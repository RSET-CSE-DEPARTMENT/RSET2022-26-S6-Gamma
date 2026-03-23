import pandas as pd
import matplotlib.pyplot as plt
import matplotlib.cm as cm
import numpy as np

# Load ZC CSV
df = pd.read_csv("zero_crossing.csv", index_col=0)
segments = df.columns.tolist()

plt.figure(figsize=(18, 6))

# Color maps
shade_vals = np.linspace(0.2, 1.0, 10)
greens = cm.get_cmap('Greens')
reds = cm.get_cmap('Reds')

# Plot Healthy (P01–P10) in green
for i in range(10):
    plt.plot(segments, df.iloc[i], label=df.index[i], color=greens(shade_vals[i]), linewidth=1.5)

# Plot Myopathy (P11–P20) in red
for i in range(10, 20):
    plt.plot(segments, df.iloc[i], label=df.index[i], color=reds(shade_vals[i - 10]), linewidth=1.5)

# Formatting
plt.title("EMG Zero Crossing - Healthy vs Myopathy")
plt.xlabel("Segments (S01 to S50)")
plt.ylabel("Zero Crossing Count")
plt.xticks(rotation=45)
plt.grid(True, linestyle='--', alpha=0.6)
plt.legend(loc='lower left', fontsize='small', ncol=2)
plt.tight_layout()

# Save and show
plt.savefig("zero_crossing_plot.png", dpi=300)
plt.show()

