from flask import Flask, request, jsonify, render_template
import os
import tempfile
from flask_cors import CORS
import PyPDF2
import nltk
import random
import re
from nltk.tokenize import sent_tokenize
from transformers import pipeline, T5ForConditionalGeneration, T5Tokenizer

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Download NLTK resources (do this once when server starts)
nltk.download('punkt')

# Alternative approach: modify the sentence tokenizer to avoid punkt_tab dependency
def safe_sent_tokenize(text):
    try:
        # Try the standard tokenizer first
        return sent_tokenize(text)
    except LookupError:
        # Fallback: Simple sentence splitting
        sentences = re.split(r'(?<=[.!?])\s+', text)
        return [s for s in sentences if s.strip()]

# Function to extract text from a PDF
def extract_text_from_pdf(pdf_path):
    text = ""
    try:
        with open(pdf_path, "rb") as file:
            reader = PyPDF2.PdfReader(file)
            for page in reader.pages:
                text += page.extract_text() + "\n"
        return text
    except Exception as e:
        print(f"Error extracting text: {str(e)}")
        return ""

# Function to generate QA pairs
def generate_qa_pairs(text, num_questions=5, question_generator=None):
    # Use our safe tokenizer
    sentences = safe_sent_tokenize(text)
    
    # Filter out very short sentences or sentences with just numbers (likely not useful for QA)
    sentences = [s for s in sentences if len(s.split()) > 5 and not s.strip().replace('.', '').isdigit()]

    # Make sure we don't try to sample more sentences than available
    num_questions = min(num_questions, len(sentences))

    if num_questions == 0:
        return []

    # Select random sentences for question generation
    selected_sentences = random.sample(sentences, num_questions)

    # Generate questions and use the source sentences as answers
    qa_pairs = []
    for sent in selected_sentences:
        try:
            # Generate question from the sentence
            result = question_generator(f"Generate a question from: {sent}", max_length=128)
            question = result[0]['generated_text']
            
            # Skip if the model simply repeats the input or creates poor questions
            if question.strip() == sent.strip() or question.strip() == f"Generate a question from: {sent}".strip():
                continue

            # The sentence itself is the answer
            qa_pairs.append({
                "question": question,
                "answer": sent
            })
        except Exception as e:
            print(f"Error generating question: {str(e)}")
            continue

    return qa_pairs

# Initialize the question generator with explicit tokenizer and model
print("Loading question generation model...")
model_name = "ramsrigouthamg/t5_squad_v1"
# Explicitly load the tokenizer and model separately to avoid the conversion issue
tokenizer = T5Tokenizer.from_pretrained(model_name, model_max_length=512)
model = T5ForConditionalGeneration.from_pretrained(model_name)
question_generator = pipeline("text2text-generation", model=model, tokenizer=tokenizer)
print("Model loaded successfully!")

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
    
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
    
    if file and file.filename.endswith('.pdf'):
        # Get number of questions parameter (default 5)
        try:
            num_questions = int(request.form.get('num_questions', 5))
            # Ensure number is within reasonable bounds
            num_questions = max(1, min(20, num_questions))
        except ValueError:
            num_questions = 5
        
        # Save uploaded file to a temporary location
        temp_dir = tempfile.gettempdir()
        temp_file_path = os.path.join(temp_dir, file.filename)
        file.save(temp_file_path)
        
        try:
            # Extract text from PDF
            text = extract_text_from_pdf(temp_file_path)
            
            if not text.strip():
                return jsonify({"error": "Could not extract any text from the PDF. The file might be scanned or protected."}), 400
            
            # Generate QA pairs
            qa_pairs = generate_qa_pairs(text, num_questions, question_generator)
            
            if not qa_pairs:
                return jsonify({"error": "Could not generate questions from the provided PDF content."}), 400
            
            # Return the QA pairs
            return jsonify({"qa_pairs": qa_pairs})
            
        except Exception as e:
            return jsonify({"error": f"An error occurred: {str(e)}"}), 500
        finally:
            # Clean up the temporary file
            if os.path.exists(temp_file_path):
                os.remove(temp_file_path)
    
    return jsonify({"error": "Invalid file type. Please upload a PDF file."}), 400

if __name__ == '__main__':
    app.run(debug=True)