import requests
from rdflib import Graph
import os
from .utils import *


import requests
import os

def upload_triples(graph):
    try:
        ttl_data = graph.serialize(format="turtle")
        # Ensure we are sending a string, but manage encoding
        query = f"INSERT DATA {{ {ttl_data} }}"
        
        response = requests.post(
            FUSEKI_UPDATE,
            data=query,
            headers={"Content-Type": "application/sparql-update"},
            timeout=10 # Prevent hanging forever
        )
        response.raise_for_status() # Raises HTTPError for 4xx/5xx
        print("✅ Fuseki upload successful")
        
    except requests.exceptions.RequestException as e:
        print(f"⚠️ Fuseki Offline or Error: {e}")
    except Exception as e:
        print(f"❌ Unexpected error during serialization: {e}")

def upload_newdata_file(ttl_file=NEW_DATA_FILE):
    if not os.path.exists(ttl_file):
        print(f"❌ File not found: {ttl_file}")
        return

    try:
        with open(ttl_file, "rb") as f:
            response = requests.post(
                FUSEKI_DATA,
                data=f,
                headers={"Content-Type": "text/turtle"},
                timeout=15
            )
        
        if response.status_code in (200, 201, 204):
            print(f"✅ {ttl_file} uploaded successfully")
        else:
            print(f"⚠️ Server returned error {response.status_code}: {response.text}")

    except requests.exceptions.ConnectionError:
        print("❌ Failed to connect: Is Fuseki running?")
    except requests.exceptions.Timeout:
        print("❌ Upload timed out.")
    except Exception as e:
        print(f"❌ An error occurred: {e}")

def upload_newdata_file_safe(ttl_file=NEW_DATA_FILE):

    if not os.path.exists(ttl_file):
        print("❌ File not found:", ttl_file)
        return

    g = Graph()
    g.parse(ttl_file, format="turtle")

    upload_triples(g)
