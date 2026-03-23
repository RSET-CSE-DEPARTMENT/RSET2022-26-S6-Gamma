from flask import Flask, request, jsonify, render_template
from gpt4all import GPT4All
from pymongo import MongoClient
from datetime import datetime, timezone
from sentence_transformers import SentenceTransformer
import numpy as np
import spacy
import time
import requests
from nltk.translate.bleu_score import sentence_bleu, SmoothingFunction
import re
from flask_cors import CORS


app = Flask(__name__)  # You can omit template_folder if you're not using HTML templates
CORS(app)  # Enable CORS

# ✅ Load AI Model
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
dot_assessment_collection = db["assess_dot"]
cos_assessment_collection = db["assess_cos"]

# ✅ Email Collection in the 'email_db' database
email_db = client["email_db"]
email_collection = email_db["emails"]

# ✅ Load pre-trained embedding model
embedding_model = SentenceTransformer('all-MiniLM-L6-v2')

# ✅ Load spaCy NLP Model
nlp = spacy.load("en_core_web_sm")

# ✅ Email Fetching API Endpoint
EMAIL_API_URL = "http://127.0.0.1:5001/fetch_emails"

# 📩 **Fetch Emails If Needed (Strictly Matches Dates First)**
def fetch_emails_if_needed(message):
    email_keywords = ["unread emails", "latest email", "recent messages", "inbox", "gmail", "meeting"]
    
    if any(kw in message.lower() for kw in email_keywords):
        try:
            response = requests.get(f"{EMAIL_API_URL}?query=unread&max_emails=10")
            if response.status_code == 200:
                emails = response.json()

                # Extract date and filter emails based on the extracted dates
                doc = nlp(message)
                extracted_dates = {ent.text.lower() for ent in doc.ents if ent.label_ == "DATE"}
                
                date_matched_emails = [
                    email for email in emails
                    if any(date in (email["key_details"].get("dates", [])) for date in extracted_dates)
                ]

                return date_matched_emails if date_matched_emails else emails
        except Exception as e:
            print(f"❌ Email Fetch Error: {e}")
    
    return []

# 🔎 **Retrieve Relevant Messages (Dynamic Handling for Person Names)**
def get_relevant_messages(user_id, query, num_results=5, threshold=0.4):
    recent_messages = list(message_collection.find({"user_id": user_id}).sort("timestamp", -1))
    
    if not recent_messages:
        return []

    message_texts = [msg["message"] for msg in recent_messages if msg["message"] != query]
    if not message_texts:
        return ["No relevant messages found."]
    
    # Extract name dynamically if mentioned in query, especially after phrases like 'meeting with'
    name = None
    if "meeting with" in query.lower():
        # Extract name after 'meeting with'
        name_start = query.lower().find("meeting with") + len("meeting with")
        name = query[name_start:].strip()

    # If name is extracted, try to fetch messages related to that name
    if name:
        relevant_messages = [msg for msg in recent_messages if name.lower() in msg["message"].lower()]
        if relevant_messages:
            return [msg["message"] for msg in relevant_messages]

    # If no name found, fall back to embedding-based search
    query_embedding = embedding_model.encode(query)
    message_embeddings = embedding_model.encode(message_texts)
    
    similarities = np.dot(message_embeddings, query_embedding)

    doc = nlp(query)
    extracted_dates = {ent.text.lower() for ent in doc.ents if ent.label_ == "DATE"}

    # ✅ Prefer messages with exact date matches
    exact_date_matches = [msg for msg in message_texts if any(date in msg.lower() for date in extracted_dates)]

    if exact_date_matches:
        return exact_date_matches  # ✅ Return exact matches first

    relevant_indices = [i for i, sim in enumerate(similarities) if sim > threshold]
    ranked_indices = sorted(relevant_indices, key=lambda i: similarities[i], reverse=True)[:num_results]

    seen_messages = set()
    relevant_messages = []

    for i in ranked_indices:
        msg = message_texts[i]
        if msg.lower().strip() not in seen_messages:
            relevant_messages.append(msg)
            seen_messages.add(msg.lower().strip())

    return relevant_messages

def calculate_bleu(reference_texts, candidate_text):
    reference_sentences = [ref.split() for ref in reference_texts if ref.strip()]
    candidate_sentence = candidate_text.split()

    if not reference_sentences:
        return 0.0

    smoothing = SmoothingFunction().method1
    return sentence_bleu(reference_sentences, candidate_sentence, smoothing_function=smoothing)

# 🎯 **AI Prediction Endpoint**
@app.route('/predict_context', methods=['POST'])
def predict_context():
    if model is None:
        return jsonify({"error": "AI Model failed to load"}), 500

    data = request.json
    user_message = data.get("message", "").strip()
    user_id = data.get("user_id", "12345")

    if not user_message:
        return jsonify({"error": "Message is required"}), 400

    start_time = time.time()

    # ✅ Fetch relevant messages & emails
    retrieved_context = "\n".join(get_relevant_messages(user_id, user_message))
    fetched_emails = fetch_emails_if_needed(user_message)

    email_context = "\n".join([
        f"📧 From: {email['sender']}\n"
        f"📝 Subject: {email['subject']}\n"
        f"🏢 Organizations: {', '.join(email.get('key_details', {}).get('organizations', []))}\n"
        f"📅 Dates: {', '.join(email.get('key_details', {}).get('dates', []))}\n"
        f"⏰ Times: {', '.join(email.get('key_details', {}).get('times', []))}\n"
        for email in fetched_emails
    ]) if fetched_emails else "No relevant emails found."

    # ✅ Skip AI if emails provide enough context
    if fetched_emails:
        response = f"You have {len(fetched_emails)} relevant email(s):\n\n" + email_context
    else:
        prompt = f"""
        You are an intelligent AI assistant. Answer concisely using only relevant information.

        🔎 **Previous Messages:**
        {retrieved_context or 'No relevant previous messages found.'}

        📧 **Email Context:**
        {email_context or 'No relevant emails found.'}

        **User Query:** "{user_message}"
        **Assistant Response:** 
        """

        response = model.generate(prompt).strip()

    end_time = time.time()

    # ✅ Evaluation Metrics
    latency = end_time - start_time

    # ✅ BLEU Score Calculation
    previous_responses = [msg["predicted_context"] for msg in message_collection.find({"user_id": user_id}).limit(5)]
    bleu_score = calculate_bleu(previous_responses, response)

    # ✅ Compute Both Similarities
    user_embedding = embedding_model.encode(user_message)
    response_embedding = embedding_model.encode(response)
    context_embedding = embedding_model.encode(retrieved_context) if retrieved_context else np.zeros_like(response_embedding)

    dot_confidence = np.dot(user_embedding, response_embedding)
    dot_relevance = np.dot(response_embedding, context_embedding) if retrieved_context else 0.0

    cos_confidence = dot_confidence / (np.linalg.norm(user_embedding) * np.linalg.norm(response_embedding))
    cos_relevance = dot_relevance / (np.linalg.norm(response_embedding) * np.linalg.norm(context_embedding)) if retrieved_context else 0.0

    # Save the conversation for follow-up purposes
    message_collection.insert_one({
        "user_id": user_id,
        "message": user_message,
        "predicted_context": response,
        "timestamp": datetime.now(timezone.utc)
    })

    return jsonify({
        "message": user_message,
        "retrieved_context": retrieved_context,
        "email_context": email_context,
        "predicted_context": response,
        "evaluation": {
            "latency": float(latency),
            "bleu_score": float(bleu_score),
            "dot_confidence_score": float(dot_confidence),
            "dot_response_relevance": float(dot_relevance),
            "cos_confidence_score": float(cos_confidence),
            "cos_response_relevance": float(cos_relevance)
        },
        "status": "Stored in MongoDB"
    })

# 🎯 **Follow-Up Endpoint**
@app.route('/follow_up', methods=['POST'])
def follow_up():
    data = request.get_json()
    user_id = data['user_id']
    message = data['message']
    
    # Extract the name from the message (we'll assume the name is part of the message)
    name = extract_name_from_message(message)
    
    if not name:
        return jsonify({
            "follow_up": "Sorry, I couldn't find a name to check the meeting for.",
            "message": message
        })
    
    # Search MongoDB for the name and retrieve meeting details (case-insensitive search)
    meeting_info = email_collection.find_one({
        "key_details.people": {"$regex": f"^{name}$", "$options": "i"}  # Case-insensitive regex search
    })
    
    if meeting_info:
        # Extract meeting date and time
        date = meeting_info['key_details']['dates'][0] if 'dates' in meeting_info['key_details'] else 'No date found'
        time = meeting_info['key_details']['times'][0] if 'times' in meeting_info['key_details'] else 'No time found'
        
        follow_up_response = f"You have a meeting with {name} on {date} at {time}."
    else:
        follow_up_response = f"No meeting found with {name}."

    # Store the follow-up response in the 'messages' collection
    message_collection.insert_one({
        "user_id": user_id,
        "message": message,
        "predicted_context": follow_up_response,
        "timestamp": datetime.now(timezone.utc)
    })

    return jsonify({
        "follow_up": follow_up_response,
        "message": message
    })


def extract_name_from_message(message):
    # Improved name extraction: extract text after "meeting with" in a case-insensitive manner
    if "meeting with" in message.lower():
        start_idx = message.lower().find("meeting with") + len("meeting with")
        person_name = message[start_idx:].strip()
        
        # Ensure the name is properly formatted (capitalize it properly)
        return person_name.capitalize()  # Capitalizing the name
    return None


# Run the Flask app
if __name__ == '__main__':
    app.run(debug=True)
