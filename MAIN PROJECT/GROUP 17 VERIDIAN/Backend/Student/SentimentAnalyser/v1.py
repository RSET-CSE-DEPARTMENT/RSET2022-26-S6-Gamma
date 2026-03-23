# Cell 2: Define the main script functions (Updated with improved event extraction)

import os
import math
import time
import numpy as np
import torch
import spacy
from spacy.lang.en.stop_words import STOP_WORDS
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import feedparser
from newspaper import Article
from urllib.parse import quote_plus
from bs4 import BeautifulSoup
import requests
from typing import List, Dict
import re

# --- Load spaCy Model for Event Extraction ---
try:
    nlp = spacy.load("en_core_web_sm") 
    #print("spaCy model loaded successfully.")
except Exception as e:
    #print(f"Failed to load spaCy model: {e}. Event extraction will be disabled.")
    nlp = None

# snscrape import
try:
    import snscrape.modules.twitter as sntwitter
except Exception:
    sntwitter = None

# -_------------
# CONFIG
# -_------------
DRIVE_MODEL_PATH = "/content/drive/MyDrive/sentiment_models/finbert_financial_mixed"
SOURCE_WEIGHTS = {
    "twitter": 0.6, 
    "yahoo_finance": 1.0,
    "seeking_alpha": 1.1,
    "benzinga": 1.0,
    "google_news_rss": 0.8,
    "news": 1.0,  # generic fallback
    "reuters": 1.1, 
    "bloomberg": 1.2, 
    "default": 1.0
}
RECENCY_LAMBDA = 0.02  # hours decay
MAX_NEWS = 20
MAX_TWEETS = 200

# -_------------
# Load model (Assuming successful loading as per previous steps)
# -_------------
print("Loading model from Drive:", DRIVE_MODEL_PATH)
try:
    tokenizer = AutoTokenizer.from_pretrained(DRIVE_MODEL_PATH)
    model = AutoModelForSequenceClassification.from_pretrained(DRIVE_MODEL_PATH)
    model.eval()
    if torch.cuda.is_available():
        model.to("cuda")
    #print("Transformer model loaded successfully.")
    id2label = model.config.id2label if hasattr(model.config, "id2label") else {0:"negative",1:"neutral",2:"positive"}
except Exception as e:
    #print(f"ERROR: Failed to load FinBERT model: {e}")
    tokenizer = None
    model = None
    id2label = {0:"negative",1:"neutral",2:"positive"}


# -_------------
# NEW: Aggressive Pre-Cleaner Function
# -_------------
def aggressive_pre_clean(text: str) -> str:
    """Removes common source, footer, and boilerplate junk from raw scraped text."""
    if not text or len(text) < 50:
        return text
    
    clean_text = text
    
    # 1. Remove footer patterns FIRST (before removing source names)
    footer_markers = [
        "source:", "read more at", "continue reading", "full story at",
        "copyright", "all rights reserved", "terms of use", "privacy policy",
        "email article", "share this article", "click here", "subscribe now",
        "download the app", "get the app"
    ]
    
    for marker in footer_markers:
        if marker in clean_text.lower():
            idx = clean_text.lower().find(marker)
            clean_text = clean_text[:idx]
    
    # 2. Remove standalone source mentions (only if at start/end of sentences)
    source_names = [
        "Google News", "Reuters", "Bloomberg", "The Wall Street Journal", 
        "Financial Times", "Fox Business", "CNBC", "CNN", "Yahoo Finance",
        "MarketWatch"
    ]
    
    # Only remove if they appear isolated (not part of actual content)
    for source in source_names:
        # Remove if at the very start
        if clean_text.strip().startswith(source):
            clean_text = clean_text[len(source):].strip()
        # Remove if standalone with punctuation
        clean_text = re.sub(rf'\b{re.escape(source)}\s*[–—-]\s*', '', clean_text, flags=re.IGNORECASE)
        clean_text = re.sub(rf'^{re.escape(source)}\s*[:.,]\s*', '', clean_text, flags=re.IGNORECASE)
    
    return clean_text.strip()


# -_------------
# Scrapers (Updated)
# -_------------
def scrape_news_multi_source(query, max_articles=MAX_NEWS):
    """
    Scrape news from multiple RSS sources that are scraper-friendly.
    Uses Yahoo Finance, Seeking Alpha, and other financial news sources.
    """
    items = []
    
    # Multiple RSS sources for financial news
    sources = [
        {
            "name": "yahoo_finance",
            "url": f"https://finance.yahoo.com/rss/headline?s={quote_plus(query)}",
            "weight": 1.0
        },
        {
            "name": "seeking_alpha", 
            "url": f"https://seekingalpha.com/api/sa/combined/{quote_plus(query.split()[0])}.xml",
            "weight": 1.1
        },
        {
            "name": "benzinga",
            "url": f"https://www.benzinga.com/feed",
            "weight": 1.0
        }
    ]
    
    for source_info in sources:
        if len(items) >= max_articles:
            break
            
        try:
            feed = feedparser.parse(source_info["url"])
            
            for entry in feed.entries:
                if len(items) >= max_articles:
                    break
                
                # Extract title and summary
                title = entry.get("title", "")
                summary = entry.get("summary", "") or entry.get("description", "")
                link = entry.get("link", "")
                
                # Remove HTML tags from summary
                if summary:
                    soup = BeautifulSoup(summary, "html.parser")
                    summary = soup.get_text()
                
                # Filter by query relevance
                combined_text = (title + " " + summary).lower()
                query_terms = query.lower().split()
                if not any(term in combined_text for term in query_terms):
                    continue
                
                # Combine title and summary as the article text
                text = f"{title}\n\n{summary}"
                
                # Try to fetch full article if link is available
                if link:
                    try:
                        art = Article(link)
                        art.download()
                        art.parse()
                        if len(art.text) > 200:
                            text = f"{art.title or title}\n\n{art.text}"
                    except:
                        pass  # Keep RSS content if full article fails
                
                # Clean the text
                text = aggressive_pre_clean(text)
                
                # Validate
                if len(text) > 100:
                    items.append({
                        "text": text,
                        "source": source_info["name"],
                        "source_weight": source_info["weight"],
                        "timestamp": time.time(),
                        "orig_link": link
                    })
                    #print(f"✓ Scraped from {source_info['name']}: {text[:80]}...")
                    
        except Exception as e:
            #print(f"✗ Failed to fetch from {source_info['name']}: {str(e)[:50]}")
            continue
    
    # Fallback: Use Google News RSS feed content (title + summary only, no scraping)
    if len(items) < 3:
        print("⚠ Low article count, using Google News RSS as fallback...")
        try:
            gn_url = f"https://news.google.com/rss/search?q={quote_plus(query)}"
            feed = feedparser.parse(gn_url)
            
            for entry in feed.entries[:max_articles]:
                if len(items) >= max_articles:
                    break
                    
                title = entry.get("title", "")
                summary = entry.get("summary", "") or entry.get("description", "")
                
                # Clean HTML from summary
                if summary:
                    soup = BeautifulSoup(summary, "html.parser")
                    summary = soup.get_text()
                
                text = f"{title}\n\n{summary}"
                text = aggressive_pre_clean(text)
                
                if len(text) > 50:
                    items.append({
                        "text": text,
                        "source": "google_news_rss",
                        "source_weight": 0.8,
                        "timestamp": time.time(),
                        "orig_link": entry.get("link", "")
                    })
                    #print(f"✓ RSS summary: {text[:80]}...")
        except Exception as e:
            #print(f"✗ Google News RSS fallback failed: {str(e)[:50]}")
    
    return items


# Alias for backward compatibility
def scrape_google_news(query, max_articles=MAX_NEWS):
    """Wrapper that calls the new multi-source scraper"""
    return scrape_news_multi_source(query, max_articles)


def scrape_tweets(query, max_tweets=MAX_TWEETS):
    """Scrape tweets using snscrape (no API key)."""
    items = []
    if sntwitter is None:
        print("snscrape not installed or import failed.")
        return items
    full_q = query + " since:2024-11-01" 
    for i, tweet in enumerate(sntwitter.TwitterSearchScraper(full_q).get_items()):
        if i >= max_tweets:
            break
        items.append({"text": tweet.rawContent, "source":"twitter", "timestamp": tweet.date.timestamp()})
    return items

# -_------------
# Model prediction per item (entity-aware)
# -_------------
def predict_item_sentiment(text, entity=None):
    if model is None or tokenizer is None:
        return {"negative": 0.33, "neutral": 0.34, "positive": 0.33}, 0.0, 0.34 # Dummy fallback
        
    if entity:
        inputs = tokenizer(text, text_pair=entity, truncation=True, padding=True, return_tensors="pt", max_length=128)
    else:
        inputs = tokenizer(text, truncation=True, padding=True, return_tensors="pt", max_length=128)
    if torch.cuda.is_available():
        inputs = {k:v.to("cuda") for k,v in inputs.items()}
    with torch.no_grad():
        out = model(**inputs)
        logits = out.logits.cpu().numpy()[0]
        probs = np.exp(logits) / np.sum(np.exp(logits))
    # build probs dict based on id2label
    probs_dict = {}
    for i in range(len(probs)):
        label_name = id2label.get(str(i), None) if isinstance(id2label, dict) else id2label[i]
        if label_name is None:
            label_name = ["negative","neutral","positive"][i] if i < 3 else str(i)
        probs_dict[label_name] = float(probs[i])
    s_value = probs_dict.get("positive", 0.0) - probs_dict.get("negative", 0.0)
    top_conf = float(max(probs))
    return probs_dict, float(s_value), top_conf

# -_------------
# Recency weight
# -_------------
def recency_weight(timestamp, now_ts=None, lam=RECENCY_LAMBDA):
    if now_ts is None: now_ts = time.time()
    age_hours = (now_ts - timestamp) / 3600.0
    return math.exp(-lam * age_hours)

# -_------------
# IMPROVED Event Extraction Function
# -_------------
def extract_key_event(text: str, entity_name: str) -> str:
    """
    Enhanced extraction of specific financial events from text.
    Captures events like CEO death, strikes, earnings, acquisitions, etc.
    """
    if not text:
        return "No supporting information found."
    
    # Pre-clean text
    text = text.strip().replace("\n", " ")
    entity_lower = entity_name.lower()
    
    # --- PATTERN 1: High-priority event patterns (regex-based) ---
    high_priority_patterns = [
        # Leadership changes
        r'(?:CEO|chief executive|executive|founder|president|chairman)\s+(?:died|dies|death|passed away|steps down|resigns|resignation|fired|ousted)',
        r'(?:appointed|names|hires|promotes)\s+(?:new\s+)?(?:CEO|chief executive|president)',
        
        # Labor/Strike events
        r'(?:workers|employees|union|staff)\s+(?:on strike|strike|walkout|protest)',
        r'strike\s+(?:at|by|against)',
        
        # Financial events
        r'(?:reports?|posts?|announces?)\s+(?:record|strong|weak|disappointing)?\s*(?:earnings|profit|loss|revenue|sales)',
        r'(?:beats|misses|exceeds)\s+(?:earnings|revenue|profit|estimates|expectations)',
        r'(?:bankruptcy|bankrupt|chapter 11|insolvency)',
        
        # M&A and deals
        r'(?:acquires?|acquisition|buys?|purchases?|takeover|merger|deal)\s+(?:of\s+)?\w+',
        r'(?:sells?|divests?|spins off)\s+\w+',
        
        # Legal/Regulatory
        r'(?:lawsuit|sued|sues|legal action|settlement|fine|penalty)',
        r'(?:investigation|probe|inquiry|charges)\s+(?:into|against|by)',
        r'(?:regulatory|FDA|SEC|FTC)\s+(?:approval|rejection|warning|action)',
        
        # Product/Operations
        r'(?:recalls?|recall)\s+(?:of\s+)?\w+',
        r'(?:launches?|unveils?|announces?|releases?)\s+(?:new\s+)?\w+',
        r'(?:factory|plant|facility)\s+(?:closes?|closure|shutdown|opens?)',
        
        # Market events
        r'(?:shares?|stock)\s+(?:plunge|plunges|surge|surges|tumble|soar|crash)',
        r'(?:downgrade|upgrade)(?:s|d)?\s+(?:to|by)',
    ]
    
    # Check for high-priority patterns
    for pattern in high_priority_patterns:
        matches = re.finditer(pattern, text, re.IGNORECASE)
        for match in matches:
            # Get surrounding context (±50 chars)
            start = max(0, match.start() - 50)
            end = min(len(text), match.end() + 50)
            context = text[start:end].strip()
            
            # Clean up the context
            context = re.sub(r'\s+', ' ', context)
            if len(context) > 150:
                context = context[:150] + "..."
            
            return context.capitalize()
    
    # --- PATTERN 2: spaCy-based extraction with improved filtering ---
    if nlp is not None:
        doc = nlp(text[:1000])  # Limit to first 1000 chars for speed
        
        # Look for important verb phrases
        key_events = []
        
        for sent in doc.sents:
            # Skip sentences without the entity (unless very short doc)
            if len(list(doc.sents)) > 3 and entity_lower not in sent.text.lower():
                continue
                
            for token in sent:
                # Find main verbs with meaningful subjects/objects
                if token.pos_ == "VERB" and token.dep_ in ["ROOT", "conj"]:
                    # Build a simple event phrase
                    subjects = [child for child in token.children if child.dep_ in ["nsubj", "nsubjpass"]]
                    objects = [child for child in token.children if child.dep_ in ["dobj", "attr", "pobj"]]
                    
                    if subjects or objects:
                        subj_text = subjects[0].text if subjects else ""
                        verb_text = token.text
                        obj_text = objects[0].text if objects else ""
                        
                        event_phrase = f"{subj_text} {verb_text} {obj_text}".strip()
                        
                        # Filter out generic phrases
                        generic_terms = ['said', 'says', 'announced', 'reported', 'according', 'including', 'using']
                        if not any(term in event_phrase.lower() for term in generic_terms):
                            key_events.append(event_phrase)
        
        if key_events:
            # Return the first meaningful event found
            return key_events[0].capitalize()
        
        # --- PATTERN 3: Named Entity + Action fallback ---
        entities_actions = []
        for ent in doc.ents:
            if ent.label_ in ["PERSON", "ORG", "EVENT", "PRODUCT"]:
                # Find the verb this entity is related to
                head = ent.root.head
                if head.pos_ == "VERB":
                    entities_actions.append(f"{ent.text} {head.text}")
        
        if entities_actions:
            return entities_actions[0].capitalize()
        
        # --- FALLBACK: Return first substantial sentence ---
        sentences = [sent.text.strip() for sent in doc.sents if len(sent.text.strip()) > 20]
        if sentences:
            first_sent = sentences[0]
            if len(first_sent) > 150:
                first_sent = first_sent[:150] + "..."
            return first_sent
    
    # Final fallback if spaCy is not available
    return text[:150].capitalize() + "..." if len(text) > 150 else text.capitalize()

# -_------------
# Aggregation
# -_------------

def aggregate_probs_and_format(items: List[Dict], entity_name: str = None, now_ts: float = None):
    """
    Aggregate class probabilities across items and format the final prediction.
    """
    now_ts = now_ts or time.time()
    denom = 0.0
    agg_pos, agg_neu, agg_neg = 0.0, 0.0, 0.0
    model_confs, source_cred = [], []
    best_score = -1.0
    best_item_text = None

    for it in items:
        text = it.get("text", "")
        ts = it.get("timestamp", now_ts)
        source = it.get("source", "default").lower()
        
        # Use source_weight from item if available, otherwise look up in SOURCE_WEIGHTS
        source_w = it.get("source_weight", SOURCE_WEIGHTS.get(source, SOURCE_WEIGHTS["default"]))
        rec_w = recency_weight(ts, now_ts)
        w_i = source_w * rec_w

        probs_dict, s_val, top_conf = predict_item_sentiment(text, entity=entity_name)

        p_pos = float(probs_dict.get("positive", 0.0))
        p_neu = float(probs_dict.get("neutral", 0.0))
        p_neg = float(probs_dict.get("negative", 0.0))

        agg_pos += w_i * p_pos
        agg_neu += w_i * p_neu
        agg_neg += w_i * p_neg
        denom += w_i

        model_confs.append(top_conf)
        source_cred.append(source_w)

        score_for_reason = w_i * top_conf
        if score_for_reason > best_score:
            best_score = score_for_reason
            best_item_text = text

    # normalize aggregated probs
    if denom > 0:
        agg_pos /= denom
        agg_neu /= denom
        agg_neg /= denom
    else:
        agg_pos = agg_neu = agg_neg = 1.0/3.0

    # prediction array [buy, sell, hold] -> [positive, negative, neutral]
    prediction = [float(agg_pos), float(agg_neg), float(agg_neu)]

    # Confidence calculation (unchanged)
    C_model = float(np.mean(model_confs)) if model_confs else 0.0
    C_source = (float(np.mean(source_cred)) / max(SOURCE_WEIGHTS.values())) if source_cred else 0.0
    C_volume = min(1.0, math.log(1 + len(items)) / math.log(1 + 100.0))
    alpha, beta, gamma = 0.65, 0.25, 0.10
    confidence = alpha * C_model + beta * C_volume + gamma * C_source
    confidence = max(0.0, min(1.0, confidence))

    # Reason: USE KEY EVENT EXTRACTION on the cleaned text
    if best_item_text:
        reason = extract_key_event(best_item_text, entity_name)
    else:
        reason = "No supporting news/tweets found."

    # final dict
    out = {
        "prediction": prediction,
        "confidence": round(float(confidence), 4),
        "reason": reason
    }
    return out

# Convenience wrapper: run end-to-end (scrape + aggregate -> formatted output)
def analyze_company_formatted(company_name, max_news=MAX_NEWS, max_tweets=MAX_TWEETS):
    news_items = scrape_google_news(f"{company_name} stock", max_articles=max_news)
    tweet_items = scrape_tweets(company_name, max_tweets=MAX_TWEETS) if sntwitter else []
    items = news_items + tweet_items
    agg = aggregate_probs_and_format(items, entity_name=company_name)
    return agg


# Example utility: run end-to-end for a company
def analyze_company(company_name, max_news=MAX_NEWS, max_tweets=MAX_TWEETS):
    q_news = f"{company_name} stock"
    #print("\n--- Scraping Data ---")
    #print("Scraping news for:", q_news)
    news_items = scrape_google_news(q_news, max_articles=max_news)
    #print("Scraping tweets for:", company_name)
    tweets = scrape_tweets(company_name, max_tweets=MAX_TWEETS) if sntwitter else []
    all_items = news_items + tweets
    #print("Total items collected:", len(all_items))
    #print("--- Aggregating Sentiment ---")
    return aggregate_probs_and_format(all_items, entity_name=company_name)

# -_------------
# If run interactively:
# -_------------
if __name__ == "__main__":
    print("--- Starting Sentiment Analysis ---")
    # You can change the company name here
    res = analyze_company("Tesla", max_news=5, max_tweets=50) 
    print("\n--- Final Result ---")
    print(res)
