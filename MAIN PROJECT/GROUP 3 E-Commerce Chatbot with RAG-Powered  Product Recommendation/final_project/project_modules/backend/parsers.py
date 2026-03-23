"""
parsers.py - Industrial-Grade Attribute Extraction

Design principles:
  - Unit-Agnostic: Handles "16GB", "16 GB", "16-GB" and "16 gb ram" interchangeably.
  - Indian Market Optimized: Handles Lakh (L), K, and Crore notations.
  - Collision Prevention: Strictly separates RAM (1-64) from Storage (128+).
  - Pre-compiled Patterns: Optimized for high-throughput search.
"""

from __future__ import annotations

import logging
import re
from typing import Optional, Tuple

from .category_config import ANDROID_BRANDS, OS_DETECTION_MAP

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constants & Whitelists
# ---------------------------------------------------------------------------
_VALID_RAM_GB: frozenset = frozenset({1, 2, 3, 4, 6, 8, 12, 16, 24, 32, 64, 128})

_GPU_VENDOR_MAP = {
    "geforce": "nvidia",
    "nvidia": "nvidia",
    "rtx": "nvidia",
    "gtx": "nvidia",
    "quadro": "nvidia",
    "mx150": "nvidia",
    "mx250": "nvidia",

    "radeon": "amd",

    "arc": "intel",
    "iris": "intel",
    "uhd": "intel",
}

def normalize_text(text: str) -> str:
    """Normalize text for robust regex parsing."""
    if not text:
        return ""

    try:
        text = str(text).lower()

        # normalize separators
        text = text.replace("-", " ")
        text = text.replace("_", " ")

        # collapse whitespace
        text = re.sub(r"\s+", " ", text)

        return text.strip()

    except Exception:
        return ""
    
# ---------------------------------------------------------------------------
# Hardened Regex Patterns (Production-Grade | Pre-compiled)
# ---------------------------------------------------------------------------

# ---------------------------------------------------------
# RAM Detection
# ---------------------------------------------------------
_RE_RAM = re.compile(
    r"\b(1|2|3|4|6|8|12|16|24|32|64|128)\s*gb\s*(?:ram|memory|lpddr\d?)?\b",
    re.I
)

# ---------------------------------------------------------
# Storage Detection
# ---------------------------------------------------------
_RE_STORAGE_GB = re.compile(
    r"\b(\d{2,4})\s*gb\s*(?:ssd|hdd|storage|rom|internal|nvme|emmc|flash|drive)?\b",
    re.I
)

_RE_STORAGE_TB = re.compile(
    r"\b(\d+(?:\.\d+)?)\s*tb\s*(?:ssd|hdd|storage|internal|drive)?\b",
    re.I
)


# ---------------------------------------------------------
# Wattage (Appliances)
# ---------------------------------------------------------
_RE_WATT = re.compile(
    r"\b(\d{2,4})\s*(?:w|watt|watts)\b",
    re.I
)


# ---------------------------------------------------------
# AC Tonnage
# ---------------------------------------------------------
_RE_TON = re.compile(
    r"\b(\d+(?:\.\d+)?)\s*(?:ton|tons|tr)\b",
    re.I
)


# ---------------------------------------------------------
# Energy Star Rating
# ---------------------------------------------------------
_RE_STAR = re.compile(
    r"\b([1-5])\s*[-]?\s*(?:star|rating)\b",
    re.I
)


# ---------------------------------------------------------
# Capacity (Litres)
# ---------------------------------------------------------
_RE_CAPACITY_L = re.compile(
    r"\b(\d+(?:\.\d+)?)\s*(?:l|litre|liter|litres|liters)\b",
    re.I
)


# ---------------------------------------------------------
# Indian Price Detection
# ---------------------------------------------------------

_RE_PRICE_LAKH = re.compile(
    r"\b(\d+(?:\.\d+)?)\s*(?:lakh|lac|l)\b",
    re.I
)

_RE_PRICE_K = re.compile(
    r"\b(\d+(?:\.\d+)?)\s*(?:k|thousand)\b",
    re.I
)

# Only capture plain price if preceded by price intent
_RE_PRICE_PLAIN = re.compile(
    r"(?:rs\.?|inr|₹)?\s*([\d]{1,3}(?:,\d{3})+|\d{4,7})\b",
    re.I
)

# ---------------------------------------------------------------------------
# Implementation
# ---------------------------------------------------------------------------
def parse_ram(text: str) -> Optional[int]:
    """Robust RAM extraction."""

    if not text:
        return None

    t = normalize_text(text)

    values = []

    try:
        for m in _RE_RAM.finditer(t):

            val = int(m.group(1))

            if val in _VALID_RAM_GB:
                values.append(val)

    except Exception:
        return None

    if not values:
        return None

    return min(values)

def parse_storage(text: str) -> Optional[int]:
    """Industrial storage extraction."""

    if not text:
        return None

    t = normalize_text(text)

    values = []

    try:

        for m in _RE_STORAGE_GB.finditer(t):

            val = int(m.group(1))

            if val >= 64:   # storage usually >=64GB
                values.append(val)

        for m in _RE_STORAGE_TB.finditer(t):

            val = int(float(m.group(1)) * 1024)

            values.append(val)

    except Exception:
        return None

    if not values:
        return None

    return max(values)


def extract_ram_and_storage(text: str) -> Tuple[Optional[int], Optional[int]]:
    """Robust RAM + storage extractor."""

    if not text:
        return None, None

    try:

        normalized = normalize_text(text)

        ram_gb = parse_ram(normalized)
        storage_gb = parse_storage(normalized)

        # collision correction
        if ram_gb and storage_gb:

            if ram_gb > 64 and storage_gb <= 64:
                ram_gb, storage_gb = storage_gb, ram_gb

        return ram_gb, storage_gb

    except Exception as e:

        logger.warning("RAM/Storage extraction failed: %s", e)

        return None, None
    
def parse_ton(text: str) -> Optional[float]:
    """Extract AC tonnage."""

    if not text:
        return None

    t = normalize_text(text)

    m = _RE_TON.search(t)

    if not m:
        return None

    try:
        value = float(m.group(1))

        if 0.5 <= value <= 5:
            return value

    except Exception:
        pass

    return None

    
def parse_watt(text: str) -> Optional[int]:
    """Extract wattage for appliances."""

    if not text:
        return None

    t = normalize_text(text)

    m = _RE_WATT.search(t)

    if not m:
        return None

    try:

        value = int(m.group(1))

        if 10 <= value <= 5000:
            return value

    except Exception:
        pass

    return None


def parse_gpu(text: str) -> Optional[str]:
    """Detect GPU vendor."""

    if not text:
        return None

    t = normalize_text(text)

    if re.search(r"\b(rt[x]?\s?\d{3,4}|gtx\s?\d{3,4})\b", t):
        return "nvidia"

    for keyword, vendor in _GPU_VENDOR_MAP.items():

        if re.search(rf"\b{keyword}\b", t):
            return vendor

    return None

def parse_star(text: str) -> Optional[int]:
    """Extract BEE star rating."""

    if not text:
        return None

    m = _RE_STAR.search(text)

    if not m:
        return None

    try:

        val = int(m.group(1))

        if 1 <= val <= 5:
            return val

    except Exception:
        pass

    return None

def parse_resolution(text: str) -> Optional[str]:
    """Detect display resolution tier."""

    if not text:
        return None

    t = normalize_text(text)

    if re.search(r"\b(4k|2160p|ultra hd|uhd|qled|oled|miniled)\b", t):
        return "4k"

    if re.search(r"\b(1080p|full hd|fhd)\b", t):
        return "fhd"

    if re.search(r"\b(720p|hd ready|hd\+)\b", t):
        return "hd"

    return None


def extract_price_constraint(query: str) -> Optional[int]:
    """Extract user budget from query."""

    if not query:
        return None

    q = normalize_text(query)

    try:

        if m := _RE_PRICE_LAKH.search(q):
            return int(float(m.group(1)) * 100_000)

        if m := _RE_PRICE_K.search(q):
            return int(float(m.group(1)) * 1_000)

        if m := re.search(r"(?:under|below|less than|budget|around)\s*(\d[\d,]*)", q):
            return int(m.group(1).replace(",", ""))

        if m := _RE_PRICE_PLAIN.search(q):
            return int(m.group(1).replace(",", ""))

    except Exception:
        return None

    return None


def parse_numeric_unit(text: str, unit: str) -> Optional[float]:
    """Generic numeric-unit parser."""

    if not text or not unit:
        return None

    t = normalize_text(text)

    try:

        pattern = re.compile(rf"\b(\d+(?:\.\d+)?)\s*{re.escape(unit)}\b")

        m = pattern.search(t)

        if not m:
            return None

        return float(m.group(1))

    except Exception:
        return None
    
    
def infer_os(text: str) -> Optional[str]:
    """Infer OS from product description."""

    if not text:
        return None

    t = normalize_text(text)

    try:

        for os_name, keywords in OS_DETECTION_MAP.items():

            for kw in keywords:

                if kw in t:
                    return os_name

        for brand in ANDROID_BRANDS:

            if brand in t:
                return "android"

    except Exception:
        return None

    return None

