import rdflib
import numpy as np
from rdflib import Graph, Namespace
import pandas as pd
from sklearn.preprocessing import LabelEncoder, MinMaxScaler
import os
import joblib
# Define Namespace
EX = Namespace("http://example.org/health#")

def extract_features(window_size=3):
    print("Loading Knowledge Graph Files...")
    g = Graph()

    # We need Patients to link to Stays, and Stays to link to Vitals
    files_to_load = [
        "./dataset/schema.ttl",
        "./dataset/patients.ttl",
        "./dataset/hospital_stays.ttl",
        "./dataset/vitals_labeled.ttl"
    ]

    for f in files_to_load:
        if os.path.exists(f):
            print(f"Parsing {f}...")
            g.parse(f, format="turtle")
        else:
            print(f"ERROR: File {f} not found!")
            return

    print(f"Total Graph Size: {len(g)} triples")

    # 1. SPARQL Query
    query = """
    PREFIX ex: <http://example.org/health#>
    PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
    PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

    SELECT ?patientID ?timestamp ?sbp ?dbp ?hr ?rr ?temp ?spo2 ?riskLabel
    WHERE {
        ?patient a ex:Patient ;
                 ex:hasStay ?stay .
        
        ?stay ex:hasVitalAt ?obs .
        
        # Extract Patient ID string
        BIND(STRAFTER(STR(?patient), "health#") AS ?patientID)

        # Get Vitals
        ?obs ex:systolicBP ?sbp ;
             ex:diastolicBP ?dbp ;
             ex:heartRate ?hr ;
             ex:respiratoryRate ?rr ;
             ex:temperature ?temp ;
             ex:spO2 ?spo2 ;
             ex:timestamp ?timestamp ;
             ex:leadsTo ?riskState .
        
        # Get Label
        ?riskState rdfs:label ?riskLabel .
    }
    ORDER BY ?patientID ?timestamp
    """
    
    print("Executing SPARQL extraction...")
    qres = g.query(query)
    
    data = []
    for row in qres:
        data.append({
            "patient_id": str(row.patientID),
            "timestamp": str(row.timestamp),
            "sbp": float(row.sbp),
            "dbp": float(row.dbp),
            "hr": float(row.hr),
            "rr": float(row.rr),
            "temp": float(row.temp),
            "spo2": float(row.spo2),
            "label": str(row.riskLabel)
        })
    
    df = pd.DataFrame(data)
    print(f"Raw Data Extracted: {len(df)} rows")
    
    if len(df) == 0:
        print("CRITICAL ERROR: Still 0 rows. Check if your TTL files actually have matching IDs.")
        return

    # 2. Encode Labels
    le = LabelEncoder()
    df['label_code'] = le.fit_transform(df['label'])
    
    print("Classes found:", list(le.classes_))
    
    # 3. Normalize Features
    feature_cols = ['sbp', 'dbp', 'hr', 'rr', 'temp', 'spo2']
    scaler = MinMaxScaler()
    df[feature_cols] = scaler.fit_transform(df[feature_cols])

    # 4. Create Sliding Windows
    X = []
    y = []

    grouped = df.groupby('patient_id')
    
    for _, group in grouped:
        group = group.sort_values('timestamp')
        values = group[feature_cols].values
        labels = group['label_code'].values
        
        for i in range(len(group) - window_size + 1):
            window_data = values[i : i + window_size]
            target_label = labels[i + window_size - 1] 
            
            X.append(window_data)
            y.append(target_label)

    X = np.array(X)
    y = np.array(y)

    print(f"\nFeature Extraction Complete!")
    print(f"X Shape: {X.shape}")
    print(f"y Shape: {y.shape}")
    
    # 5. Save
    np.save("X_data.npy", X)
    np.save("y_data.npy", y)
    np.save("classes.npy", le.classes_)
    joblib.dump(scaler, "scaler.pkl")
    print("Files saved successfully.")

if __name__ == "__main__":
    extract_features(window_size=3)