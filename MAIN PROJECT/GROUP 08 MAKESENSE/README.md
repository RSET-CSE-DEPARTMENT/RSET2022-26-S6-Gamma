# MakeSense

**Semantic Evidence Construction with Optimal Transport**  
Reference implementation: **`eviot`**

---

## What is MakeSense

**MakeSense** is a research framework for **constructing evidence sets**, not just by ranking sentences.

Its Python implementation, **`eviot`**, uses **Optimal Transport (OT)** to select a *set* of sentences that are **together sufficient** to answer complex queries.

---

## Why MakeSense?

Traditional retrieval answers:

> “Which sentences are relevant?”

MakeSense answers:

> “Which **set of sentences together** is sufficient?”

This distinction matters for:
- multi-hop questions
- presence of redundancy
- reasoning across multiple facts
- deciding **joint sufficiency**

---

## How to MakeSense

1. Embed using (bge-base-en-v1.5), the
    - query (optionally decomposed into semantic supports)
    - candidate sentences
3. Use **Optimal Transport** to measure *coverage* between:
   - query representation
   - candidate evidence set
4. Construct evidence **as a set**, not a list as a result of just relevance ranking

---

## Query representation

`eviot` supports two modes.

### With query decomposition
- Query is split into semantic supports
- OT enforces coverage across supports
- Produces smaller, inference-based contexts

Best for:
- semantic sufficiency
- redundancy suppression
- theory-driven evaluation

---

### Without query decomposition
- Query is embedded as a single vector
- OT behaves closer to dense retrieval
- Favors explicit answer sentences

Works for:
- real-world implementations
- evidence recall
- optimizing context retrieval to minimzing set size trade-off

---

## Evidence construction modes

### Adaptive OT (default)
- Greedy selection
- Stops when marginal gain saturates
- Produces minimal sufficient context

---

### Fixed OT
- Selects exactly `k` sentences
- Inflates context beyond sufficiency for large `k`
- Not recommended for practical purposes

---

### Temporal OT
- Models **progressive evidence discovery**
- Evidence appears over time
- Penalizes abrupt semantic shifts
- States are **not answer-complete individually**

Used for:
- analysis
- evidence evolution
- semantic drift

---

## Package structure

---

## Installation using pip

```bash
python -m venv .venv
source .venv/bin/activate

pip install torch transformers pot spacy
python -m spacy download en_core_web_sm
```
---

## Installation using uv

Install uv package manager based on your OS (Windows/MacOS/Linux) - 
https://docs.astral.sh/uv/getting-started/installation/

```bash
uv init
uv venv
uv sync
```

Or manually add dependencies

```bash
uv add torch pot spacy transformers
```

---

## To run

```bash
python -m eviot.runners.single_query
```

## Example Configuration

```bash
CONFIG = {
    "mode": "adaptive",
    "use_query_decomposition": True,

    "epsilon": 0.01,
    "patience": 2,
    "k_max": 10,

    "temporal_slices": 3,
    "alpha_temporal": 0.3,
}
```

Configuration details:
- `mode`: adaptive, fixed, temporal
- `use_query_decomposed`: query decomposed or single vector embedding
- `epsilon`: threshold gain acheieved `patience` times to trigger stopping
- `patience`: how many times of gains equivalent to `epsilon` must trigger stopping
- `k_max`: upper bound for any set (triggered only if saturation is not observed at `k_max` set size)
- `temporal_slices`: number of stages before uncovering all candidates
- `alpha_temporal`: controls semantic drift


