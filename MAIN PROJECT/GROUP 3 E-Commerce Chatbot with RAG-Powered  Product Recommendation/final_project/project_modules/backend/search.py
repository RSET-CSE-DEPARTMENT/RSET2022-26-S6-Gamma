"""
search.py — Production RAG search pipeline

Industrial improvements:
- Deterministic dataset resolution
- Hardened Intent & Exclusion logic
- Improved Price Normalization for INR
- Robust fallback while maintaining category lock
- Metadata + embedding pairing by timestamp
"""

from __future__ import annotations

import glob
import os
from typing import Dict, List, Tuple

import numpy as np

from .logging_config import logger
from .utils import cosine_sim, safe_read_meta
from .filters import hard_filter, deduplicate, resolve_price
from .ranking import phi3_rerank, compute_graph_signal
from .validation import has_required_ram, has_required_gpu
from .explainability import init_candidate, explain_category, explain_ranking
from .query_constraints import extract_query_constraints
from .dataset_loader import load_dataset

# ============================================================
# CONFIG
# ============================================================

DATA_DIR = os.path.join(
    os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")),
    "data_2"
)

_LARGE_POOL = frozenset({"smartphones", "laptops"})

# Score weights must sum to 1
_W_VEC = 0.50
_W_SPEC = 0.20
_W_PRICE = 0.15
_W_GRAPH = 0.15

assert abs(_W_VEC + _W_SPEC + _W_PRICE + _W_GRAPH - 1.0) < 1e-9

# --------------------------------------------------
# Query enrichment for semantic retrieval
# --------------------------------------------------

def enrich_query(query: str) -> str:
    """
    Query expansion for better semantic retrieval.
    Works across all categories.
    """

    if not query:
        return ""

    q = query.lower()

    expansions = [query]

    QUERY_EXPANSIONS = {
        "pendrive": "usb flash drive storage device",
        "pen drive": "usb flash drive storage device",
        "ssd": "solid state drive storage",
        "hdd": "hard disk drive storage",
        "gaming": "gaming high performance device",
        "5g": "5g connectivity device",
        "tv": "television smart tv led display",
        "phone": "smartphone mobile device",
        "laptop": "portable computer laptop",
        "camera": "digital photography camera",
    }

    for key, exp in QUERY_EXPANSIONS.items():

        if key in q:
            expansions.append(exp)

    return " ".join(expansions)


# ============================================================
# MAIN SEARCH PIPELINE
# ============================================================
def run_search(
    query: str,
    category: str,
    model,
    topk: int = 10
) -> List[Dict]:

    logger.info(
        "[SEARCH] query=%r category=%r topk=%d",
        query,
        category,
        topk
    )

    if not query or not query.strip():
        logger.warning("[SEARCH] Empty query")
        return []

    query = query.strip()

    try:
        # 1. Query constraints
        constraints = extract_query_constraints(query, category)
        include = constraints.get("include", {})
        exclude = constraints.get("exclude", {})
        intent = include.get("intent")

        # Prevent OS constraint leaking into unrelated categories
        if category not in {"smartphones", "laptops", "tablets"}:
            include.pop("os", None)
            exclude.pop("os", None)

        # 2. Dataset loading
        meta_df, emb = load_dataset(DATA_DIR, category)

        if category == "smartphones" and "is_accessory" in meta_df.columns:
            mask = meta_df["is_accessory"].astype(str).str.lower() != "true"
            meta_df = meta_df[mask].reset_index(drop=True)
            emb = emb[mask.values]

        # 3. Vector retrieval
        enriched_query = enrich_query(query)
        qvec = model.encode(
            "query: " + enriched_query,
            convert_to_numpy=True,
            show_progress_bar=False
        ).astype(np.float32)

        norm = np.linalg.norm(qvec)
        if norm != 0:
            qvec = qvec / norm
       
        sims = cosine_sim(qvec, emb)

        pool_size = 300 if category in _LARGE_POOL else 200
        k0 = min(pool_size, len(sims))

        top_idx = np.argsort(-sims)[:k0]
        
        candidates: List[Dict] = []

        for i in top_idx:
            row = meta_df.iloc[i].to_dict()
            row["resolved_price"] = resolve_price(row, category)
            cand = init_candidate(row, float(sims[i]))
            explain_category(cand, category)
            candidates.append(cand)

        # 4. Hard filtering
        candidates = hard_filter(candidates, query, category)
        candidates = deduplicate(candidates)

        # Industrial fallback: Relaxation MUST stay category-locked
        if not candidates:
            logger.warning("[SEARCH] No candidates after filtering → relaxing constraints")
            candidates = []
            # Fallback to top vectors within the SAME category metadata
            for i in top_idx[:30]:
                row = meta_df.iloc[i].to_dict()
                row["resolved_price"] = resolve_price(row, category)
                cand = init_candidate(row, float(sims[i]))
                explain_category(cand, category)
                candidates.append(cand)


        # 5. Score fusion (Category-agnostic)

        ram_req = include.get("ram")
        gpu_req = include.get("gpu")
        price_req = include.get("max_price")

        exclude_brand = str(exclude.get("brand", "")).lower()

        for c in candidates:

            meta = c.get("meta", {})
            text = (
                c.get("title", "")
                + " "
                + meta.get("description", "")
                + " "
                + str(meta.get("brand", ""))
            ).lower()

            price = meta.get("resolved_price") or c.get("resolved_price")

            # --------------------------------------------------
            # Intent bonus (generic)
            # --------------------------------------------------

            intent_bonus = 0.0

            if intent and intent in text:
                intent_bonus += 0.15

            # Special gaming boost
            if intent == "gaming":
                if any(k in text for k in ["rtx","gtx","geforce","gaming"]):
                    intent_bonus += 0.25

            # Connectivity intent
            if intent == "5g" and "5g" in text:
                intent_bonus += 0.20

            # --------------------------------------------------
            # Spec score
            # --------------------------------------------------

            spec_hits = 0
            spec_score = 0.0

            if ram_req:
                spec_hits += 1
                spec_score += int(has_required_ram(text, ram_req))

            if gpu_req:
                spec_hits += 1
                gpu_ok = has_required_gpu(text, gpu_req)
                spec_score += 1 if gpu_ok else 0

            spec_score = spec_score / spec_hits if spec_hits else 0.5

            # --------------------------------------------------
            # Price score (robust INR scaling)
            # --------------------------------------------------

            if price and price_req:

                # Hard constraint satisfied
                price_score = 1.0 if price <= price_req else 0.0

            elif price:

                # Soft normalization for ranking
                try:
                    price_score = 1 - np.log(max(price, 1)) / np.log(1_000_000)
                    price_score = max(0.2, min(1.0, price_score))
                except Exception:
                    price_score = 0.5

            else:

                # Missing price → neutral score
                price_score = 0.5

            # --------------------------------------------------
            # Graph signal
            # --------------------------------------------------

            graph = float(compute_graph_signal(c, query, category) or 0.0)

            # --------------------------------------------------
            # Final score
            # --------------------------------------------------

            base_score = (
                _W_VEC * c["merged_score"]
                + _W_SPEC * spec_score
                + _W_PRICE * price_score
                + _W_GRAPH * graph
                + intent_bonus
            )

            # Brand exclusion penalty
            if exclude_brand and exclude_brand in text:
                base_score -= 2.0

            c["merged_score"] = base_score

        # 6. Score normalization
        if len(candidates) > 1:
            scores = [float(c.get("merged_score", 0.0)) for c in candidates]
            mn, mx = min(scores), max(scores)
            denom = (mx - mn) or 1.0
            for c in candidates:
                c["merged_score"] = 0.15 + ((c["merged_score"] - mn) / denom) * 0.85
        elif candidates:
            candidates[0]["merged_score"] = 1.0

        # Ranking explanations
        candidates.sort(key=lambda x: x["merged_score"], reverse=True)
        for c in candidates:
            explain_ranking(c)

        # 7. LLM rerank
        if len(candidates) > 1:
            n = min(5, len(candidates))
            try:
                reranked = phi3_rerank(query, candidates[:n], k=n)
                # Keep reranked order but don't lose the rest of the pool
                candidates = reranked + candidates[n:]
            except Exception as exc:
                logger.warning("[SEARCH] LLM rerank failed: %s", exc)

        # 8. Final slice
        candidates.sort(key=lambda x: x["merged_score"], reverse=True)
        results = candidates[:topk]

        logger.info("[SEARCH] returning %d results", len(results))
        return results

    except Exception:
        logger.error("[SEARCH] Pipeline crashed", exc_info=True)
        return []