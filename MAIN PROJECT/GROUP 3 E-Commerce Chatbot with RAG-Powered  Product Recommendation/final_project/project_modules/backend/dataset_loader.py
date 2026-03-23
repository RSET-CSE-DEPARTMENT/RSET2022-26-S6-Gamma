"""
backend/dataset_loader.py
Industrial dataset resolver for the hybrid recommender.

Guarantees:
- Deterministic dataset selection
- Metadata ↔ embedding consistency
- Automatic selection of the newest cleaned dataset
- Safe fallback if datasets are missing
- Caching for performance
"""

import os
import re
import glob
import logging
from functools import lru_cache
from typing import Tuple

import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)

# ---------------------------------------------------------
# Dataset priority scoring
# ---------------------------------------------------------

def _dataset_score(path: str) -> int:
    """
    Score datasets for automatic selection.

    Higher score = preferred dataset.
    """

    name = os.path.basename(path).lower()

    score = 0

    if "final" in name:
        score += 40

    if "clean" in name:
        score += 30

    if "processed" in name:
        score += 10

    if "sample" in name or "backup" in name:
        score -= 100

    # Prefer CSV datasets with clear naming
    if name.endswith(".csv"):
        score += 5

    return score

# ---------------------------------------------------------
# Find best dataset
# ---------------------------------------------------------
def _select_best_file(files):
    """
    Select best dataset candidate using score + recency.
    """

    valid = [f for f in files if os.path.exists(f)]

    if not valid:
        return None

    ranked = sorted(
        valid,
        key=lambda f: (_dataset_score(f), os.path.getmtime(f)),
        reverse=True
    )

    best = ranked[0]

    logger.debug("[DATA] Candidate files: %s", valid)
    logger.debug("[DATA] Selected file: %s", best)

    return best


# ---------------------------------------------------------
# Metadata loader
# ---------------------------------------------------------
def _load_metadata(path: str) -> pd.DataFrame:
    """
    Load metadata with strict schema validation.
    """

    logger.info("[DATA] Loading metadata: %s", path)

    try:
        df = pd.read_csv(path, encoding="utf-8", low_memory=False)
    except Exception as e:
        raise RuntimeError(f"Failed to load metadata: {path}") from e

    if df.empty:
        raise RuntimeError(f"Metadata file is empty: {path}")

    df = df.fillna("")

    if "title" not in df.columns:
        raise ValueError(f"Dataset missing 'title' column: {path}")

    if "description" not in df.columns:
        df["description"] = df["title"]

    # -------------------------------------------------
    # PRICE NORMALIZATION
    # -------------------------------------------------

    price_priority = [
        "price_inr_int",
        "price_num",
        "discount_price",
        "actual_price",
        "price",
        "price_inr"
    ]

    price_series = None

    for col in price_priority:

        if col in df.columns:

            s = pd.to_numeric(df[col], errors="coerce")

            if s.notna().sum() > 10:  # enough valid prices
                price_series = s
                break

    if price_series is None:
        logger.warning("[DATA] No valid price column detected")
        df["resolved_price"] = np.nan
    else:
        df["resolved_price"] = price_series.astype("float32")

    # -------------------------------------------------
    # TEXT NORMALIZATION
    # -------------------------------------------------

    df["title"] = (
        df["title"]
        .astype(str)
        .str.replace(r"\s+", " ", regex=True)
        .str.strip()
    )

    df["description"] = (
        df["description"]
        .astype(str)
        .str.replace(r"\s+", " ", regex=True)
        .str.strip()
    )

    return df.reset_index(drop=True)


# ---------------------------------------------------------
# Embedding loader
# ---------------------------------------------------------
def _load_embeddings(path: str) -> np.ndarray:
    """
    Load embeddings with strict validation.
    """

    logger.info("[DATA] Loading embeddings: %s", path)

    try:
        emb = np.load(path, allow_pickle=False)
    except Exception as e:
        raise RuntimeError(f"Failed to load embeddings: {path}") from e

    if emb.ndim != 2:
        raise ValueError(f"Embedding matrix must be 2D: {path}")

    if emb.shape[0] == 0:
        raise RuntimeError(f"Embedding matrix empty: {path}")

    emb = emb.astype(np.float32, copy=False)

    if np.isnan(emb).any():
        raise RuntimeError(f"Embedding matrix contains NaN values: {path}")

    norms = np.linalg.norm(emb, axis=1, keepdims=True)
    norms[norms == 0] = 1.0

    emb = emb / norms

    return emb

# ---------------------------------------------------------
# Public API
# ---------------------------------------------------------
@lru_cache(maxsize=64)
def load_dataset(data_dir: str, category: str) -> Tuple[pd.DataFrame, np.ndarray]:
    """
    Industrial dataset loader.
    """

    meta_pattern = os.path.join(
        data_dir,
        "categories",
        f"{category}*.csv"
    )

    emb_pattern = os.path.join(
        data_dir,
        "embeddings",
        f"{category}*.npy"
    )

    meta_files = glob.glob(meta_pattern)
    emb_files = glob.glob(emb_pattern)

    if not meta_files:
        raise FileNotFoundError(
            f"No metadata files found for category '{category}'"
        )

    if not emb_files:
        raise FileNotFoundError(
            f"No embedding files found for category '{category}'"
        )

    meta_path = _select_best_file(meta_files)

    # Try matching embedding using category name
    emb_candidates = [
        e for e in emb_files
        if category in os.path.basename(e)
    ]

    emb_path = (
        _select_best_file(emb_candidates)
        if emb_candidates
        else _select_best_file(emb_files)
    )

    logger.info("[DATA] Selected metadata: %s", meta_path)
    logger.info("[DATA] Selected embeddings: %s", emb_path)

    meta_df = _load_metadata(meta_path)
    emb = _load_embeddings(emb_path)

    # -------------------------------------------------
    # Consistency validation
    # -------------------------------------------------

    if len(meta_df) != len(emb):

        diff = abs(len(meta_df) - len(emb))

        logger.warning(
            "[DATA] Metadata / embedding mismatch %d vs %d",
            len(meta_df),
            len(emb)
        )

        if diff > 5:
            raise RuntimeError(
                f"Dataset corruption detected: "
                f"{len(meta_df)} metadata vs {len(emb)} embeddings"
            )

        n = min(len(meta_df), len(emb))

        meta_df = meta_df.iloc[:n].copy().reset_index(drop=True)
        emb = emb[:n]

    logger.info(
        "[DATA] Dataset ready | category=%s rows=%d dim=%d",
        category,
        len(meta_df),
        emb.shape[1]
    )

    return meta_df, emb

