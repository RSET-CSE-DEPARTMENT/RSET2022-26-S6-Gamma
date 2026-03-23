import csv
import pandas as pd
import numpy as np
import random
from datetime import datetime, timedelta

# ------------------ CONFIG ------------------
BASE_DATE = datetime(2025, 1, 1)
np.random.seed(42)
random.seed(42)

# ------------------ TRENDS (UPDATED FOR REALISM) ------------------

def bp_trend(dx, sys, dia, hour):
    # Add random noise first
    sys += np.random.normal(0, 3)
    dia += np.random.normal(0, 2)

    if dx == "Normal":
        # Normal daily variation (circadian rhythm)
        sys += np.sin(hour / 24 * 2 * np.pi) * 5
        
    elif dx == "Pneumonia":
        # Mild stress, BP goes up slightly due to fever/pain
        sys += min(hour, 10) 
        
    elif dx == "Heart Failure":
        # Cardiogenic trouble: BP drops significantly over time
        # Hour 10: -20 mmHg | Hour 20: -40 mmHg
        decay = (hour * 2.0)
        sys -= decay
        dia -= (decay * 0.6)
        
    elif dx == "Sepsis":
        # OLD: decay = (hour * 3.0) 
        # NEW: Rapid onset. Starts with a drop and worsens quickly.
        # Hour 0: -15 (SBP ~105) | Hour 4: -31 (SBP ~89 -> CRITICAL)
        decay = 15 + (hour * 4.0) 
        sys -= decay
        dia -= (decay * 0.5)

    # Safety clamping (Dead or Exploding)
    return round(max(50, min(220, sys))), round(max(30, min(140, dia)))

def vitals_trend(dx, row, hour):
    # Get the BP first 
    sys, dia = bp_trend(dx, row["systolic_bp"], row["diastolic_bp"], hour)

    # --- HEART RATE (HR) ---
    base_hr = np.random.normal(75, 5) # Lower resting rate
    hr_adder = 0
    
    if dx == "Sepsis":
        # OLD: hr_adder = 10 + (hour * 2.5)
        # NEW: Immediate Tachycardia. 
        # Hour 0: +30 (HR ~105) -> Immediate Trigger with Low BP
        hr_adder = 30 + (hour * 2.0)
    elif dx == "Pneumonia":
        hr_adder = 15 # Constant stress
    elif dx == "Heart Failure":
        hr_adder = -5 + (hour * 0.5) # Variable
        
    hr = round(max(40, min(180, base_hr + hr_adder)))

    # --- RESPIRATORY RATE (RR) ---
    base_rr = np.random.normal(16, 2)
    rr_adder = 0
    
    if dx == "Pneumonia":
        # Respiratory distress
        rr_adder = 5 + (hour * 0.8) # Ends up around 25-30
    elif dx == "Sepsis":
        rr_adder = (hour * 0.5) # Compensatory tachypnea
        
    rr = round(max(8, min(45, base_rr + rr_adder)))

    # --- TEMPERATURE (Temp) ---
    base_temp = np.random.normal(36.8, 0.2)
    temp_adder = 0
    
    if dx == "Sepsis" or dx == "Pneumonia":
        # Fever spikes
        temp_adder = 1.0 + (hour * 0.1) # 38C -> 40C
        
    temp = round(max(35, min(42, base_temp + temp_adder)), 1)

    # --- OXYGEN (SpO2) ---
    base_spo2 = np.random.normal(98, 1)
    spo2_subtractor = 0
    
    if dx == "Pneumonia":
        # Hypoxia
        spo2_subtractor = 2 + (hour * 0.6) # Drops to ~88%
    elif dx == "Sepsis":
        spo2_subtractor = 2 + (hour * 0.4) # Drops to ~90%
    elif dx == "Heart Failure":
        spo2_subtractor = (hour * 0.5) # Pulmonary edema
        
    spo2 = round(max(70, min(100, base_spo2 - spo2_subtractor)))

    return sys, dia, hr, rr, temp, spo2

def csv_generate_patients(
	base_file="./dataset/synthetic_clinical_dataset.csv",
	output="./dataset/patients.csv",
	limit_per_diagnosis=250
):
	df = pd.read_csv(base_file)

	required_diagnoses = [
		"Normal",
		"Heart Failure",
		"Sepsis",
		"Pneumonia"
	]

	rows = []

	for dx in required_diagnoses:
		group = df[df["diagnosis"] == dx]

		if len(group) < limit_per_diagnosis:
			raise ValueError(
				f"Not enough rows for diagnosis '{dx}': "
				f"need {limit_per_diagnosis}, found {len(group)}"
			)

		sampled = group.sample(
			n=limit_per_diagnosis,
			random_state=42
		)

		for _, r in sampled.iterrows():
			rows.append({
				"patient_id": r["patient_id"],
				"age": r["age"],
				"sex": r["sex"],
				"bmi": round(r["bmi"], 1),
				"diabetes": r["diabetes"],
				"hypertension": r["hypertension"],
				"diagnosis": r["diagnosis"],
			})

	# Shuffle final dataset
	patients_df = pd.DataFrame(rows).sample(
		frac=1, random_state=42
	)

	patients_df.to_csv(output, index=False)

	print("Wrote", output)
	print("Diagnosis distribution:")
	print(patients_df["diagnosis"].value_counts())

def csv_generate_hospital_stays(
	base_file="./dataset/synthetic_clinical_dataset.csv",
	patient_file="./dataset/patients.csv",
	output="./dataset/hospital_stays.csv",
):
	# Load patients selected earlier
	patients_df = pd.read_csv(patient_file)
	if patients_df.empty:
		raise ValueError("patients.csv is empty")

	# Load base dataset and filter
	base_df = pd.read_csv(base_file)
	base_df = base_df[base_df["patient_id"].isin(patients_df["patient_id"])]

	if base_df.empty:
		raise ValueError("No matching patients found in base dataset")

	rows = []

	for idx, r in base_df.iterrows():
		admit = BASE_DATE + timedelta(
			days=idx % 30,
			hours=random.randint(6, 20)
		)

		los = random.choice([24, 28, 36, 48, 72])

		rows.append({
			"patient_id": r["patient_id"],
			"stay_id": idx + 1,
			"admission_datetime": admit.isoformat(),
			"discharge_datetime": (admit + timedelta(hours=los)).isoformat(),
			"length_of_stay_hours": los,
			"glucose": round(r["glucose"], 1),
			"cholesterol": round(r["cholesterol"], 1),
			"creatinine": round(r["creatinine"], 2),
		})

	pd.DataFrame(rows).to_csv(output, index=False)
	print("Wrote", output)
	print(f"Hospital stays generated for {len(rows)} patients")

def csv_generate_vitals(
	base_file="./dataset/synthetic_clinical_dataset.csv",
	patient_file="./dataset/patients.csv",
	stay_file="./dataset/hospital_stays.csv",
	output="./dataset/vitals.csv",
):
	# Load patients
	patients_df = pd.read_csv(patient_file)
	if patients_df.empty:
		raise ValueError("patients.csv is empty")

	valid_patients = set(patients_df["patient_id"])

	# Load hospital stays
	stays_df = pd.read_csv(stay_file)
	if stays_df.empty:
		raise ValueError("hospital_stays.csv is empty")

	# Load base clinical data
	base_df = pd.read_csv(base_file)
	base_df = base_df[base_df["patient_id"].isin(valid_patients)]

	if base_df.empty:
		raise ValueError("No matching patients found in base dataset")

	rows = []

	for _, stay in stays_df.iterrows():
		patient_id = stay["patient_id"]
		stay_id = stay["stay_id"]
		admit = pd.to_datetime(stay["admission_datetime"])

		# get patient's diagnosis row
		patient_row = base_df[base_df["patient_id"] == patient_id].iloc[0]

		for h in [0, 4, 8, 12, 16, 20]:
			vital_time = admit + timedelta(hours=h)
			if vital_time > pd.to_datetime(stay["discharge_datetime"]):
				break

			sys, dia, hr, rr, temp, spo2 = vitals_trend(
				patient_row["diagnosis"],
				patient_row,
				h
			)

			rows.append({
				"patient_id": patient_id,
				"stay_id": stay_id,
				"vital_datetime": vital_time.isoformat(),
				"systolic_bp": sys,
				"diastolic_bp": dia,
				"heart_rate": hr,
				"respiratory_rate": rr,
				"temp_c": temp,
				"sp_o2": spo2,
				"hour_offset": h,
			})

	pd.DataFrame(rows).to_csv(output, index=False)
	print("Wrote", output)
	print(f"Vitals generated for {len(rows)} observations")