from rdflib import Graph
from .utils import *


def append_triples(graph):

    try:
        existing = Graph()
        existing.parse(NEW_DATA_FILE, format="turtle")

        for triple in graph:
            existing.add(triple)

        existing.serialize(NEW_DATA_FILE, format="turtle")

    except Exception:
        graph.serialize(NEW_DATA_FILE, format="turtle")

    print("Appended triples locally.")
