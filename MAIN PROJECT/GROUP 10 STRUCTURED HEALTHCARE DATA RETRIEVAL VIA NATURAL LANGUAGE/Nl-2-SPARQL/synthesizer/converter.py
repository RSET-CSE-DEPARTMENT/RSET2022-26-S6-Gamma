import csv
import re
import os
from collections import defaultdict

def convert_inv_to__(string):
	string = string.lower().strip()
	string = re.sub(r"[^a-z0-9_-]", "_", string)
	string = re.sub(r"_+", "_", string)
	return string

def convert_int_to_bool(string):
	if string == "0": return "false"
	elif string == "1": return "true"
	else: return "unknown"

def convert_num_to_id_long(number):
	number = int(number)
	return f"{number:06d}"

def convert_num_to_id_mid(number):
	number = int(number)
	return f"{number:04d}"

def csv_to_rdfs_disease(input_file="./dataset/diseases_V1_local.csv", output_file="./dataset/disease.ttl", base="http://example.org/health#"):
	with open(input_file, newline="", encoding="utf-8 sig") as fin, open(output_file, "w", encoding="utf-8") as fout:
		reader = csv.DictReader(fin)

		fout.write('@prefix ex:   <' + base + '> .\n')
		fout.write('@prefix wd:   <http://www.wikidata.org/entity/> .\n')
		fout.write('@prefix rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .\n')
		fout.write('@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .\n')
		fout.write('@prefix owl:  <http://www.w3.org/2002/07/owl#> .\n\n')

		for row in reader:
			local = row["disease_local_name"].strip()
			label = row["diseaseLabel"].replace('"', '\\"').strip()
			wd_uri = row["disease"].strip()

			if not local:
				print(row)
				continue   # skip rows without local name

			fout.write(f"ex:{convert_inv_to__(local)} rdf:type ex:Disease ;\n")
			fout.write(f'        rdfs:label "{label}"@en ;\n')
			fout.write(f"        owl:sameAs <{wd_uri}> .\n\n")

	print("Wrote", output_file)

def csv_to_rdfs_symptom(
	input_file="./dataset/symptoms_V1_local.csv",
	output_file="./dataset/symptom.ttl",
	base="http://example.org/health#",
):
	with open(input_file, newline="", encoding="utf-8 sig") as fin, open(
		output_file, "w", encoding="utf-8"
	) as fout:
		reader = csv.DictReader(fin)

		fout.write("@prefix ex:   <" + base + "> .\n")
		fout.write("@prefix wd:   <http://www.wikidata.org/entity/> .\n")
		fout.write("@prefix rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .\n")
		fout.write("@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .\n")
		fout.write("@prefix owl:  <http://www.w3.org/2002/07/owl#> .\n\n")

		for row in reader:
			symptom_local = row["symptom_local_name"].strip()
			symptom_label = row["symptomLabel"].replace('"', '\\"').strip()
			symptom_wd = row["symptom"].strip()

			disease_local = row["diseaseLabel"].strip()

			if not symptom_local or not disease_local:
				continue

			symptom_id = convert_inv_to__(symptom_local)
			disease_id = convert_inv_to__(disease_local)

			# Symptom entity
			fout.write(f"ex:{symptom_id} rdf:type ex:Symptom ;\n")
			fout.write(f'        rdfs:label "{symptom_label}"@en ;\n')
			fout.write(f"        owl:sameAs <{symptom_wd}> .\n\n")

			# Disease → Symptom relation
			fout.write(
				f"ex:{disease_id} ex:hasSymptom ex:{symptom_id} .\n\n"
			)

	print("Wrote", output_file)

def csv_to_rdfs_drug(
	input_file="./dataset/drugs_V1_local.csv",
	output_file="./dataset/drug.ttl",
	base="http://example.org/health#",
):
	with open(input_file, newline="", encoding="utf-8 sig") as fin, open(
		output_file, "w", encoding="utf-8"
	) as fout:
		reader = csv.DictReader(fin)

		fout.write("@prefix ex:   <" + base + "> .\n")
		fout.write("@prefix wd:   <http://www.wikidata.org/entity/> .\n")
		fout.write("@prefix rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .\n")
		fout.write("@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .\n")
		fout.write("@prefix owl:  <http://www.w3.org/2002/07/owl#> .\n\n")

		for row in reader:
			drug_local = row["drugs_local_name"].strip()
			drug_label = row["drugLabel"].replace('"', '\\"').strip()
			drug_wd = row["drug"].strip()

			disease_local = row["diseaseLabel"].strip()

			if not drug_local or not disease_local:
				continue

			drug_id = convert_inv_to__(drug_local)
			disease_id = convert_inv_to__(disease_local)

			# Drug entity
			fout.write(f"ex:{drug_id} rdf:type ex:Medication ;\n")
			fout.write(f'        rdfs:label "{drug_label}"@en ;\n')
			fout.write(f"        owl:sameAs <{drug_wd}> .\n\n")

			# Disease → Drug relation
			fout.write(
				f"ex:{drug_id} ex:treats ex:{disease_id} .\n\n"
			)

	print("Wrote", output_file)

def csv_to_rdfs_doctor(
	input_file="./dataset/doctor.csv",
	output_file="./dataset/doctor.ttl",
	base="http://example.org/health#",
):
	with open(input_file, newline="", encoding="utf-8 sig") as fin, open(
		output_file, "w", encoding="utf-8"
	) as fout:

		reader = csv.DictReader(fin)

		fout.write("@prefix ex:   <" + base + "> .\n")
		fout.write("@prefix rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .\n")
		fout.write("@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .\n\n")

		for row in reader:
			doc_id = row["doctor_id"].strip()
			label = row["doctorLabel"].replace('"', '\\"').strip()
			age = row["age"].strip()
			gender = row["gender"].strip()
			dept = row["department"].strip()

			if not doc_id or not label:
				continue

			fout.write(f"ex:{doc_id} rdf:type ex:Doctor ;\n")
			fout.write(f'        rdfs:label "{label}"@en ;\n')
			fout.write(f"        ex:age {age} ;\n")
			fout.write(f'        ex:gender "{gender}" ;\n')
			fout.write(f'        ex:department "{dept}" .\n\n')

	print("Wrote", output_file)


def csv_to_rdfs_hospital_files(
	input_file="./dataset/hospital.csv",
	output_dir="./dataset/hospital",
	base="http://example.org/health#",
):
	os.makedirs(output_dir, exist_ok=True)

	# -------- read and group rows by file_id --------
	with open(input_file, newline="", encoding="utf-8 sig") as fin:
		reader = csv.DictReader(fin)
		records_by_file = defaultdict(list)

		for row in reader:
			file_id = row["file_id"].strip()
			if file_id:
				records_by_file[file_id].append(row)

	for i, (file_id, records) in enumerate(records_by_file.items(), start=1):
		output_path = os.path.join(output_dir, f"{file_id}.ttl")

		with open(output_path, "w", encoding="utf-8") as fout:
			# Prefixes
			fout.write(f"@prefix ex:   <{base}> .\n")
			fout.write("@prefix rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .\n")
			fout.write("@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .\n\n")

			for row in records:
				is_checkup = row["isCheckup"].lower() == "true"

				visit_class = (
					"CheckupVisit" if is_checkup else "AdmissionVisit"
				)

				doctor_id = row["doctor_id"].strip()
				patient_id = f"P{convert_num_to_id_long(int(row['patient_id']))}"

				diagnosis = row["diagnosis"].replace('"', '\\"').strip()
				diagnosis_type = row["diagnosisType"].strip()
				prescription = row["prescription"].replace('"', '\\"').strip()

				fout.write(f"ex:{file_id} rdf:type ex:{visit_class} ;\n")
				fout.write(f"        ex:isCheckup {'true' if is_checkup else 'false'} ;\n")
				fout.write(f"        ex:attendingDoctor ex:{doctor_id} ;\n")
				fout.write(f"        ex:patient ex:{patient_id} ;\n")

				# Only write stay if present
				if row["stay_id"] != "NULL":
					stay_id = f"S{convert_num_to_id_long(int(row['stay_id']))}"
					fout.write(f"        ex:stay ex:{stay_id} ;\n")

				fout.write(f'        ex:diagnosis "{diagnosis}" ;\n')
				fout.write(f"        ex:diagnosisType ex:{diagnosis_type} ;\n")
				fout.write(f'        ex:prescribedDrug "{prescription}" .\n\n')

		if i % 100 == 0:
			print(f"Wrote .. {output_path}")

	print(f"Finished writing {len(records_by_file)} hospital visit TTL files")

def csv_to_rdfs_patients(
	input_file="./dataset/patients.csv",
	output_file="./dataset/patients.ttl",
	base="http://example.org/health#"
):
	with open(input_file, newline="", encoding="utf-8 sig") as fin, open(
		output_file, "w", encoding="utf-8"
	) as fout:

		reader = csv.DictReader(fin)

		fout.write(f"@prefix ex:   <{base}> .\n")
		fout.write("@prefix rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .\n")
		fout.write("@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .\n\n")

		for row in reader:
			pid = f"P{convert_num_to_id_long(row['patient_id'])}"
			hasDiabetes = convert_int_to_bool(row['diabetes'])
			hasHypertension = convert_int_to_bool(row['hypertension'])
			diagnosis = row["diagnosis"].replace('"', '\\"')

			fout.write(f"ex:{pid} rdf:type ex:Patient ;\n")
			fout.write(f"        ex:age {row['age']} ;\n")
			fout.write(f'        ex:sex "{row["sex"]}" ;\n')
			fout.write(f"        ex:bmi {row['bmi']} ;\n")
			fout.write(f"        ex:hasDiabetes {hasDiabetes} ;\n")
			fout.write(f"        ex:hasHypertension {hasHypertension} .\n")
			# fout.write(f'        ex:diagnosis "{diagnosis}" .\n')
			fout.write(f"\n")

	print("Wrote", output_file)

def csv_to_rdfs_stays(
	input_file="./dataset/hospital_stays.csv",
	output_file="./dataset/hospital_stays.ttl",
	base="http://example.org/health#"
):
	with open(input_file, newline="", encoding="utf-8 sig") as fin, open(
		output_file, "w", encoding="utf-8"
	) as fout:

		reader = csv.DictReader(fin)

		fout.write(f"@prefix ex:   <{base}> .\n")
		fout.write("@prefix rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .\n\n")

		for row in reader:
			stay = f"S{convert_num_to_id_long(int(row['stay_id']))}"
			patient = f"P{convert_num_to_id_long(row['patient_id'])}"

			fout.write(f"ex:{stay} rdf:type ex:HospitalStay ;\n")
			fout.write(f"        ex:admissionTime \"{row['admission_datetime']}\" ;\n")
			fout.write(f"        ex:dischargeTime \"{row['discharge_datetime']}\" ;\n")
			fout.write(f"        ex:lengthOfStayHours {row['length_of_stay_hours']} ;\n")
			fout.write(f"        ex:glucose {row['glucose']} ;\n")
			fout.write(f"        ex:cholesterol {row['cholesterol']} ;\n")
			fout.write(f"        ex:creatinine {row['creatinine']} .\n\n")

			fout.write(f"ex:{patient} ex:hasStay ex:{stay} .\n\n")

	print("Wrote", output_file)

def csv_to_rdfs_vitals(
	input_file="./dataset/vitals.csv",
	output_file="./dataset/vitals.ttl",
	base="http://example.org/health#"
):
	with open(input_file, newline="", encoding="utf-8 sig") as fin, open(
		output_file, "w", encoding="utf-8"
	) as fout:

		reader = csv.DictReader(fin)

		fout.write(f"@prefix ex:   <{base}> .\n")
		fout.write("@prefix rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .\n\n")

		for row in reader:
			obs = f"OBS{row['patient_id']}_{row['stay_id']}_{row['hour_offset']}"
			stay = f"S{convert_num_to_id_long(int(row['stay_id']))}"

			fout.write(f"ex:{obs} rdf:type ex:VitalObservation ;\n")
			fout.write(f"        ex:timestamp \"{row['vital_datetime']}\" ;\n")
			fout.write(f"        ex:systolicBP {row['systolic_bp']} ;\n")
			fout.write(f"        ex:diastolicBP {row['diastolic_bp']} ;\n")
			fout.write(f"        ex:heartRate {row['heart_rate']} ;\n")
			fout.write(f"        ex:respiratoryRate {row['respiratory_rate']} ;\n")
			fout.write(f"        ex:temperature {row['temp_c']} ;\n")
			fout.write(f"        ex:spO2 {row['sp_o2']} .\n\n")

			fout.write(f"ex:{stay} ex:hasVitalAt ex:{obs} .\n\n")

	print("Wrote", output_file)
