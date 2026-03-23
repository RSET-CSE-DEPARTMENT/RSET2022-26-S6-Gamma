from fastapi import APIRouter
import requests

router = APIRouter()

Y_HEADERS = {"User-Agent": "Mozilla/5.0"}

@router.get("/api/stock/{symbol}")
def get_stock(symbol: str):
    try:
        url = f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}?interval=5m&range=1d"
        r = requests.get(url, headers=Y_HEADERS, timeout=10)
        return r.json()
    except Exception as e:
        return {"error": str(e)}


@router.get("/api/news")
def get_news():
    api_key = "3fdcb86666e1eeb08c7611a418bc3d9e"

    try:
        url = (
            f"https://gnews.io/api/v4/top-headlines"
            f"?category=business&lang=en&country=in&max=5&apikey={api_key}"
        )
        r = requests.get(url, timeout=10)
        return r.json()
    except Exception as e:
        return {"error": str(e)}