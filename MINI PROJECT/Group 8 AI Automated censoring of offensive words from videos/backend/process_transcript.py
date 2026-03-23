import json
import os
import torch
from transformers import AutoModelForSequenceClassification, AutoTokenizer

#  Custom Tokenizer Function
def custom_tokenize(text):
    text = text.lower()
    for punct in ".,!?;:'\")]}-_":
        text = text.replace(punct, ' ')
    for punct in "[({\"-_":
        text = text.replace(punct, ' ')
    return [word for word in text.split() if word]

#  Load NLP Model
MODEL_DIR = "C:/Users/91994/Desktop/cleanvid/cleanvid-repo/backend/offensive_word_model-main"
TOKENIZER = AutoTokenizer.from_pretrained(MODEL_DIR)
NLP_MODEL = AutoModelForSequenceClassification.from_pretrained(MODEL_DIR).to("cpu")

def detect_offensive_words(text, words, threshold=0.7):
    """Detects offensive words and replaces them in the text"""
    censored_text = text
    offensive_words = []
    
    for word_data in words:
        word = word_data["word"]
        start_time = word_data["start"]
        end_time = word_data["end"]

        # Tokenize and classify word
        inputs = TOKENIZER(word, return_tensors="pt")
        with torch.no_grad():
            logits = NLP_MODEL(**inputs).logits
        scores = torch.softmax(logits, dim=1)[0].tolist()
        offensive_prob = scores[1]

        if offensive_prob >= threshold:
            censored_text = censored_text.replace(word, "****")
            offensive_words.append({
                "word": word, "start_time": start_time, "end_time": end_time, "confidence": offensive_prob
            })

    #  Save Output
    BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))  # Move up one level
    PROCESSED_FOLDER = os.path.join(BASE_DIR, "processed")
    output_json_path = os.path.join(PROCESSED_FOLDER, "offensive_words.json")
    os.makedirs(PROCESSED_FOLDER, exist_ok=True)
    with open(output_json_path, "w", encoding="utf-8") as f:
        json.dump({"censored_text": censored_text, "offensive_words": offensive_words}, f, indent=2)

    return {
        "censored_text": censored_text,
        "offensive_words": offensive_words,
        "output_json": output_json_path
    }
