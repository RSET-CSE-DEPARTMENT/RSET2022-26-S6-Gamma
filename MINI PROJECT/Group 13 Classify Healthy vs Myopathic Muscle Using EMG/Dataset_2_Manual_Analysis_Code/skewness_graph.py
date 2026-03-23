import pandas as pd
import matplotlib.pyplot as plt
import matplotlib.cm as cm
import numpy as np

# Load the skewness CSV
df = pd.read_csv("skewness.csv", index_col=0)
segments = df.columns.tolist()

plt.figure(figsize=(18, 6))

# Generate 10 visible color intensities between 0.2 and 1.0
shade_vals = np.linspace(0.2, 1.0, 10)

# Healthy (P01 to P10) → Green shades
greens = cm.get_cmap('Greens')
for i in range(10):
    plt.plot(segments, df.iloc[i], label=df.index[i], color=greens(shade_vals[i]), linewidth=1.5)

# Myopathy (P11 to P20) → Red shades
reds = cm.get_cmap('Reds')
for i in range(10, 20):
    plt.plot(segments, df.iloc[i], label=df.index[i], color=reds(shade_vals[i - 10]), linewidth=1.5)

# Styling
plt.title("EMG Skewness - Healthy vs Myopathy")
plt.xlabel("Segments (S01 to S50)")
plt.ylabel("Skewness")
plt.xticks(rotation=45)
plt.grid(True, linestyle='--', alpha=0.6)
plt.legend(loc='lower left', fontsize='small', ncol=2)
plt.tight_layout()

# Save and show
plt.savefig("skewness.png", dpi=300)
plt.show()

