import pandas as pd
import matplotlib.pyplot as plt
import numpy as np

# File paths for Healthy and Myopathy summaries
healthy_file = r"C:\Users\USER\Desktop\A_final_data\PSD_Results\MNF_MDF_Summary_Hea.csv"
myopathy_file = r"C:\Users\USER\Desktop\A_final_data\PSD_Results\MNF_MDF_Summary_Myo.csv"

# Load CSV files
healthy_df = pd.read_csv(healthy_file)
myopathy_df = pd.read_csv(myopathy_file)

# Extract patient prefixes (P01, P02, ..., P06)
healthy_df["Patient"] = healthy_df["File"].str[:3]  
myopathy_df["Patient"] = myopathy_df["File"].str[:3]

# Get unique patients
healthy_patients = sorted(healthy_df["Patient"].unique())
myopathy_patients = sorted(myopathy_df["Patient"].unique())

# Define colors for different patients
colors = plt.cm.get_cmap("tab10", max(len(healthy_patients), len(myopathy_patients)))

### PLOT 1: MEAN FREQUENCY (MNF) COMPARISON ###
fig, axes = plt.subplots(1, 2, figsize=(14, 6), sharey=True)

# Healthy MNF
axes[0].set_title("Healthy Patients - Mean Frequency (MNF)")
axes[0].set_xlabel("Patient ID")
axes[0].set_ylabel("Mean Frequency (Hz)")
for i, patient in enumerate(healthy_patients):
    patient_data = healthy_df[healthy_df["Patient"] == patient]["Mean Frequency (MNF)"]
    axes[0].scatter([i] * len(patient_data), patient_data, color=colors(i), marker="o", label=patient, alpha=0.7)

axes[0].set_xticks(range(len(healthy_patients)))
axes[0].set_xticklabels(healthy_patients)
axes[0].grid(True)
axes[0].legend()

# Myopathy MNF
axes[1].set_title("Myopathic Patients - Mean Frequency (MNF)")
axes[1].set_xlabel("Patient ID")
for i, patient in enumerate(myopathy_patients):
    patient_data = myopathy_df[myopathy_df["Patient"] == patient]["Mean Frequency (MNF)"]
    axes[1].scatter([i] * len(patient_data), patient_data, color=colors(i), marker="x", label=patient, alpha=0.7)

axes[1].set_xticks(range(len(myopathy_patients)))
axes[1].set_xticklabels(myopathy_patients)
axes[1].grid(True)
axes[1].legend()

plt.tight_layout()
plt.savefig(r"C:\Users\USER\Desktop\A_final_data\PSD_Results\MNF_Comparison.png", dpi=300)
plt.show()


### PLOT 2: MEDIAN FREQUENCY (MDF) COMPARISON ###
fig, axes = plt.subplots(1, 2, figsize=(14, 6), sharey=True)

# Healthy MDF
axes[0].set_title("Healthy Patients - Median Frequency (MDF)")
axes[0].set_xlabel("Patient ID")
axes[0].set_ylabel("Median Frequency (Hz)")
for i, patient in enumerate(healthy_patients):
    patient_data = healthy_df[healthy_df["Patient"] == patient]["Median Frequency (MDF)"]
    axes[0].scatter([i] * len(patient_data), patient_data, color=colors(i), marker="o", label=patient, alpha=0.7)

axes[0].set_xticks(range(len(healthy_patients)))
axes[0].set_xticklabels(healthy_patients)
axes[0].grid(True)
axes[0].legend()

# Myopathy MDF
axes[1].set_title("Myopathic Patients - Median Frequency (MDF)")
axes[1].set_xlabel("Patient ID")
for i, patient in enumerate(myopathy_patients):
    patient_data = myopathy_df[myopathy_df["Patient"] == patient]["Median Frequency (MDF)"]
    axes[1].scatter([i] * len(patient_data), patient_data, color=colors(i), marker="x", label=patient, alpha=0.7)

axes[1].set_xticks(range(len(myopathy_patients)))
axes[1].set_xticklabels(myopathy_patients)
axes[1].grid(True)
axes[1].legend()

plt.tight_layout()
plt.savefig(r"C:\Users\USER\Desktop\A_final_data\PSD_Results\MDF_Comparison.png", dpi=300)
plt.show()
