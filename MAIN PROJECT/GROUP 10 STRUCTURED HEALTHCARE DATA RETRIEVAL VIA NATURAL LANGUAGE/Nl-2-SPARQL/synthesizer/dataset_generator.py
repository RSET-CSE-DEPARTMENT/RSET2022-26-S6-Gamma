import csv
from random import randint, choice

DOCTOR_NAMES = [
	'Robert Michael Anderson',
	'Priya Natarajan',
	'Jonathan William Harris',
	'Ananya Srinivasan',
	'David Christopher Miller',
	'Sneha Ramesh Iyer',
	'Matthew Thomas Wilson',
	'Kavya Subramanian',
	'Daniel Joseph Rodriguez',
	'Neha Prakash Mehta',
	'Andrew Paul Thompson',
	'Aishwarya Rajesh Kulkarni',
	'Michael Anthony Collins',
	'Pooja Sharma',
	'Benjamin Scott Turner',
	'Rohan Vivek Deshpande',
	'Christopher Alan Brooks',
	'Shalini Gupta',
	'Samuel Edward Peterson',
	'Arjun Krishnan Menon'
]

DIAGNOSIS_TO_DEPARTMENTS = {
	"Pneumonia": [
		"Pulmonology",
		"General Medicine"
	],
	"Sepsis": [
		"Critical Care",
		"Internal Medicine"
	],
	"Heart Failure": [
		"Cardiology",
		"Internal Medicine"
	],
	"Normal": [
		"General Medicine"
	],
}

DIAGNOSIS_TO_DRUGS = {
	"Pneumonia": [
		"Azithromycin",
		"Amoxicillin",
		"Ceftriaxone"
	],
	"Sepsis": [
		"Piperacillin-Tazobactam",
		"Vancomycin",
		"Meropenem"
	],
	"Heart Failure": [
		"Furosemide",
		"Lisinopril",
		"Metoprolol"
	],
	"Normal": [
		"Multivitamins"
	],
}

DIAGNOSIS_TO_SIMILAR = {
	"Pneumonia": [
		"Pneumonia",
		"Upper Respiratory Infection",
		"Bronchitis",
		"Chest Infection",
	],
	"Sepsis": [
		"Sepsis",
		"Systemic Infection",
		"Suspected Infection",
		"Fever of Unknown Origin",
	],
	"Heart Failure": [
		"Heart Failure",
		"Cardiac Dysfunction",
		"Shortness of Breath",
		"Edema",
	],
	"Normal": [
		"Normal",
		"Routine Checkup",
		"General Weakness",
		"No Abnormality Detected",
	],
}

ALL_DEPARTMENTS = sorted({
	dept
	for depts in DIAGNOSIS_TO_DEPARTMENTS.values()
	for dept in depts
})

DEFAULT_DIAGNOSIS = "Multivitamins"

def convert_num_to_id_long(number):
	number = int(number)
	return f"{number:06d}"

def convert_num_to_id_mid(number):
	number = int(number)
	return f"{number:04d}"

def doctor_id(i):
	return f"D{convert_num_to_id_mid(i)}"

def random_name(names):
	if not names:
		raise ValueError("Ran out of doctor names")
	name = choice(names)
	names.remove(name)
	return "Dr " + name

def random_gender():
	return choice(["M", "F"])

def random_department(remaining):
	# ensure each department appears at least once
	if remaining:
		dept = choice(remaining)
		remaining.remove(dept)
		return dept
	return choice(ALL_DEPARTMENTS)

def csv_random_doctor(
	output_file="./dataset/doctor.csv",
	nof_records=10
):
	if nof_records < len(ALL_DEPARTMENTS):
		raise ValueError(
			"nof_records must be >= number of unique departments"
		)

	with open(output_file, "w", newline="", encoding="utf-8") as fout:
		writer = csv.writer(fout)

		writer.writerow([
			"doctor_id",
			"doctorLabel",
			"age",
			"gender",
			"department"
		])

		names = DOCTOR_NAMES.copy()
		departments_remaining = ALL_DEPARTMENTS.copy()

		for i in range(1, nof_records + 1):
			writer.writerow([
				doctor_id(i),
				random_name(names),
				randint(35, 60),
				random_gender(),
				random_department(departments_remaining)
			])

	print("Wrote", output_file)

def csv_random_hospital(
	output="./dataset/hospital.csv",
	nof_records=1000,
	doctor_file="./dataset/doctor.csv",
	stay_file="./dataset/hospital_stays.csv",
	patient_file="./dataset/patients.csv",
	max_checkups_per_stay=3
):
	from random import choice, randint
	import csv

	# ------------------ load doctors ------------------

	with open(doctor_file, newline="", encoding="utf-8 sig") as f:
		doctors = list(csv.DictReader(f))

	if not doctors:
		raise ValueError("doctor.csv is empty")

	doctors_by_department = {}
	for d in doctors:
		doctors_by_department.setdefault(
			d["department"], []
		).append(d)

	# ------------------ load stays ------------------

	with open(stay_file, newline="", encoding="utf-8 sig") as f:
		stays = list(csv.DictReader(f))

	if not stays:
		raise ValueError("hospital_stays.csv is empty")

	# ------------------ load patients ------------------

	with open(patient_file, newline="", encoding="utf-8 sig") as f:
		patients = list(csv.DictReader(f))

	if not patients:
		raise ValueError("patients.csv is empty")

	patient_diagnosis = {
		p["patient_id"]: p["diagnosis"]
		for p in patients
	}

	records = []

	# ------------------ generate records ------------------

	for _ in range(min(nof_records, len(stays))):

		stay = choice(stays)
		stays.remove(stay)

		patient_id = stay["patient_id"]
		stay_id = stay["stay_id"]

		diagnosis = patient_diagnosis.get(
			patient_id, "Normal"
		)

		valid_departments = DIAGNOSIS_TO_DEPARTMENTS.get(
			diagnosis, ["General Medicine"]
		)

		eligible_doctors = []
		for dept in valid_departments:
			eligible_doctors.extend(
				doctors_by_department.get(dept, [])
			)

		doctor = choice(
			eligible_doctors or doctors
		)

		prescription = choice(
			DIAGNOSIS_TO_DRUGS.get(
				diagnosis,
				[DEFAULT_DIAGNOSIS]
			)
		)

		# ------------------
		# generate MULTIPLE checkups
		# ------------------

		num_checkups = randint(1, max_checkups_per_stay)

		for _ in range(num_checkups):

			checkup_diagnosis = choice(
				DIAGNOSIS_TO_SIMILAR.get(
					diagnosis, [diagnosis]
				)
			)

			checkup_record = {
				"type": "CHECKUP",
				"isCheckup": True,
				"doctor_id": doctor["doctor_id"],
				"patient_id": patient_id,
				"stay_id": "NULL",
				"diagnosis": checkup_diagnosis,
				"diagnosisType": "PreliminaryDiagnosis",
				"prescription": prescription,
			}

			insert_pos = randint(0, len(records))
			records.insert(insert_pos, checkup_record)

		# ------------------
		# add confirmed stay
		# ------------------

		stay_record = {
			"type": "STAY",
			"isCheckup": False,
			"doctor_id": doctor["doctor_id"],
			"patient_id": patient_id,
			"stay_id": stay_id,
			"diagnosis": diagnosis,
			"diagnosisType": "ConfirmedDiagnosis",
			"prescription": prescription,
		}

		records.append(stay_record)

	# ------------------ write CSV ------------------

	with open(output, "w", newline="", encoding="utf-8") as fout:

		writer = csv.writer(fout)

		writer.writerow([
			"file_id",
			"isCheckup",
			"doctor_id",
			"patient_id",
			"stay_id",
			"diagnosis",
			"diagnosisType",
			"prescription"
		])

		for i, r in enumerate(records, start=1):

			writer.writerow([
				f"F{convert_num_to_id_long(i)}",
				r["isCheckup"],
				r["doctor_id"],
				r["patient_id"],
				r["stay_id"],
				r["diagnosis"],
				r["diagnosisType"],
				r["prescription"]
			])

	print("Wrote", output)
	print(f"Total rows: {len(records)}")