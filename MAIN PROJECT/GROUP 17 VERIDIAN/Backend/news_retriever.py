import requests
import os
import re

NEWS_API_KEY = os.getenv("NEWS_API_KEY", "c6d9641ef6b44ac1ad7d7eddf869b6a5")


def fetch_finance_news(query: str, max_articles: int = 3) -> str:
    url = "https://newsapi.org/v2/everything"
    
    # Enhance query for better finance news results
    finance_terms = ["finance", "market", "economy", "stock", "investment", "trading"]
    if not any(term in query.lower() for term in finance_terms):
        enhanced_query = f"{query} finance OR market"
    else:
        enhanced_query = query

    params = {
        "q": enhanced_query,
        "apiKey": NEWS_API_KEY,
        "language": "en",
        "sortBy": "relevancy",  # Changed from publishedAt for better relevance
        "pageSize": max_articles,
    }

    try:
        print(f"Fetching news for: {enhanced_query}")
        res = requests.get(url, params=params, timeout=10)
        res.raise_for_status()
        data = res.json()

        articles = data.get("articles", [])
        if not articles:
            print("No articles found")
            return ""

        summaries = []
        for a in articles:
            title = a.get("title", "").strip()
            desc = a.get("description", "").strip()
            source = a.get("source", {}).get("name", "")
            date = a.get("publishedAt", "")[:10]
            
            # Clean up title and description
            title = re.sub(r'\[.*?\]', '', title).strip()
            desc = re.sub(r'\[.*?\]', '', desc).strip()
            
            if title and len(title) > 15:  # Filter out very short titles
                summary = f"[{source}, {date}] {title}"
                if desc and len(desc) > 20:
                    summary += f". {desc}"
                summaries.append(summary)

        result = "\n\n".join(summaries[:max_articles])
        print(f"Fetched {len(summaries)} news items")
        return result

    except requests.exceptions.RequestException as e:
        print(f"⚠️ News fetch network error: {e}")
        return ""
    except Exception as e:
        print(f"⚠️ News fetch error: {e}")
        return ""