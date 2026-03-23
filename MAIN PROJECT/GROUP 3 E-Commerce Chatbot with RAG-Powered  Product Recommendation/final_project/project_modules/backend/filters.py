# backend/filters.py

"""
═══════════════════════════════════════════════════════════════════════════
PRODUCTION FILTER ENGINE v5.0 - INTELLIGENT & BALANCED
═══════════════════════════════════════════════════════════════════════════

Features:
✅ Smart accessory detection (not overly strict)
✅ Intent-aware filtering (gaming, office, photography)
✅ Graceful degradation (relaxed fallback)
✅ Comprehensive attribute parsing
✅ Category-specific validation covering all 21 categories
✅ No double-gating: redundant is_phone_like() pre-check removed.
   validation.is_valid_device() is the single authority for device
   classification — phones with brand-only titles now pass correctly.
✅ OS inference consolidated into this module (lru_cache for speed)
✅ Performance optimized

Root cause of v4.0 smartphone failure (now fixed):
  - is_phone_like() required the word "smartphone" or brand WITHOUT any
    accessory word. Titles like "Samsung Galaxy S23 Ultra 5G (256GB)"
    have no explicit "smartphone" and may reference accessories in desc.
  - is_valid_device() additionally required parse_ram() to succeed, but
    many curated phone titles carry no RAM in the title — only desc.
  Both gates were killing real phones. Now a single smarter gate in
  validation._is_phone() handles this correctly.

Author: Production Team
Version: 5.0.0
Last Updated: 2026-03-04
"""

import re
import logging
import pandas as pd
from typing import Dict, Optional, List, Set
from functools import lru_cache

from .validation import is_valid_device
from .query_constraints import extract_query_constraints

logger = logging.getLogger(__name__)

# ═══════════════════════════════════════════════════════════════════════════
# SMART ATTRIBUTE PARSERS
# ═══════════════════════════════════════════════════════════════════════════

# RAM sizes that are realistic for devices (excludes storage values)
_VALID_RAM_GB = {1, 2, 3, 4, 6, 8, 12, 16, 24, 32, 64}

_ANDROID_BRANDS_RE = re.compile(
    r"\b(samsung|redmi|realme|oneplus|oppo|vivo|iqoo|motorola|nokia|"
    r"xiaomi|infinix|tecno|lava)\b",
    re.I,
)

@lru_cache(maxsize=2000)
def parse_ram(text: str) -> Optional[int]:
    """
    Extract RAM size in GB.

    Strategy (priority order):
      1. Explicit 'N gb ram' / 'ram: N gb' pattern.
      2. RAM+storage combo pattern e.g. '8GB + 128GB'.
      3. 'N gb' where N is in the RAM whitelist (avoids storage confusion).
    """
    patterns = [
        r'(\d+)\s*gb\s*ram',
        r'ram\s*[:\-]?\s*(\d+)\s*gb',
        r'memory\s*[:\-]?\s*(\d+)\s*gb',
        r'(\d+)\s*gb\s*\+\s*\d+\s*gb',  # "8GB + 128GB"
    ]

    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            ram = int(match.group(1))
            if 1 <= ram <= 128:
                return ram

    for match in re.finditer(r'(\d+)\s*gb', text, re.IGNORECASE):
        val = int(match.group(1))
        if val in _VALID_RAM_GB:
            return val

    return None


@lru_cache(maxsize=2000)
def parse_gpu(text: str) -> Optional[str]:
    """Extract GPU vendor: 'nvidia' | 'amd' | 'intel' | None."""
    t = text.lower()

    if any(kw in t for kw in ("nvidia", "geforce", "rtx", "gtx")):
        return "nvidia"
    if any(kw in t for kw in ("amd", "radeon", "vega")):
        return "amd"
    if any(kw in t for kw in ("intel", "iris", "uhd", "xe graphics")):
        return "intel"

    return None


def parse_star_rating(text: str) -> Optional[int]:
    """Extract BEE energy star rating (1–5)."""
    match = re.search(r'(\d)\s*[-]?\s*star', text, re.IGNORECASE)
    if match:
        stars = int(match.group(1))
        if 1 <= stars <= 5:
            return stars
    return None


def parse_power(text: str) -> Optional[int]:
    """Extract wattage."""
    match = re.search(r'(\d+)\s*w(?:att(?:s?)?)?(?:\b|$)', text.lower())
    return int(match.group(1)) if match else None


def parse_resolution(text: str) -> Optional[str]:
    """Return normalised resolution tier: '4k' | 'fhd' | 'hd' | None."""
    t = text.lower()
    if any(x in t for x in ("4k", "ultra hd", "uhd", "2160p", "qled", "crystal uhd")):
        return "4k"
    if any(x in t for x in ("full hd", "1080p", "fhd")):
        return "fhd"
    if any(x in t for x in ("hd ready", "720p")):
        return "hd"
    return None


def resolve_price(row: Dict, category: str) -> Optional[int]:
    """
    UNIVERSAL PRICE RESOLUTION (ALL CATEGORIES)

    Handles price stored in:
        candidate["price"]
        candidate["meta"]["price"]
        price_inr_int
        discount_price
        actual_price

    Always returns an integer price if available.
    """

    if not isinstance(row, dict):
        return None

    candidates = []

    def valid(x):
        return isinstance(x, (int, float)) and not pd.isna(x) and x > 0

    # ------------------------------------------------
    # 1. direct candidate price
    # ------------------------------------------------
    p = row.get("price")
    if valid(p):
        candidates.append(int(p))

    # ------------------------------------------------
    # 2. price stored inside meta
    # ------------------------------------------------
    meta = row.get("meta", {})
    if isinstance(meta, dict):

        for key in ("price", "price_inr_int", "discount_price", "actual_price"):
            val = meta.get(key)

            if valid(val):
                candidates.append(int(val))

            elif isinstance(val, str) and val.strip():
                try:
                    clean = re.sub(r"[₹,\s]", "", val)
                    price = int(float(clean))
                    if price > 0:
                        candidates.append(price)
                except Exception:
                    pass

    # ------------------------------------------------
    # 3. fallback fields
    # ------------------------------------------------
    for key in ("price_inr_int", "discount_price", "actual_price"):
        val = row.get(key)

        if valid(val):
            candidates.append(int(val))

    return min(candidates) if candidates else None


def detect_brand_from_query(query: str) -> Optional[str]:
    """
    Detect a brand name from the query string.
    Used as fallback when the constraint extractor does not fire.
    """
    query = query.lower()

    brand_patterns = {
        "sandisk":   r"\bsandisk\b",
        "samsung":   r"\bsamsung\b",
        "apple":     r"\bapple\b|\biphone\b",
        "hp":        r"\bhp\b",
        "dell":      r"\bdell\b",
        "lenovo":    r"\blenovo\b",
        "asus":      r"\basus\b",
        "acer":      r"\bacer\b",
        "msi":       r"\bmsi\b",
        "redmi":     r"\bredmi\b",
        "realme":    r"\brealme\b",
        "oneplus":   r"\boneplus\b",
        "oppo":      r"\boppo\b",
        "vivo":      r"\bvivo\b",
        "seagate":   r"\bseagate\b",
        "wd":        r"\bwestern\s+digital\b|\bwd\b",
        "daikin":    r"\bdaikin\b",
        "lg":        r"\blg\b",
        "panasonic": r"\bpanasonic\b",
        "philips":   r"\bphilips\b",
        "prestige":  r"\bprestige\b",
    }

    for brand, pattern in brand_patterns.items():
        if re.search(pattern, query):
            return brand

    return None


# ═══════════════════════════════════════════════════════════════════════════
# OS INFERENCE  (lru_cache for speed; used inside hard_filter)
# ═══════════════════════════════════════════════════════════════════════════

_RE_IOS     = re.compile(r"\b(iphone|ios|apple\s+watch|airpods)\b", re.I)
_RE_ANDROID = re.compile(r"\b(android|miui|coloros|one\s+ui|oxygenos|realme\s+ui)\b", re.I)
_RE_WINDOWS = re.compile(r"\b(windows|win11|win10)\b", re.I)
_RE_MACOS   = re.compile(r"\b(macos|mac\s+os|osx|os\s+x|m1|m2|m3|m4)\b", re.I)


@lru_cache(maxsize=5000)
def infer_os(text: str) -> Optional[str]:
    """
    Industrial-grade OS detection.

    Layered inference:
      1. Explicit OS / device-name keywords (highest confidence)
      2. Android brand inference
      3. Laptop OS signals
    """
    if not text:
        return None

    if _RE_IOS.search(text):
        return "ios"
    if _RE_ANDROID.search(text):
        return "android"
    brands_re = globals().get("_ANDROID_BRANDS_RE")
    if brands_re and brands_re.search(text):
        return "android"
    if _RE_WINDOWS.search(text):
        return "windows"
    if _RE_MACOS.search(text):
        return "macos"

    return None


# ═══════════════════════════════════════════════════════════════════════════
# INTELLIGENT HARD FILTER  (PRODUCTION v5.0)
# ═══════════════════════════════════════════════════════════════════════════

def hard_filter(candidates: List[Dict],
                query: str,
                category: str) -> List[Dict]:
    """
    PRODUCTION HARD FILTER v5.0

    Guarantees:
    ✅ Single authority for device classification (validation.is_valid_device)
    ✅ No double-gating: is_phone_like() removed — validation._is_phone()
       handles phone classification with brand-only title support
    ✅ Deterministic filtering with no constraint mutation
    ✅ Safe evaluation for all 21 categories
    ✅ Defensive metadata handling
    ✅ Full include + exclude constraint enforcement
    """

    if not candidates:
        return []

    # ------------------------------------------------
    # Extract query constraints (safe copy)
    # ------------------------------------------------
    constraints = extract_query_constraints(query, category) or {}
    include = dict(constraints.get("include", {}))
    exclude = dict(constraints.get("exclude", {}))

    # ------------------------------------------------
    # Resolve constraint conflicts
    # ------------------------------------------------
    if "brand" in include and "brand" in exclude:
        if include["brand"] == exclude["brand"]:
            logger.warning("[FILTER] Brand conflict detected → removing include brand")
            include.pop("brand", None)

    if "os" in include and "os" in exclude:
        if include["os"] == exclude["os"]:
            logger.warning("[FILTER] OS conflict detected → removing include os")
            include.pop("os", None)

    # ------------------------------------------------
    # Brand fallback detection (non-smartphone categories only)
    # ------------------------------------------------
    if "brand" not in include and "brand" not in exclude and category != "smartphones":
        detected_brand = detect_brand_from_query(query)
        if detected_brand:
            include["brand"] = detected_brand

    logger.info(
        "[FILTER] %d candidates  inc=%s  exc=%s",
        len(candidates), include, exclude
    )

    filtered:   List[Dict]      = []
    drop_stats: Dict[str, int]  = {}

    for c in candidates:

        if not isinstance(c, dict):
            continue

        title = str(c.get("title", "") or "")
        meta  = c.get("meta") or {}
        desc  = str(meta.get("description", "") or "")
        text  = f"{title} {desc}".lower()

        # ------------------------------------------------
        # 1. Device validation
        #    validation.is_valid_device() is the single gate.
        #    It calls _is_phone() internally for smartphones —
        #    brand-only titles without "smartphone" keyword now pass.
        # ------------------------------------------------
        if not is_valid_device(title, desc, category):
            drop_stats["invalid_device"] = drop_stats.get("invalid_device", 0) + 1
            logger.debug("[FILTER] DROP invalid_device: %r", title[:60])
            continue

        reason: Optional[str] = None

        # ------------------------------------------------
        # 2. INCLUDE constraints
        # ------------------------------------------------

        # BRAND
        brand_required = include.get("brand")
        if brand_required:
            brand_required = brand_required.lower()
            if not re.search(rf"\b{re.escape(brand_required)}\b", text):
                reason = f"brand_required={brand_required}"

        # OS
        if reason is None:
            required_os = include.get("os")
            if required_os:
                required_os = required_os.lower()
                actual_os   = infer_os(text)
                if actual_os != required_os:
                    reason = f"os_required={required_os},got={actual_os}"

        # RAM
        if reason is None:
            required_ram = include.get("ram")
            if required_ram:
                actual_ram = parse_ram(text)
                if actual_ram is None or actual_ram < required_ram:
                    reason = f"ram_required={required_ram},got={actual_ram}"

        # GPU
        if reason is None:
            required_gpu = include.get("gpu")
            if required_gpu:
                actual_gpu = parse_gpu(text)
                if actual_gpu != required_gpu:
                    reason = f"gpu_required={required_gpu},got={actual_gpu}"

        # MAX PRICE
        if reason is None:
            max_price = include.get("max_price")
            if max_price:
                price = meta.get("resolved_price")

                if not price:
                    price = resolve_price(meta, category)

                if not price or price > max_price:
                    reason = f"price<={max_price},got={price}"

        # STAR RATING
        if reason is None:
            required_star = include.get("star_rating")
            if required_star:
                actual_star = parse_star_rating(text)
                if actual_star != required_star:
                    reason = f"star_required={required_star},got={actual_star}"

        # RESOLUTION
        if reason is None:
            required_res = include.get("resolution")
            if required_res:
                actual_res = parse_resolution(text)
                if actual_res != required_res:
                    reason = f"resolution_required={required_res},got={actual_res}"

        # ------------------------------------------------
        # INTENT filtering (category-aware but generic)
        # ------------------------------------------------

        if reason is None:

            intent = include.get("intent")

            if intent:

                INTENT_TOKENS = {

                    "gaming": [
                        "gaming", "rtx", "gtx", "radeon",
                        "graphics", "high performance", "fps"
                    ],

                    "office": [
                        "office", "business", "productivity",
                        "work", "professional"
                    ],

                    "photography": [
                        "camera", "dslr", "mirrorless",
                        "lens", "megapixel", "photography"
                    ],

                    "music": [
                        "speaker", "sound", "audio",
                        "bass", "dolby", "surround"
                    ],

                    "fitness": [
                        "treadmill", "exercise", "gym",
                        "fitness", "workout", "cardio"
                    ],

                    "travel": [
                        "travel", "luggage", "trolley",
                        "backpack", "duffel"
                    ],

                    "kitchen": [
                        "kitchen", "cooking", "cook",
                        "mixer", "grinder", "fryer"
                    ]
                }

                tokens = INTENT_TOKENS.get(intent, [intent])

                if not any(t in text for t in tokens):

                    reason = f"intent_required={intent}"

        # ------------------------------------------------
        # 3. EXCLUDE constraints
        # ------------------------------------------------

        if reason is None:
            excluded_brand = exclude.get("brand")
            if excluded_brand:
                excluded_brand = excluded_brand.lower()
                if re.search(rf"\b{re.escape(excluded_brand)}\b", text):
                    reason = f"brand_excluded={excluded_brand}"

        if reason is None:
            excluded_os = exclude.get("os")
            if excluded_os:
                actual_os = infer_os(text)
                if actual_os == excluded_os:
                    reason = f"os_excluded={excluded_os}"

        if reason is None:
            excluded_gpu = exclude.get("gpu")
            if excluded_gpu:
                actual_gpu = parse_gpu(text)
                if actual_gpu == excluded_gpu:
                    reason = f"gpu_excluded={excluded_gpu}"

        if reason is None:
            excluded_star = exclude.get("star_rating")
            if excluded_star:
                actual_star = parse_star_rating(text)
                if actual_star == excluded_star:
                    reason = f"star_excluded={excluded_star}"

        # ------------------------------------------------
        # Passed all checks
        # ------------------------------------------------
        if reason:
            drop_stats[reason] = drop_stats.get(reason, 0) + 1
            logger.debug("[FILTER] DROP %r  reason=%s", title[:60], reason)
        else:
            filtered.append(c)

    logger.info(
        "[FILTER] %d/%d passed  drop_summary=%s",
        len(filtered), len(candidates), drop_stats
    )

    return filtered


# ═══════════════════════════════════════════════════════════════════════════
# DEDUPLICATION
# ═══════════════════════════════════════════════════════════════════════════

def normalize_title(title: str) -> str:
    """Normalize for deduplication."""
    clean = re.sub(r'[^\w\s]', '', title.lower())
    return re.sub(r'\s+', ' ', clean).strip()


def deduplicate(candidates: List[Dict]) -> List[Dict]:
    """Remove duplicate products, keeping first occurrence."""
    seen:    Set[str]   = set()
    deduped: List[Dict] = []

    for c in candidates:
        key = normalize_title(str(c.get("title",""))[:120])
        if key and key not in seen:
            seen.add(key)
            deduped.append(c)

    logger.debug("[DEDUP] %d → %d", len(candidates), len(deduped))
    return deduped


# ═══════════════════════════════════════════════════════════════════════════
# CONSTRAINT CONFIDENCE
# ═══════════════════════════════════════════════════════════════════════════

def constraint_confidence(constraints: Dict) -> int:
    """Total include + exclude constraint count. Higher = more specific query."""
    return (
        len(constraints.get("include", {})) +
        len(constraints.get("exclude", {}))
    )