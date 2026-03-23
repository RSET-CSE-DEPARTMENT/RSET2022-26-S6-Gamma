#frontend/explanation_engine.py

# ============================================================
# GRAPH-GROUNDED RAG EXPLANATION ENGINE (Production-Grade)
# Hybrid RAG: Structured Graph Context + LLM Reasoning
# ============================================================

import json
from typing import List, Dict

from ollama import chat
from project_modules.backend.graph_config import get_neo4j_driver


def generate_pkg_rag_explanation(
    query: str,
    top_product: Dict,
    comparison_products: List[Dict]
) -> str:
    """
    Generates a graph-grounded analytical explanation using:
    - Neo4j structured attributes (retrieval)
    - Phi-3 LLM reasoning (generation)

    Fully isolated, production-safe.
    """

    if not query or not top_product:
        return "Explanation unavailable."

    try:
        # ----------------------------------------------------
        # 1️⃣ Collect Product Titles
        # ----------------------------------------------------

        product_titles = [top_product.get("title")]

        for p in comparison_products:
            if p.get("title"):
                product_titles.append(p["title"])

        if not product_titles:
            return "Explanation unavailable."

        # ----------------------------------------------------
        # 2️⃣ Fetch Structured Graph Context
        # ----------------------------------------------------

        cypher = """
        MATCH (p:Product)
        WHERE p.title IN $titles
        OPTIONAL MATCH (p)-[:HAS_BRAND]->(b:Brand)
        OPTIONAL MATCH (p)-[:HAS_ATTRIBUTE]->(a:Attribute)
        OPTIONAL MATCH (p)-[:HAS_PRICE]->(pr:Price)
        RETURN p.title AS title,
               b.name AS brand,
               collect(DISTINCT {label:a.label, value:a.value}) AS attributes,
               pr.amount AS price
        """

        driver = get_neo4j_driver()

        with driver.session(database="neo4j") as session:
            records = session.run(
                cypher,
                titles=product_titles
            ).data()

        if not records:
            return "Graph-grounded explanation unavailable."

        # ----------------------------------------------------
        # 3️⃣ Separate Top vs Comparison Context
        # ----------------------------------------------------

        top_title = top_product.get("title")

        top_context = next(
            (r for r in records if r.get("title") == top_title),
            {}
        )

        comparison_context = [
            r for r in records
            if r.get("title") != top_title
        ]

        # ----------------------------------------------------
        # 4️⃣ Build Deterministic Prompt
        # ----------------------------------------------------

        prompt = f"""
You are an analytical recommendation system.

User Query:
{query}

Top Product Structured Data:
{json.dumps(top_context, ensure_ascii=False)}

Comparison Products Structured Data:
{json.dumps(comparison_context, ensure_ascii=False)}

Write ONE concise analytical paragraph explaining:
- Why the top product best satisfies the user query
- How it compares structurally to alternatives
- Reference structured attributes when relevant

Do not invent information.
Do not hallucinate missing attributes.
Keep response factual and objective.
"""

        # ----------------------------------------------------
        # 5️⃣ LLM Call (Deterministic)
        # ----------------------------------------------------

        response = chat(
            model="phi3:latest",
            messages=[{"role": "user", "content": prompt}],
            options={
                "temperature": 0.0,
                "num_predict": 200
            }
        )

        output = response.message.content.strip()

        if not output:
            return "Graph-grounded explanation unavailable."

        return output

    except Exception:
        # Silent fail to avoid breaking UI
        return "Graph-grounded explanation unavailable."