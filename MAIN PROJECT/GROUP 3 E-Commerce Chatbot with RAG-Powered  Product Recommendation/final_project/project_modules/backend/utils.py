#backend/utils.py

import re
import numpy as np
import pandas as pd
from .logging_config import logger

def cosine_sim(qvec, mat):
    """
    Stable cosine similarity between query vector and embedding matrix.
    Works safely across all datasets.
    """

    if mat.ndim != 2:
        raise ValueError("Embedding matrix must be 2-D")

    if qvec.ndim != 1:
        raise ValueError("Query vector must be 1-D")

    mat_norm = np.linalg.norm(mat, axis=1)

    q_norm = np.linalg.norm(qvec)

    denom = (mat_norm * q_norm) + 1e-12

    sims = (mat @ qvec) / denom

    return sims


def normalize_title(t):
    """
    Normalize product title for deduplication.
    """

    if not t:
        return ""

    try:
        t = str(t).lower()

        t = re.sub(r"\s+", " ", t)

        t = re.sub(r"[^a-z0-9 ]", "", t)

        return t.strip()

    except Exception:
        return ""
    
def parse_price(v):
    """
    Robust INR price parsing.
    Handles:
    ₹1,29,999
    59k
    1.2 lakh
    """

    if not v:
        return None

    try:

        s = str(v).lower()

        s = s.replace(",", "")

        # lakh
        m = re.search(r"(\d+(?:\.\d+)?)\s*lakh", s)
        if m:
            return int(float(m.group(1)) * 100000)

        # k
        m = re.search(r"(\d+(?:\.\d+)?)\s*k", s)
        if m:
            return int(float(m.group(1)) * 1000)

        # plain digits
        digits = re.sub(r"[^\d]", "", s)

        if digits:
            return int(digits)

    except Exception:
        pass

    return None

def safe_read_meta(path: str) -> pd.DataFrame:
    """
    Safe metadata loader.

    Guarantees:
    - UTF-8 safe loading
    - No NaN text fields
    - Valid price parsing
    - Schema normalization
    """

    try:

        df = pd.read_csv(path, dtype=str, encoding="utf-8", low_memory=False)

        df = df.fillna("")

        if "title" not in df.columns:
            raise ValueError("Metadata missing 'title' column")

        if "description" not in df.columns:
            df["description"] = df["title"]

        df["title"] = df["title"].astype(str).str.strip()

        df["description"] = df["description"].astype(str).str.strip()

        if "price_inr_int" in df.columns:

            df["price_inr_int"] = df["price_inr_int"].apply(parse_price)

        return df.reset_index(drop=True)

    except Exception as e:

        logger.error("Error reading metadata: %s", e)

        raise
    
    