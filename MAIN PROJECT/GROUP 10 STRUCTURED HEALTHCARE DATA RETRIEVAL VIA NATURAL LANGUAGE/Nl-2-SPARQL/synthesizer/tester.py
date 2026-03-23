from SPARQLWrapper import SPARQLWrapper, JSON
from config import *

SPARQL_ENDPOINT = f"{FUSEKI_URL}/{DEFAULT_GRAPH}/sparql"

TESTS = {

    "doctor_count": {
        "query": """
            PREFIX ex: <http://example.org/health#>
            SELECT (COUNT(?d) AS ?count)
            WHERE { ?d a ex:Doctor . }
        """,
        "expected_min": 1,
        "description": "Number of doctors"
    },

    "patient_count": {
        "query": """
            PREFIX ex: <http://example.org/health#>
            SELECT (COUNT(?p) AS ?count)
            WHERE { ?p a ex:Patient . }
        """,
        "expected_min": 1,
        "description": "Number of patients"
    },

    "visit_count": {
        "query": """
            PREFIX ex: <http://example.org/health#>
            SELECT (COUNT(?v) AS ?count)
            WHERE { ?v a ex:HospitalVisit . }
        """,
        "expected_min": 1,
        "description": "Number of hospital visits"
    },

    "stay_count": {
        "query": """
            PREFIX ex: <http://example.org/health#>
            SELECT (COUNT(?s) AS ?count)
            WHERE { ?s a ex:HospitalStay . }
        """,
        "expected_min": 1,
        "description": "Number of hospital stays"
    },

    "vital_count": {
        "query": """
            PREFIX ex: <http://example.org/health#>
            SELECT (COUNT(?v) AS ?count)
            WHERE { ?v a ex:VitalObservation . }
        """,
        "expected_min": 1,
        "description": "Number of vital observations"
    },

    "doctor_visit_connection": {
        "query": """
            PREFIX ex: <http://example.org/health#>
            SELECT (COUNT(?v) AS ?count)
            WHERE {
                ?v ex:attendingDoctor ?d .
                ?d a ex:Doctor .
            }
        """,
        "expected_min": 1,
        "description": "Visits connected to doctors"
    },

    "patient_visit_connection": {
        "query": """
            PREFIX ex: <http://example.org/health#>
            SELECT (COUNT(?v) AS ?count)
            WHERE {
                ?v ex:patient ?p .
                ?p a ex:Patient .
            }
        """,
        "expected_min": 1,
        "description": "Visits connected to patients"
    },

    "stay_vital_connection": {
        "query": """
            PREFIX ex: <http://example.org/health#>
            SELECT (COUNT(?v) AS ?count)
            WHERE {
                ?s ex:hasVitalAt ?v .
                ?s a ex:HospitalStay .
            }
        """,
        "expected_min": 1,
        "description": "Stays connected to vitals"
    },

    "full_pipeline_connection": {
        "query": """
            PREFIX ex: <http://example.org/health#>
            SELECT (COUNT(?visit) AS ?count)
            WHERE {
                ?visit ex:patient ?patient ;
                       ex:attendingDoctor ?doctor .
                OPTIONAL { ?visit ex:hasStay ?stay . }
                OPTIONAL { ?stay ex:hasVitalAt ?vital . }
            }
        """,
        "expected_min": 1,
        "description": "Full pipeline connectivity"
    }

}

def run_query(query):

    sparql = SPARQLWrapper(SPARQL_ENDPOINT)
    sparql.setQuery(query)
    sparql.setReturnFormat(JSON)

    results = sparql.query().convert()

    bindings = results["results"]["bindings"]

    if not bindings:
        return 0

    value = list(bindings[0].values())[0]["value"]

    return int(value)


def run_tests():

    print("\n==== DATASET TEST REPORT ====\n")

    passed = 0
    total = len(TESTS)

    for name, test in TESTS.items():

        try:

            count = run_query(test["query"])

            ok = count >= test["expected_min"]

            symbol = "✅" if ok else "❌"

            print(f"{symbol} {test['description']}")
            print(f"   Found: {count}")
            print(f"   Expected >= {test['expected_min']}\n")

            if ok:
                passed += 1

        except Exception as e:

            print(f"❌ {test['description']}")
            print(f"   ERROR: {e}\n")

    print(f"RESULT: {passed}/{total} tests passed")


# ==============================
# MAIN
# ==============================

if __name__ == "__main__":
    run_tests()
