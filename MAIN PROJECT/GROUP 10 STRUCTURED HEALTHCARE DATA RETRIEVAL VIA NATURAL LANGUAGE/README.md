# NL-to-SPARQL (Health Knowledge Graph)

## Overview

**NL-to-SPARQL** is a research-oriented mini project that enables querying a
**health knowledge graph (KG)** using natural language and SPARQL.
The system focuses on **diseases, symptoms, and drug indications**, with strict
attention to **open-data licensing**.

The project combines:
- RDF-based knowledge graphs
- Apache Jena Fuseki
- SPARQL querying
- Synthetic data generation for experimentation

---

## Data Source (v1 Scope)

To avoid licensing constraints, **Version 1** relies **exclusively on Wikidata**.

- Diseases, symptoms, and drugs are derived only from Wikidata items
- SNOMED CT is **not used** until a license is arranged
- External identifiers (SNOMED, ICD, DrugBank, etc.) are stored **only if already present in Wikidata**
- Licensing remains under **Wikidata’s CC0 license**

---

## Knowledge Graph Model

The health KG is modeled using RDF triples:

```text
(Disease) ── hasSymptom ──> (Symptom)
(Medication) ── treats ──> (Symptom)
```

---

## Running Apache Jena Fuseki

Load the dataset with the name healthkg.
The SPARQL endpoint must be available at:

`http://localhost:3030/healthkg/sparql
`

All application queries are executed against this endpoint.
⚠️ Ensure Fuseki is running before starting the frontend.

---

## Running the Synthetic Data Generator

Due to limited open medical datasets, synthetic data is used.
Run the synthesizer using:

`python -m synthesizer.main`


This will:
- Generate dummy disease–symptom–drug relationships
- Output RDF compatible with the existing KG ontology
- Enable safe experimentation without patient data

---

## Features

- Natural Language → SPARQL workflow
- Direct SPARQL query execution
- Drug recommendation based on disease input
- RDF-based health knowledge graph
- License-safe data usage
- Synthetic data generation