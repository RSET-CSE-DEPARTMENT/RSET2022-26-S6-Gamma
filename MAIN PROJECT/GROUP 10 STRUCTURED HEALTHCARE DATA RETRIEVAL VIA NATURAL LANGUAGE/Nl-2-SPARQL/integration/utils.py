import os
from rdflib import Graph, Namespace, RDF
from datetime import datetime
from rdflib.namespace import RDF

NEW_DATA_FILE = r"./dataset/new_data.ttl"
EX = Namespace("http://example.org/health#")
MIN_STAY_ID = 10000

FUSEKI_UPDATE = "http://localhost:3030/healthkg/update"
FUSEKI_DATA = "http://localhost:3030/healthkg/data"


def get_date_now():
    now = datetime.now()
    return now.replace(minute=0, second=0, microsecond=0)

def convert_num_to_id_long(number):
	number = int(number)
	return f"{number:06d}"

def convert_num_to_id_mid(number):
	number = int(number)
	return f"{number:04d}"

def get_next_stay_id(ttl_file=NEW_DATA_FILE):

    # If file doesn't exist → start from S10000
    if not os.path.exists(ttl_file):
        return f"S{convert_num_to_id_long(MIN_STAY_ID)}"

    g = Graph()
    g.parse(ttl_file, format="turtle")

    max_id = MIN_STAY_ID - 1

    for stay in g.subjects(RDF.type, EX.HospitalStay):

        uri = str(stay)

        if "S" in uri:
            try:
                num = int(uri.split("S")[-1])

                # Ignore IDs below 10000
                if num >= MIN_STAY_ID:
                    max_id = max(max_id, num)

            except:
                pass

    next_id = max(max_id + 1, MIN_STAY_ID)

    return f"S{convert_num_to_id_long(next_id)}"