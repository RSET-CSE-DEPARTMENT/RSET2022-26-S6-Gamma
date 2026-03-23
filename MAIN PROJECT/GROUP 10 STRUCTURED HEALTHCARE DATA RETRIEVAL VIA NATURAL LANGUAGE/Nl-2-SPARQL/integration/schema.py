from rdflib import Namespace, Graph
from .utils import *

def new_graph():
    g = Graph()
    g.bind("ex", EX)
    return g