import numpy as np
import requests
from .models import DocumentChunk, CompanyCapability

############################################################
# RAG RETRIEVAL
############################################################

def retrieve_relevant_chunks(document, query, top_k=5):
    from .services import _embedding_model

    query_embedding = _embedding_model.encode(query, convert_to_numpy=True)
    chunks = list(
        DocumentChunk.objects.filter(document=document).values("text", "embedding")
    )

    if not chunks:
        return [document.content_preview or ""]

    matrix = np.array([c["embedding"] for c in chunks], dtype=np.float32)
    query_norm = query_embedding / (np.linalg.norm(query_embedding) + 1e-10)
    norms = np.linalg.norm(matrix, axis=1, keepdims=True) + 1e-10
    scores = (matrix / norms) @ query_norm

    top_indices = np.argsort(scores)[::-1][:top_k]
    return [chunks[i]["text"] for i in top_indices]


def get_company_profile():
    cap = CompanyCapability.objects.first()
    if not cap:
        return {"tech_keywords": ["software development", "AI", "machine learning", "NLP"]}
    return {"tech_keywords": cap.tech_keywords or []}


############################################################
# PROPOSAL GENERATOR
############################################################

def generate_proposal(document):
    company = get_company_profile()
    tech_stack = ", ".join(company["tech_keywords"][:10])

    # Keep context short for local model
    chunks = retrieve_relevant_chunks(
        document,
        "scope requirements technical implementation timeline compliance",
        top_k=4
    )
    # Truncate each chunk to avoid massive prompts
    rfp_context = "\n\n".join([c[:300] for c in chunks])

    timeline_weeks = document.rfp_timeline_weeks or 24
    budget = document.rfp_budget or "Not specified"
    keywords = ", ".join([dk.keyword.keyword for dk in document.keywords.all()[:10]])

    sections = {}

    # Generate each section separately with short focused prompts
    sections["executive_summary"] = _generate_with_ollama(
        f"""Write a 200 word executive summary for a bid proposal responding to this RFP.

RFP: {document.filename}
Key topics: {keywords}
Budget: {budget}
Context: {rfp_context[:500]}

Use "Our organization" instead of [Company Name]. Be professional and confident."""
    )

    sections["technical_approach"] = _generate_with_ollama(
        f"""Write a 300 word technical approach for a bid proposal.

RFP topics: {keywords}
Our tech stack: {tech_stack}
Context: {rfp_context[:500]}

Cover: architecture, technology stack, implementation phases, testing, security."""
    )

    sections["timeline"] = _generate_with_ollama(
        f"""Create a project timeline for {timeline_weeks} weeks.

RFP: {document.filename}
Format:
Phase 1: Name (Weeks 1-X)
- Milestone: description

Cover: initiation, design, development, testing, UAT, deployment, handover."""
    )

    sections["compliance_checklist"] = _generate_with_ollama(
        f"""Create a compliance checklist for this RFP bid proposal.

RFP topics: {keywords}
Tech stack: {tech_stack}

Format each item as:
✓ Requirement — How we comply

Cover: technical, eligibility, financial, legal compliance."""
    )

    return sections


############################################################
# OLLAMA BACKEND
############################################################

def _generate_with_ollama(prompt, model="llama3.2"):
    try:
        response = requests.post(
            "http://localhost:11434/api/generate",
            json={
                "model": model,
                "prompt": prompt,
                "stream": False,
                "options": {
                    "temperature": 0.7,
                    "num_predict": 600,  # shorter output = faster
                }
            },
            timeout=600  # 10 minutes per section
        )
        response.raise_for_status()
        data = response.json()
        result = data.get("response", "").strip()
        result = result.replace("**", "")
        return result
    except requests.exceptions.ConnectionError:
        raise Exception("Ollama is not running. Open a terminal and run: ollama serve")
    except requests.exceptions.ReadTimeout:
        raise Exception("Ollama timed out. Your machine may be too slow for this model. Try: ollama pull llama3.2:1b for a smaller model.")
    except Exception as e:
        raise Exception(f"Ollama error: {str(e)}")