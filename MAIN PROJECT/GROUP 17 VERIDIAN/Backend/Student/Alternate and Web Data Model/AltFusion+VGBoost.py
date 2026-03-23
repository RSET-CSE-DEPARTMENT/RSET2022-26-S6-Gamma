pip install transformers xgboost yfinance pytrends requests scikit-learn joblib

# altfusion_xgb_live.py
# AltFusion-XGB: Real Alternative Data Fusion Model

import requests
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import concurrent.futures
import yfinance as yf
from pytrends.request import TrendReq
from transformers import pipeline
from xgboost import XGBRegressor
from sklearn.preprocessing import MinMaxScaler
import joblib
import os

# ==============================
# 1️⃣  Setup Sentiment Analyzer
# ==============================
sentiment_analyzer = pipeline("sentiment-analysis")

# ==============================
# 2️⃣  Fetch Reddit Sentiment
# ==============================
def fetch_reddit_sentiment(keyword):
    url = f"https://www.reddit.com/search.json?q={keyword}&sort=new&limit=20"
    headers = {'User-agent': 'AltFusionBot'}
    response = requests.get(url, headers=headers)
    if response.status_code != 200:
        return 0
    posts = response.json().get("data", {}).get("children", [])
    texts = [p["data"]["title"] for p in posts if "title" in p["data"]]
    if not texts:
        return 0
    results = sentiment_analyzer(texts)
    scores = [r["score"] if r["label"] == "POSITIVE" else -r["score"] for r in results]
    return np.mean(scores)

# ==============================
# 3️⃣  Fetch GitHub Activity
# ==============================
def fetch_github_commits(org):
    url = f"https://api.github.com/orgs/{org}/repos"
    repos = requests.get(url).json()
    if not isinstance(repos, list):
        return 0
    total = 0
    for r in repos[:5]:  # limit for performance
        commits_url = r["commits_url"].replace("{/sha}", "")
        commits = requests.get(commits_url).json()
        if isinstance(commits, list):
            total += len(commits)
    return total

# ==============================
# 4️⃣  Fetch Job Postings (Adzuna)
# ==============================
def fetch_job_postings(keyword):
    app_id = "your_app_id"
    app_key = "your_app_key"
    url = f"https://api.adzuna.com/v1/api/jobs/in/search/1?app_id={app_id}&app_key={app_key}&what={keyword}"
    resp = requests.get(url).json()
    return len(resp.get("results", []))

# ==============================
# 5️⃣  Fetch Google Trends
# ==============================
def fetch_trend_score(keyword):
    pytrends = TrendReq(hl="en-US", tz=360)
    pytrends.build_payload([keyword], timeframe="today 3-m")
    data = pytrends.interest_over_time()
    if data.empty:
        return 0
    return data[keyword].iloc[-1] - data[keyword].iloc[0]  # momentum

# ==============================
# 6️⃣  Combine Data
# ==============================
def collect_features(keyword="Tesla", github_org="teslamotors"):
    with concurrent.futures.ThreadPoolExecutor() as executor:
        reddit_future = executor.submit(fetch_reddit_sentiment, keyword)
        github_future = executor.submit(fetch_github_commits, github_org)
        jobs_future = executor.submit(fetch_job_postings, keyword)
        trends_future = executor.submit(fetch_trend_score, keyword)

        reddit = reddit_future.result()
        github = github_future.result()
        jobs = jobs_future.result()
        trends = trends_future.result()

    return {
        "timestamp": datetime.now(),
        "reddit_sentiment": reddit,
        "github_commits": github,
        "job_postings": jobs,
        "trend_score": trends
    }

# ==============================
# 7️⃣  Train or Update Model
# ==============================
def train_xgb_model(data_path="altfusion_data.csv", model_path="altfusion_xgb.pkl"):
    df = pd.read_csv(data_path)
    if len(df) < 10:
        print("⚠️ Not enough data points yet to train model.")
        return None

    X = df[["reddit_sentiment", "github_commits", "job_postings", "trend_score"]]
    y = df["target_score"]

    model = XGBRegressor(
        n_estimators=250,
        learning_rate=0.05,
        max_depth=5,
        subsample=0.8,
        colsample_bytree=0.8,
        random_state=42
    )
    model.fit(X, y)
    joblib.dump(model, model_path)
    print("✅ Model retrained and saved.")
    return model

# ==============================
# 8️⃣  Predict Live Investment Score
# ==============================
def predict_investment_score(feature_dict, model_path="altfusion_xgb.pkl"):
    model = joblib.load(model_path)
    X_live = pd.DataFrame([feature_dict])[["reddit_sentiment", "github_commits", "job_postings", "trend_score"]]
    score = model.predict(X_live)[0]
    return score

# ==============================
# 9️⃣  Main Pipeline
# ==============================
def main():
    keyword = "Tesla"
    org = "teslamotors"

    features = collect_features(keyword, org)
    print("📊 Live Features:", features)

    # Derive pseudo-target (heuristic for bootstrapping)
    # Once you collect real labels, replace this with true outcomes
    features["target_score"] = (
        features["reddit_sentiment"] * 50 +
        np.sqrt(features["github_commits"] + 1) +
        np.log1p(features["job_postings"]) * 5 +
        features["trend_score"]
    )

    # Append to dataset
    data_path = "altfusion_data.csv"
    if os.path.exists(data_path):
        df = pd.read_csv(data_path)
        df = pd.concat([df, pd.DataFrame([features])], ignore_index=True)
    else:
        df = pd.DataFrame([features])
    df.to_csv(data_path, index=False)

    # Train model if needed
    if not os.path.exists("altfusion_xgb.pkl") or len(df) % 10 == 0:
        train_xgb_model(data_path)

    # Predict live investment score
    if os.path.exists("altfusion_xgb.pkl"):
        pred = predict_investment_score(features)
        print(f"💹 Predicted Investment Score (AltFusion-XGB): {pred:.2f}")

        verdict = (
            "Strongly Bullish" if pred > 70 else
            "Bullish" if pred > 30 else
            "Neutral" if pred > -10 else
            "Bearish" if pred > -40 else
            "Strongly Bearish"
        )
        print(f"📈 Verdict: {verdict}")
    else:
        print("Model not ready yet. Collect more data.")

if __name__ == "__main__":
    main()
