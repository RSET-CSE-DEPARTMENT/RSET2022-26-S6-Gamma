# backend/ingredient_extraction_api.py
from flask import Flask, request, jsonify
from transformers import AutoTokenizer, AutoModelForTokenClassification
from transformers import pipeline
import torch

app = Flask(__name__)

# Load NER model for ingredient extraction
tokenizer = AutoTokenizer.from_pretrained("dslim/bert-base-NER")
model = AutoModelForTokenClassification.from_pretrained("dslim/bert-base-NER")
ner_pipeline = pipeline("ner", model=model, tokenizer=tokenizer, aggregation_strategy="simple")

@app.route('/extract_ingredients', methods=['POST'])
def extract_ingredients_api():
    data = request.get_json()
    transcription = data.get('transcription')
    
    if not transcription:
        return jsonify({"error": "No transcription provided"}), 400
    
    try:
        ingredients = extract_ingredients(transcription)
        return jsonify({
            "success": True,
            "ingredients": ingredients
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

def extract_ingredients(transcription_text):
    """
    Extract food ingredients from transcription text using BERT NER model
    """
    # Get named entities from the transcription
    entities = ner_pipeline(transcription_text)
    
    # Filter for likely ingredients
    # This is a basic implementation - you may need to refine it based on your specific needs
    ingredients = []
    food_related_entities = ["MISC", "ORG", "PRODUCT"]  # Relevant entity types for food
    
    for entity in entities:
        if entity["entity_group"] in food_related_entities:
            # Check if the entity might be a food ingredient
            # This is where you might want to add more sophisticated filtering
            ingredients.append({
                "name": entity["word"],
                "confidence": round(float(entity["score"]), 3)
            })
    
    # Remove duplicates while maintaining order
    unique_ingredients = []
    seen = set()
    for item in ingredients:
        if item["name"].lower() not in seen:
            seen.add(item["name"].lower())
            unique_ingredients.append(item)
    
    return unique_ingredients

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5002)