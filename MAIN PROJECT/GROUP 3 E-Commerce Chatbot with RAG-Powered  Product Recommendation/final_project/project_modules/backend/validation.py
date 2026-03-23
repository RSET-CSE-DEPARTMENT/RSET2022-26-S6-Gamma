# backend/validation.py

"""
Industrial Category-Aware Product Validator

Design goals
------------
• Fully configuration-driven
• Scales to unlimited categories
• No hardcoded category logic
• Safe against malformed input
• Deterministic filtering

All category rules are sourced from category_config.py
"""

import re
from typing import Optional

from .category_config import CATEGORY_KEYWORDS
from .parsers import (
    parse_ram,
    parse_gpu,
    parse_star,
    parse_resolution,
    parse_ton
)

# ============================================================
# GLOBAL ACCESSORY BLOCK
# ============================================================

GLOBAL_REJECT_SAFE = {
    "adapter", "cable", "wire", "dock",
    "mount", "replacement", "spare",
    "compatible with"
}


# ============================================================
# SMARTPHONE DETECTOR (specialized rule)
# ============================================================

_PHONE_ACCESSORY_PATTERNS = re.compile(
    r"\b("
    r"charging\s+cable|lightning\s+cable|usb\s+cable"
    r"|tempered\s+glass|screen\s+protector"
    r"|phone\s+case|flip\s+cover"
    r"|earphone|earbuds|headphone"
    r"|phone\s+holder|selfie\s+stick"
    r")\b",
    re.I,
)

_PHONE_BRANDS = re.compile(
    r"\b("
    r"iphone|samsung|redmi|realme|oneplus|oppo|vivo|pixel"
    r"|motorola|nokia|xiaomi|infinix|tecno|iqoo"
    r")\b",
    re.I
)

_PHONE_HW = re.compile(
    r"\b("
    r"\d+\s*gb\s*ram"
    r"|snapdragon|dimensity|helio|exynos"
    r"|amoled|oled"
    r"|5g|4g\s*lte"
    r")\b",
    re.I
)


def _is_phone(text: str) -> bool:
    """
    Robust smartphone detector.

    Allows brand + model patterns without requiring
    explicit hardware specs.
    """

    if _PHONE_ACCESSORY_PATTERNS.search(text):
        return False

    # Explicit phone words
    if re.search(r"\b(smartphone|mobile phone|mobile)\b", text):
        return True

    # Brand + model pattern
    if _PHONE_BRANDS.search(text):

        # common phone model signals
        if re.search(r"\b(galaxy|note|iphone|pixel|redmi|mi|neo|pro|max|plus|ultra)\b", text):
            return True

        # hardware hint
        if _PHONE_HW.search(text):
            return True

    return False


# ============================================================
# GENERIC VALIDATOR
# ============================================================
def is_valid_device(
    title: str,
    desc: str,
    category: str
) -> bool:
    """
    Industrial category validator.

    Prevents accessory leakage while allowing
    flexible product titles.
    """

    title = str(title or "")
    desc = str(desc or "")

    text = f"{title} {desc}".lower()

    # --------------------------------------------------------
    # GLOBAL ACCESSORY BLOCK
    # --------------------------------------------------------

    for kw in GLOBAL_REJECT_SAFE:

        if re.search(rf"\b{re.escape(kw)}\b", text):
            return False

    # --------------------------------------------------------
    # CATEGORY SPECIAL CASE
    # --------------------------------------------------------

    if category == "smartphones":
        return _is_phone(text)

    # --------------------------------------------------------
    # GENERIC CATEGORY VALIDATION
    # --------------------------------------------------------

    keywords = CATEGORY_KEYWORDS.get(category)

    if keywords:

        for kw in keywords:

            if re.search(rf"\b{re.escape(kw)}\b", text):
                return True

        return False

    # --------------------------------------------------------
    # SAFE FALLBACK
    # --------------------------------------------------------

    return True


# ============================================================
# HARD CONSTRAINT VALIDATORS
# ============================================================

def has_required_ram(text: str, ram_req: Optional[int]) -> bool:

    if not ram_req:
        return True

    try:
        ram = parse_ram(text)
        return ram is not None and ram >= ram_req
    except Exception:
        return False


def has_required_gpu(text: str, gpu_req: Optional[str]) -> bool:

    if not gpu_req:
        return True

    try:

        gpu = parse_gpu(text)

        if not gpu:
            return False

        return gpu.lower() == gpu_req.lower()

    except Exception:
        return False


def has_required_star(text: str, star_req: Optional[int]) -> bool:

    if not star_req:
        return True

    try:
        star = parse_star(text)
        return star is not None and star >= star_req
    except Exception:
        return False


def has_required_resolution(text: str, res_req: Optional[str]) -> bool:

    if not res_req:
        return True

    try:
        res = parse_resolution(text)
        return res and res.lower() == res_req.lower()
    except Exception:
        return False


def has_required_tonnage(text: str, ton_req: Optional[float]) -> bool:

    if not ton_req:
        return True

    try:

        ton = parse_ton(text)

        if ton is None:
            return False

        return abs(ton - ton_req) <= 0.5

    except Exception:
        return False
    