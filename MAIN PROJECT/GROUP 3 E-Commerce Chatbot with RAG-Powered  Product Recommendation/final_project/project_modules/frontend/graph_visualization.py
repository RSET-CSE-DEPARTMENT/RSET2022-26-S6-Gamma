# frontend/graph_visualization.py

# ============================================================
# GRAPH VISUALIZATION MODULE (Production-Grade)
# Uses Lazy Neo4j Driver
# ============================================================

import math
import streamlit as st
import plotly.graph_objects as go
import networkx as nx

from project_modules.backend.graph_config import get_neo4j_driver


def shorten_title(title: str) -> str:
    """
    Production-safe product title cleaner.

    Keeps the key product name (brand + model)
    and removes long spec sections.
    """

    if not title:
        return ""

    title = title.split("(")[0]
    title = title.split("|")[0]
    title = title.replace("-", " ")

    words = title.strip().split()
    words = words[:4]

    return " ".join(words)


def visualize_product_graph(query_text: str):

    if not query_text:
        st.warning("Invalid query.")
        return

    cypher = """
    MATCH (q:Query {text: $query})
    MATCH (q)-[r:TOP_RECOMMENDATION|RECOMMENDS]->(p:Product)
    RETURN q.text AS query,
           p.title AS product,
           type(r) AS rel_type,
           r.rank AS rank
    ORDER BY rank ASC
    """

    try:
        driver = get_neo4j_driver()

        with driver.session(database="neo4j") as session:
            records = session.run(
                cypher,
                {"query": query_text}
            ).data()

    except Exception as e:
        st.error(f"Graph fetch failed: {e}")
        return

    if not records:
        st.warning("No graph data available.")
        return

    # --------------------------------------------------------
    # Graph Construction
    # --------------------------------------------------------

    G = nx.DiGraph()

    query_node = records[0]["query"]
    G.add_node(query_node, type="query")

    pos = {}

    # Query node slightly above center
    pos[query_node] = (0, 2.5, 0)

    radius = 3

    for i, rec in enumerate(records):

        product = rec["product"]
        rel_type = rec["rel_type"]
        rank = rec["rank"]

        angle = (2 * math.pi / len(records)) * i

        x = radius * math.cos(angle)
        z = radius * math.sin(angle)
        y = 0

        pos[product] = (x, y, z)

        G.add_node(
            product,
            type="top_product" if rel_type == "TOP_RECOMMENDATION" else "other_product",
            rank=rank
        )

        G.add_edge(query_node, product)

    # --------------------------------------------------------
    # Edge Trace
    # --------------------------------------------------------

    edge_x, edge_y, edge_z = [], [], []

    for edge in G.edges():
        x0, y0, z0 = pos[edge[0]]
        x1, y1, z1 = pos[edge[1]]

        edge_x += [x0, x1, None]
        edge_y += [y0, y1, None]
        edge_z += [z0, z1, None]

    edge_trace = go.Scatter3d(
        x=edge_x,
        y=edge_y,
        z=edge_z,
        mode="lines",
        line=dict(width=4, color="#64748b"),
        hoverinfo="none"
    )

    # --------------------------------------------------------
    # Node Trace
    # --------------------------------------------------------

    node_x, node_y, node_z = [], [], []
    node_text, node_color, node_size = [], [], []

    for node in G.nodes():

        x, y, z = pos[node]

        node_x.append(x)
        node_y.append(y)
        node_z.append(z)

        node_type = G.nodes[node]["type"]

        if node_type == "query":

            node_color.append("#ff7f0e")
            node_size.append(55)
            node_text.append("USER QUERY")

        elif node_type == "top_product":

            node_color.append("#2ecc71")
            node_size.append(45)

            short = shorten_title(node)
            node_text.append(f"TOP\n{short}")

        else:

            node_color.append("#3498db")
            node_size.append(35)

            rank = G.nodes[node].get("rank", "?")
            short = shorten_title(node)

            node_text.append(f"#{rank}\n{short}")

    node_trace = go.Scatter3d(
        x=node_x,
        y=node_y,
        z=node_z,
        mode="markers+text",
        text=node_text,
        textposition="bottom center",
        hovertext=list(G.nodes()),
        hoverinfo="text",
        marker=dict(
            size=node_size,
            color=node_color,
            opacity=0.95,
            line=dict(width=2, color="white")
        )
    )

    # --------------------------------------------------------
    # Render
    # --------------------------------------------------------

    fig = go.Figure(data=[edge_trace, node_trace])

    fig.update_layout(

        margin=dict(l=0, r=0, b=0, t=0),

        scene=dict(
            xaxis=dict(visible=False),
            yaxis=dict(visible=False),
            zaxis=dict(visible=False),
            bgcolor="#0f172a"
        ),

        showlegend=False
    )

    st.plotly_chart(fig, use_container_width=True)