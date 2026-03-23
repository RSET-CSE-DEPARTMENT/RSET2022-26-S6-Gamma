"""
qa.py — Question Answering endpoint for Veridian Financial Advisor
Uses FLAN-T5 with multi-prompt chaining, intent detection, and clean plain-text output.
"""

from fastapi import APIRouter
from pydantic import BaseModel
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
import torch
import re

from rag_engine import retrieve_context
from news_retriever import fetch_finance_news

router = APIRouter()

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

model = None
tokenizer = None


def load_model():
    global model, tokenizer
    if model is None:
        print("Loading FLAN-T5 large...")
        model_name = "google/flan-t5-large"
        tokenizer = AutoTokenizer.from_pretrained(model_name)
        model = AutoModelForSeq2SeqLM.from_pretrained(model_name, low_cpu_mem_usage=True)
        model.to(device)
        model.eval()
        print(f"Model loaded on {device}")


class Query(BaseModel):
    question: str


# --------------------------------------------------
# Helper function to extract comparison items
# --------------------------------------------------
def extract_comparison_items(question: str) -> list:
    """Extract the two items being compared from a question."""
    question_lower = question.lower()
    
    # Handle "vs" pattern
    if " vs " in question_lower:
        parts = question_lower.split(" vs ")
        item1 = parts[0].strip()
        item2 = parts[1].split()[0].strip() if parts[1] else ""
        return [item1, item2]
    
    # Handle "versus" pattern
    if " versus " in question_lower:
        parts = question_lower.split(" versus ")
        item1 = parts[0].strip()
        item2 = parts[1].split()[0].strip() if parts[1] else ""
        return [item1, item2]
    
    # Handle "difference between X and Y"
    if "difference between" in question_lower:
        pattern = r"difference between (.*?) and (.*?)(?:\?|$)"
        match = re.search(pattern, question_lower)
        if match:
            return [match.group(1).strip(), match.group(2).strip()]
    
    # Handle "X vs Y" without spaces
    vs_pattern = r"(\w+)\s*vs?\s*(\w+)"
    match = re.search(vs_pattern, question_lower)
    if match:
        return [match.group(1).strip(), match.group(2).strip()]
    
    return ["first option", "second option"]


# --------------------------------------------------
# Redirect stock/company prediction questions
# --------------------------------------------------
PREDICT_COMPANY_NAMES = [
    "tcs", "infosys", "reliance", "wipro", "hdfc", "nifty", "sensex",
    "apple stock", "tesla stock", "nvidia stock", "microsoft stock",
]

PREDICT_PHRASES = [
    "predict", "will it go up", "will it go down",
    "should i buy ", "should i sell ", "price target", "target price",
    "stock movement",
    "invest in tcs", "invest in infosys", "invest in reliance",
    "invest in wipro", "invest in hdfc",
    "buy tcs", "sell tcs", "buy infosys", "sell infosys",
]

def is_prediction_question(question: str) -> bool:
    q = question.lower()
    for company in PREDICT_COMPANY_NAMES:
        if company in q and any(w in q for w in ["invest", "buy", "sell", "good time", "should i"]):
            return True
    return any(phrase in q for phrase in PREDICT_PHRASES)


# --------------------------------------------------
# Check if query needs more specific information
# --------------------------------------------------
def needs_more_specific_info(question: str, rag_context: str) -> bool:
    """Check if the knowledge base lacks specific information for this query."""
    question_lower = question.lower()
    
    # Check for ETF questions with only mutual fund context
    if "etf" in question_lower and "mutual fund" in rag_context.lower() and "etf" not in rag_context.lower():
        return True
    
    # Check for specific stock questions without matching context
    stock_keywords = ["stock", "share", "equity", "market"]
    if any(k in question_lower for k in stock_keywords):
        if "stock" not in rag_context.lower() and "share" not in rag_context.lower():
            return True
    
    return False


# --------------------------------------------------
# Detect if live news is needed
# --------------------------------------------------
NEWS_KEYWORDS = [
    "recent", "latest", "today", "current", "now", "this week",
    "happening", "situation", "going on", "right now",
    "geopolitical", "war", "conflict", "tension", "attack", "strike",
    "iran", "israel", "russia", "ukraine", "china", "pakistan",
    "inflation", "interest rate", "rate hike", "rate cut", "market news",
    "fed", "federal reserve", "rbi", "central bank", "economy",
    "recession", "crash", "rally", "earnings", "gdp", "unemployment", "news",
]

def needs_news(question: str) -> bool:
    q = question.lower()
    return any(k in q for k in NEWS_KEYWORDS)


# --------------------------------------------------
# Detect intent with improved comparison detection
# --------------------------------------------------
def detect_intent(question: str) -> str:
    q = question.lower()
    
    # More comprehensive comparison detection
    COMPARE_PATTERNS = [
        r" vs? ",
        r" versus ",
        r"difference between",
        r"compare",
        r"better (investment|option|choice)",
        r"which (is|are) better",
        r"should i choose",
        r"large cap.*small cap",
        r"small cap.*large cap",
        r"equity.*debt",
        r"debt.*equity",
        r"stock.*bond",
        r"bond.*stock",
        r"etf.*mutual fund",
        r"mutual fund.*etf",
        r"sip.*lump sum",
        r"lump sum.*sip",
    ]
    
    if any(re.search(pattern, q) for pattern in COMPARE_PATTERNS):
        return "compare"

    if any(w in q for w in ["what is", "what are", "define", "explain", "meaning of", "tell me about"]):
        return "definition"
    if any(w in q for w in ["should i", "is it good", "is it safe", "good time", "worth it"]):
        return "advice"
    if any(w in q for w in ["how to", "how do i", "how can i", "steps to", "start investing", "begin"]):
        return "howto"

    return "general"


# --------------------------------------------------
# Pre-process raw news into clean readable sentences
# --------------------------------------------------
def preprocess_news(raw_news: str) -> str:
    if not raw_news:
        return ""

    lines = raw_news.strip().split("\n\n")
    cleaned = []

    for line in lines:
        line = line.strip()
        if not line:
            continue

        # Strip [Source, date] prefix
        line = re.sub(r'^\[.*?\]\s*', '', line).strip()
        line = line.strip('"').strip("'").strip()

        if len(line) < 30:
            continue

        if len(line) > 200:
            cut = line[:200].rfind(".")
            line = line[:cut + 1] if cut > 50 else line[:200]

        cleaned.append(line)

    result = []
    for i, item in enumerate(cleaned[:4], 1):
        result.append(f"News {i}: {item}")

    return "\n".join(result)


# --------------------------------------------------
# Build a news answer without using FLAN-T5
# --------------------------------------------------
def build_news_answer(question: str, raw_news: str, rag_context: str) -> str:
    lines = raw_news.strip().split("\n\n")
    articles = []

    for line in lines:
        line = line.strip()
        if not line:
            continue

        m = re.match(r"^\[([^\]]+),\s*(\d{4}-\d{2}-\d{2})\]\s*(.*)", line)
        if m:
            source = m.group(1).strip()
            date = m.group(2).strip()
            body = m.group(3).strip().strip('"').strip("'")
        else:
            source = "News"
            date = ""
            body = re.sub(r"^\[.*?\]\s*", "", line).strip().strip('"').strip("'")

        parts = body.split(". ", 1)
        title = parts[0].strip()
        desc = parts[1].strip() if len(parts) > 1 else ""

        if len(title) < 20:
            continue

        if len(desc) > 200:
            cut = desc[:200].rfind(".")
            desc = desc[:cut + 1] if cut > 40 else desc[:200]

        articles.append({"source": source, "date": date, "title": title, "desc": desc})

    if not articles:
        return (
            "I found some recent news on this topic but could not extract clear details. "
            "Please check a trusted news source directly for the latest updates.\n\n"
            "Disclaimer: This is general financial information, not personalized advice."
        )

    topic = question.strip().rstrip("?").strip()
    out = [f"Here is what is currently happening with: {topic}\n", "Recent News:"]

    for i, a in enumerate(articles[:4], 1):
        date_str = f" ({a['date']})" if a["date"] else ""
        src_str = f" — {a['source']}{date_str}"
        out.append(f"\n{i}. {a['title']}{src_str}")
        if a["desc"]:
            out.append(f"   {a['desc']}")

    if rag_context:
        sentences = [s.strip() for s in rag_context.replace("\n", " ").split(". ") if len(s.strip()) > 40]
        if sentences:
            out.append("\nWhat this means for investors:")
            out.append(sentences[0] + ".")
            if len(sentences) > 1:
                out.append(sentences[1] + ".")

    out.append("\nNote: This answer is based on live news. Situations may change rapidly.")
    out.append("Disclaimer: This is general financial information, not personalized advice. Consult a licensed financial advisor before making major financial decisions.")
    return "\n".join(out)


# --------------------------------------------------
# Build focused prompts per intent
# --------------------------------------------------
def build_prompts(question: str, rag_context: str, news_context: str, intent: str) -> list:
    rag = rag_context[:600] if rag_context else ""
    news = preprocess_news(news_context) if news_context else ""

    if news:
        ctx = f"Recent developments:\n{news}\n\nFinancial background:\n{rag}".strip()[:1000]
    else:
        ctx = rag.strip()

    if intent == "definition":
        return [
            f"Background: {ctx}\n\nGive a one-sentence definition of {question} that clearly distinguishes it from similar investments.\nDefinition:",
            f"Background: {ctx}\n\nExplain how {question} works in simple terms. If it's similar to another investment type, explain the key difference.\nHow it works:",
            f"Background: {ctx}\n\nDescribe a simple real-world example that helps understand {question}.\nReal-life example:",
            f"Background: {ctx}\n\nList two specific benefits of {question} for a first-time investor.\nKey benefits:",
        ]
    elif intent == "advice":
        return [
            f"Background: {ctx}\n\nFor the question '{question}', what is the single most important factor to consider?\nKey consideration:",
            f"Background: {ctx}\n\nFor the question '{question}', what specific risks should a beginner be aware of?\nRisks to be aware of:",
            f"Background: {ctx}\n\nWhat concrete action should a beginner take given the question: {question}\nWhat you should do:",
            f"Background: {ctx}\n\nWhat is one common mistake investors make when dealing with: {question}\nCommon mistake to avoid:",
        ]
    elif intent == "howto":
        return [
            f"Background: {ctx}\n\nWhat is the very first step a beginner should take to: {question}\nFirst step:",
            f"Background: {ctx}\n\nAfter the first step, what should someone do next to: {question}\nNext step:",
            f"Background: {ctx}\n\nWhat is a common beginner mistake when trying to: {question}\nMistake to avoid:",
            f"Background: {ctx}\n\nWhat is one practical tip that makes it easier to: {question}\nPractical tip:",
        ]
    elif intent == "compare":
        items = extract_comparison_items(question)
        item1, item2 = items[0] if len(items) > 0 else "first option", items[1] if len(items) > 1 else "second option"
        
        return [
            f"Background: {ctx}\n\nDefine {item1} and {item2} in one sentence each, highlighting their core characteristics.\nDefinitions:",
            f"Background: {ctx}\n\nCompare the risk levels of {item1} vs {item2}. Which is riskier and why?\nRisk comparison:",
            f"Background: {ctx}\n\nCompare the potential returns of {item1} vs {item2} over a long-term investment period.\nReturn potential:",
            f"Background: {ctx}\n\nBased on the comparison, which type of investor should choose {item1} and which should choose {item2}?\nRecommendation:",
        ]
    else:
        if news:
            return [
                f"Background: {ctx}\n\nBased on the recent news, summarize what is happening with: {question}\nSummary:",
                f"Background: {ctx}\n\nBased on the recent news, what is the financial impact on everyday investors of: {question}\nImpact on investors:",
                f"Background: {ctx}\n\nGiven the recent situation, what should a cautious investor do about: {question}\nWhat to do:",
            ]
        else:
            return [
                f"Background: {ctx}\n\nAnswer clearly and simply: {question}\nAnswer:",
                f"Background: {ctx}\n\nWhat is the financial impact of this on a regular everyday investor: {question}\nImpact on investors:",
                f"Background: {ctx}\n\nWhat should an everyday investor do in response to: {question}\nWhat to do:",
            ]


# --------------------------------------------------
# Run prompts through FLAN-T5
# --------------------------------------------------
def run_prompts(prompts: list) -> list:
    results = []
    for prompt in prompts:
        inputs = tokenizer(
            prompt,
            return_tensors="pt",
            truncation=True,
            max_length=512,
        ).to(device)

        with torch.no_grad():
            outputs = model.generate(
                **inputs,
                max_new_tokens=120,
                min_new_tokens=15,
                num_beams=4,
                early_stopping=True,
                no_repeat_ngram_size=3,
                repetition_penalty=1.3,
                length_penalty=1.0,
                temperature=0.7,  # Add some creativity
            )

        text = tokenizer.decode(outputs[0], skip_special_tokens=True).strip()
        if text:
            results.append(text)
    return results


# --------------------------------------------------
# Clean a single model output
# --------------------------------------------------
PROMPT_LABELS = [
    "Final Answer:", "Answer:", "Response:", "Summary:", "Definition:", "Explanation:",
    "Example:", "Benefits:", "Key consideration:", "Risks to be aware of:", "What you should do:",
    "Common mistake to avoid:", "First step:", "Next step:", "Practical tip:",
    "Definitions:", "Risk comparison:", "Return potential:", "Recommendation:",
    "Impact on investors:", "What to do:", "Key benefits:", "Real-life example:",
    "How it works:",
]

def clean_answer(text: str) -> str:
    text = text.strip()

    for marker in PROMPT_LABELS:
        if text.startswith(marker):
            text = text[len(marker):].strip()
        elif text.startswith(marker.lower()):
            text = text[len(marker.lower()):].strip()

    text = re.sub(r'\[.*?\d{4}-\d{2}-\d{2}\].*', '', text).strip()

    # Remove duplicate sentences
    seen = set()
    sentences = []
    for s in text.split(". "):
        s = s.strip()
        normalized = s.lower()
        if s and normalized not in seen:
            seen.add(normalized)
            sentences.append(s)

    return ". ".join(sentences).strip()


# --------------------------------------------------
# Deduplicate sentences ACROSS sections
# --------------------------------------------------
def dedup_across_parts(parts: list) -> list:
    seen_sentences = set()
    result = []

    for part in parts:
        sentences = [s.strip() for s in part.split(". ") if s.strip()]
        unique = []
        for s in sentences:
            normalized = s.lower()
            if normalized not in seen_sentences:
                seen_sentences.add(normalized)
                unique.append(s)
        result.append(". ".join(unique).strip())

    return result


# --------------------------------------------------
# Specialized assembly for comparison answers
# --------------------------------------------------
def assemble_comparison_answer(parts: list, question: str) -> str:
    """Specialized assembly for comparison questions."""
    
    items = extract_comparison_items(question)
    item1 = items[0].title() if len(items) > 0 else "First Option"
    item2 = items[1].title() if len(items) > 1 else "Second Option"
    
    if len(parts) < 4:
        parts += [""] * (4 - len(parts))
    
    definitions, risk, returns, recommendation = parts[:4]
    
    lines = []
    
    if definitions:
        lines.append(f"Understanding {item1} and {item2}:\n{definitions}")
    
    if risk:
        lines.append(f"Risk Comparison:\n{risk}")
    
    if returns:
        lines.append(f"Return Potential:\n{returns}")
    
    # Add a structured summary if not already covered
    lines.append("\nQuick Comparison:")
    lines.append(f"• {item1}: Established companies, lower volatility, moderate returns, suitable for conservative investors")
    lines.append(f"• {item2}: Growing companies, higher volatility, potentially higher returns, suitable for aggressive investors with longer time horizons")
    
    if recommendation:
        lines.append(f"\nRecommendation:\n{recommendation}")
    else:
        lines.append(f"\nRecommendation:\nIf you have lower risk tolerance and need stability, {item1} may be appropriate. If you can tolerate volatility for potentially higher returns and have a long investment horizon, consider adding {item2} to your portfolio.")
    
    return "\n\n".join(lines)


# --------------------------------------------------
# Section labels — plain text, no emojis
# --------------------------------------------------
SECTION_LABELS = {
    "definition": ["What it is", "How it works", "Real-life example", "Key benefits"],
    "advice":     ["Key consideration", "Risks to be aware of", "What you should do", "Common mistake to avoid"],
    "howto":      ["First step", "Next step", "Mistake to avoid", "Practical tip"],
    "compare":    ["Definitions", "Risk comparison", "Return potential", "Recommendation"],
    "general":    ["Answer", "Impact on investors", "What you should do"],
}


# --------------------------------------------------
# Assemble final answer — plain text, structured
# --------------------------------------------------
def assemble_answer(parts: list, intent: str, has_news: bool, question: str = "") -> str:
    
    # Use specialized assembly for comparison
    if intent == "compare":
        body = assemble_comparison_answer(parts, question)
    else:
        labels = SECTION_LABELS.get(intent, SECTION_LABELS["general"])
        parts = dedup_across_parts(parts)

        lines = []
        for i, part in enumerate(parts):
            if not part:
                continue
            label = labels[i] if i < len(labels) else "Additional information"
            lines.append(f"{label}:\n{part}")

        body = "\n\n".join(lines)

    footer_lines = []
    if has_news:
        footer_lines.append("Note: This answer includes recent news context.")
    footer_lines.append(
        "Disclaimer: This is general financial information, not personalized advice. "
        "Consult a licensed financial advisor before making major financial decisions."
    )

    footer = "\n".join(footer_lines)
    return f"{body}\n\n{footer}"


# --------------------------------------------------
# QA endpoint
# --------------------------------------------------
@router.post("/ask")
def ask_question(data: Query):
    try:
        question = data.question.strip()

        # STEP 1: Redirect prediction/stock questions
        if is_prediction_question(question):
            return {
                "answer": (
                    "It looks like you're asking about a specific stock or whether to invest in a particular company.\n\n"
                    "For stock price predictions and movement analysis, please press the Predict button to activate "
                    "the prediction model, which is specifically designed to analyze market data and forecast stock movements.\n\n"
                    "If you have a general investing question — such as how to evaluate a stock, what factors affect "
                    "share prices, or how markets work — feel free to ask me that here."
                )
            }

        # STEP 2: Retrieve RAG context
        rag_context = retrieve_context(question)

        # STEP 3: Check if we need more specific information
        if needs_more_specific_info(question, rag_context):
            return {
                "answer": (
                    f"I notice you're asking about {question}, but my knowledge base has limited "
                    f"specific information on this topic. Based on what I know:\n\n"
                    f"{rag_context[:300]}...\n\n"
                    f"Note: For the most accurate and detailed information about {question}, "
                    f"please consult a licensed financial advisor or refer to specialized financial resources."
                )
            }

        # STEP 4: Fetch live news if needed
        news_context = ""
        if needs_news(question):
            try:
                news_context = fetch_finance_news(question, max_articles=4)
                if news_context:
                    print(f"News fetched for: {question}")
                else:
                    print("News API returned no articles.")
            except Exception as e:
                print(f"News fetch failed: {e}")

        # STEP 5: Guard — if no useful context found
        if not rag_context and not news_context:
            return {
                "answer": (
                    "I don't have enough information in my knowledge base to answer that confidently.\n\n"
                    "Try rephrasing your question, or ask about topics like mutual funds, SIPs, asset allocation, "
                    "risk tolerance, inflation, interest rates, or how to start investing."
                )
            }

        # STEP 6: For news questions, build answer directly
        intent = detect_intent(question)
        print(f"Intent: {intent}")

        if news_context and intent == "general":
            answer = build_news_answer(question, news_context, rag_context)
            return {"answer": answer}

        # STEP 7: Load model for non-news questions
        load_model()

        # STEP 8: Build and run prompts
        prompts = build_prompts(question, rag_context, news_context, intent)
        raw_parts = run_prompts(prompts)

        # STEP 9: Clean and assemble
        cleaned_parts = [clean_answer(p) for p in raw_parts]
        answer = assemble_answer(cleaned_parts, intent, has_news=bool(news_context), question=question)

        return {"answer": answer}

    except Exception as e:
        print(f"QA ERROR: {e}")
        return {
            "answer": (
                "I'm sorry, I'm having trouble processing that question right now. "
                "Please try again."
            )
        }