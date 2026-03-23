# backend/graph_config.py

from dotenv import load_dotenv
load_dotenv()

import os
from neo4j import GraphDatabase
from .logging_config import logger

NEO4J_URI = os.getenv("NEO4J_URI")
NEO4J_USER = os.getenv("NEO4J_USER")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD")

_neo4j_driver = None


def get_neo4j_driver():
    """
    Lazy and fail-safe Neo4j driver initializer.

    Returns:
        Neo4j driver if credentials are available.
        None if graph is not configured.
    """

    global _neo4j_driver

    # already initialized
    if _neo4j_driver is not None:
        return _neo4j_driver

    # graph disabled
    if not all([NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD]):
        logger.warning("Neo4j credentials not set. Graph features disabled.")
        return None

    try:
        driver = GraphDatabase.driver(
            NEO4J_URI,
            auth=(NEO4J_USER, NEO4J_PASSWORD)
        )

        # verify connection
        driver.verify_connectivity()

        _neo4j_driver = driver

        logger.info("Neo4j driver initialized successfully.")

        return _neo4j_driver

    except Exception as e:

        logger.error("Neo4j driver initialization failed: %s", e)

        return None