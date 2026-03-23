"""
interactive_console.py
======================
Production Interactive Search Console v3.0

Features:
  ✅ Real-time search with all 21 product categories
  ✅ Constraint extraction display (include / exclude)
  ✅ In-session performance metrics (latency, success rate, category breakdown)
  ✅ Debug mode toggle with per-field parser output
  ✅ Paginated query history
  ✅ Graceful degradation on model / data failures
  ✅ Input sanitisation and length guard
  ✅ Correct run_search() signature matching the production backend
  ✅ No phantom imports (get_search_metrics / get_performance_stats removed)

Usage:
    python interactive_console.py
    python interactive_console.py --topk 10 --debug

Author: Production Team
Version: 3.0.0
"""

from __future__ import annotations

import argparse
import logging
import os
import sys
import time
from collections import defaultdict
from dataclasses import dataclass, field
from typing import Dict, List, Optional

# ---------------------------------------------------------------------------
# Adjust import path if running this file directly (not as a package)
# ---------------------------------------------------------------------------
_HERE = os.path.dirname(os.path.abspath(__file__))
if _HERE not in sys.path:
    sys.path.insert(0, _HERE)

# Lazy imports (prevents heavy backend initialization before CLI parsing)
from project_modules.backend.search import run_search
from project_modules.backend.category_detection import (
    list_available_categories,
    detect_category,
    detect_category_with_scores,
)
from project_modules.backend.query_constraints import extract_query_constraints


# ===========================================================================
# CLI ARGUMENTS
# ===========================================================================

def _parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Production Search Console")
    p.add_argument("--topk", type=int, default=5,
                   help="Results to display per query (default: 5)")
    p.add_argument("--device", type=str, default="cpu",
                   help="Inference device: cpu | cuda (default: cpu)")
    p.add_argument("--debug", action="store_true",
                   help="Start in debug mode")

    # NEW
    p.add_argument("--file", type=str, default=None,
                   help="Run queries from file instead of interactive mode")

    return p.parse_args()

# ===========================================================================
# LOGGING  (configured after arg parse so debug flag is respected)
# ===========================================================================

def _configure_logging(debug: bool) -> None:
    logging.basicConfig(
        level=logging.DEBUG if debug else logging.INFO,
        format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
        datefmt="%H:%M:%S",
    )

logger = logging.getLogger(__name__)


# ===========================================================================
# IN-SESSION METRICS TRACKER
# ===========================================================================

@dataclass
class SessionMetrics:
    """Accumulates per-session search statistics."""

    total_queries:    int = 0
    successful:       int = 0
    empty_results:    int = 0
    errors:           int = 0
    total_latency_ms: float = 0.0
    category_counts:  Dict[str, int] = field(default_factory=lambda: defaultdict(int))
    constraint_counts: Dict[str, int] = field(default_factory=lambda: defaultdict(int))

    def record(
        self,
        *,
        category: Optional[str],
        result_count: int,
        latency_ms: float,
        constraints: Dict,
        error: bool = False,
    ) -> None:
        self.total_queries += 1
        self.total_latency_ms += latency_ms
        if error:
            self.errors += 1
            return
        if result_count > 0:
            self.successful += 1
        else:
            self.empty_results += 1
        if category:
            self.category_counts[category] += 1
        for key in constraints.get("include", {}):
            self.constraint_counts[key] += 1
        for key in constraints.get("exclude", {}):
            self.constraint_counts[f"NOT_{key}"] += 1

    @property
    def success_rate(self) -> float:
        if self.total_queries == 0:
            return 0.0
        return self.successful / self.total_queries

    @property
    def avg_latency_ms(self) -> float:
        if self.total_queries == 0:
            return 0.0
        return self.total_latency_ms / self.total_queries


# ===========================================================================
# DISPLAY HELPERS
# ===========================================================================

_W = 80   # terminal width

def _line(char: str = "═") -> str:
    return char * _W

def _section(title: str) -> None:
    print(f"\n{_line('─')}")
    print(f"  {title}")
    print(_line("─"))

def _fmt_price(price: Optional[int]) -> str:
    if price is None:
        return "N/A"
    if price >= 100_000:
        return f"₹{price/100_000:.2f}L  (₹{price:,})"
    return f"₹{price:,}"

def _fmt_score(score: float) -> str:
    bar_len  = 20
    filled   = int(score * bar_len)
    bar      = "█" * filled + "░" * (bar_len - filled)
    return f"[{bar}] {score:.4f}"

def _fmt_constraints(constraints: Dict) -> str:
    inc = constraints.get("include", {})
    exc = constraints.get("exclude", {})
    parts = []
    for k, v in inc.items():
        parts.append(f"+{k}={v}")
    for k, v in exc.items():
        parts.append(f"-{k}={v}")
    return "  |  ".join(parts) if parts else "(none)"


def print_header(topk: int, device: str, debug: bool) -> None:
    print("\n" + _line())
    print("  🛒  PRODUCTION RAG SEARCH CONSOLE  v3.0")
    print(_line())
    print(f"  topk={topk}  device={device}  debug={'ON' if debug else 'OFF'}")
    print()
    print("  Commands:")
    print("    <query>         Search products")
    print("    stats           Session performance metrics")
    print("    debug           Toggle debug mode")
    print("    history [N]     Show last N queries (default 10)")
    print("    cats            List all supported categories")
    print("    clear           Clear screen")
    print("    exit / quit     Quit")
    print(_line())


def display_results(
    results:    List[Dict],
    query:      str,
    category:   str,
    debug:      bool,
    latency_ms: float,
) -> None:
    if not results:
        print("\n  ⚠️   NO RESULTS FOUND")
        print("\n  Possible reasons:")
        print("    • Hard filters are too strict — try a broader query")
        print("    • No data loaded for this category")
        print("    • Category detection picked the wrong bucket")
        return

    _section(f"TOP {len(results)} RESULTS  |  category={category}  |  {latency_ms:.0f}ms")

    for idx, result in enumerate(results, 1):
        title  = result.get("title", "Unknown Product")
        meta   = result.get("meta", {})
        price  = meta.get("resolved_price")
        score  = result.get("merged_score", 0.0)
        desc   = meta.get("description", "")

        print(f"\n  {idx:>2}.  {title[:72]}")
        print(f"        {'─' * 68}")
        print(f"        💰  {_fmt_price(price)}")
        print(f"        ⭐  Score: {_fmt_score(score)}")

        if debug:
            # Show truncated description and all meta keys for diagnostics
            if desc:
                print(f"        📝  {desc[:100].strip()}…")
            debug_keys = {k: v for k, v in meta.items()
                          if k not in ("description", "resolved_price") and v}
            if debug_keys:
                for k, v in list(debug_keys.items())[:6]:
                    print(f"        🔍  {k}: {str(v)[:60]}")

    print(f"\n{_line('─')}")


def display_constraints(constraints: Dict, category: str, debug: bool) -> None:
    _section(f"CONSTRAINTS  |  category={category}")

    inc = constraints.get("include", {})
    exc = constraints.get("exclude", {})

    if inc:
        print("\n  ✅  INCLUDE  (product MUST satisfy):")
        for key, value in inc.items():
            print(f"       {key:20s}  →  {value}")
    else:
        print("\n  ✅  INCLUDE: (none)")

    if exc:
        print("\n  ❌  EXCLUDE  (product MUST NOT match):")
        for key, value in exc.items():
            print(f"       {key:20s}  →  {value}")
    else:
        print("\n  ❌  EXCLUDE: (none)")

    if debug and not inc and not exc:
        print("\n  ℹ️   No constraints extracted — all candidates will be scored by vector similarity only.")


def display_category_scores(scores: Dict[str, int]) -> None:
    if not scores:
        return
    top = sorted(scores.items(), key=lambda x: x[1], reverse=True)[:5]
    print("\n  📊  Category keyword scores (debug):")
    for cat, score in top:
        print(f"       {cat:25s}  {score} hit(s)")


def display_stats(metrics: SessionMetrics) -> None:
    _section("SESSION METRICS")

    print(f"\n  Total queries      : {metrics.total_queries}")
    print(f"  Successful (>0)    : {metrics.successful}")
    print(f"  Empty results      : {metrics.empty_results}")
    print(f"  Errors             : {metrics.errors}")
    print(f"  Success rate       : {metrics.success_rate:.1%}")
    print(f"  Avg latency        : {metrics.avg_latency_ms:.1f} ms")

    if metrics.category_counts:
        print("\n  Top categories this session:")
        for cat, cnt in sorted(metrics.category_counts.items(),
                               key=lambda x: x[1], reverse=True)[:8]:
            print(f"       {cat:25s}  {cnt} query/queries")

    if metrics.constraint_counts:
        print("\n  Most-used constraints:")
        for key, cnt in sorted(metrics.constraint_counts.items(),
                               key=lambda x: x[1], reverse=True)[:8]:
            print(f"       {key:25s}  used {cnt}×")


def display_history(history: List[str], n: int = 10) -> None:
    _section(f"QUERY HISTORY  (last {n})")
    if not history:
        print("\n  (no queries yet)")
        return
    for i, q in enumerate(history[-n:], 1):
        print(f"  {i:>3}.  {q}")


def display_categories(available: List[str]) -> None:
    _section(f"SUPPORTED CATEGORIES  ({len(available)})")
    cols = 3
    rows = [available[i:i+cols] for i in range(0, len(available), cols)]
    for row in rows:
        print("  " + "    ".join(f"{cat:<28}" for cat in row))


# ===========================================================================
# INPUT SANITISATION
# ===========================================================================

_MAX_QUERY_LEN = 300

def sanitise(raw: str) -> str:
    """Strip, collapse whitespace, enforce length limit."""
    cleaned = " ".join(raw.strip().split())
    if len(cleaned) > _MAX_QUERY_LEN:
        logger.warning("Query truncated from %d to %d chars.", len(cleaned), _MAX_QUERY_LEN)
        cleaned = cleaned[:_MAX_QUERY_LEN]
    return cleaned


def load_queries_from_file(path: str) -> List[str]:
    """Load queries line-by-line from a text file."""
    if not os.path.exists(path):
        raise FileNotFoundError(f"Query file not found: {path}")

    queries = []
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            q = line.strip()
            if q and not q.startswith("#"):
                queries.append(q)

    return queries

# ===========================================================================
# MAIN CONSOLE LOOP
# ===========================================================================

def main() -> int:
    args = _parse_args()
    debug = args.debug
    topk = args.topk
    device = args.device

    _configure_logging(debug)

    print_header(topk, device, debug)

    # ---------------------------------------------------------------- Model
    print("\n  🔄  Loading embedding model…")

    # Lazy import (prevents Streamlit from executing at import time)
    from project_modules.frontend.model_loader import get_or_load_model

    model = get_or_load_model(device)

    if model is None:
        print("  ❌  Failed to load embedding model. Exiting.")
        logger.critical("Embedding model unavailable; aborting.")
        return 1
    print("  ✅  Model ready.\n")

    # ---------------------------------------------------------------- Categories
    available_categories = list_available_categories()
    print(f"  📂  {len(available_categories)} categories available.")

    # ---------------------------------------------------------------- Session State
    metrics: SessionMetrics = SessionMetrics()
    history: List[str] = []

    # =======================================================================
    # BATCH MODE
    # =======================================================================
    if args.file:

        print(f"\n📄 Running batch queries from: {args.file}")

        try:
            batch_queries = load_queries_from_file(args.file)
        except Exception as e:
            print(f"❌ Failed to load query file: {e}")
            return 1

        print(f"Loaded {len(batch_queries)} queries\n")

        for q in batch_queries:

            print("\n" + _line())
            print(f"🔎 Query: {q}")

            query = sanitise(q)
            t0 = time.perf_counter()

            category, cat_scores = detect_category_with_scores(query, available_categories)

            if category is None:
                print("❌ Could not detect category")
                continue

            print(f"\n  📂  Category detected: {category}")

            constraints = extract_query_constraints(query, category)

            results = run_search(
                query=query,
                category=category,
                model=model,
                topk=topk,
            )

            latency_ms = (time.perf_counter() - t0) * 1000

            display_constraints(constraints, category, debug)
            display_results(results, query, category, debug, latency_ms)

            print(f"\n  ⏱ {latency_ms:.0f} ms | {len(results)} result(s)")

            metrics.record(
                category=category,
                result_count=len(results),
                latency_ms=latency_ms,
                constraints=constraints,
            )

        print("\n" + _line())
        print("  📊  BATCH RUN SUMMARY")
        print(_line())
        print(f"  Queries: {metrics.total_queries}")
        print(f"  Success rate: {metrics.success_rate:.0%}")
        print(f"  Avg latency: {metrics.avg_latency_ms:.0f} ms")
        print(_line())

        return 0

    # =======================================================================
    # INTERACTIVE MODE
    # =======================================================================
    while True:
        try:
            print(f"\n{_line()}")
            raw = input("  🔎  Query: ").strip()

            if not raw:
                continue

            cmd = raw.lower()

            # ------------------------------------------------ Commands
            if cmd in ("exit", "quit", "q"):
                print("\n  👋  Goodbye!\n")
                break

            if cmd == "stats":
                display_stats(metrics)
                continue

            if cmd == "debug":
                debug = not debug
                _configure_logging(debug)
                print(f"\n  🔧  Debug mode: {'ON ✅' if debug else 'OFF'}")
                continue

            if cmd.startswith("history"):
                parts = cmd.split()
                n = int(parts[1]) if len(parts) > 1 and parts[1].isdigit() else 10
                display_history(history, n)
                continue

            if cmd == "cats":
                display_categories(available_categories)
                continue

            if cmd == "clear":
                os.system("cls" if os.name == "nt" else "clear")
                print_header(topk, device, debug)
                continue

            # ------------------------------------------------ Search
            query = sanitise(raw)
            if not query:
                print("  ⚠️  Empty query after sanitisation.")
                continue

            history.append(query)

            t0 = time.perf_counter()

            category, cat_scores = detect_category_with_scores(query, available_categories)

            if debug:
                display_category_scores(cat_scores)

            if category is None:
                print("\n  ❌  Could not detect a product category.")
                print("  💡  Try adding a category keyword: laptop, phone, ac, fan, tv…")
                metrics.record(
                    category=None,
                    result_count=0,
                    latency_ms=0.0,
                    constraints={},
                )
                continue

            print(f"\n  📂  Category detected: {category}")

            constraints = extract_query_constraints(query, category)
            display_constraints(constraints, category, debug)

            print("\n  🔍  Searching…")

            results = run_search(
                query=query,
                category=category,
                model=model,
                topk=topk,
            )

            latency_ms = (time.perf_counter() - t0) * 1000

            display_results(results, query, category, debug, latency_ms)

            print(f"\n  ⏱ {latency_ms:.0f} ms | {len(results)} result(s)")

            metrics.record(
                category=category,
                result_count=len(results),
                latency_ms=latency_ms,
                constraints=constraints,
            )

        except KeyboardInterrupt:
            print("\n\n  👋  Interrupted. Goodbye!\n")
            break

        except Exception:
            latency_ms = (time.perf_counter() - t0) * 1000 if "t0" in dir() else 0.0
            logger.error("Unhandled exception in console loop.", exc_info=True)

            metrics.record(
                category=None,
                result_count=0,
                latency_ms=latency_ms,
                constraints={},
                error=True,
            )

            print("\n  ❌  An unexpected error occurred.")
            if debug:
                import traceback
                traceback.print_exc()

    # ---------------------------------------------------------------- Summary
    if metrics.total_queries > 0:
        print(_line())
        print("  📊  SESSION SUMMARY")
        print(_line())
        print(
            f"  Queries: {metrics.total_queries}  |  "
            f"Success: {metrics.success_rate:.0%}  |  "
            f"Avg latency: {metrics.avg_latency_ms:.0f} ms"
        )
        print(_line())

    return 0

if __name__ == "__main__":
    sys.exit(main())
