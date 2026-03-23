# ot_context/temporal/temporal_builder.py

from typing import List, Dict

from eviot.temporal.slicer import temporal_slice
from eviot.temporal.state import ContextState
from eviot.temporal.temporal_cost import temporal_cost
from hotpotqa_eval.set_builder import build_context_set_adaptive


def build_temporal_context(
    query_embs,
    candidates: List[Dict],
    *,
    slice_mode: str = "retrieval_depth",
    num_slices: int = 3,
    epsilon_query: float = 0.01,
    epsilon_temporal: float = 0.01,
    patience: int = 2,
    k_max: int = 12,
    alpha: float = 1.0,
    beta: float = 1.0,
):
    """
    Build a temporal context using chained OT states.

    Returns:
        states: List[ContextState]
        debug:  Dict with per-step diagnostics
    """

    # ------------------------------
    # 1. Temporal slicing
    # ------------------------------
    slices = temporal_slice(
        candidates,
        mode=slice_mode,
        T=num_slices,
    )

    states: List[ContextState] = []
    debug = {
        "query_costs": [],
        "temporal_costs": [],
        "combined_costs": [],
        "state_sizes": [],
    }

    prev_state = None
    no_gain_steps = 0
    prev_combined_cost = None

    # ------------------------------
    # 2. Iterate over slices
    # ------------------------------
    for t, cand_slice in enumerate(slices):

        if not cand_slice:
            continue

        # ---- static OT on this slice ----
        selected, cost_history = build_context_set_adaptive(
            query_embs,
            cand_slice,
            epsilon=epsilon_query,
            patience=patience,
            k_max=k_max,
        )

        if not selected:
            continue

        curr_state = ContextState(selected, cost_history)

        # ---- query cost ----
        query_cost = curr_state.final_cost

        # ---- temporal cost ----
        if prev_state is None:
            temp_cost = 0.0
        else:
            temp_cost = temporal_cost(prev_state, curr_state)

        # ---- combined objective ----
        combined_cost = alpha * query_cost + beta * temp_cost

        # ---- logging ----
        debug["query_costs"].append(query_cost)
        debug["temporal_costs"].append(temp_cost)
        debug["combined_costs"].append(combined_cost)
        debug["state_sizes"].append(curr_state.size)

        states.append(curr_state)

        # ---- temporal stopping logic ----
        if prev_combined_cost is not None:
            gain = prev_combined_cost - combined_cost
            if gain < epsilon_temporal:
                no_gain_steps += 1
            else:
                no_gain_steps = 0

            if no_gain_steps >= patience:
                break

        prev_combined_cost = combined_cost
        prev_state = curr_state

    return states, debug
