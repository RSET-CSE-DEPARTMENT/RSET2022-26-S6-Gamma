import rdflib
from rdflib import Graph, Literal, RDF, RDFS, OWL, XSD, Namespace

# 1. Define Namespace (MUST match your data files)
EX = Namespace("http://example.org/health#")

def create_schema():
    g = Graph()
    g.bind("ex", EX)
    g.bind("owl", OWL)
    
    print("Building Ontology based on your TTL snippets...")

    # ==========================================
    # 1. DEFINE CLASSES
    # ==========================================
    classes = [
        "Patient", 
        "HospitalStay", 
        "VitalObservation", 
        "Doctor", 
        "HospitalVisit",  # From ex:F001 rdf:type ex:HospitalVisit
        "RiskState"       # For the labels
    ]
    
    for c in classes:
        uri = EX[c]
        g.add((uri, RDF.type, OWL.Class))
        g.add((uri, RDFS.label, Literal(c)))

    # Define Risk Subclasses (Hierarchy for Reasoning)
    risk_hierarchy = {
        "StableState": "Stable",
        "HighRisk_Fall": "Fall Risk",
        "HighRisk_Hypertension": "Hypertension Crisis",
        "HighRisk_Deterioration": "Sepsis Deterioration",
        "HighRisk_Hypoxia": "Hypoxia"
    }
    for subclass, label in risk_hierarchy.items():
        sub_uri = EX[subclass]
        g.add((sub_uri, RDF.type, OWL.Class))
        g.add((sub_uri, RDFS.subClassOf, EX.RiskState))
        g.add((sub_uri, RDFS.label, Literal(label)))

    # ==========================================
    # 2. DEFINE OBJECT PROPERTIES (Links)
    # ==========================================
    # Format: (Property, Domain, Range)
    object_props = [
        # Patient -> Stay
        ("hasStay", "Patient", "HospitalStay"),
        
        # Stay -> Vitals
        ("hasVitalAt", "HospitalStay", "VitalObservation"),
        
        # Vitals -> Risk Label
        ("leadsTo", "VitalObservation", "RiskState"),
        
        # Hospital Visit File Links (from hospital.ttl)
        ("attendingDoctor", "HospitalVisit", "Doctor"),
        ("patient", "HospitalVisit", "Patient"), # Note: lowercase 'p' property
        ("stay", "HospitalVisit", "HospitalStay")
    ]

    for prop, dom, rng in object_props:
        uri = EX[prop]
        g.add((uri, RDF.type, OWL.ObjectProperty))
        g.add((uri, RDFS.domain, EX[dom]))
        g.add((uri, RDFS.range, EX[rng]))

    # ==========================================
    # 3. DEFINE DATA PROPERTIES (Attributes)
    # ==========================================
    # Format: (Property, Domain, Datatype)
    data_props = [
        # --- Patient Props ---
        ("age", "Patient", XSD.integer),
        ("sex", "Patient", XSD.string),       # Matches patient.ttl
        ("bmi", "Patient", XSD.float),
        ("hasDiabetes", "Patient", XSD.boolean),
        ("hasHypertension", "Patient", XSD.boolean),

        # --- Hospital Stay Props ---
        ("admissionTime", "HospitalStay", XSD.dateTime),
        ("dischargeTime", "HospitalStay", XSD.dateTime),
        ("lengthOfStayHours", "HospitalStay", XSD.integer),
        ("glucose", "HospitalStay", XSD.float),
        ("cholesterol", "HospitalStay", XSD.float),
        ("creatinine", "HospitalStay", XSD.float),

        # --- Vital Observation Props ---
        ("timestamp", "VitalObservation", XSD.dateTime),
        ("systolicBP", "VitalObservation", XSD.integer), 
        ("diastolicBP", "VitalObservation", XSD.integer),
        ("heartRate", "VitalObservation", XSD.integer),
        ("respiratoryRate", "VitalObservation", XSD.integer),
        ("temperature", "VitalObservation", XSD.float),
        ("spO2", "VitalObservation", XSD.integer),

        # --- Doctor Props ---
        ("gender", "Doctor", XSD.string), 
        ("department", "Doctor", XSD.string),
        
        # --- Hospital Visit Props ---
        ("diagnosis", "HospitalVisit", XSD.string),
        ("prescribedDrug", "HospitalVisit", XSD.string),
    ]

    for prop, dom, dtype in data_props:
        uri = EX[prop]
        g.add((uri, RDF.type, OWL.DatatypeProperty))
        g.add((uri, RDFS.domain, EX[dom]))
        g.add((uri, RDFS.range, dtype))

    # ==========================================
    # 4. SAVE
    # ==========================================
    output_file = "./dataset/schema.ttl"
    g.serialize(output_file, format="turtle")
    print(f"Schema successfully created at: {output_file}")

if __name__ == "__main__":
    create_schema()