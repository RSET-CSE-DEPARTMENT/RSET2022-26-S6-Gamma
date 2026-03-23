import spacy
from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd

# Dictionary mapping ingredients to potential allergens
allergen_mapping = {
    "butter": "Dairy Allergy/Lactose Intolerance",
    "milk": "Dairy Allergy/Lactose Intolerance",
    "cream": "Dairy Allergy/Lactose Intolerance",
    "cheese": "Dairy Allergy/Lactose Intolerance",
    "yogurt": "Dairy Allergy/Lactose Intolerance",
    
    "flour": "Gluten allergy",
    "wheat": "Gluten allergy",
    "all-purpose flour": "Gluten allergy",
    "bread flour": "Gluten allergy",
    "pastry flour": "Gluten allergy",
    
    "peanut": "Peanut Allergy",
    "peanuts": "Peanut Allergy",
    "peanut butter": "Peanut Allergy",
    
    "tree nut": "Tree Nut Allergy",
    "almonds": "Tree Nut Allergy",
    "walnuts": "Tree Nut Allergy",
    "cashews": "Tree Nut Allergy",
    
    "shellfish": "Shellfish Allergy",
    "shrimp": "Shellfish Allergy",
    "crab": "Shellfish Allergy",
    "lobster": "Shellfish Allergy",
    
    "egg": "Egg Allergy",
    "eggs": "Egg Allergy",
    
    "fish": "Fish Allergy",
    "salmon": "Fish Allergy",
    "tuna": "Fish Allergy",
    
    "soy": "Soy Allergy",
    "soybeans": "Soy Allergy",
    "tofu": "Soy Allergy",
    
    "corn": "Corn Allergy",
    "cornmeal": "Corn Allergy",
    "corn syrup": "Corn Allergy",
    
    "baking powder": "Corn allergy",  # Often contains cornstarch
    
    "vanilla extract": "Alcohol Sensitivity/Corn Allergy",
    "vanilla": "Spice Allergy"
}
df = pd.read_csv("C:/Users/visak/Downloads/allergen_list.csv")

df = pd.read_csv("C:/Users/visak/Downloads/allergen_list.csv")
df["Ingredient"] = df["Ingredient"].str.lower().str.strip()
df["Possible Allergens"] = df["Possible Allergens"].fillna("None").str.strip()

ingredient_set = set(df["Ingredient"])
ingredient_allergen_map = dict(zip(df["Ingredient"], df["Possible Allergens"]))


# Load your custom SpaCy model
nlp = spacy.load("C:\\Project\\saved_model")

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS

def extract_ingredients_and_allergens(text):
    words = text.lower().replace(",", "").replace(".", "").split()
    found_ingredients = set()
    for i in range(len(words)):
        for j in range(i + 1, len(words) + 1):
            phrase = " ".join(words[i:j])
            if phrase in ingredient_set:
                found_ingredients.add(phrase)

    result = []
    for ing in found_ingredients:
        allergen = ingredient_allergen_map.get(ing, "None")
        result.append((ing, allergen))

    return result

@app.route('/extract_ingredients', methods=['POST'])
def extract_ingredients():
    transcript = request.data.decode('utf-8')  # Raw text

    ingredients_and_allergens = extract_ingredients_and_allergens(transcript)

    results = []
    for ingredient, allergen in ingredients_and_allergens:
        results.append({
            "name": ingredient,
            "allergen": allergen
        })

    return jsonify({"ingredients": results})


if __name__ == "__main__":
    app.run(host='0.0.0.0', port=5002, debug=True)