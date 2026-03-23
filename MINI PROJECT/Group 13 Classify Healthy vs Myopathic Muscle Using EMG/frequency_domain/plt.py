import pandas as pd
import matplotlib.pyplot as plt
import os

# Base directories
base_dir_healthy = r"C:\Users\USER\Desktop\A_final_data\A.)IMPULSE_FEATURES\healthy"
base_dir_myopathic = r"C:\Users\USER\Desktop\A_final_data\A.)IMPULSE_FEATURES\myo"

# Feature file mapping
features = {
    "Peak": "peak_value_summary_h.csv",
    "Impulse Factor": "impulse_factor_summary_h.csv",
    "Crest Factor": "crest_factor_summary_h.csv",
    "Clearance Factor": "clearance_factor_summary_h.csv",
}

# Create a subplot: 4 rows (features) × 2 columns (healthy, myopathic)
fig, axes = plt.subplots(nrows=4, ncols=2, figsize=(16, 12))
plt.subplots_adjust(hspace=0.5, wspace=0.3)

# Loop over features and plot
for row_idx, (feature_name, healthy_file) in enumerate(features.items()):
    # Derive file paths
    healthy_path = os.path.join(base_dir_healthy, healthy_file)
    myo_file = healthy_file.replace("_h.csv", "_m.csv")
    myo_path = os.path.join(base_dir_myopathic, myo_file)

    # Load data
    healthy_df = pd.read_csv(healthy_path, index_col="Person")
    myo_df = pd.read_csv(myo_path, index_col="Person")

    # Compute mean per segment
    healthy_mean = healthy_df.mean()
    myo_mean = myo_df.mean()
    segment_numbers = [int(col[3:]) for col in healthy_mean.index]

    # Plot Healthy (left column)
    ax_healthy = axes[row_idx, 0]
    ax_healthy.plot(segment_numbers, healthy_mean, color='blue', linewidth=1)
    ax_healthy.set_title(f"{feature_name} - Healthy")
    ax_healthy.set_xlabel("Segment Number")
    ax_healthy.set_ylabel(feature_name)
    ax_healthy.grid(True)

    # Plot Myopathic (right column)
    ax_myo = axes[row_idx, 1]
    ax_myo.plot(segment_numbers, myo_mean, color='red', linewidth=1)
    ax_myo.set_title(f"{feature_name} - Myopathic")
    ax_myo.set_xlabel("Segment Number")
    ax_myo.set_ylabel(feature_name)
    ax_myo.grid(True)

# Add a global title and save
plt.suptitle("Impulse Feature Comparison: Healthy vs Myopathic (Separate Scales)", fontsize=18, y=1.02)

# Save final figure
output_path = r"C:\Users\USER\Desktop\A_final_data\A.)IMPULSE_FEATURES\impulse_feature_comparison_separate.png"
plt.savefig(output_path, dpi=300, bbox_inches='tight')
print(f"✅ Combined plot with separate Y-scales saved at: {output_path}")

# Show plot
#plt.show()
