import pandas as pd
import matplotlib.pyplot as plt
import numpy as np

# Load the summary CSV file
summary_path = r"C:\Users\USER\Desktop\A_final_data\PSD_Results\MNF_MDF_Summary_Myo.csv"
df = pd.read_csv(summary_path)

# Extract data
file_names = df['File']
mnf_values = df['Mean Frequency (MNF)']
mdf_values = df['Median Frequency (MDF)']

# Assign colors based on patient ID (P01, P02, etc.)
patients = [name[:3] for name in file_names]  # Extract first three characters (PXX)
unique_patients = sorted(set(patients))
colors = plt.cm.get_cmap("tab10", len(unique_patients))  # Use colormap for different patients
color_map = {patient: colors(i) for i, patient in enumerate(unique_patients)}

# Set up side-by-side plots
fig, axes = plt.subplots(1, 2, figsize=(15, 6))

# Reduce the number of x-axis labels to avoid overcrowding
num_labels = 10  # Adjust as needed
selected_indices = np.linspace(0, len(file_names) - 1, num_labels, dtype=int)
selected_labels = [file_names[i] for i in selected_indices]

# Plot Mean Frequency (MNF)
for patient in unique_patients:
    indices = [i for i, p in enumerate(patients) if p == patient]
    axes[0].plot(np.array(file_names)[indices], np.array(mnf_values)[indices], marker='o', linestyle='-',
                 label=patient, color=color_map[patient])
axes[0].set_xlabel("Patients")
axes[0].set_ylabel("Mean Frequency (Hz)")
axes[0].set_title("Mean Frequency (MNF) for All Patients")
axes[0].set_xticks(selected_indices)
axes[0].set_xticklabels(selected_labels, rotation=45, ha='right')
axes[0].legend(title="Patients")
axes[0].grid()

# Plot Median Frequency (MDF)
for patient in unique_patients:
    indices = [i for i, p in enumerate(patients) if p == patient]
    axes[1].plot(np.array(file_names)[indices], np.array(mdf_values)[indices], marker='s', linestyle='-',
                 label=patient, color=color_map[patient])
axes[1].set_xlabel("Patients")
axes[1].set_ylabel("Median Frequency (Hz)")
axes[1].set_title("Median Frequency (MDF) for All Patients")
axes[1].set_xticks(selected_indices)
axes[1].set_xticklabels(selected_labels, rotation=45, ha='right')
axes[1].legend(title="Patients")
axes[1].grid()

# Adjust layout and save
plt.tight_layout()
plt.savefig("MNF_MDF_plots_myo.png")
plt.show()
