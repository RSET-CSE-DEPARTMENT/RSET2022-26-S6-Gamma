# frontend/query_utils.py

"""
═══════════════════════════════════════════════════════════════
ENTERPRISE FRONTEND QUERY UTILITIES v3.0
Fully Schema-Driven | Category-Aware | Scalable | Production Safe
═══════════════════════════════════════════════════════════════
"""

import re
from typing import Dict, Any, List, Optional

from project_modules.backend.query_constraints import (
    CATEGORY_REGISTRY,
    extract_query_constraints
)


# ═══════════════════════════════════════════════════════════════
# CATEGORY DETECTION (Registry Driven)
# ═══════════════════════════════════════════════════════════════

def detect_category_from_query(query: str) -> Optional[str]:

    if not query:
        return None

    query_lower = query.lower()
    best_match = None
    best_score = 0

    for category, data in CATEGORY_REGISTRY.items():
        for alias in data.get("aliases", []):
            alias_lower = alias.lower()
            pattern = rf"\b{re.escape(alias_lower)}\b"

            if re.search(pattern, query_lower):
                score = len(alias_lower)
                if score > best_score:
                    best_score = score
                    best_match = category

    return best_match


# ═══════════════════════════════════════════════════════════════
# USER PREFERENCE EXTRACTION (Constraint-Aligned)
# ═══════════════════════════════════════════════════════════════

def extract_preferences_from_query(query: str) -> Dict[str, Any]:

    prefs: Dict[str, Any] = {}

    if not query:
        return prefs

    category = detect_category_from_query(query)
    constraints = extract_query_constraints(query, category)

    include = constraints.get("include", {})

    if category:
        prefs["favorite_category"] = category

    if "brand" in include:
        prefs["favorite_brand"] = include["brand"]

    if "max_price" in include:
        prefs["budget"] = include["max_price"]

    if "use_case" in include:
        prefs["use_case"] = include["use_case"]

    return prefs


# ═══════════════════════════════════════════════════════════════
# GENERIC NUMERIC EXTRACTION
# ═══════════════════════════════════════════════════════════════

def _extract_numbers(text: str) -> List[float]:
    return [float(n) for n in re.findall(r"\d+\.?\d*", text)]


# ═══════════════════════════════════════════════════════════════
# DYNAMIC ATTRIBUTE EXTRACTION (Schema Driven)
# ═══════════════════════════════════════════════════════════════

def extract_structured_attributes(
    product: Dict[str, Any],
    category: Optional[str]
) -> Dict[str, Any]:

    text = (
        product.get("title", "") + " " +
        product.get("meta", {}).get("description", "")
    ).lower()

    attributes: Dict[str, Any] = {}

    # Always extract price safely
    attributes["price"] = product.get("meta", {}).get("resolved_price")

    if not category or category not in CATEGORY_REGISTRY:
        return attributes

    schema_attrs = CATEGORY_REGISTRY[category].get("attributes", [])

    numbers = _extract_numbers(text)

    for attr in schema_attrs:

        # Numeric attributes (power, capacity, tonnage, screen_size, etc.)
        if any(keyword in attr for keyword in [
            "power", "capacity", "tonnage", "size", "rating", "speed"
        ]):
            attributes[attr] = numbers

        # Boolean attributes
        elif any(keyword in attr for keyword in [
            "inverter", "smart", "anc", "waterproof", "auto_shutoff"
        ]):
            attributes[attr] = attr.replace("_", " ") in text

        # String attributes
        else:
            attributes[attr] = attr.replace("_", " ") in text

    # Brand (generic)
    attributes["brand"] = product.get("meta", {}).get("brand")

    return attributes


# ═══════════════════════════════════════════════════════════════
# DYNAMIC MATCH SIGNAL ENGINE (Fully Constraint Driven)
# ═══════════════════════════════════════════════════════════════

def compute_match_signals(
    product: Dict[str, Any],
    query_constraints: Dict[str, Any],
    category: Optional[str] = None
) -> List[str]:

    attrs = extract_structured_attributes(product, category)
    signals: List[str] = []

    include = query_constraints.get("include", {})
    exclude = query_constraints.get("exclude", {})
    prefer = query_constraints.get("prefer", {})

    text = (
        product.get("title", "") + " " +
        product.get("meta", {}).get("description", "")
    ).lower()

    # ------------------------------------------------------------
    # INCLUDE CONSTRAINTS
    # ------------------------------------------------------------
    for key, value in include.items():

        if key == "max_price":
            price = attrs.get("price")
            if price and price <= value:
                signals.append(f"✔ Within budget (₹{int(price):,})")
            else:
                signals.append("✖ Exceeds specified budget")

        elif isinstance(value, (int, float)):
            numbers = attrs.get(key) or _extract_numbers(text)
            tolerance = 0.05 * value
            matched = any(abs(n - value) <= tolerance for n in numbers)
            if matched:
                signals.append(f"✔ Matches required {key} ({value})")
            else:
                signals.append(f"✖ Does not match required {key}")

        elif isinstance(value, str):
            if value.lower() in text:
                signals.append(f"✔ Matches {key}: {value}")
            else:
                signals.append(f"✖ Missing {key}: {value}")

        elif isinstance(value, bool):
            if value:
                signals.append(f"✔ Includes {key.replace('_',' ')}")

    # ------------------------------------------------------------
    # EXCLUDE CONSTRAINTS
    # ------------------------------------------------------------
    for key, value in exclude.items():
        if isinstance(value, str) and value.lower() in text:
            signals.append(f"✖ Contains excluded {key}: {value}")

    # ------------------------------------------------------------
    # PREFERENCES
    # ------------------------------------------------------------
    for key in prefer.keys():
        signals.append(f"★ Matches preference: {key}")

    return signals


# ═══════════════════════════════════════════════════════════════
# SAFE PRICE FORMATTER
# ═══════════════════════════════════════════════════════════════

def format_price_safe(product: Any) -> str:
    """
    Enterprise-grade price resolver + formatter.
    Handles heterogeneous schemas across categories.
    """

    try:
        if product is None:
            return "Price unavailable"

        # If full product dict passed
        if isinstance(product, dict):
            meta = product.get("meta", product)

            # Possible price fields across datasets
            candidate_fields = [
                "resolved_price",
                "final_price",
                "discount_price",
                "sale_price",
                "offer_price",
                "our_price",
                "selling_price",
                "price",
                "mrp"
            ]

            price_val = None

            for field in candidate_fields:
                if field in meta and meta[field]:
                    raw = meta[field]

                    # Clean string price
                    if isinstance(raw, str):
                        clean = re.sub(r"[^\d.]", "", raw)
                        if clean:
                            price_val = float(clean)
                            break

                    # Numeric price
                    elif isinstance(raw, (int, float)):
                        price_val = float(raw)
                        break

            if price_val is None or price_val <= 0:
                return "Price unavailable"

        # If direct numeric value passed
        elif isinstance(product, (int, float)):
            price_val = float(product)

        else:
            return "Price unavailable"

        return f"₹{int(price_val):,}"

    except Exception:
        return "Price unavailable"
    