from . import converter
from . import dataset_generator
from . import patients_generator
from . import remover
from . import merge
from . import tester

INVALID_MESSAGE = "Invalid."

def main():

	while True:
		input_string = input(">>> ").lower().strip().split()
		
		cmd = input_string[0]
		if cmd == "conv":
			if len(input_string) == 1: option = input("Enter dataset: ")
			else: option = input_string[-1]
			
			if option == "disease":
				converter.csv_to_rdfs_disease()
			elif option == "symptom":
				converter.csv_to_rdfs_symptom()
			elif option == "drug":
				converter.csv_to_rdfs_drug()
			else:
				print(INVALID_MESSAGE)

		elif cmd == "gen" or cmd == "generate":
			if len(input_string) == 1: option = input("Enter dataset: ")
			else: option = input_string[-1]
			
			if option == "all":
				patients_generator.csv_generate_patients()
				converter.csv_to_rdfs_patients()
				
				patients_generator.csv_generate_hospital_stays()
				converter.csv_to_rdfs_stays()
				
				patients_generator.csv_generate_vitals()
				converter.csv_to_rdfs_vitals()

				dataset_generator.csv_random_doctor()
				converter.csv_to_rdfs_doctor()

				dataset_generator.csv_random_hospital()
				converter.csv_to_rdfs_hospital_files()
			elif option == "doctor":
				dataset_generator.csv_random_doctor()
				converter.csv_to_rdfs_doctor()
			elif option == "hospital":
				dataset_generator.csv_random_hospital()
				converter.csv_to_rdfs_hospital_files()
			elif option == "patient":
				patients_generator.csv_generate_patients()
				converter.csv_to_rdfs_patients()
			elif option == "stay":
				patients_generator.csv_generate_hospital_stays()
				converter.csv_to_rdfs_stays()
			elif option == "vital":
				patients_generator.csv_generate_vitals()
				converter.csv_to_rdfs_vitals()
			else:
				print(INVALID_MESSAGE)
		
		elif cmd == "rm" or cmd == "remove":
			if len(input_string) == 1: option = input("Enter dataset: ")
			else: option = input_string[-1]

			if option == "hospital":
				remover.clear_hospital_ttl_files()
		
		elif cmd == "mg" or cmd == "merge":
			if len(input_string) == 1: option = input("Enter dataset: ")
			else: option = input_string[-1]

			if option == "hospital":
				merge.merge_hospital_ttls()
		
		elif cmd == "test":
			if len(input_string) == 1: option = input("Enter dataset: ")
			else: option = input_string[-1]

			if option == "all":
				tester.run_tests()
			
		elif cmd == "exit" or cmd == "e" or cmd == "q" or cmd == "quit":
			exit()
		else:
			print(INVALID_MESSAGE)

if __name__ == "__main__":
	main()