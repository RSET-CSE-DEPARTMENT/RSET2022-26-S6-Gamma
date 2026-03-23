# to run: python -m ai_chat.agent

import os
import time
from config import *
from ai_chat.logger_utils import setup_agent_logger

# Initialize the clean logger
logger = setup_agent_logger()

# ----------------- CONFIGURATION -----------------
os.environ["GEMINI_API_KEY"] = GEMINI_API_KEY
os.environ["LANGCHAIN_TRACING_V2"] = "false"

from typing import Any
from langchain.chat_models import init_chat_model
from langchain.tools import tool
from langchain.agents import create_agent
from langgraph.checkpoint.memory import InMemorySaver
from SPARQLWrapper import SPARQLWrapper, JSON

# Initialize Model
model = init_chat_model("google_genai:gemini-2.5-flash")

# Connection to Fuseki
endpoint = SPARQLWrapper(FUSEKI_URL.rstrip('/') + '/' + DEFAULT_GRAPH.lstrip('/'))
endpoint.setReturnFormat(JSON)
endpoint.setMethod("POST")

logger.info(f" Agent Started. Endpoint: {FUSEKI_URL + DEFAULT_GRAPH}")

# ----------------- TOOLS DEFINITION -----------------

@tool("sparql_list_classes")
def list_classes() -> str:
    """Return classes and instance counts. Use this FIRST to see if data exists."""
    logger.info("[TOOL] Calling list_classes")
    query = """
    SELECT ?class (COUNT(?s) AS ?count) WHERE {
      ?s a ?class .
    } GROUP BY ?class ORDER BY DESC(?count) LIMIT 50
    """
    endpoint.setQuery(PREFIXES + "\n" + query)
    try:
        res = endpoint.query().convert()
        bindings = res["results"]["bindings"]
        if not bindings: 
            logger.info("[TOOL] list_classes: Knowledge Graph is empty.")
            return "The Knowledge Graph is currently empty."
        
        lines = [f"{b['class']['value'].split('#')[-1].split('/')[-1]} ({b['count']['value']} instances)" for b in bindings]
        logger.info(f"[TOOL] list_classes: Found {len(lines)} classes.")
        return "Classes in KG:\n" + "\n".join(lines)
    except Exception as e:
        logger.error(f"[TOOL] list_classes failed: {e}")
        return f"Error: {e}"

@tool("sparql_schema")
def get_schema(class_list: str) -> str:
    """
    Input: comma-separated list of classes (e.g. "ex:Disease, Patient").
    Output: predicates used with instances of those classes.
    """
    logger.info(f"[TOOL] Calling get_schema for: {class_list}")
    classes = [c.strip() for c in class_list.split(",") if c.strip()]
    if not classes:
        return "No classes provided."

    value_terms = []
    for c in classes:
        if c.startswith("http://") or c.startswith("https://"):
            value_terms.append(f"<{c}>")
        elif ":" in c:
            value_terms.append(c)
        else:
            value_terms.append(f"ex:{c}")

    values_block = " ".join(value_terms)
    
    query = f"""
            {PREFIXES}
            SELECT DISTINCT ?class ?pred WHERE {{
            VALUES ?class {{ {values_block} }}
            ?s a ?class .
            ?s ?pred ?o .
            }} LIMIT 50
    """
    endpoint.setQuery(query)
    try:
        res = endpoint.query().convert()
        bindings = res["results"]["bindings"]
        lines = [f"{b['class']['value']} -- {b['pred']['value']}" for b in bindings]
        logger.info(f" [TOOL] get_schema: Found {len(lines)} predicates.")
        return "Schema:\n" + "\n".join(lines)
    except Exception as e:
        logger.error(f" [TOOL] get_schema failed: {e}")
        return f"Error getting schema: {e}"

@tool("sparql_entity_search")
def search_entities(keyword: str) -> str:
    """
    CRITICAL TOOL: Search for the exact URI of a term (e.g., 'cough', 'diabetes').
    ALWAYS use this before writing a query to avoid guessing URIs.
    """
    logger.info(f" [TOOL] Searching for entity: '{keyword}'")
    keyword = keyword.replace("'", "").replace('"', "").strip()
    query = f"""
    {PREFIXES}
    SELECT DISTINCT ?entity ?label ?type WHERE {{
      ?entity rdfs:label ?label .
      OPTIONAL {{ ?entity a ?type }}
      FILTER(CONTAINS(LCASE(?label), "{keyword.lower()}"))
    }} LIMIT 10
    """
    endpoint.setQuery(query)
    try:
        res = endpoint.query().convert()
        bindings = res["results"]["bindings"]
        if not bindings:
            logger.info(f"️ [TOOL] No entities found for '{keyword}'.")
            return f"No entities found for '{keyword}'."
        
        results = []
        for b in bindings:
            entity = b['entity']['value']
            label = b['label']['value']
            type_val = b.get('type', {}).get('value', 'Unknown')
            results.append(f"URI: <{entity}> | Label: '{label}' | Type: <{type_val}>")
        
        logger.info(f" [TOOL] entity_search: Found {len(results)} matches.")
        return "\n".join(results)
    except Exception as e:
        logger.error(f" [TOOL] entity_search failed: {e}")
        return f"Search failed: {e}"

@tool("sparql_query_checker")
def sparql_query_checker(query: str) -> str:
    """Validate SPARQL syntax by running with LIMIT 1."""
    logger.info(f"️ [TOOL] Checking SPARQL Syntax:\n{query}")
    try:
        lines = query.split('\n')
        body = "\n".join([line for line in lines if not line.strip().upper().startswith("PREFIX")]).strip()

        import re
        body_no_limit = re.sub(r"(?i)LIMIT\s+\d+\s*$", "", body).strip()
        test_query = f"{PREFIXES}\n{body_no_limit}\nLIMIT 1"

        endpoint.setQuery(test_query)
        endpoint.query().convert()
        
        logger.info(" [TOOL] SPARQL Syntax is valid.")
        return query
    except Exception as e:
        logger.error(f" [TOOL] SPARQL Syntax Error: {e}")
        return f"SPARQL Syntax Error: {e}"

@tool("sparql_query")
def safe_sparql_query(query: str) -> Any:
    """Execute VALIDATED SPARQL SELECT query."""
    logger.info(f" [TOOL] Executing Final SPARQL:\n{query}")
    
    lines = query.split('\n')
    clean_lines = [line for line in lines if not line.strip().upper().startswith("PREFIX")]
    body = "\n".join(clean_lines).strip()
    
    if not body.upper().startswith("SELECT"):
        logger.warning("️ [TOOL] safe_sparql_query: Blocked non-SELECT query.")
        return "Error: Only SELECT queries are allowed."
    
    if "LIMIT" not in body.upper():
        body += "\nLIMIT 50"
    
    final_query = PREFIXES + "\n" + body
    endpoint.setQuery(final_query)
    try:
        res = endpoint.query().convert()
        bindings = res["results"]["bindings"]
        if not bindings:
            logger.info("️ [TOOL] safe_sparql_query: No results returned.")
            return "No results found."

        vars_ = res["head"].get("vars", [])
        if len(vars_) == 1:
            var = vars_[0]
            values = sorted({b[var]["value"] for b in bindings if var in b})
            logger.info(f" [TOOL] Query Success: Found {len(values)} unique values.")
            return f"{var} values: " + ", ".join(values)

        rows = []
        for b in bindings:
            parts = [f"{var}={val['value']}" for var, val in b.items()]
            rows.append("; ".join(parts))
        
        logger.info(f" [TOOL] Query Success: Found {len(rows)} rows.")
        return "Results:\n" + "\n".join(rows)
    except Exception as e:
        logger.error(f" [TOOL] safe_sparql_query Execution Error: {e}")
        return f"Execution Error: {e}"

tools = [list_classes, get_schema, search_entities, sparql_query_checker, safe_sparql_query]

# ----------------- SYSTEM PROMPT -----------------
system_prompt = f"""
You are a **Hospital Data Agent**. Your goal is to answer user questions by querying a Knowledge Graph using the provided tools.

PREFIXES:
{PREFIXES}
## 1. YOUR TOOLKIT (PROTOCOL)

1. **`sparql_entity_search`** (Discovery):
    - **USE FOR:** Clinical concepts (e.g., "Pneumonia", "Sepsis"), Doctor names (e.g., "Dr. Smith"), or Drug names. These rely on `rdfs:label`.
    - **STRICT PROHIBITION:** Do NOT use for Patient IDs (e.g., "P1257"), Stay IDs (e.g., "S1286"), or File IDs (e.g., "F1505"). These are encoded in the URI string and found using `STRENDS`.
    - **IF SEARCH FAILS:** If a keyword search for a disease returns nothing, use `list_classes` to see if it's a Class instead of an Instance.

2. **`list_classes` & `sparql_schema`** (Discovery Order):
   - **MANDATORY STEP 1:** If a query returns 'No results', you MUST call `list_classes`.
   - **MANDATORY STEP 2:** Only call `sparql_schema` if the class appeared in Step 1.
   - **MANDATORY STEP 3:** If the data is missing from the schema, do NOT retry. Explain the data gap to the user.
   -If sparql_schema is empty, run a manual discovery query: SELECT DISTINCT ?p WHERE {{ ?s a ex:RelevantClass . ?s ?p ?o }} LIMIT 10
   -**TERMINATION RULE:** If `list_classes` shows 0 instances for a class, or if `sparql_schema` confirms a predicate is missing, STOP. 
        Inform the user: "I have verified the database structure, and the requested [History/Lab/Visit] data has not been uploaded yet."

3. **`sparql_query_checker`**: Always use this to validate syntax before execution.
    -**STRICT REQUIREMENT:** Never execute safe_sparql_query without a successful sparql_query_checker call first.

4. **`safe_sparql_query`**: Execute the final query.

## 2. THE CORE SCHEMA (CHEAT SHEET)
- **Patients:** `ex:Patient`. Attributes: `ex:age`, `ex:sex`, `ex:hasDiabetes`, `ex:hasHypertension`, `ex:bmi`.

- **Doctors:** `ex:Doctor`. Attributes: `ex:department`, `ex:gender`, `rdfs:label` (name) , 'ex:age' .

- **Hospital Visits (Files):** `ex:HospitalVisit` (Subclasses: `ex:CheckupVisit`, `ex:AdmissionVisit`).
    - Connects to patient via `ex:patient`.
    - Key attributes: `ex:diagnosis`, `ex:diagnosisType`, `ex:prescribedDrug`, `ex:isCheckup`, `ex:attendingDoctor`.
    - **Admission Visits** link to stays via `ex:hasStay` .

- **Hospital Stays:** `ex:HospitalStay`.
    - Linked to Patient via `ex:hasStay`.
    - Lab attributes: `ex:glucose`, `ex:cholesterol`, `ex:creatinine`.

- **Vitals (Time-series):** `ex:HospitalStay` -- `ex:hasVitalAt` --> `ex:VitalObservation`.
    - Properties: `ex:heartRate`, `ex:systolicBP`, `ex:diastolicBP`, `ex:spO2`, `ex:respiratoryRate`, `ex:temperature`, `ex:timestamp`, `ex:leadsTo` , 'ex:riskConfidence'.
    - ex:leadsTo indicates the clinical risk state predicted by the system (e.g., Stable, Sepsis, Hypoxia). Use this to identify patients needing immediate attention.
    - for a newly admitted patient, the vital observation may have a predicted leadsTo and riskConfidence of that risk state. So optionally show confidence score if present in the observation

## 3. CRITICAL STRATEGIES (MUST FOLLOW)
- **Strict Patient/Visit/Stay ID Matching:** To avoid "ID Overlap" (where searching for P10 accidentally returns P100, P101, etc.), you must match the exact end of the URI.

    -CORRECT (Gold Standard): FILTER(STRENDS(STR(?patient), "#P1257"))
    -ALSO CORRECT: FILTER(STRAFTER(STR(?patient), "health#") = "P1257")
    -STRICTLY BANNED: Never use CONTAINS(STR(?p), "P1257") for IDs as it is too broad and causes data errors.

- **Data Hierarchy & Relationship Direction:**  Patient Attributes: age, sex, bmi, hasDiabetes are on the ex:Patient.
    -Visit/File Attributes: diagnosis, prescribedDrug are on the ex:HospitalVisit.
    -Stay/Lab Attributes: cholesterol, creatinine, glucose are on the ex:HospitalStay.
    -Vital Observations: heartRate, spO2, temperature, systolicBP, leadsTo are on the ex:VitalObservation.
    -LINKING: Note that visits point to patients: ?visit ex:patient ?patient. Stays point to vitals: ?stay ex:hasVitalAt ?observation.

- **Use Aggregate Functions for Counts:** When a user asks "how many," "total," or "count," you MUST use SPARQL aggregate functions like SELECT (COUNT(DISTINCT ?patient) AS ?count)

- **Discovery First on Failure:** If safe_sparql_query returns "No results found," do NOT retry the query by just changing the filter. Your next thought MUST be: "The predicates or classes might be different than my cheat sheet." * ACTION: Immediately call list_classes and sparql_schema for the relevant classes to see the actual predicates in the graph.

- **Temporal Sorting: Current vs. Historical Data (Time-Sensitivity): >   - Current Status: If a user asks "Is P2286 currently stable?" or "Who is currently at risk?", you MUST find the latest record using ORDER BY DESC(?timestamp) LIMIT 1 or a MAX(?timestamp) subquery.
        Historical Status: If a user asks general questions like "How many patients had a fall risk?" or "Which patients have Sepsis?", do NOT restrict the query to the latest timestamp. Query their entire history unless the user explicitly uses words like "currently," "now," or "latest."
        Sorting List Results: When returning a list of files or vitals to the user, always ORDER BY DESC(?timestamp) so the most recent events appear at the top.

- **Trend Analysis:** When asked for a trend, retrieve at least the last 5 recordings with timestamps. Do not just provide the latest one.

- **Data Cleanup:** When presenting results to the user, always strip the URI prefixes. Convert http://example.org/health#heartRate to simply heartRate to make it doctor-friendly.

- Also remember that doctors have departments like pulmonolgy,cardiology, internal medicine, critical care and general medicine. If a user asks about doctors, try to identify their department as well. This can be critical for answering questions like "Which doctor is treating P1257?" or "list 10 patients attending pulmonologist"
## 4. FEW-SHOT WORKFLOWS

**Scenario 1: Simple Patient Lookup (Direct Query)**
*User:* "What is the heart rate history for Patient P2046?"
*Thought:* I know the schema for Patients and Vitals. I have the ID P2046. I will query directly.
*Action:* Call `safe_sparql_query` with...

**Scenario 2: Entity Lookup (Search First)**
*User:* "Which patients have Sepsis?"
*Thought:* I need the URI for "Sepsis".
*Action:* Call `sparql_entity_search("Sepsis")`.
*Observation:* Found `<http://example.org/health#HighRisk_Deterioration>`.
*Action:* Call `safe_sparql_query`...

**Scenario 3: Unknown Attribute (Schema Exploration)**
*User:* "What details do you have about Doctors?"
*Thought:* The user is asking about the structure of "Doctor" data. I should check the schema.
*Action:* Call `sparql_schema("ex:Doctor")`.
*Observation:* Returns `ex:department`, `ex:gender`, `rdfs:label`.
*Response:* "I have their name, department, and gender."

**Scenario 4: Patient lookup with Lab Vitals**
*Action:* Call `sparql_query_checker` with:
SELECT ?cholesterol WHERE {{ ?p ex:hasStay ?s . ?s ex:cholesterol ?cholesterol . FILTER(STRENDS(STR(?p), "#P8024")) }}

**Scenario 5: Hospital Visit History (Files)**
*User:* "Detail the medical history of P3379"
*Thought:* Hospital Files (`ex:HospitalVisit`) point TO the patient via the `ex:patient` predicate.
*Action:* Call `safe_sparql_query` with:
SELECT ?diagnosis ?prescribedDrug WHERE {{
    {{
        ?visit a ex:CheckupVisit ;
               ex:patient ?patient ;
               ex:diagnosis ?diagnosis .
        OPTIONAL {{ ?visit ex:prescribedDrug ?prescribedDrug }} .
        FILTER(STRENDS(STR(?patient), "#P3379"))
    }}
    UNION
    {{
        ?visit a ex:AdmissionVisit ;
               ex:patient ?patient ;
               ex:diagnosis ?diagnosis .
        OPTIONAL {{ ?visit ex:prescribedDrug ?prescribedDrug }} .
        FILTER(STRENDS(STR(?patient), "#P3379"))
    }}
}}`

**Scenario 6: Risk State Inference**
*User:* "Is P2286 in a stable state?"
*Thought:* I need to find the latest VitalObservation and check its `ex:leadsTo` property.
*Action:* Call `safe_sparql_query` with:
`SELECT ?state ?time WHERE {{ ?p ex:hasStay ?s . ?s ex:hasVitalAt ?v . ?v ex:leadsTo ?state ; ex:timestamp ?time . FILTER(STRENDS(STR(?p), "#P2286")) }} ORDER BY DESC(?time) LIMIT 1`


"""

# ----------------- AGENT SETUP -----------------

agent = create_agent(
    model,
    tools,
    system_prompt=system_prompt,
    checkpointer=InMemorySaver(),
)

if __name__ == "__main__":
    config = {"configurable": {"thread_id": "1"}}
    logger.info("--- Manual CLI Session Started ---")
    print("Agent ready. (Wait 10s between complex questions to avoid Rate Limits)")
    
    while True:
        question = input("\nAsk a healthcare question (or 'quit'): ").strip()
        if not question or question.lower() in {"q", "quit", "exit"}:
            logger.info("--- Manual CLI Session Ended ---")
            break

        logger.info(f" USER INPUT: {question}")
        try:
            for step in agent.stream(
                {"messages": [{"role": "user", "content": question}]},
                config,
                stream_mode="values",
            ):
                if "messages" in step:
                    msg = step["messages"][-1]
                    # Log the formatted message for the log file
                    logger.info(f" AGENT STEP: {msg.type.upper()} | {msg.content[:200]}...")
                    msg.pretty_print()
                time.sleep(2)
        except Exception as e:
            logger.error(f" CRITICAL AGENT CRASH: {e}")
            print(f"\nAN ERROR OCCURRED: {e}")
            if "429" in str(e):
                print(">> QUOTA EXCEEDED. Please wait 60 seconds before trying again.")