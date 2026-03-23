import chromadb
from langchain_community.embeddings import OllamaEmbeddings

chroma_client = chromadb.PersistentClient(path="./chroma")
embed = OllamaEmbeddings(model="nomic-embed-text")

player_messages = chroma_client.get_or_create_collection(
    name="player_messages", embedding_function=embed
)

def add_player_message(text, metadata, msg_id):
    player_messages.add(
        documents=[text],
        metadatas=[metadata],
        ids=[msg_id]
    )

def query_player_messages(query, filters, k=5):
    return player_messages.query(
        query_texts=[query],
        n_results=k,
        where=filters
    )
