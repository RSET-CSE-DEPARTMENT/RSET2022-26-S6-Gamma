#backend/graph_sync.py

# ============================================================
# GRAPH SYNC + EXPLANATION LAYER (Neo4j)
# Industrial-Grade (Lazy Driver + Safe Sessions)
# ============================================================

from typing import List, Dict

from .category_config import CATEGORY_GRAPH_SCHEMA, KNOWN_BRANDS
from .parsers import (
    parse_ram,
    parse_gpu,
    parse_ton,
    parse_star,
    parse_watt,
    parse_resolution,
    extract_ram_and_storage
)
from .logging_config import logger
from .graph_config import get_neo4j_driver


# ============================================================
# INTERNAL BATCH WRITE
# ============================================================

def _write_batch(tx, rows):

    tx.run(
    """
    UNWIND $rows AS row

    MERGE (p:Product {title: row.title})
    SET p.last_updated = timestamp()

    MERGE (c:Category {name: row.category})
    MERGE (p)-[:BELONGS_TO]->(c)

    MERGE (b:Brand {name: coalesce(row.brand, "Unknown")})
    MERGE (p)-[:HAS_BRAND]->(b)

    WITH p, row

    // --------------------------------------------
    // PRICE
    // --------------------------------------------
    FOREACH (_ IN CASE WHEN row.price IS NOT NULL THEN [1] ELSE [] END |
        MERGE (pr:Price {amount: row.price})
        MERGE (p)-[:HAS_PRICE]->(pr)
    )

    // --------------------------------------------
    // GENERIC ATTRIBUTE WRITER
    // --------------------------------------------
    WITH p, row

    UNWIND keys(row.attributes) AS attr_key

    WITH p, attr_key, row.attributes[attr_key] AS attr_val

    WHERE attr_val IS NOT NULL

    MERGE (a:Attribute {
        label: attr_key,
        value: attr_val
    })

    MERGE (p)-[:HAS_ATTRIBUTE {type: attr_key}]->(a)

    """,
    rows=rows
    )

# ============================================================
# PRODUCT SYNC
# ============================================================

def sync_products_to_graph(products: List[Dict], category: str):

    if not products:
        return

    driver = get_neo4j_driver()

    # Graph disabled → skip
    if not driver:
        return

    rows = []

    schema = CATEGORY_GRAPH_SCHEMA.get(category, {})
    relations = schema.get("relations", [])

    # attribute extractor registry
    attribute_extractors = {
        "ram": lambda t: parse_ram(t),
        "gpu": lambda t: parse_gpu(t),
        "tonnage": lambda t: parse_ton(t),
        "star_rating": lambda t: parse_star(t),
        "power": lambda t: parse_watt(t),
        "resolution": lambda t: parse_resolution(t),
        "storage": lambda t: extract_ram_and_storage(t)[1]
    }

    for p in products:

        meta = p.get("meta", {})
        title = p.get("title", "")

        text = f"{title} {meta.get('description','')}".lower()

        # -----------------------------------------
        # Detect brand
        # -----------------------------------------
        brand = next((b for b in KNOWN_BRANDS if b in text), None)

        # -----------------------------------------
        # Extract attributes dynamically
        # -----------------------------------------
        attributes = {}

        for field, _, _, _ in relations:

            extractor = attribute_extractors.get(field)

            if extractor:
                try:
                    attributes[field] = extractor(text)
                except Exception:
                    attributes[field] = None
            else:
                attributes[field] = None

        # -----------------------------------------
        # Row structure expected by _write_batch
        # -----------------------------------------
        row = {
            "title": title,
            "category": category,
            "brand": brand,
            "price": meta.get("resolved_price"),
            "attributes": attributes
        }

        rows.append(row)

    try:

        with driver.session(database="neo4j") as session:
            session.execute_write(_write_batch, rows)

    except Exception as e:

        logger.warning(f"Graph sync failed: {e}")

        
# ============================================================
# RANKING VIEW SYNC
# ============================================================

def sync_ranking_view_to_graph(query: str,
                               results: List[Dict],
                               category: str):

    if not results:
        return

    rows = []

    for rank, r in enumerate(results, 1):
        rows.append({
            "title": r["title"],
            "rank": rank,
            "score": float(r.get("merged_score", 0.0))
        })

    def write_tx(tx):
        tx.run("""
        MERGE (q:Query {text: $query_text})
          ON CREATE SET q.created_at = timestamp()
        SET q.last_updated = timestamp()

        WITH q
        OPTIONAL MATCH (q)-[old:RECOMMENDS|TOP_RECOMMENDATION]->()
        DELETE old

        WITH q
        UNWIND $rows AS row

        MERGE (p:Product {title: row.title})

        FOREACH (_ IN CASE WHEN row.rank = 1 THEN [1] ELSE [] END |
            MERGE (q)-[r:TOP_RECOMMENDATION]->(p)
            SET r.rank = row.rank,
                r.score = row.score,
                r.category = $category,
                r.timestamp = timestamp()
        )

        FOREACH (_ IN CASE WHEN row.rank <> 1 THEN [1] ELSE [] END |
            MERGE (q)-[r:RECOMMENDS]->(p)
            SET r.rank = row.rank,
                r.score = row.score,
                r.category = $category,
                r.timestamp = timestamp()
        )
        """, query_text=query, rows=rows, category=category)

    try:
        driver = get_neo4j_driver()
        with driver.session(database="neo4j") as session:
            session.execute_write(write_tx)

    except Exception as e:
        logger.warning(f"Ranking graph sync failed: {e}")


# ============================================================
# FETCH STRUCTURED FACTS
# ============================================================

def fetch_graph_facts(product_title: str, category: str) -> Dict:

    schema = CATEGORY_GRAPH_SCHEMA.get(category, {})
    relations = schema.get("relations", [])

    if not relations:
        return {}

    optional_matches = []
    aggregation_fields = []

    for field, label, rel_type, prop in relations:
        var = f"{field}_node"

        optional_matches.append(
            f"OPTIONAL MATCH (p)-[:{rel_type}]->({var}:{label})"
        )

        aggregation_fields.append(
            f"collect(DISTINCT {var}.{prop})[0] AS {field}"
        )

    query = f"""
    MATCH (p:Product {{title: $title}})
    OPTIONAL MATCH (p)-[:HAS_BRAND]->(b:Brand)
    {' '.join(optional_matches)}
    RETURN p.title AS title,
           b.name AS brand,
           {', '.join(aggregation_fields)}
    """

    try:
        driver = get_neo4j_driver()
        with driver.session(database="neo4j") as session:
            record = session.run(query, title=product_title).single()
            return dict(record) if record else {}

    except Exception as e:
        logger.warning(f"Graph fetch failed: {e}")
        return {}


# ============================================================
# VISUALIZATION QUERY
# ============================================================

def generate_visualization_query(query_text: str) -> str:

    safe_query = query_text.replace('"', '\\"')

    return f"""
MATCH (q:Query {{text: "{safe_query}"}})
MATCH (q)-[r:TOP_RECOMMENDATION|RECOMMENDS]->(p)
RETURN q, r, p
ORDER BY r.rank ASC
"""