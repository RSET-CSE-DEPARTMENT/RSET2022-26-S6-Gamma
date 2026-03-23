# @title NOTEBOOK 1: THE "TITAN" TRAINER (3-MONTH HORIZON)
# ==============================================================================
# SPECS:
# - Horizon: 3 Months (60 Trading Days)
# - Universe: Top ~200 Indian Stocks (NIFTY 200 equivalent)
# - RAM Strategy: "Streaming Batch" (Zero Memory Crash Risk)
# - Goal: Identify fundamental 15%+ moves, not noise.
# ==============================================================================

import subprocess
import sys
import gc
import os
import torch
import torch.nn as nn
import lightgbm as lgb
import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler
from google.colab import drive
import warnings
import time

# 1. SETUP
def install(package):
    subprocess.check_call([sys.executable, "-m", "pip", "install", package])
try:
    import yfinance as yf
except ImportError:
    print("Installing yfinance...")
    install('yfinance')
    import yfinance as yf

warnings.filterwarnings('ignore')
np.random.seed(42)
torch.manual_seed(42)

print("Mounting Drive...")
drive.mount('/content/drive')
SAVE_PATH = '/content/drive/My Drive/Veridian_Models/'
if not os.path.exists(SAVE_PATH): os.makedirs(SAVE_PATH)

# 2. CONFIGURATION (THE BIG SHIFT)
SEQ_LEN = 90               # Input: Look at last 4.5 months (Quarterly Context)
PREDICTION_HORIZON = 60    # Output: Predict 3 Months ahead
PREDICTION_THRESHOLD = 0.15 # Target: >15% Return required to Buy
INPUT_DIM = 8
HIDDEN_DIM = 128           # Bigger Brain for longer patterns
EMBEDDING_DIM = 32

# 3. ARCHITECTURE
class LSTMEncoder(nn.Module):
    def __init__(self, input_dim, hidden_dim, embedding_dim):
        super(LSTMEncoder, self).__init__()
        # 2-Layer LSTM for deeper pattern recognition
        self.lstm = nn.LSTM(input_dim, hidden_dim, num_layers=2, batch_first=True, dropout=0.2)
        self.projection = nn.Linear(hidden_dim, embedding_dim)
        self.relu = nn.ReLU()

    def forward(self, x):
        out, _ = self.lstm(x)
        return self.relu(self.projection(out[:, -1, :]))

lstm_model = LSTMEncoder(INPUT_DIM, HIDDEN_DIM, EMBEDDING_DIM)
optimizer = torch.optim.Adam(lstm_model.parameters(), lr=0.001)

# 4. ROBUST DATA ENGINE
def get_technical_indicators(df):
    df = df.copy()
    if len(df) < 50: return df
    # Long-term Moving Averages for 3-month trends
    df['SMA_50'] = df['Close'].rolling(window=50).mean() # Replaces SMA_15

    delta = df['Close'].diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
    rs = gain / loss
    df['RSI'] = 100 - (100 / (1 + rs))
    df.fillna(0, inplace=True)
    return df

def process_stock_robust(ticker):
    try:
        stock = yf.Ticker(ticker)
        # Fetch MAX history to find long-term regimes
        df = stock.history(period="5y")

        # CLEANLINESS CHECK 1: Enough History?
        if len(df) < SEQ_LEN + PREDICTION_HORIZON + 50: return None, None

        # CLEANLINESS CHECK 2: Liquidity? (Skip penny stocks with 0 volume)
        if df['Volume'].iloc[-30:].mean() < 10000: return None, None

        # Dynamic Valuation
        eps = stock.info.get('trailingEps', 0)
        if eps is None or eps <= 0: eps = df['Close'].iloc[-1] / 20.0
        df['Synthetic_PE'] = df['Close'] / eps

        df = get_technical_indicators(df)

        # Features
        feature_cols = ['Open', 'High', 'Low', 'Close', 'Volume', 'SMA_50', 'RSI', 'Synthetic_PE']
        # Handle NaNs created by SMA_50
        df.dropna(subset=feature_cols, inplace=True)

        raw_data = df[feature_cols].values
        scaler = StandardScaler()
        scaled_data = scaler.fit_transform(raw_data)

        info = stock.info
        fund_static = [
            info.get('debtToEquity', 50.0) or 50.0,
            info.get('profitMargins', 0.10) or 0.10,
            info.get('returnOnEquity', 0.15) or 0.15
        ]
        return scaled_data, fund_static
    except:
        return None, None

# 5. THE "LIQUID 200" LIST
# A mix of Nifty 50, Next 50, and High-Vol Midcaps
TICKER_UNIVERSE = [
    'RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'ICICIBANK.NS', 'INFY.NS', 'HINDUNILVR.NS', 'ITC.NS', 'SBIN.NS', 'BHARTIARTL.NS', 'BAJFINANCE.NS',
    'LTIM.NS', 'KOTAKBANK.NS', 'WIPRO.NS', 'HCLTECH.NS', 'ASIANPAINT.NS', 'AXISBANK.NS', 'MARUTI.NS', 'TITAN.NS', 'SUNPHARMA.NS', 'ULTRACEMCO.NS',
    'TATAMOTORS.NS', 'ADANIENT.NS', 'POWERGRID.NS', 'ONGC.NS', 'NTPC.NS', 'JSWSTEEL.NS', 'TATASTEEL.NS', 'M&M.NS', 'HDFCLIFE.NS', 'COALINDIA.NS',
    'BAJAJFINSV.NS', 'BPCL.NS', 'BRITANNIA.NS', 'GRASIM.NS', 'EICHERMOT.NS', 'TECHM.NS', 'HINDALCO.NS', 'DRREDDY.NS', 'CIPLA.NS', 'SBILIFE.NS',
    'DIVISLAB.NS', 'ADANIPORTS.NS', 'APOLLOHOSP.NS', 'TATACONSUM.NS', 'UPL.NS', 'HEROMOTOCO.NS', 'BAJAJ-AUTO.NS', 'INDUSINDBK.NS', 'TRENT.NS',
    'ZOMATO.NS', 'PAYTM.NS', 'NAUKRI.NS', 'DLF.NS', 'PIDILITIND.NS', 'SIEMENS.NS', 'ABB.NS', 'HAL.NS', 'BEL.NS', 'VBL.NS', 'CHOLAFIN.NS',
    'HAVELLS.NS', 'GAIL.NS', 'IOC.NS', 'AMBUJACEM.NS', 'VEDL.NS', 'SHREECEM.NS', 'TVSMOTOR.NS', 'BANKBARODA.NS', 'CANBK.NS', 'PNB.NS',
    'IDFCFIRSTB.NS', 'INDHOTEL.NS', 'ASHOKLEY.NS', 'BHARATFORG.NS', 'ASTRAL.NS', 'POLYCAB.NS', 'JUBLFOOD.NS', 'PIIND.NS', 'LUPIN.NS', 'ALKEM.NS',
    'AUROPHARMA.NS', 'TORNTPHARM.NS', 'MFSL.NS', 'SRF.NS', 'IRCTC.NS', 'MUTHOOTFIN.NS', 'GODREJCP.NS', 'DABUR.NS', 'MARICO.NS', 'BERGEPAINT.NS',
    'BOSCHLTD.NS', 'CONCOR.NS', 'CUMMINSIND.NS', 'OBEROIRLTY.NS', 'GODREJPROP.NS', 'PERSISTENT.NS', 'MPHASIS.NS', 'LTTS.NS', 'COFORGE.NS',
    'SAIL.NS', 'NMDC.NS', 'JINDALSTEL.NS', 'VOLTAS.NS', 'CROMPTON.NS', 'KAJARIACER.NS', 'PAGEIND.NS', 'HONAUT.NS', 'MRF.NS', 'BALKRISIND.NS'
]

# 6. STREAMING TRAINER
def train_titan():
    print(f"\nINITIALIZING TITAN ENGINE (3-MONTH HORIZON)...")
    print(f"Targeting: 15% Returns. Universe: {len(TICKER_UNIVERSE)} Stocks.")

    X_hybrid_storage = []
    y_storage = []

    BATCH_SIZE = 15 # Process 15 stocks at a time to stay safe on RAM

    for i in range(0, len(TICKER_UNIVERSE), BATCH_SIZE):
        batch_tickers = TICKER_UNIVERSE[i : i+BATCH_SIZE]
        print(f"\nProcessing Batch {i//BATCH_SIZE + 1}...")

        batch_seq = []
        batch_fund = []
        batch_y = []

        for t in batch_tickers:
            data, fund = process_stock_robust(t)
            if data is None: continue

            # --- AGGRESSIVE SAMPLING LOGIC ---
            # Create sequences with 3-Month lookahead
            for j in range(len(data) - SEQ_LEN - PREDICTION_HORIZON):

                current_price = data[j+SEQ_LEN, 3] # Close price at Day 90
                future_price = data[j+SEQ_LEN + PREDICTION_HORIZON, 3] # Close price at Day 150

                # Calculate 3-Month Return
                roi = (future_price - current_price) / current_price

                label = 1 # Hold
                if roi > PREDICTION_THRESHOLD: label = 2    # Buy (>15% profit)
                elif roi < -PREDICTION_THRESHOLD: label = 0 # Sell (<-15% loss)

                # OVERSAMPLING: If it's a major move (Buy/Sell), memorize it!
                repeats = 1
                if label != 1: repeats = 4 # 4x Weight for major moves

                seq_window = data[j : j+SEQ_LEN]

                for _ in range(repeats):
                    batch_seq.append(seq_window)
                    batch_fund.append(fund)
                    batch_y.append(label)

        if not batch_seq: continue

        # Convert to Memory-Efficient Arrays
        X_seq_arr = np.array(batch_seq, dtype=np.float32)
        X_fund_arr = np.array(batch_fund, dtype=np.float32)
        y_arr = np.array(batch_y, dtype=np.int8)

        # 1. TRAIN LSTM ON STREAM
        print(f"  - Learning from {len(X_seq_arr)} 3-month scenarios...")
        train_tensor = torch.from_numpy(X_seq_arr)

        for epoch in range(5): # Quick updates per batch
            for k in range(0, len(train_tensor), 1024):
                mini_batch = train_tensor[k : k+1024]
                optimizer.zero_grad()
                emb = lstm_model(mini_batch)
                loss = torch.mean(emb**2)
                loss.backward()
                optimizer.step()

        # 2. EXTRACT EMBEDDINGS FOR LGBM
        with torch.no_grad():
            emb_list = []
            for k in range(0, len(train_tensor), 1024):
                 emb_list.append(lstm_model(train_tensor[k : k+1024]).numpy())
            batch_emb = np.concatenate(emb_list)

        # Store compressed features
        X_hybrid_storage.append(np.hstack([batch_emb, X_fund_arr]))
        y_storage.append(y_arr)

        # FLUSH RAM
        del X_seq_arr, X_fund_arr, y_arr, train_tensor, batch_seq, batch_fund
        gc.collect()

    # --- FINAL DECISION LAYER ---
    print("\nTraining Titan Decision Layer...")
    X_final = np.vstack(X_hybrid_storage)
    y_final = np.concatenate(y_storage)

    dtrain = lgb.Dataset(X_final, label=y_final)
    params = {
        'objective': 'multiclass', 'num_class': 3, 'metric': 'multi_logloss',
        'verbosity': -1, 'learning_rate': 0.04, 'num_leaves': 60,
        'feature_fraction': 0.8
    }
    bst = lgb.train(params, dtrain, num_boost_round=200)

    # SAVE
    print(f"\nSaving Titan Models to {SAVE_PATH}...")
    torch.save(lstm_model.state_dict(), f"{SAVE_PATH}veridian_titan_lstm.pth")
    bst.save_model(f"{SAVE_PATH}veridian_titan_lgb.txt")
    print("TRAINING COMPLETE.")

train_titan()
