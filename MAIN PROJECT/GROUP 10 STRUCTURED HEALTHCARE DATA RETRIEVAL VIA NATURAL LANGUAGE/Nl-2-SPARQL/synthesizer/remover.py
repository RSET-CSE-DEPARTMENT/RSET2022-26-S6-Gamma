import os

def clear_hospital_ttl_files(path="./dataset/hospital"):
	for filename in os.listdir(path):
		if filename.endswith(".ttl"):
			os.remove(os.path.join(path, filename))

	print("Removed all .ttl files from", path)