#backend/explainability.py

# ============================================================
# EXPLAINABILITY LAYER
# ============================================================

import re
from typing import Dict, List

from .parsers import (
    parse_ram,
    parse_gpu,
    parse_ton,
    parse_star,
    parse_watt
)
from .category_config import CATEGORY_GRAPH_SCHEMA


# ============================================================
# Candidate Explanation Helpers
# ============================================================

def init_candidate(row: Dict, score: float) -> Dict:
    return {
        "title": str(row.get("title", "")),
        "meta": row,
        "merged_score": score,
        "explain": {
            "category": None,
            "brand": None,
            "attributes": [],
            "ranking": None
        }
    }


def explain_category(candidate: Dict, category: str):
    candidate["explain"]["category"] = category.replace("_", " ")


def explain_brand(candidate: Dict, brand: str):
    candidate["explain"]["brand"] = brand.title()


def explain_attribute(candidate: Dict, attr: str, value: str):
    candidate["explain"]["attributes"].append((attr, value))


def explain_ranking(candidate: Dict):
    candidate["explain"]["ranking"] = \
        "overall relevance and specification match"


# ============================================================
# Structured Explanation Generator
# ============================================================
def generate_structured_explanation(
        evidence: Dict,
        query: str,
        category: str,
        llm=None) -> Dict:
    """
    Production-grade explanation generator.

    Guarantees category-relevant explanations and prevents
    LLM hallucination by grounding explanations in product features.
    """

    import re

    if not isinstance(evidence, dict):
        evidence = {}

    matched = evidence.get("matched", {}) or {}
    additional = evidence.get("additional", {}) or {}
    violations = evidence.get("violations", {}) or {}

    # ------------------------------------------------
    # Convert attributes into readable features
    # ------------------------------------------------

    matched_features = []
    additional_features = []

    for k, v in matched.items():
        matched_features.append(f"{v} {k.replace('_',' ')}")

    for k, v in additional.items():
        additional_features.append(f"{v} {k.replace('_',' ')}")

    all_features = matched_features + additional_features

    feature_text = (
        ", ".join(all_features)
        if all_features
        else "relevant product specifications"
    )

    missing = [k.replace("_", " ") for k in violations.keys()]

    # ------------------------------------------------
    # Bullet explanations
    # ------------------------------------------------

    bullets = []

    if query:
        bullets.append(f"Matches your search for '{query}'")

    for f in matched_features[:3]:
        bullets.append(f"Includes {f}")

    for f in additional_features[:2]:
        bullets.append(f"Also offers {f}")

    # ------------------------------------------------
    # LLM enhanced explanation
    # ------------------------------------------------

    if llm:

        prompt = f"""
You are explaining why a product recommendation is relevant.

STRICT RULES:
- Only mention the features listed below.
- Do NOT invent new features.
- Do NOT mention batteries, GPUs, displays, or processors unless listed.
- Do NOT mention algorithms or ranking systems.

User Query:
{query}

Product Category:
{category}

Product Features:
{feature_text}

Missing Requested Attributes:
{", ".join(missing) if missing else "None"}

Write a natural explanation (90–150 words) explaining why this product is a strong match.
"""

        try:

            response = llm(prompt)

            if response:

                paragraph = str(response).strip()

                paragraph = re.sub(r"<[^>]+>", "", paragraph)
                paragraph = re.sub(r"\s+", " ", paragraph)

                if len(paragraph.split()) >= 60:

                    return {
                        "bullets": bullets,
                        "paragraph": paragraph
                    }

        except Exception:
            pass

    # ------------------------------------------------
    # Category-aware deterministic fallback
    # ------------------------------------------------

    category_label = category.replace("_", " ")
    schema = CATEGORY_GRAPH_SCHEMA.get(category, {})

    paragraph = (
        f"This product is recommended because it closely matches the "
        f"requirements in your search for '{query}'. Within the "
        f"{category_label} category, users typically prioritize reliability, "
        f"practical specifications, and strong compatibility with everyday "
        f"use cases. Based on the available product metadata, this item "
        f"includes features such as {feature_text}. These characteristics "
        f"indicate that the product aligns well with the intended purpose "
        f"of your query. Products that demonstrate strong alignment with "
        f"user requirements and include relevant specifications tend to "
        f"rank higher within the recommendation results. Because this "
        f"product contains multiple attributes that correspond with your "
        f"search intent, it was identified as a relevant and suitable "
        f"recommendation within the {category_label} category."
    )

    paragraph = re.sub(r"\s+", " ", paragraph).strip()

    return {
        "bullets": bullets,
        "paragraph": paragraph
    }


# ============================================================
# Key Feature Summary (Production Grade)
# ============================================================
def summarize_key_features(candidate: Dict,
                           category: str) -> List[str]:

    title = str(candidate.get("title", ""))
    description = str(candidate.get("meta", {}).get("description", ""))

    text = f"{title} {description}".lower()

    features = []
    seen = set()

    def add(feature):
        if feature and feature not in seen:
            features.append(feature)
            seen.add(feature)

    # ------------------------------------------------
    # Laptop features
    # ------------------------------------------------

    ram = parse_ram(text)
    if ram:
        add(f"{ram}GB RAM")

    gpu = parse_gpu(text)
    if gpu:
        add(f"{gpu.upper()} graphics")

    storage = re.search(
        r'(\d+)\s?(tb|gb)\s*(ssd|hdd|nvme)',
        text,
        re.IGNORECASE
    )

    if storage:
        size = storage.group(1)
        unit = storage.group(2).upper()
        dtype = storage.group(3).upper()
        add(f"{size}{unit} {dtype}")

    # ------------------------------------------------
    # Smartphone features
    # ------------------------------------------------

    if category == "smartphones":

        if "5g" in text:
            add("5G connectivity")

        if "amoled" in text:
            add("AMOLED display")

        battery = re.search(r'(\d{3,5})\s?mah', text)
        if battery:
            add(f"{battery.group(1)}mAh battery")

    # ------------------------------------------------
    # Air conditioner features
    # ------------------------------------------------

    if category == "air_conditioners":

        ton = parse_ton(text)
        if ton:
            add(f"{ton} ton capacity")

        star = parse_star(text)
        if star:
            add(f"{star}-star energy rating")

        if "inverter" in text:
            add("Inverter compressor")

    # ------------------------------------------------
    # Air fryer features
    # ------------------------------------------------

    if category == "air_fryers":

        capacity = re.search(r'(\d+(?:\.\d+)?)\s?l', text)
        if capacity:
            add(f"{capacity.group(1)}L capacity")

        watt = parse_watt(text)
        if watt:
            add(f"{watt}W power")

    # ------------------------------------------------
    # Speaker features
    # ------------------------------------------------

    if category == "speakers":

        if "bluetooth" in text:
            add("Bluetooth connectivity")

        watt = parse_watt(text)
        if watt:
            add(f"{watt}W output")

    if category == "televisions":

        if "4k" in text:
            add("4K resolution")

        if "oled" in text:
            add("OLED display")

        if "qled" in text:
            add("QLED panel")

        size = re.search(r'(\d{2,3})\s?inch', text)
        if size:
            add(f"{size.group(1)} inch display")

    if category == "earbuds":

        if "anc" in text:
            add("Active noise cancellation")

        if "bluetooth" in text:
            add("Bluetooth connectivity")

        battery = re.search(r'(\d+)\s?hour', text)
        if battery:
            add(f"{battery.group(1)} hour battery life")

    if category == "cameras":

        mp = re.search(r'(\d+)\s?mp', text)
        if mp:
            add(f"{mp.group(1)}MP sensor")

        if "mirrorless" in text:
            add("Mirrorless system")

        if "dslr" in text:
            add("DSLR camera")

    if category == "fans":

        watt = parse_watt(text)
        if watt:
            add(f"{watt}W motor")

        sweep = re.search(r'(\d{3,4})\s?mm', text)
        if sweep:
            add(f"{sweep.group(1)}mm sweep")

    # ------------------------------------------------
    # Generic schema-based feature extraction
    # Ensures support for all configured categories
    # ------------------------------------------------

    if category in CATEGORY_GRAPH_SCHEMA:

        relations = CATEGORY_GRAPH_SCHEMA.get(category, {}).get("relations", [])

        for field, _, _, _ in relations:

            pattern = rf"(\d+(?:\.\d+)?)\s?(?:{field.replace('_',' ')}|{field.replace('_','')})"
            match = re.search(pattern, text)

            if match:
                add(f"{match.group(1)} {field.replace('_',' ')}")

    return features[:5]


def format_price_inr(price):

    if price in [None, "", "nan"]:
        return "Price unavailable"

    try:

        if isinstance(price, str):

            price = (
                price.replace("₹", "")
                     .replace(",", "")
                     .strip()
            )

        price = float(price)
        price = int(price)

        return f"₹{price:,}"

    except Exception:
        return "Price unavailable"     

# ============================================================
# Intent Normalization
# ============================================================
def normalize_user_intent(query: str) -> str:
    """
    Normalizes user search intent for downstream processing.
    """

    if not query:
        return ""

    q = query.lower()

    q = re.sub(
        r'\b(recommend|suggest|show|give|find|list)\s+me\b',
        '',
        q
    )

    q = re.sub(r'\bplease\b', '', q)

    q = re.sub(r'\s+', ' ', q).strip()

    return q