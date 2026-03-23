"""
bert_profanity.py - BERT-based Offensive Language Detection (Word-Level Only)
Classifies individual words without context windows
"""

import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification
from typing import List, Dict
import warnings
import os

# Suppress transformers warnings
warnings.filterwarnings('ignore', category=UserWarning)

# ===== MODEL LOADING (ONCE AT IMPORT TIME) =====
MODEL_LOADED = False
BERT_MODEL = None
BERT_TOKENIZER = None
DEVICE = None

try:
    # Load fine-tuned BERT model
    MODEL_NAME = os.path.join(os.path.dirname(__file__), "cleanvid-offensive-detector")
    BERT_TOKENIZER = AutoTokenizer.from_pretrained(MODEL_NAME)
    BERT_MODEL = AutoModelForSequenceClassification.from_pretrained(MODEL_NAME)
    
    # Use GPU if available, otherwise CPU
    DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    BERT_MODEL.to(DEVICE)
    BERT_MODEL.eval()  # Set to evaluation mode
    
    MODEL_LOADED = True
    print(f"✅ BERT model loaded on {DEVICE}")

except Exception as e:
    MODEL_LOADED = False
    print(f"⚠️  BERT model loading failed: {e}")
    print("   Falling back to keyword-only detection")


def batch_classify_words(words: List[Dict], threshold: float = 0.8) -> List[Dict]:
    """
    Classify individual words in a single batch inference.
    NO context windows - pure word-level classification.
    
    Args:
        words: List of word dicts [{"word": str, "start": float, "end": float}]
        threshold: Confidence threshold for OFFENSIVE class
    
    Returns:
        List of offensive word spans:
        [{"start": float, "end": float, "confidence": float}]
    """
    if not MODEL_LOADED or not words:
        return []
    
    try:
        # Extract individual word texts
        word_texts = [w["word"].strip() for w in words]
        
        # Tokenize all words in batch
        inputs = BERT_TOKENIZER(
            word_texts,
            padding=True,
            truncation=True,
            max_length=32,  # Single words are short
            return_tensors="pt"
        )
        
        # Move to device
        inputs = {k: v.to(DEVICE) for k, v in inputs.items()}
        
        # Run inference (no gradient computation)
        with torch.no_grad():
            outputs = BERT_MODEL(**inputs)
            logits = outputs.logits
            
            # Apply softmax to get probabilities
            probabilities = torch.nn.functional.softmax(logits, dim=-1)
            
            # Assuming label 1 = OFFENSIVE, label 0 = NOT_OFFENSIVE
            # Adjust indices based on your model's label mapping
            offensive_probs = probabilities[:, 1].cpu().numpy()
        
        # Extract offensive words with confidence above threshold
        offensive_spans = []
        
        for i, (word, prob) in enumerate(zip(words, offensive_probs)):
            if float(prob) >= threshold:
                offensive_spans.append({
                    "start": word["start"],
                    "end": word["end"],
                    "confidence": float(prob)
                })
        
        return offensive_spans
    
    except Exception as e:
        print(f"⚠️  BERT inference error: {e}")
        return []


def detect_bert_profanities(
    words: List[Dict],
    threshold: float = 0.8
) -> List[Dict]:
    """
    Detect offensive words using BERT word-level classification.
    NO context windows - each word is classified independently.
    
    Args:
        words: List of word dicts from Whisper
               [{"word": str, "start": float, "end": float, ...}]
        threshold: Confidence threshold for offensive classification
    
    Returns:
        List of offensive word spans:
        [
            {
                "start": float,
                "end": float,
                "confidence": float
            }
        ]
    """
    # If model not loaded, return empty (fall back to keyword detection)
    if not MODEL_LOADED:
        return []
    
    if not words:
        return []
    
    try:
        # Batch classify all words (single inference call per chunk)
        offensive_spans = batch_classify_words(words, threshold)
        
        return offensive_spans
    
    except Exception as e:
        print(f"⚠️  BERT profanity detection error: {e}")
        return []


# ===== TESTING FUNCTION (OPTIONAL) =====
def test_bert_detection():
    """Test function to verify BERT word-level integration"""
    test_words = [
        {"word": "hello", "start": 0.0, "end": 0.3},
        {"word": "this", "start": 0.4, "end": 0.6},
        {"word": "shit", "start": 0.7, "end": 1.0},
        {"word": "is", "start": 1.1, "end": 1.3},
        {"word": "fucking", "start": 1.4, "end": 1.8},
        {"word": "bad", "start": 1.9, "end": 2.1}
    ]
    
    results = detect_bert_profanities(test_words, threshold=0.8)
    
    print("\n=== BERT Word-Level Test Results ===")
    print(f"Detected {len(results)} offensive words:")
    for span in results:
        print(f"  [{span['start']:.1f}s - {span['end']:.1f}s]: confidence={span['confidence']:.2f}")


if __name__ == "__main__":
    test_bert_detection()
