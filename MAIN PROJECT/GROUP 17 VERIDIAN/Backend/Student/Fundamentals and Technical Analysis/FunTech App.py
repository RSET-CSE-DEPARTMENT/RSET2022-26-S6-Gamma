# @title VERIDIAN TITAN: FINAL MASTER EDITION
# ==============================================================================
# 1. STRICT SCORING: No free points. Banks need ROA > 1% to get high scores.
# 2. TREND VETO: Even if Score is 9/9, we HOLD if the Trend is Down.
# 3. SECTOR SMART: Automatically detects Banks vs Tech vs Industry.
# ==============================================================================

import os
import time
import warnings
import numpy as np
import pandas as pd
import torch
import torch.nn as nn
import lightgbm as lgb
import yfinance as yf
from sklearn.preprocessing import StandardScaler
from google.colab import drive

warnings.filterwarnings('ignore')

# --- 1. CONFIGURATION & DRIVE ---
SEQ_LEN = 90
INPUT_DIM = 8
HIDDEN_DIM = 128
EMBEDDING_DIM = 32

print("Mounting Drive...")
drive.mount('/content/drive')
LOAD_PATH = '/content/drive/My Drive/Veridian_Models/'

# --- 2. DEFINE MODEL ARCHITECTURE ---
class LSTMEncoder(nn.Module):
    def __init__(self):
        super(LSTMEncoder, self).__init__()
        self.lstm = nn.LSTM(INPUT_DIM, HIDDEN_DIM, num_layers=2, batch_first=True, dropout=0.2)
        self.projection = nn.Linear(HIDDEN_DIM, EMBEDDING_DIM)
        self.relu = nn.ReLU()

    def forward(self, x):
        out, _ = self.lstm(x)
        return self.relu(self.projection(out[:, -1, :]))

# --- 3. LOAD MODELS ---
print("Loading Models...")
try:
    if not os.path.exists(f"{LOAD_PATH}veridian_titan_lstm.pth"):
        raise FileNotFoundError("Model files not found!")

    lstm_model = LSTMEncoder()
    lstm_model.load_state_dict(torch.load(f"{LOAD_PATH}veridian_titan_lstm.pth", map_location=torch.device('cpu')))
    lstm_model.eval()

    bst_model = lgb.Booster(model_file=f"{LOAD_PATH}veridian_titan_lgb.txt")
    print("✅ System Online.")
except Exception as e:
    print(f"❌ Critical Error Loading Models: {e}")

# --- 4. DATA ENGINE ---
def process_data(ticker):
    stock = yf.Ticker(ticker)
    df = stock.history(period="2y")

    if len(df) < SEQ_LEN + 10: return None, None, None

    # Calculate Features
    eps = stock.info.get('trailingEps', 0)
    if eps is None or eps <= 0: eps = df['Close'].iloc[-1] / 20.0
    df['Synthetic_PE'] = df['Close'] / eps
    df['SMA_50'] = df['Close'].rolling(window=50).mean()

    delta = df['Close'].diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
    rs = gain / loss
    df['RSI'] = 100 - (100 / (1 + rs))
    df.fillna(0, inplace=True)

    features = ['Open', 'High', 'Low', 'Close', 'Volume', 'SMA_50', 'RSI', 'Synthetic_PE']
    raw = df[features].values
    scaler = StandardScaler()
    scaled = scaler.fit_transform(raw)

    info = stock.info
    fund = [info.get('debtToEquity', 50.0), info.get('profitMargins', 0.1), info.get('returnOnEquity', 0.15)]
    fund = [x if x is not None else 0 for x in fund]

    return scaled, fund, df['Close'].iloc[-1]

# --- 5. STRICT SECTOR ENGINE (The "Banking Score" Fix) ---
def get_adaptive_score(ticker):
    try:
        stock = yf.Ticker(ticker)
        info = stock.info
        sector = info.get('sector', 'Unknown')
        score = 0 # STRICT START (No free points)

        # A. BANKS & FINANCIALS
        if 'Financial' in sector or 'Bank' in sector:
            # ROA (The Truth Teller) - Max 3 Pts
            roa = info.get('returnOnAssets', 0)
            if roa > 0.012: score += 3     # Elite (>1.2%)
            elif roa > 0.010: score += 2   # Strong (>1.0%)
            elif roa > 0.007: score += 1   # Decent

            # ROE (Efficiency) - Max 2 Pts
            roe = info.get('returnOnEquity', 0)
            if roe > 0.15: score += 2      # >15% is the new benchmark
            elif roe > 0.12: score += 1

            # Valuation (Safety) - Max 2 Pts
            pb = info.get('priceToBook', 5)
            if pb < 1.5: score += 2        # Value Buy
            elif pb < 3.0: score += 1      # Fair Price

            # Growth - Max 2 Pts
            growth = info.get('revenueGrowth', 0)
            if growth > 0.15: score += 2   # High Growth
            elif growth > 0.08: score += 1

        # B. TECHNOLOGY (Rule of 40)
        elif 'Technology' in sector or 'Services' in sector:
            margin = info.get('profitMargins', 0)
            growth = info.get('revenueGrowth', 0)

            rule_40 = (margin * 100) + (growth * 100)
            if rule_40 > 50: score += 4    # Super Star
            elif rule_40 > 40: score += 3  # SaaS Standard
            elif rule_40 > 30: score += 2  # Good
            elif rule_40 > 20: score += 1  # Okay

            fcf = info.get('freeCashflow', 0)
            if fcf > 0: score += 2

            de = info.get('debtToEquity', 100)
            if de < 20: score += 3
            elif de < 50: score += 1

        # C. STANDARD INDUSTRY
        else:
            if info.get('returnOnAssets', 0) > 0: score += 1
            if info.get('operatingCashflow', 0) > 0: score += 1
            if info.get('returnOnEquity', 0) > 0.12: score += 1
            if info.get('debtToEquity', 100) < 80: score += 1
            if info.get('revenueGrowth', 0) > 0.05: score += 1
            if info.get('grossMargins', 0) > 0.20: score += 1
            if info.get('currentRatio', 0) > 1.0: score += 1
            if info.get('earningsGrowth', 0) > 0: score += 2

        return min(9, max(0, score)) # Cap at 9

    except:
        return 4 # Default to below average on error

# --- 6. API ANALYZER (With Trend Veto) ---
def analyze_api_final(ticker):
    ticker = ticker.upper().strip()
    if not ticker.endswith('.NS') and not ticker.endswith('.BO'):
        ticker += '.NS'

    # 1. Get Data
    try:
        data, fund, price = process_data(ticker)
        if data is None:
            print({'prediction': [0, 0, 0], 'confidence': 0, 'reason': 'Insufficient Data'})
            return
    except Exception as e:
        print({'prediction': [0, 0, 0], 'confidence': 0, 'reason': f'Error: {str(e)}'})
        return

    # 2. AI Inference
    seq = torch.FloatTensor(data[-SEQ_LEN:]).unsqueeze(0)
    with torch.no_grad():
        emb = lstm_model(seq).numpy()
    hybrid = np.hstack([emb, np.array(fund).reshape(1, -1)])
    probs = bst_model.predict(hybrid)[0]

    p_sell, p_hold, p_buy = probs[0], probs[1], probs[2]

    # 3. Strict Fundamental Score
    smart_score = get_adaptive_score(ticker)

    # 4. GOLDEN FORMULA
    tech_score = p_buy * 100
    fund_score = (smart_score / 9) * 100

    # --- SAFETY LOGIC (The "Math Trap" Fix) ---
    raw_score = (tech_score * 0.60) + (fund_score * 0.40)

    # RULE 1: CRASH PROTECTION
    if p_sell > 0.60:
        veridian_score = min(30, raw_score)

    # RULE 2: TREND VETO (The "Catching Knife" Fix)
    # If AI says Sell > Buy, we cap the score at 55 (HOLD), even if fundamentals are 9/9.
    elif p_sell > p_buy:
        veridian_score = min(55, raw_score)

    else:
        veridian_score = raw_score

    final_confidence = round(veridian_score / 100.0, 2)

    # 5. Output Logic
    if veridian_score >= 75:
        reason = f"Strong Buy: High AI Conviction + Elite Fundamentals (Score {smart_score})."
    elif veridian_score >= 60:
        reason = f"Buy: Positive Trend supported by Good Fundamentals (Score {smart_score})."
    elif veridian_score >= 40:
        if p_sell > p_buy:
            reason = f"Hold/Wait: Fundamentals are strong (Score {smart_score}), but Trend is Bearish."
        else:
            reason = f"Hold: Neutral Signal (Score {veridian_score:.0f})."
    else:
        reason = f"Sell: Low Score ({veridian_score:.0f}). High Risk."

    output = {
        'prediction': [round(float(p_buy), 2), round(float(p_hold), 2), round(float(p_sell), 2)],
        'confidence': final_confidence,
        'reason': reason
    }

    print(output)

# --- 7. RUN LOOP ---
print("\n✨ Veridian Titan (Master Edition) is Ready.")
while True:
    t = input("\nEnter Ticker: ")
    if t.lower() in ['exit', 'quit']: break
    analyze_api_final(t)
