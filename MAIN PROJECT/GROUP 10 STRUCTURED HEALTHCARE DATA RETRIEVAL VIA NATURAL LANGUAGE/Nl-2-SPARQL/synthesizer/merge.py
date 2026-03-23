from rdflib import Graph
import os

def validateTurtle(file):
	g = Graph()
	g.parse(file, format="turtle")
	print(f"Validated {len(g)} triples.")

def merge_hospital_ttls(
	input_dir="./dataset/hospital",
	output_file="./dataset/hospital_all.ttl"
):
	g = Graph()

	for filename in os.listdir(input_dir):
		if filename.endswith(".ttl"):
			filepath = os.path.join(input_dir, filename)
			g.parse(filepath, format="turtle")

	g.serialize(output_file, format="turtle")
	print(f"Merged {len(g)} triples into {output_file}")

	validateTurtle(output_file)
