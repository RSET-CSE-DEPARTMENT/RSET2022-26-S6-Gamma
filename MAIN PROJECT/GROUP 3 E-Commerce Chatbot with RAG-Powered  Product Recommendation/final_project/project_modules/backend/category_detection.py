"""category_detection.py - Deterministic keyword-based category resolver."""

from __future__ import annotations

import logging
from typing import Dict, List, Optional, Tuple
import re

from .category_config import CATEGORY_KEYWORDS

logger = logging.getLogger(__name__)

# Minimum keyword hits required to claim a detection
_MIN_CONFIDENCE: int = 1


def list_available_categories() -> List[str]:
    """Return all supported category names."""
    return list(CATEGORY_KEYWORDS.keys())

def _score_query(q: str) -> Dict[str, int]:
    """
    Return a dict mapping category -> number of matching keywords.

    Uses word-boundary matching to avoid substring errors
    (e.g., 'ac' should not match 'macbook').
    """

    scores: Dict[str, int] = {}

    for category, keywords in CATEGORY_KEYWORDS.items():

        hits = 0

        for kw in keywords:

            # word boundary pattern
            pattern = r"\b" + re.escape(kw) + r"\b"

            if re.search(pattern, q):
                hits += 1

        if hits > 0:
            scores[category] = hits

    return scores


def detect_category(
    query: str,
    available: Optional[List[str]] = None,
) -> Optional[str]:
    """
    Detect the best-matching product category for a user query.

    Uses deterministic keyword scoring. In case of a tie, the category
    that appears first in CATEGORY_KEYWORDS (insertion order) wins.

    Args:
        query:     Raw user query string.
        available: Optional allowlist of categories to consider.
                   Defaults to all categories in CATEGORY_KEYWORDS.

    Returns:
        Category name string, or None if no match meets the confidence threshold.
    """
    if not query or not query.strip():
        logger.debug("detect_category called with empty query.")
        return None

    q = query.lower()
    q = re.sub(r"[^\w\s]", " ", q)   # remove punctuation
    q = re.sub(r"\s+", " ", q).strip()
    
    candidates = set(available) if available else set(CATEGORY_KEYWORDS.keys())

    scores = {
        cat: score
        for cat, score in _score_query(q).items()
        if cat in candidates
    }

    if not scores:
        logger.info("No category detected for query: %r", query)
        return None

    best_score = max(scores.values())
    if best_score < _MIN_CONFIDENCE:
        return None

    # Among all categories with the top score, pick the first defined one
    winner = next(
        cat for cat in CATEGORY_KEYWORDS
        if cat in scores and scores[cat] == best_score
    )

    logger.info(
        "Detected category=%r (score=%d) for query: %r",
        winner, best_score, query,
    )
    return winner


def detect_category_with_scores(
    query: str,
    available: Optional[List[str]] = None,
) -> Tuple[Optional[str], Dict[str, int]]:
    """
    Like detect_category but also returns the full score map for debugging.

    Returns:
        (best_category_or_None, {category: score, ...})
    """
    best = detect_category(query, available)
    q = query.lower().strip() if query else ""
    candidates = set(available) if available else set(CATEGORY_KEYWORDS.keys())
    scores = {
        cat: score
        for cat, score in _score_query(q).items()
        if cat in candidates
    }
    return best, scores