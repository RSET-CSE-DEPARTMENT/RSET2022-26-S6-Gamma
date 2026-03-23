from flask import Flask, request, jsonify

from .triple_builder import build_vital_triples, build_stay_triples
from .local_uploader import append_triples
from .remote_uploader import upload_triples
from .validator import validate_vital, validate_stay
from .utils import *

app = Flask(__name__)


@app.route("/api/insert/vital", methods=["POST"])
def vital():

    data = request.json

    if not validate_vital(data):
        return jsonify({"error": "Invalid vital data"}), 400

    graph = build_vital_triples(data)

    append_triples(graph)
    upload_triples(graph)

    return jsonify({"status": "vital added"})


@app.route("/api/insert/stay", methods=["POST"])
def stay():

    data = request.json

    if not validate_stay(data):
        return jsonify({"error": "Invalid stay data"}), 400

    graph = build_stay_triples(data)

    append_triples(graph)
    upload_triples(graph)

    return jsonify({"status": "stay added"})


if __name__ == "__main__":
    app.run(port=5000)