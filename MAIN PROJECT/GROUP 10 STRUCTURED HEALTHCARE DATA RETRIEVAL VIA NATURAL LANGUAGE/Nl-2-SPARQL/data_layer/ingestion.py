# data_layer/ingestion.py
import uuid
from datetime import datetime, timedelta
from SPARQLWrapper import SPARQLWrapper, JSON

from config import FUSEKI_URL, DEFAULT_GRAPH, UPDATE_GRAPH

PREFIXES = """
PREFIX ex:   <http://example.org/health#>
PREFIX rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX xsd:  <http://www.w3.org/2001/XMLSchema#>
PREFIX owl:  <http://www.w3.org/2002/07/owl#>
"""

def execute_update(query):
    full_url = FUSEKI_URL.rstrip('/') + '/' + UPDATE_GRAPH.lstrip('/')
    sparql = SPARQLWrapper(full_url)
    sparql.setMethod("POST")
    sparql.setQuery(PREFIXES + query)
    sparql.query()

def execute_query(query):
    full_url = FUSEKI_URL.rstrip('/') + '/' + DEFAULT_GRAPH.lstrip('/')
    sparql = SPARQLWrapper(full_url)
    sparql.setReturnFormat(JSON)
    sparql.setQuery(PREFIXES + query)
    return sparql.query().convert()["results"]["bindings"]

def readmit_patient(patient_id):
    """Creates a new active hospital stay for the patient starting NOW."""
    stay_id = f"Stay_{uuid.uuid4().hex[:6]}"
    admission_time = datetime.now().isoformat()
    
    insert_query = f"""
    INSERT DATA {{
        ex:{patient_id} ex:hasStay ex:{stay_id} .
        ex:{stay_id} ex:admissionTime "{admission_time}"^^xsd:dateTime .
    }}
    """
    execute_update(insert_query)
    return stay_id

def get_last_timestamp_for_stay(stay_id):
    """Retrieves the latest vital timestamp ONLY for this specific stay."""
    query = f"""
    SELECT (MAX(?ts) as ?latest) WHERE {{
        ex:{stay_id} ex:hasVitalAt ?v .
        ?v ex:timestamp ?ts .
    }}
    """
    results = execute_query(query)
    if results and 'latest' in results[0]:
        return datetime.fromisoformat(results[0]['latest']['value'])
    return None

def add_vital_observation(stay_id, hr, sys, dia, rr, temp, spo2):
    """Adds vitals spaced by 4 hours, starting from the current time."""
    last_time = get_last_timestamp_for_stay(stay_id)
    
    if last_time:
        new_dt = last_time + timedelta(hours=4)
    else:
        new_dt = datetime.now() 

    new_timestamp_str = new_dt.isoformat()
    obs_id = f"Obs_{uuid.uuid4().hex[:6]}"
    
    insert_query = f"""
    INSERT DATA {{
        ex:{stay_id} ex:hasVitalAt ex:{obs_id} .
        ex:{obs_id} ex:timestamp "{new_timestamp_str}"^^xsd:dateTime ;
                    ex:heartRate {hr} ;
                    ex:systolicBP {sys} ;
                    ex:diastolicBP {dia} ;
                    ex:respiratoryRate {rr} ;
                    ex:temperature {temp} ;
                    ex:spO2 {spo2} .
    }}
    """
    execute_update(insert_query)
    return new_timestamp_str, obs_id

def update_kg_with_alert(obs_id, risk_label, confidence):
    """Links the AI prediction back to the specific observation in the KG."""
    insert_query = f"""
    INSERT DATA {{
        ex:{obs_id} ex:leadsTo "{risk_label}" ;
                    ex:riskConfidence "{confidence}"^^xsd:float .
    }}
    """
    execute_update(insert_query)