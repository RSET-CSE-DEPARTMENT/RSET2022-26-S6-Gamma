import numpy as np
import requests
from tensorflow.keras.models import load_model

FUSEKI_QUERY = "http://localhost:3030/healthkg/sparql"
FUSEKI_UPDATE = "http://localhost:3030/healthkg/update"

PREFIX = """
PREFIX ex: <http://example.org/health#>
"""

# =========================================
# Load model once (Keras 3 compatible)
# =========================================
model = load_model("medical_lstm.keras", compile=False)


# =========================================
# Execute SPARQL Query
# =========================================
def execute_query(query):

    response = requests.post(
        FUSEKI_QUERY,
        data={"query": query},
        headers={"Accept": "application/sparql-results+json"}
    )

    if response.status_code != 200:
        raise Exception(f"SPARQL Query Failed: {response.text}")

    return response.json()["results"]["bindings"]


# =========================================
# Execute SPARQL Update
# =========================================
def execute_update(query):

    response = requests.post(
        FUSEKI_UPDATE,
        data=query,
        headers={"Content-Type": "application/sparql-update"}
    )

    if response.status_code != 200:
        raise Exception(f"SPARQL Update Failed: {response.text}")

    return response.status_code


# =========================================
# Get last 3 vitals
# =========================================
def get_recent_vitals(stay_id):

    query = PREFIX + f"""
    SELECT ?v ?timestamp ?hr ?sys ?dia ?rr ?temp ?spo2
    WHERE {{
        ex:{stay_id} ex:hasVitalAt ?v .
        ?v ex:timestamp ?timestamp ;
           ex:heartRate ?hr ;
           ex:systolicBP ?sys ;
           ex:diastolicBP ?dia ;
           ex:respiratoryRate ?rr ;
           ex:temperature ?temp ;
           ex:spO2 ?spo2 .
    }}
    ORDER BY DESC(xsd:dateTime(?timestamp))
    LIMIT 3
    """

    results = execute_query(query)

    if len(results) < 3:
        return None, None

    data = []
    latest_vital_uri = results[0]["v"]["value"]  # most recent

    # Reverse so oldest → newest
    for r in reversed(results):
        data.append([
            float(r["hr"]["value"]),
            float(r["sys"]["value"]),
            float(r["dia"]["value"]),
            float(r["spo2"]["value"]),
            float(r["rr"]["value"]),
            float(r["temp"]["value"])
        ])

    return np.array([data], dtype=np.float32), latest_vital_uri


# =========================================
# Write Risk Back to KG (Avoid duplicates)
# =========================================
def write_risk_to_graph(vital_uri, risk_class):

    vital_id = vital_uri.split("#")[-1]

    update_query = PREFIX + f"""
    DELETE {{
        ex:{vital_id} ex:leadsTo ?oldRisk .
    }}
    INSERT {{
        ex:{vital_id} ex:leadsTo ex:{risk_class} .
    }}
    WHERE {{
        OPTIONAL {{ ex:{vital_id} ex:leadsTo ?oldRisk . }}
    }}
    """

    execute_update(update_query)


# =========================================
# Run LSTM Prediction
# =========================================
def run_prediction(stay_id):

    tensor, latest_vital_uri = get_recent_vitals(stay_id)

    if tensor is None:
        return "Collecting Data...", 0.0

    # Ensure correct input shape
    if tensor.shape != (1, 3, 6):
        raise ValueError(f"Unexpected input shape: {tensor.shape}")

    probs = model.predict(tensor, verbose=0)[0]
    risk_idx = int(np.argmax(probs))
    confidence = float(probs[risk_idx])

    classes = [
        "StableState",
        "HighRisk_Deterioration",
        "HighRisk_Hypoxia",
        "HighRisk_Hypertension"
    ]

    predicted_class = classes[risk_idx]

    write_risk_to_graph(latest_vital_uri, predicted_class)

    return predicted_class, confidence