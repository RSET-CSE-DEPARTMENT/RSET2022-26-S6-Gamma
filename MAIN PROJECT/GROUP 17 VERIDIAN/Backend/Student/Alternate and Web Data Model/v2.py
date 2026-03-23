!pip install -q pandas requests beautifulsoup4 transformers torch sentence-transformers pytrends accelerate yfinance
!pip install praw

# =====================================================
# 1. SETUP AND DEPENDENCIES
# =====================================================

import pandas as pd
import requests
from bs4 import BeautifulSoup
from pytrends.request import TrendReq
from transformers import pipeline
import torch
import concurrent.futures
import re
import yfinance as yf
import warnings

warnings.filterwarnings('ignore')
print("✅ Dependencies installed successfully!")

# =====================================================
# 2. AI & CONFIGURATION SETUP
# =====================================================
print("🧠 Initializing AI models... (This may take a minute)")
try:
    analyzer_pipeline = pipeline(
        "text-generation",
        model="HuggingFaceH4/zephyr-7b-beta",
        torch_dtype=torch.bfloat16,
        device_map="auto"
    )
    sentiment_analyzer = pipeline("sentiment-analysis", model="distilbert-base-uncased-finetuned-sst-2-english")
    print("✅ AI models initialized successfully!")
except Exception as e:
    print(f"❌ Error initializing AI models: {e}")
    print("Please ensure you are using a GPU runtime in Colab (Runtime -> Change runtime type -> T4 GPU).")

# =====================================================
# 3. COMPANY DATABASE
# =====================================================
COMPANY_DATABASE = {
    'GOOGL': {'name': 'Alphabet (Google)', 'subreddits': ['google', 'investing', 'technology'], 'github': ['google', 'tensorflow'], 'trends': 'google ai'},
    'NVDA': {'name': 'NVIDIA', 'subreddits': ['investing', 'wallstreetbets', 'Nvidia_Stock'], 'github': ['nvidia'], 'trends': 'AI chip demand'},
    'TSLA': {'name': 'Tesla', 'subreddits': ['teslainvestorsclub', 'wallstreetbets', 'electricvehicles'], 'github': ['tesla'], 'trends': 'cybertruck reviews'},
    'AAPL': {'name': 'Apple', 'subreddits': ['apple', 'investing', 'gadgets'], 'github': ['apple'], 'trends': 'vision pro sales'},
    'MSFT': {'name': 'Microsoft', 'subreddits': ['Microsoft', 'investing'], 'github': ['microsoft'], 'trends': 'microsoft copilot'}
}

HEADERS = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'}

# =====================================================
# 4. REDDIT SCRAPER
# =====================================================
import praw

reddit = praw.Reddit(
    client_id="lXVCupaZFzxD8prEGbTIiw",
    client_secret="saca9k8m_jLT0CVVZzCWwjwGti6jzA",
    user_agent="Mozilla/5.0 (InvestmentAnalyzer/1.0)"
)

def get_reddit_sentiment(company_name, subreddits):
    """Uses official Reddit API via PRAW."""
    try:
        all_titles = []
        search_term = company_name.split(' ')[0]

        for sub in subreddits:
            for submission in reddit.subreddit(sub).search(search_term, sort="new", limit=25):
                all_titles.append(submission.title)

        if not all_titles:
            print(f"⚠️ No posts found for '{company_name}' on Reddit.")
            return 0, 0

        sample_titles = all_titles[:50]
        sentiments = sentiment_analyzer(sample_titles)
        score = sum(1 if s["label"] == "POSITIVE" else -1 for s in sentiments)
        return round(score / len(sentiments), 3), len(all_titles)

    except Exception as e:
        print(f"❌ Reddit API error: {e}")
        return 0, 0


# =====================================================
# 5. OTHER SCRAPERS
# =====================================================
def get_github_activity(org_names):
    total_commits = 0
    for org in org_names:
        try:
            url = f"https://api.github.com/orgs/{org}/repos"
            response = requests.get(url, headers=HEADERS, timeout=10)
            if response.status_code == 200:
                repos = sorted(response.json(), key=lambda x: x.get('stargazers_count', 0), reverse=True)
                for repo in repos[:3]:
                    commits_url = repo['commits_url'].replace('{/sha}', '') + '?per_page=100'
                    commit_res = requests.get(commits_url, headers=HEADERS, timeout=10)
                    if commit_res.status_code == 200:
                        total_commits += len(commit_res.json())
        except Exception:
            continue
    return total_commits


def get_hiring_velocity(company_name, country="us"):
    """Fetches job postings count via Adzuna API."""
    import requests
    APP_ID = "ab4c753e"
    APP_KEY = "b20e95cc52342837df4285c25d2c50d4"

    try:
        url = f"https://api.adzuna.com/v1/api/jobs/{country}/search/1"
        params = {
            "app_id": APP_ID,
            "app_key": APP_KEY,
            "results_per_page": 50,
            "what_and": company_name,
            "max_days_old": 30,
            "content-type": "application/json"
        }

        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()

        data = response.json()
        return data.get("count", 0)

    except Exception as e:
        print(f"❌ Adzuna API error: {e}")
        return 0


def get_trends_momentum(keyword):
    try:
        pytrends = TrendReq(hl='en-US', tz=360)
        pytrends.build_payload([keyword], cat=0, timeframe='today 3-m', geo='', gprop='')
        df = pytrends.interest_over_time()
        if df.empty or len(df) < 8:
            return 0
        last_4_weeks = df[keyword].iloc[-4:].mean()
        previous_4_weeks = df[keyword].iloc[-8:-4].mean()
        return round(((last_4_weeks - previous_4_weeks) / previous_4_weeks) * 100) if previous_4_weeks > 0 else 0
    except Exception:
        return 0


# =====================================================
# 6. CORE ANALYSIS ENGINE (LIGHTWEIGHT VERSION)
# =====================================================
def analyze_company_investment(query):
    print(f"\n🔎 Researching '{query}'...")
    query_upper = query.upper()
    db_entry, info, ticker = None, None, None

    if query_upper in COMPANY_DATABASE:
        db_entry = COMPANY_DATABASE[query_upper]
        ticker = query_upper
    else:
        for t, c in COMPANY_DATABASE.items():
            if query.lower() in c['name'].lower():
                db_entry, ticker = c, t
                break

    if db_entry:
        info = {'ticker': ticker, 'name': db_entry['name']}
        print(f"✅ Found '{query}' in database as {info['name']} ({info['ticker']}).")
        config = db_entry
    else:
        print(f"'{query}' not in internal database. Searching with yfinance...")
        try:
            info_data = yf.Ticker(query).info
            if not info_data or 'shortName' not in info_data:
                print(f"❌ Error: Could not find a publicly traded company for '{query}'.")
                return
            name = info_data.get('shortName', info_data.get('longName', query))
            info = {'ticker': info_data['symbol'], 'name': name}
            print(f"✅ yfinance found: {name} ({info['ticker']}).")
            name_for_search = name.split(' ')[0].replace(',', '').lower()
            config = {'name': name, 'subreddits': [name_for_search, 'investing', 'stocks'], 'github': [name_for_search], 'trends': name}
        except Exception:
            print(f"❌ Error: yfinance lookup failed for '{query}'.")
            return

    company_name, ticker = info['name'], info['ticker']
    print(f"🤖 Starting alternative data analysis for {company_name} ({ticker})... Please wait.")
    print("-" * 60)

    signals = {}
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
        future_reddit = executor.submit(get_reddit_sentiment, company_name, config['subreddits'])
        future_github = executor.submit(get_github_activity, config['github'])
        future_hiring = executor.submit(get_hiring_velocity, company_name)
        future_trends = executor.submit(get_trends_momentum, config['trends'])

        signals['Reddit Sentiment'], signals['Posts Analyzed'] = future_reddit.result()
        signals['GitHub Commits (30 days)'], signals['Job Postings'] = future_github.result(), future_hiring.result()
        signals['Trends Momentum (3-Mo)'] = f"{future_trends.result()}%"

    print("📊 Raw Alternative Data Signals:")
    for key, value in signals.items():
        print(f"  - {key}: {value}")
    print("-" * 60)

    # =====================================================
    # LIGHTWEIGHT VERDICT GENERATOR
    # =====================================================
    print("🧠 Generating in-depth but lightweight verdict...")

    reddit_score = signals['Reddit Sentiment']
    commits = signals['GitHub Commits (30 days)']
    jobs = signals['Job Postings']
    trend = int(str(signals['Trends Momentum (3-Mo)']).replace('%','') or 0)

    # Normalize and weight factors
    score = (reddit_score * 40) + (commits * 0.1) + (jobs * 0.3) + (trend * 1.5)

    # Determine verdict category
    if score > 60:
        verdict = "Bullish"
        reason_parts = [
            "Robust hiring and engineering activity indicate ongoing expansion.",
            "Positive sentiment and consistent growth in momentum show investor trust.",
            "Signals point toward long-term sustainability and innovation strength."
        ]
    elif score > 20:
        verdict = "Slightly Bullish"
        reason_parts = [
            "Moderate hiring trends and stable sentiment suggest steady performance.",
            "Developer activity supports a healthy product pipeline.",
            "Market confidence appears to be cautiously optimistic."
        ]
    elif score > -20:
        verdict = "Neutral"
        reason_parts = [
            "Mixed data trends — steady developer output but lukewarm sentiment.",
            "Hiring and innovation appear stable, without major growth signals.",
            "Could indicate a consolidation phase or balanced market perception."
        ]
    elif score > -50:
        verdict = "Bearish"
        reason_parts = [
            "Negative sentiment and declining trends suggest weakening confidence.",
            "Low hiring or tech activity may signal reduced future growth.",
            "Investors may adopt a wait-and-see approach in the near term."
        ]
    else:
        verdict = "Strongly Bearish"
        reason_parts = [
            "Severe sentiment decline and minimal developer engagement observed.",
            "Hiring stagnation points to strategic pullback or internal challenges.",
            "High caution recommended — company outlook appears weak in the short term."
        ]

    reason = " ".join(reason_parts)  # join all reasons into one string
    verdict_text = f"**Verdict:** {verdict}\n**Analysis:** {reason}"

    print("\n📈 Final Verdict:")
    print(verdict_text)

    print("\n" + "=" * 60)
    print("Disclaimer: This is not financial advice. It is an automated analysis based on public web data.")


# =====================================================
# 7. INTERACTIVE LOOP
# =====================================================
def start_analysis_tool():
    print("\n" + "=" * 60)
    print("🏛️ Welcome to the Universal Investment Analyzer (v5 - Lightweight)")
    print("=" * 60)

    while True:
        user_input = input("\n➡️ Analyze Company (or type 'quit' to exit): ")
        if user_input.lower() == 'quit':
            print("Exiting analysis tool. Goodbye!")
            break
        if user_input:
            analyze_company_investment(user_input)


# =====================================================
# 8. RUN
# =====================================================
if __name__ == "__main__":
    start_analysis_tool()
