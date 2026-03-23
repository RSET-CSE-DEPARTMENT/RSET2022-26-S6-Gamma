# ot_context/temporal/temporal_cost.py

import torch
from eviot.temporal.state import ContextState


def temporal_cost(
    prev_state: ContextState,
    curr_state: ContextState,
):
    """
    Compute temporal consistency cost between two context states.

    Lower cost => better temporal coherence.

    Currently implemented as cosine distance between
    context centroids.
    """

    assert isinstance(prev_state, ContextState)
    assert isinstance(curr_state, ContextState)

    u = prev_state.centroid
    v = curr_state.centroid

    # safety: ensure correct shape
    assert u.ndim == 1 and v.ndim == 1

    sim = torch.cosine_similarity(u, v, dim=0)
    cost = 1.0 - sim

    return float(cost)
