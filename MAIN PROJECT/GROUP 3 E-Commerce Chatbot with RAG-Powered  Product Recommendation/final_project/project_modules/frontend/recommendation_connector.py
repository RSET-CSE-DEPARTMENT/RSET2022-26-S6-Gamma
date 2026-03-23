#frontend/recommendation_connector.py

import streamlit as st
import time

from project_modules.backend.search import run_search
from project_modules.backend.graph_sync import (
    sync_products_to_graph,
    sync_ranking_view_to_graph
)
from project_modules.backend.category_detection import (
    list_available_categories,
    detect_category
)

from project_modules.frontend.model_loader import get_or_load_model
from project_modules.frontend.explanation_engine import generate_pkg_rag_explanation


def get_recommendations(
    user_query: str,
    device: str,
    topk: int,
    explain: bool = False
):

    try:
        if not user_query or not user_query.strip():
            return [], None, "Please enter a valid query."

        clean_query = user_query.strip()

        model = get_or_load_model(device)

        if model is None:
            return [], None, "Embedding model failed to initialize."

        available = list_available_categories()

        category = detect_category(clean_query, available)

        if category is None:
            return [], None, "Unsupported category."

        start_time = time.time()

        results = run_search(
            query=clean_query,
            category=category,
            model=model,
            topk=topk
        )

        latency = time.time() - start_time
        st.caption(f"Search latency: {latency:.2f}s")

        if not results:
            return [], category, "No relevant products found."

        # --------------------------------------------------
        # TERMINAL OUTPUT (Copy-Friendly)
        # --------------------------------------------------

        print("\n" + "=" * 50)
        print("SEARCH RESULTS")
        print("=" * 50)
        print(f"Query: {clean_query}")
        print(f"Category: {category}\n")

        for idx, r in enumerate(results, 1):
            title = r.get("title")
            price = r["meta"].get("resolved_price")
            score = round(r.get("merged_score", 0), 4)

            print(f"{idx}. {title}")
            print(f"   Price: {price}")
            print(f"   Score: {score}\n")

        print("=" * 50 + "\n")
        
        explanation = None

        if explain:
            sync_products_to_graph(results[:3], category)
            sync_ranking_view_to_graph(clean_query, results[:5], category)

            top_product = results[0]
            comparison_products = results[1:3]

            explanation = generate_pkg_rag_explanation(
                query=clean_query,
                top_product=top_product,
                comparison_products=comparison_products
            )

        return results, category, explanation

    except Exception:
        raise