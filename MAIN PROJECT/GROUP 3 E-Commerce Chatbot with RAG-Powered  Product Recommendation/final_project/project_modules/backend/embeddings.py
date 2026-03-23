# backend/embeddings.py

from functools import lru_cache
from typing import List

import numpy as np
from sentence_transformers import SentenceTransformer

from .logging_config import logger


@lru_cache(maxsize=1)
def get_embedding_model(name: str = "intfloat/e5-large-v2", device: str = "cpu"):
    """
    Load and cache the embedding model.

    This function ensures the model is loaded only once per process.
    """

    try:
        logger.info(f"Loading embedding model: {name} on {device}")

        model = SentenceTransformer(name, device=device)

        logger.info("Embedding model loaded successfully")

        return model

    except Exception as e:
        logger.error(f"Failed to load embedding model: {e}")
        raise RuntimeError(f"Cannot initialize embedding model: {e}")


def embed_text(text: str) -> np.ndarray:
    """
    Convert a query string into an embedding vector.

    Returns:
        numpy float32 vector normalized for cosine similarity.
    """

    if not text or not text.strip():
        raise ValueError("Cannot embed empty text")

    model = get_embedding_model()

    vec = model.encode(
        text,
        normalize_embeddings=True
    )

    return vec.astype("float32")


def embed_batch(texts: List[str]) -> np.ndarray:
    """
    Embed a batch of texts.

    Used for dataset generation or bulk queries.
    """

    model = get_embedding_model()

    vectors = model.encode(
        texts,
        normalize_embeddings=True
    )

    return vectors.astype("float32")