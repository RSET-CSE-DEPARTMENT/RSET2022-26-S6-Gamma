PROJECT TITLE:
Personalized E-commerce Chatbot with RAG-powered Product Recommendation

---

📌 OVERVIEW
This project is a production-oriented Retrieval-Augmented Generation (RAG) based recommendation system that intelligently suggests products based on user queries. It combines semantic search, structured filtering, and ranking mechanisms to deliver accurate and explainable recommendations across multiple product categories.

The system supports natural language queries such as:

* "laptop with 16GB RAM and NVIDIA GPU"
* "Samsung smartphone under 40k"
* "750W mixer grinder"

---

🚀 KEY FEATURES

✔ Multi-category recommendation system (30+ categories)
✔ Semantic search using Sentence Transformers (E5-large-v2)
✔ Constraint extraction (RAM, GPU, price, brand, etc.)
✔ Hybrid ranking (vector similarity + spec scoring + graph signal)
✔ Intelligent filtering engine with hard + soft constraints
✔ Explainable recommendations
✔ Modular and scalable backend design

---

🧠 SYSTEM ARCHITECTURE

User Query
↓
Category Detection
↓
Constraint Extraction
↓
Embedding-based Retrieval (Top-K candidates)
↓
Filtering Engine (hard + soft constraints)
↓
Ranking Engine (hybrid scoring)
↓
Final Recommendations

---

📂 PROJECT STRUCTURE

Proj_trial_1/
│
├── project_modules/
│   ├── backend/
│   │   ├── search.py
│   │   ├── filters.py
│   │   ├── embeddings.py
│   │   ├── dataset_loader.py
│   │   ├── ranking.py
│   │   ├── query_constraints.py
│   │   ├── category_detection.py
│   │   └── validation.py
│   │
│   └── frontend/
│       ├── recommendation_connector.py
│       └── explanation_engine.py
│
├── data_2/
│   ├── categories/        (CSV datasets)
│   └── embeddings/        (NumPy embeddings)
│
├── pipeline/
│   └── build_embeddings.py
│
├── interactive_console.py
├── UI_interface.py
├── app.py
└── requirements.txt

---

⚙️ INSTALLATION

1. Clone the repository

2. Create virtual environment

   python -m venv venv311
   source venv311/bin/activate

3. Install dependencies

   pip install -r requirements.txt

---

📊 DATASET

* Structured product datasets stored as CSV files
* Each category has its own dataset (e.g., laptops_final.csv)
* Fields include: title, brand, description, ram_gb, gpu_vendor, price, etc.

---

🧬 EMBEDDINGS

Embeddings are generated using:
Model: intfloat/e5-large-v2

To rebuild embeddings:

python pipeline/build_embeddings.py

Embeddings are stored in:
data_2/embeddings/

---

▶️ RUNNING THE SYSTEM

Run interactive console:

python interactive_console.py

Example queries:

laptop with 16GB RAM and nvidia GPU
smartphone under 40000
samsung laptop
750W mixer grinder

---

🔍 CORE MODULES

1. search.py

   * Main RAG pipeline
   * Handles retrieval, filtering, ranking

2. filters.py

   * Applies hard constraints (GPU, RAM, brand)
   * Applies soft scoring and penalties

3. query_constraints.py

   * Extracts structured constraints from natural language

4. dataset_loader.py

   * Loads datasets and embeddings
   * Ensures consistency

5. ranking.py

   * Hybrid scoring (vector + specs + graph signal)

---

📈 SCORING LOGIC

Final recommendation score is based on:

* Vector similarity (semantic relevance)
* Specification match (RAM, GPU, price)
* Intent alignment (e.g., gaming)
* Graph signal (token overlap + feature hints)

---

⚠️ LIMITATIONS

* Performance depends on dataset quality
* GPU detection relies on structured fields
* Embedding quality affects retrieval recall

---

🔮 FUTURE IMPROVEMENTS

* Integrate FAISS for faster retrieval
* Improve GPU/CPU extraction accuracy
* Add user personalization (history-based recommendations)
* Deploy as a web-based chatbot
* Integrate LLM-based explanation generation

---

👨‍💻 AUTHOR

Visal V Menon

Final Year Project
Rajagiri School of Engineering & Technology

---

📌 NOTES

* Designed with production-level modularity
* Emphasis on explainability and robustness
* Suitable for research, demo, and real-world deployment

---
