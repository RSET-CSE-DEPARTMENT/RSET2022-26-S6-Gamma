import pandas as pd
import matplotlib.pyplot as plt
import matplotlib.cm as cm
import numpy as np

# Load the IQR CSV
df = pd.read_csv("iqr.csv", index_col=0)
segments = df.columns.tolist()

plt.figure(figsize=(18, 6))

# Generate color shades
shade_vals = np.linspace(0.2, 1.0, 10)
greens = cm.get_cmap('Greens')
reds = cm.get_cmap('Reds')

# Plot Healthy (P01–P10) in green shades
for i in range(10):
    plt.plot(segments, df.iloc[i], label=df.index[i], color=greens(shade_vals[i]), linewidth=1.5)

# Plot Myopathy (P11–P20) in red shades
for i in range(10, 20):
    plt.plot(segments, df.iloc[i], label=df.index[i], color=reds(shade_vals[i - 10]), linewidth=1.5)

# Formatting
plt.title("EMG Interquartile Range - Healthy vs Myopathy")
plt.xlabel("Segments (S01 to S50)")
plt.ylabel("IQR")
plt.xticks(rotation=45)
plt.grid(True, linestyle='--', alpha=0.6)
plt.legend(loc='lower left', fontsize='small', ncol=2)
plt.tight_layout()

# Save and show
plt.savefig("iqr_shaded_plot.png", dpi=300)
plt.show()

