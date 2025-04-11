from flask import Flask, request, jsonify
import imaplib
import email
from email.header import decode_header
import spacy  # Import SpaCy
from pymongo import MongoClient
from bson import ObjectId  # Import ObjectId

app = Flask(__name__)

# ✅ Email Credentials (Use App Password for Gmail)
EMAIL_USER = "nickeltin380@gmail.com"
EMAIL_PASS = "stwnbxrerttuaskn"  # Ensure this is secured

# ✅ IMAP Server Configuration
IMAP_SERVER = "imap.gmail.com"
IMAP_PORT = 993  # Use 993 for SSL

# ✅ Load SpaCy English model
nlp = spacy.load("en_core_web_trf")

# 🔹 MongoDB Connection
client = MongoClient("mongodb://localhost:27017/")  # Update with your MongoDB URI if needed
db = client["email_db"]
collection = db["emails"]

def decode_mime_words(value):
    """Safely decode email headers to handle special characters."""
    decoded_parts = decode_header(value)
    return "".join(
        part.decode(charset or "utf-8", errors="ignore") if isinstance(part, bytes) else part
        for part, charset in decoded_parts
    )
from spacy.training import Example
import random

# ✅ Corrected Training Data Format
TRAIN_DATA = [
    ("Your meeting with John is scheduled for 10 AM.", {"entities": [(5, 12, "EVENT")]}),
    ("We have a conference on AI next Monday.", {"entities": [(10, 20, "EVENT")]}),
    ("The workshop on NLP starts tomorrow.", {"entities": [(4, 12, "EVENT")]}),
    ("Don't forget the webinar at 5 PM.", {"entities": [(14, 21, "EVENT")]}),
    ("Join us for the annual tech summit!", {"entities": [(26, 32, "EVENT")]}),
    ("The seminar on cybersecurity is scheduled for next Friday.", {"entities": [(4, 11, "EVENT")]}),
    ("Your interview at Google is on Wednesday.", {"entities": [(5, 13, "EVENT")]}),
    ("There is a hackathon happening this weekend.", {"entities": [(9, 17, "EVENT")]}),
    ("Join the AI conference next month.", {"entities": [(8, 18, "EVENT")]}),
    ("Don't forget our business summit on March 30.", {"entities": [(14, 20, "EVENT")]}),
    
]

# ✅ Fix: Create a `Doc` object for both input text and reference labels
def train_event_model(nlp, train_data):
    ner = nlp.get_pipe("ner")
    ner.add_label("EVENT")

    examples = []
    for text, annotations in train_data:
        doc = nlp.make_doc(text)  # Create a blank doc object
        example = Example.from_dict(doc, annotations)  # Convert annotations properly
        examples.append(example)

    optimizer = nlp.resume_training()
    for _ in range(10):  # Train for 10 iterations
        random.shuffle(examples)
        losses = {}
        nlp.update(examples, drop=0.3, losses=losses, sgd=optimizer)
        print("Losses:", losses)

# ✅ Train the model before extracting events
train_event_model(nlp, TRAIN_DATA)



from spacy.matcher import Matcher

def extract_key_details(text):
    """Extract important details like dates, times, and events using SpaCy and Matcher."""
    doc = nlp(text)

    # Rule-based matching for events
    matcher = Matcher(nlp.vocab)
    event_patterns = [
        [{"LOWER": "meeting"}], 
        [{"LOWER": "conference"}], 
        [{"LOWER": "summit"}],
        [{"LOWER": "webinar"}],
        [{"LOWER": "workshop"}]
    ]
    matcher.add("EVENT", event_patterns)
    matches = matcher(doc)

    events = [doc[start:end].text for match_id, start, end in matches]

    details = {
        "dates": [ent.text for ent in doc.ents if ent.label_ == "DATE"],
        "times": [ent.text for ent in doc.ents if ent.label_ == "TIME"],
        "events": events if events else [ent.text for ent in doc.ents if ent.label_ == "EVENT"],  # Use NER if Matcher fails
        "people": [ent.text for ent in doc.ents if ent.label_ == "PERSON"],
        "organizations": [ent.text for ent in doc.ents if ent.label_ == "ORG"]
    }
    return details


def fetch_emails(query="ALL", max_emails=5):
    """Fetch emails based on user query."""
    try:
        mail = imaplib.IMAP4_SSL(IMAP_SERVER, IMAP_PORT)
        mail.login(EMAIL_USER, EMAIL_PASS)
        mail.select("inbox")

        # Improved query logic for better accuracy
        if query == "UNSEEN":
            status, messages = mail.search(None, '(UNSEEN)')
        elif query == "RECENT":
            status, messages = mail.search(None, '(RECENT)')
        else:
            status, messages = mail.search(None, "ALL")

        email_ids = messages[0].split()
        if not email_ids:
            return []  # No emails found

        emails = []

        # Fetch the latest N emails to ensure recent data
        for email_id in email_ids[-max_emails:]:  
            status, msg_data = mail.fetch(email_id, "(RFC822)")
            for response_part in msg_data:
                if isinstance(response_part, tuple):
                    msg = email.message_from_bytes(response_part[1])
                    subject = decode_mime_words(msg["Subject"])
                    sender = decode_mime_words(msg["From"])

                    # Extract email body
                    body = ""
                    if msg.is_multipart():
                        for part in msg.walk():
                            if part.get_content_type() == "text/plain":
                                body = part.get_payload(decode=True).decode("utf-8", errors="ignore")
                                break
                    else:
                        body = msg.get_payload(decode=True).decode("utf-8", errors="ignore")

                    key_details = extract_key_details(body)

                    # Store tokenized content in MongoDB
                    email_data = {
                        "sender": sender,
                        "subject": subject,
                        "key_details": key_details
                    }
                    result = collection.insert_one(email_data)
                    email_data["_id"] = str(result.inserted_id)  # Convert ObjectId to string

                    emails.append(email_data)

        mail.close()
        mail.logout()
        return emails

    except Exception as e:
        return {"error": str(e)}

@app.route("/fetch_emails", methods=["GET"])
def fetch_emails_api():
    query_type = request.args.get("query", "ALL")
    num_emails = int(request.args.get("max_emails", 5))

    query_map = {
        "unread": "UNSEEN",
        "latest": "RECENT",  # Added RECENT for improved email retrieval
        "all": "ALL",
    }
    query = query_map.get(query_type.lower(), query_type.upper())

    emails = fetch_emails(query, num_emails)
    return jsonify(emails)

if __name__ == "__main__":
    app.run(port=5001, debug=True)