from flask import Flask, request, jsonify, render_template
from gpt4all import GPT4All
from pymongo import MongoClient
from datetime import datetime, UTC
from sentence_transformers import SentenceTransformer
import numpy as np
import requests
import spacy
import time

app = Flask(__name__, template_folder='templates')

# ✅ Load the AI Model (Use a lighter model for speed)
try:
    model_path = "Meta-Llama-3-8B-Instruct.Q4_0.gguf"
    model = GPT4All(model_path)
    print("✅ Model Loaded Successfully")
except Exception as e:
    print("❌ Model Load Failed:", str(e))
    model = None

# ✅ MongoDB Connection
client = MongoClient("mongodb://localhost:27017/")
db = client["ai_assistant"]
message_collection = db["messages"]
email_collection = client["email_db"]["emails"]

# ✅ Load pre-trained embedding model (for context similarity)
embedding_model = SentenceTransformer('all-MiniLM-L6-v2')

# ✅ Load spaCy NLP Model
nlp = spacy.load("en_core_web_sm")

# ✅ Email Fetching API
EMAIL_API_URL = "http://127.0.0.1:5001/fetch_emails"

# 📩 **Email Fetching Logic**
def fetch_emails_if_needed(message):
    email_trigger_phrases = [
        "unread emails", "latest email", "recent messages",
        "show my inbox", "check my gmail", "read my email"
    ]
    
    if any(phrase in message.lower() for phrase in email_trigger_phrases):
        try:
            response = requests.get(f"{EMAIL_API_URL}?query=unread&max_emails=5")
            if response.status_code == 200:
                fetched_emails = response.json()

                # ✅ Store fetched emails in MongoDB (Prevent duplicates)
                for email in fetched_emails:
                    email_collection.update_one(
                        {"_id": email["_id"]},  
                        {"$set": email},
                        upsert=True
                    )
                return fetched_emails
            else:
                print("❌ Failed to fetch emails.")
                return []
        except Exception as e:
            print(f"❌ Error fetching emails: {e}")
            return []
    return []

# 🔎 **Keyword Extraction for Email Search**
def extract_keywords(query):
    doc = nlp(query)
    return [token.text for token in doc if token.is_alpha and token.is_title]

# 📧 **Enhanced Email Context Retrieval**
def get_relevant_emails(query):
    keywords = extract_keywords(query)
    
    email_results = list(email_collection.find({
        "$or": [
            {"key_details.people": {"$in": keywords}},
            {"key_details.dates": {"$in": keywords}},
            {"key_details.organizations": {"$in": keywords}}
        ]
    }))

    if not email_results:
        return "No relevant emails found."

    return "\n".join([
        f"📧 From: {email['sender']}\n"
        f"📝 Subject: {email['subject']}\n"
        f"🏢 Organizations: {', '.join(email['key_details'].get('organizations', []))}\n"
        f"📅 Dates: {', '.join(email['key_details'].get('dates', []))}\n"
        for email in email_results
    ])

# 🧠 **Context-Based Message Retrieval**
def get_relevant_messages(user_id, query, num_results=5, similarity_threshold=0.4):
    recent_messages = list(message_collection.find({"user_id": user_id}).sort("timestamp", -1))
    if not recent_messages:
        return []

    message_texts = [msg["message"] for msg in recent_messages if msg["message"] != query]

    if not message_texts:
        return ["No relevant messages found."]

    query_embedding = embedding_model.encode(query)
    message_embeddings = embedding_model.encode(message_texts)

    similarities = np.dot(message_embeddings, query_embedding) / (
        np.linalg.norm(message_embeddings, axis=1) * np.linalg.norm(query_embedding)
    )

    if len(query.split()) < 4:
        similarity_threshold = 0.55

    filtered_indices = [i for i in range(len(similarities)) if similarities[i] > similarity_threshold]
    ranked_indices = sorted(filtered_indices, key=lambda i: similarities[i], reverse=True)[:num_results]

    seen_messages = set()
    relevant_messages = []

    for i in ranked_indices:
        msg = message_texts[i]
        if msg.lower().strip() not in seen_messages:
            relevant_messages.append(msg)
            seen_messages.add(msg.lower().strip())

    return relevant_messages

@app.route('/predict_context', methods=['POST'])
def predict_context():
    if model is None:
        return jsonify({"error": "AI Model failed to load"}), 500

    data = request.json
    user_message = data.get("message", "").strip()
    user_id = data.get("user_id", "12345")

    if not user_message:
        return jsonify({"error": "Message is required"}), 400

    # ✅ Fetch previous messages & context
    retrieved_context = "\n".join(get_relevant_messages(user_id, user_message))
    
    # ✅ Fetch emails only if needed
    fetched_emails = fetch_emails_if_needed(user_message)

    # ✅ Retrieve stored emails if fresh ones were not fetched
   # ✅ Improved email response handling
    if fetched_emails:
        email_collection_context = "\n".join([
            f"📧 From: {email['sender']}\n"
            f"📝 Subject: {email['subject']}\n"
            f"🏢 Organizations: {', '.join(email.get('key_details', {}).get('organizations', []))}\n"
            f"📅 Dates: {', '.join(email.get('key_details', {}).get('dates', []))}\n"
            for email in fetched_emails
        ])
    elif email_collection.find_one({}):  # Check if any stored emails exist
        email_collection_context = get_relevant_emails(user_message)
    else:
        email_collection_context = "No new or relevant emails found."



    # ✅ Construct AI prompt
    prompt = f"""
    You are an intelligent AI assistant. Provide precise and relevant responses.
    Avoid unnecessary information or code. If no relevant data is found from MongoDB, respond with:
    "I couldn't find any information on that." If unread email is found then respond with the number of unread emails found. 

    🔎 **Previous Messages:**
    {retrieved_context if retrieved_context else 'No relevant previous messages found.'}

    📧 **Relevant Email Context:**
    {email_collection_context if email_collection_context else 'No relevant emails found.'}

    User Query: "{user_message}"
    Assistant Response:
    """

    response = model.generate(prompt).strip()

    # ✅ Extract the most relevant part of the AI response
    predicted_context = response.split("\n")[0].strip()
    if "Answer:" in predicted_context:
        predicted_context = predicted_context.replace("Answer:", "").strip()

    # ✅ Store message & prediction in MongoDB
    message_data = {
        "user_id": user_id,
        "message": user_message,
        "timestamp": datetime.now(UTC),
        "predicted_context": predicted_context
    }
    message_collection.insert_one(message_data)

    return jsonify({
        "message": user_message,
        "retrieved_context": retrieved_context,
        "fetched_emails": fetched_emails,
        "email_collection_context": email_collection_context,
        "predicted_context": predicted_context,
        "status": "Stored in MongoDB"
    })

# 🌐 **Basic Chat Interface**
@app.route('/')
def index():
    return render_template('index.html')

if __name__ == '__main__':
    try:
        app.run(port=5000, debug=True, use_reloader=False)
    finally:
        if model:
            del model
