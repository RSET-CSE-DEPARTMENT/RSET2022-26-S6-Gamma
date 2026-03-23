import faiss
import numpy as np
from sentence_transformers import SentenceTransformer
import re

print("Loading embedding model...")
embedder = SentenceTransformer("all-MiniLM-L6-v2")


# --------------------------------------------------
# Load and chunk the knowledge base
# Handles both \n\n paragraph breaks AND titled sections
# like "Mutual Funds\n\nA mutual fund is..."
# --------------------------------------------------
def load_knowledge(path="finance_knowledge.txt"):
    with open(path, "r", encoding="utf-8") as f:
        raw = f.read()

    # Normalize line endings
    raw = raw.replace("\r\n", "\n").replace("\r", "\n")

    # Split on blank lines (one or more)
    raw_chunks = re.split(r"\n{2,}", raw)

    chunks = []
    current_title = None

    for chunk in raw_chunks:
        chunk = chunk.strip()
        if not chunk:
            continue

        lines = chunk.split("\n")

        # Detect a title line: short, no period, title-cased or all-caps
        if len(lines) == 1 and len(chunk) < 80 and not chunk.endswith("."):
            current_title = chunk
            continue

        # If chunk is too short (under 60 chars), skip
        if len(chunk) < 60:
            continue

        # Prepend title to chunk for better semantic matching
        if current_title:
            enriched = f"{current_title}: {chunk}"
            current_title = None
        else:
            enriched = chunk

        chunks.append(enriched)

    # Fallback: if chunking produced very few results, split by single newlines
    if len(chunks) < 5:
        print("WARNING: Few chunks found with paragraph splitting. Falling back to line splitting.")
        chunks = [
            line.strip() for line in raw.split("\n")
            if len(line.strip()) > 60
        ]

    print(f"Total chunks loaded: {len(chunks)}")
    for i, c in enumerate(chunks[:5]):
        print(f"  Chunk {i}: {c[:100]}...")

    return chunks


knowledge_chunks = load_knowledge()
print(f"RAG index: {len(knowledge_chunks)} chunks ready")

# --------------------------------------------------
# Build FAISS index
# --------------------------------------------------
embeddings = embedder.encode(knowledge_chunks, show_progress_bar=False)
dimension = embeddings.shape[1]

index = faiss.IndexFlatL2(dimension)
index.add(np.array(embeddings).astype("float32"))

print("RAG index ready")


# --------------------------------------------------
# Retrieve top-k most relevant chunks with threshold
# --------------------------------------------------
def retrieve_context(query: str, k: int = 3, threshold: float = 1.2) -> str:
    query_vec = embedder.encode([query])
    distances, indices = index.search(
        np.array(query_vec).astype("float32"), k * 2  # Get more candidates
    )

    results = []
    print(f"\nRAG query: '{query}'")
    
    for rank, (idx, dist) in enumerate(zip(indices[0], distances[0])):
        if idx < len(knowledge_chunks) and dist < threshold:
            chunk = knowledge_chunks[idx]
            print(f"  Rank {rank+1} (dist={dist:.2f}): {chunk[:80]}...")
            results.append(chunk)
        
        # Also log rejected chunks for debugging
        elif idx < len(knowledge_chunks):
            print(f"  Rejected (dist={dist:.2f} > {threshold}): {knowledge_chunks[idx][:80]}...")
    
    # If no chunks meet threshold, try with higher k
    if not results and k < 5:
        print(f"No chunks within threshold {threshold}, trying with higher k...")
        return retrieve_context(query, k=5, threshold=threshold * 1.2)
    
    # If still no results, take the closest one with a warning
    if not results and len(indices[0]) > 0 and indices[0][0] < len(knowledge_chunks):
        print(f"WARNING: No chunks within threshold, using closest match")
        closest = knowledge_chunks[indices[0][0]]
        results = [f"[Limited information] {closest}"]
    
    return "\n\n".join(results)