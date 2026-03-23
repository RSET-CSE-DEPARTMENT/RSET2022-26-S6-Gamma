import os
from dotenv import load_dotenv

load_dotenv()

#  Secrets (must exist in .env)
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not GEMINI_API_KEY:
    raise RuntimeError("GEMINI_API_KEY not set")

#  Non-secret config (can be committed)
FUSEKI_URL = os.getenv("FUSEKI_URL", "http://localhost:3030")
DEFAULT_GRAPH = os.getenv("DEFAULT_GRAPH", "/healthkg/sparql")

#  The Write-Only endpoint (for ingestion.py)
UPDATE_GRAPH = os.getenv("UPDATE_GRAPH", "/healthkg/update")

DEBUG = os.getenv("DEBUG", "false").lower() == "true"

#  Agent.py chat model api url
AI_CHAT_API = os.getenv("AI_CHAT_API", "")

#for Prefix checks

PREFIXES = """
PREFIX ex:   <http://example.org/health#>
PREFIX rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX xsd:  <http://www.w3.org/2001/XMLSchema#>
PREFIX owl:  <http://www.w3.org/2002/07/owl#>
"""
ALLOWED_PREFIXES = [
    "ex:",
    "rdf:",
    "rdfs:",
    "owl:",
    "xsd:",
]

# Langsmith config
LANGSMITH_TRACING = os.getenv("LANGSMITH_TRACING", "false")
LANGSMITH_API_KEY = os.getenv("LANGSMITH_API_KEY", "")

if LANGSMITH_TRACING.lower() == "true" and not LANGSMITH_API_KEY:
    raise RuntimeError("LANGSMITH_API_KEY is not set but LANGSMITH_TRACING is true")

