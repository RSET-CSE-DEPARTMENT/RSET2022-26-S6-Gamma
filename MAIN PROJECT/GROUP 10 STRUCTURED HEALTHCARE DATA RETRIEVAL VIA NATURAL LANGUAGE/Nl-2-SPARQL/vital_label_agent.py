import rdflib
from rdflib import Graph, Namespace, URIRef, Literal, RDF
import os 

# Namespaces (Matches your file)
EX = Namespace("http://example.org/health#")
XSD = Namespace("http://www.w3.org/2001/XMLSchema#")

class MedicalGraph_Agent:
    def __init__(self):
        self.g = Graph()
        self.g.bind("ex", EX)
    
    def inject_risk_labels(self, input_file, output_file):
        """
        Reads raw vitals, calculates medical risk, adds 'leadsTo' triples,
        and prints a statistical summary of the labels generated.
        """
        print(f"Loading {input_file}...")
        try:
            self.g.parse(input_file, format="turtle")
        except FileNotFoundError:
            print(f"Error: Could not find {input_file}")
            return

        new_triples = []
        count = 0
        
        # --- Initialize Counters ---
        risk_counts = {
            "Stable": 0,
            "Fall Risk (Hypotension)": 0,
            "Hypertension Crisis": 0,
            "Deterioration (Sepsis)": 0,
            "Hypoxia": 0
        }

        # Iterate over all VitalObservations
        for s, p, o in self.g.triples((None, RDF.type, EX.VitalObservation)):

            # 1. Extract values
            sbp_node = self.g.value(s, EX.systolicBP)
            hr_node = self.g.value(s, EX.heartRate)
            spo2_node = self.g.value(s, EX.spO2)

            if sbp_node is None or hr_node is None:
                continue

            try:
                sbp = float(sbp_node)
                hr = float(hr_node)
                spo2 = float(spo2_node) if spo2_node else 99.0
            except ValueError:
                continue

            # 2. Apply Medical Rules
            risk_uri = EX.StableState
            label_key = "Stable"

            # Rule A: Deterioration Risk (Sepsis-like)
            if hr > 100 and sbp < 100:   #Waiting for HR > 110 misses the early warning window
                risk_uri = EX.HighRisk_Deterioration
                label_key = "Deterioration (Sepsis)"
            
            # Rule B: Hypertensive Crisis
            elif sbp > 140:  # Stage 2 Hypertension
                risk_uri = EX.HighRisk_Hypertension
                label_key = "Hypertension Crisis"
            
            # Rule C: Hypotension Risk (Fall Risk)
            elif sbp < 90:
                risk_uri = EX.HighRisk_Fall
                label_key = "Fall Risk (Hypotension)"
            
            # Rule D: Hypoxia Risk
            elif spo2 < 90:
                risk_uri = EX.HighRisk_Hypoxia
                label_key = "Hypoxia"
            
            # 3. Create the New Relationship
            new_triples.append((s, EX.leadsTo, risk_uri))
            
            # 4. Update Counters
            risk_counts[label_key] += 1
            count += 1
        
        # 5. Write back to graph
        for t in new_triples:
            self.g.add(t)
            
        # 6. Save
        self.g.serialize(output_file, format="turtle")
        
        # --- PRINT SUMMARY ---
        print("-" * 40)
        print(f"Success! Processed {count} observations.")
        print("-" * 40)
        print("LABEL DISTRIBUTION:")
        for category, qty in risk_counts.items():
            print(f"  - {category}: {qty}")
        print("-" * 40)
        print(f"Labeled data saved to: {output_file}")

# --- EXECUTION BLOCK ---
if __name__ == "__main__":
    agent = MedicalGraph_Agent()
    input_filename = "./dataset/vitals.ttl"
    output_filename = "./dataset/vitals_labeled.ttl"
    agent.inject_risk_labels(input_filename, output_filename)