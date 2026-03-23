"""query_constraints.py - Constraint extraction engine for all 21 categories."""

from __future__ import annotations
import logging, re
from typing import Dict, FrozenSet, Optional
from .category_config import KNOWN_BRANDS, POWER_CATEGORIES, CAPACITY_CATEGORIES, OS_DETECTION_MAP

logger = logging.getLogger(__name__)

_NEGATION_RE = re.compile(r"\b(?:without|no\b|not\b|do\s+not|don't|doesn't|exclude|avoid|except)\b", re.I)
_RE_PRICE_LAKH = re.compile(r"(?:under|below|less\s+than|within|budget(?:\s+of)?)\s*[rs.]*\s*(\d+(?:\.\d+)?)\s*(?:lakh|lac|l\b)", re.I)
_RE_PRICE_K    = re.compile(r"(?:under|below|less\s+than|within|budget(?:\s+of)?)\s*[rs.]*\s*([\d,]+)\s*k\b", re.I)
_RE_PRICE_PLAIN= re.compile(r"(?:under|below|less\s+than|within|budget(?:\s+of)?)\s*[rs.]*\s*([\d,]+)", re.I)
_RE_STAR       = re.compile(r"([1-5])\s*star", re.I)
_RE_TONNAGE    = re.compile(r"(\d+(?:\.\d+)?)\s*(?:ton|tr)(?:\b|$)", re.I)
_RE_RAM_EXACT  = re.compile(r"(\d+)\s*gb\s*ram", re.I)
_RE_RAM_ANY    = re.compile(r"(\d+)\s*gb", re.I)
_RE_WATT       = re.compile(r"(\d+)\s*w(?:att(?:s?)?)?(?:\b|$)", re.I)
_RE_CAPACITY_L = re.compile(r"(\d+(?:\.\d+)?)\s*l(?:itre?s?|iters?)?(?:\b|$)", re.I)
_VALID_RAM_GB: FrozenSet[int] = frozenset({1,2,3,4,6,8,12,16,24,32,64})
_GPU_MAP = {"geforce":"nvidia","nvidia":"nvidia","rtx":"nvidia","gtx":"nvidia","radeon":"amd","amd":"amd","intel":"intel","arc":"intel"}
_AC_CATS: FrozenSet[str] = frozenset({"air_conditioners","air_coolers"})
_COMPUTE_CATS: FrozenSet[str] = frozenset({"laptops","smartphones","smartwatches"})


_INTENT_KEYWORDS = {
    "gaming": ["gaming", "for gaming", "game"],
    "pendrive": ["pendrive", "pen drive", "usb drive", "flash drive", "thumb drive"],
    "5g": ["5g", "5 g"]
}

# ---------------------------------------------------------------------------
# CATEGORY REGISTRY
# Central schema defining which constraints are valid per product category
# ---------------------------------------------------------------------------
# ---------------------------------------------------------------------------
# CATEGORY REGISTRY
# Defines which constraint attributes are valid for each category
# ---------------------------------------------------------------------------

from typing import Dict, FrozenSet

CATEGORY_REGISTRY: Dict[str, FrozenSet[str]] = {

    # ---------------------------------------------------------
    # COMPUTE DEVICES
    # ---------------------------------------------------------
    "laptops": frozenset({
        "brand",
        "max_price",
        "ram",
        "storage",
        "gpu",
        "os",
        "intent"
    }),

    "smartphones": frozenset({
        "brand",
        "max_price",
        "ram",
        "storage",
        "os",
        "intent"
    }),

    "smartwatches": frozenset({
        "brand",
        "max_price",
        "os",
        "intent"
    }),

    # ---------------------------------------------------------
    # DISPLAY DEVICES
    # ---------------------------------------------------------
    "televisions": frozenset({
        "brand",
        "max_price",
        "resolution"
    }),

    # ---------------------------------------------------------
    # AUDIO DEVICES
    # ---------------------------------------------------------
    "earbuds": frozenset({
        "brand",
        "max_price",
        "intent"
    }),

    "speakers": frozenset({
        "brand",
        "max_price",
        "power_watt"
    }),

    # ---------------------------------------------------------
    # STORAGE DEVICES
    # ---------------------------------------------------------
    "storage": frozenset({
        "brand",
        "max_price",
        "storage"
    }),

    # ---------------------------------------------------------
    # COOLING DEVICES
    # ---------------------------------------------------------
    "air_conditioners": frozenset({
        "brand",
        "max_price",
        "tonnage",
        "star_rating",
        "inverter"
    }),

    "air_coolers": frozenset({
        "brand",
        "max_price",
        "capacity_liters",
        "power_watt"
    }),

    "fans": frozenset({
        "brand",
        "max_price",
        "power_watt"
    }),

    # ---------------------------------------------------------
    # KITCHEN APPLIANCES
    # ---------------------------------------------------------
    "air_fryers": frozenset({
        "brand",
        "max_price",
        "capacity_liters",
        "power_watt"
    }),

    "electric_kettles": frozenset({
        "brand",
        "max_price",
        "capacity_liters",
        "power_watt"
    }),

    "induction_cooktops": frozenset({
        "brand",
        "max_price",
        "power_watt"
    }),

    "mixer_grinders": frozenset({
        "brand",
        "max_price",
        "power_watt"
    }),

    "irons": frozenset({
        "brand",
        "max_price",
        "power_watt"
    }),

    "home_and_kitchen": frozenset({
        "brand",
        "max_price"
    }),

    # ---------------------------------------------------------
    # ELECTRONICS
    # ---------------------------------------------------------
    "cameras": frozenset({
        "brand",
        "max_price"
    }),

    # ---------------------------------------------------------
    # FITNESS / LIFESTYLE
    # ---------------------------------------------------------
    "fitness": frozenset({
        "brand",
        "max_price",
        "intent"
    }),

    # ---------------------------------------------------------
    # FASHION / ACCESSORIES
    # ---------------------------------------------------------
    "amazon_fashion": frozenset({
        "brand",
        "max_price"
    }),

    "beauty_and_grooming": frozenset({
        "brand",
        "max_price"
    }),

    "travel_accessories": frozenset({
        "brand",
        "max_price"
    })
}

def allowed_constraints_for(category: str) -> FrozenSet[str]:
    """Return allowed constraint keys for a category."""
    return CATEGORY_REGISTRY.get(category, frozenset())


def _negated(text: str, keyword: str) -> bool:
    """
    Detect negation near a keyword.

    Example:
    'laptop without nvidia gpu'
    """

    pattern = re.compile(
        rf"(?:{_NEGATION_RE.pattern})\W+(?:\w+\W+){{0,3}}{re.escape(keyword)}",
        re.I
    )

    return bool(pattern.search(text))
    

def _set(c: Dict, neg: bool, key: str, val: object) -> None:
    c["exclude" if neg else "include"][key] = val

def _price(q: str) -> Optional[int]:
    m = _RE_PRICE_LAKH.search(q)
    if m: return int(float(m.group(1))*100_000)
    m = _RE_PRICE_K.search(q)
    if m: return int(m.group(1).replace(",",""))*1_000
    m = _RE_PRICE_PLAIN.search(q)
    if m: return int(m.group(1).replace(",",""))
    return None

def _ram(q: str) -> Optional[int]:
    """
    Extract RAM value safely.

    Avoids confusing storage with RAM.
    """

    m = _RE_RAM_EXACT.search(q)
    if m:
        return int(m.group(1))

    for match in _RE_RAM_ANY.finditer(q):

        val = int(match.group(1))

        if val in _VALID_RAM_GB:
            return val

    return None


def _gpu(q: str) -> Optional[str]:

    for kw, vendor in _GPU_MAP.items():

        if re.search(rf"\b{re.escape(kw)}\b", q):
            return vendor

    return None


def _os(q: str) -> Optional[str]:
    """
    Detect OS from query.

    Priority:
    1. Explicit OS keywords
    2. Brand inference (iphone -> ios)
    """

    q = q.lower()

    # Explicit OS keywords
    for os_name, keywords in OS_DETECTION_MAP.items():
        if any(kw in q for kw in keywords):
            return os_name

    # Brand inference
    if "iphone" in q or "apple" in q:
        return "ios"

    if any(b in q for b in ["samsung","xiaomi","redmi","realme","oppo","vivo","iqoo","oneplus","motorola"]):
        return "android"

    return None


def _brand(q: str, explicit_excludes: set[str]) -> Optional[str]:
    """
    Detect brand mentioned in the query.

    Behaviour:
    - Ignores explicitly excluded brands
    - Prefers longer brand names (avoids 'mi' matching 'miui')
    - Uses word boundaries to avoid partial matches
    """

    q = q.lower()

    for brand in sorted(KNOWN_BRANDS, key=len, reverse=True):

        if brand in explicit_excludes:
            continue

        if re.search(rf"\b{re.escape(brand)}\b", q):
            return brand

    return None

# ---------------------------------------------------------
# Query normalization + negation extraction
# ---------------------------------------------------------

_NEGATION_WORDS = {
    "without", "except", "exclude", "excluding",
    "avoid", "not", "no"
}

def normalize_query_and_extract_negations(query: str):
    """
    Normalize query and detect explicit negation tokens.

    Example:
        "exclude samsung phones"
        -> excludes={"samsung"}
    """

    q = query.lower().strip()

    excludes = set()

    pattern = re.compile(
        r"(?:without|exclude|except|avoid|not|no)\s+([a-z0-9]+)",
        re.I
    )

    for m in pattern.finditer(q):
        token = m.group(1)
        excludes.add(token)

    return q, excludes


def extract_query_constraints(query: str, category: Optional[str] = None) -> Dict:
    """
    Industrial-grade constraint extraction.

    Returns:
        {
            "include": {...},
            "exclude": {...}
        }

    Handles:
        brand, price, os, ram, gpu,
        tonnage, star_rating, inverter,
        power_watt, capacity_liters, resolution, intent
    """

    c: Dict = {"include": {}, "exclude": {}}

    if not query or not query.strip():
        return c

    q, explicit_excludes = normalize_query_and_extract_negations(query)

    # ------------------------------------------------
    # Brand detection
    # ------------------------------------------------

    brand = _brand(q, explicit_excludes)

    if brand:

        if brand in explicit_excludes:
            c["exclude"]["brand"] = brand

        else:
            c["include"]["brand"] = brand

    # ------------------------------------------------
    # Price detection
    # ------------------------------------------------

    price = _price(q)

    if price:
        c["include"]["max_price"] = price

    # ------------------------------------------------
    # OS detection
    # ------------------------------------------------

    os_name = _os(q)

    if os_name:
        _set(c, _negated(q, os_name), "os", os_name)

    # ------------------------------------------------
    # Compute device constraints (RAM / GPU)
    # ------------------------------------------------

    if category is None or category in _COMPUTE_CATS:

        ram = _ram(q)

        if ram:
            _set(c, _negated(q, "gb"), "ram", ram)

        if category is None or category == "laptops":

            gpu = _gpu(q)

            if gpu:

                if gpu in explicit_excludes:
                    c["exclude"]["gpu"] = gpu

                else:
                    _set(c, _negated(q, gpu), "gpu", gpu)

    # ------------------------------------------------
    # AC / Cooler specific constraints
    # ------------------------------------------------

    if category is None or category in _AC_CATS:

        m = _RE_TONNAGE.search(q)

        if m:
            c["include"]["tonnage"] = float(m.group(1))

        m = _RE_STAR.search(q)

        if m:

            star = int(m.group(1))

            _set(
                c,
                _negated(q, f"{star} star"),
                "star_rating",
                star
            )

        if "inverter" in q:
            _set(c, _negated(q, "inverter"), "inverter", True)

    # ------------------------------------------------
    # Appliance wattage
    # ------------------------------------------------

    if category is None or category in POWER_CATEGORIES:

        m = _RE_WATT.search(q)

        if m:
            _set(c, _negated(q, "watt"), "power_watt", int(m.group(1)))

    # ------------------------------------------------
    # Capacity in litres
    # ------------------------------------------------

    if category is None or category in CAPACITY_CATEGORIES:

        m = _RE_CAPACITY_L.search(q)

        if m:
            _set(
                c,
                _negated(q, "litre"),
                "capacity_liters",
                float(m.group(1))
            )

    # ------------------------------------------------
    # TV resolution
    # ------------------------------------------------

    if category is None or category == "televisions":

        from .parsers import parse_resolution

        res = parse_resolution(q)

        if res:
            _set(c, _negated(q, res), "resolution", res)

    # ------------------------------------------------
    # Intent detection
    # ------------------------------------------------

    for intent, words in _INTENT_KEYWORDS.items():

        for w in words:

            if re.search(rf"\b{re.escape(w)}\b", q):

                if _negated(q, w):
                    c["exclude"]["intent"] = intent

                else:
                    c["include"]["intent"] = intent

                break

    # ------------------------------------------------
    # Enforce category registry
    # ------------------------------------------------

    if category:

        allowed = allowed_constraints_for(category)

        if allowed:

            c["include"] = {
                k: v for k, v in c["include"].items()
                if k in allowed
            }

            c["exclude"] = {
                k: v for k, v in c["exclude"].items()
                if k in allowed
            }

    # ------------------------------------------------
    # Conflict resolution
    # ------------------------------------------------

    for key in list(c["include"].keys()):

        if key in c["exclude"]:

            if c["include"][key] == c["exclude"][key]:

                logger.warning(
                    "[CONSTRAINT] conflict on %s → keeping exclusion",
                    key
                )

                c["include"].pop(key, None)

    # ------------------------------------------------
    # Logging
    # ------------------------------------------------

    logger.debug(
        "Constraints query=%r cat=%r -> %s",
        query,
        category,
        c
    )

    return c
 
