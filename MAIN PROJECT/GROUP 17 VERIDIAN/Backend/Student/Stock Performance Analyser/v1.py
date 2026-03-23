# ==============================================================================
# Step 1: Install and Import Necessary Libraries
# ==============================================================================
# yfinance is used to download stock data from Yahoo Finance
# tensorflow is the deep learning framework for building the LSTM model
# sklearn is for data scaling
# matplotlib is for plotting the results

!pip install yfinance tensorflow scikit-learn matplotlib

import yfinance as yf
import numpy as np
import pandas as pd
from sklearn.preprocessing import MinMaxScaler
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense, Dropout
import matplotlib.pyplot as plt
from datetime import datetime

def analyze_stock(ticker):
    """
    Fetches stock data, trains an LSTM model, predicts the next day's price,
    and provides an investment signal.
    """
    print(f"\n🚀 Starting analysis for {ticker}...")

    # --- Data Fetching ---
    try:
        end_date = datetime.now()
        start_date = datetime(end_date.year - 10, end_date.month, end_date.day)
        df = yf.download(ticker, start=start_date, end=end_date)
        df.dropna(inplace=True)
        
        if df.empty:
            print(f"❌ ERROR: No data found for ticker '{ticker}'. Please check the ticker symbol.")
            return
        print(f"✅ Data downloaded successfully. Shape: {df.shape}")
    except Exception as e:
        print(f"❌ ERROR: Failed to download data. {e}")
        return

    # --- Data Preprocessing ---
    data = df[['Close']]
    dataset = data.values
    training_data_len = int(np.ceil(len(dataset) * .95))

    scaler = MinMaxScaler(feature_range=(0,1))
    scaled_data = scaler.fit_transform(dataset)

    train_data = scaled_data[0:int(training_data_len), :]
    
    x_train = []
    y_train = []
    sequence_length = 60
    
    for i in range(sequence_length, len(train_data)):
        x_train.append(train_data[i-sequence_length:i, 0])
        y_train.append(train_data[i, 0])

    x_train, y_train = np.array(x_train), np.array(y_train)
    x_train = np.reshape(x_train, (x_train.shape[0], x_train.shape[1], 1))
    
    print("✅ Data preprocessed for LSTM model.")

    # --- Build and Train the LSTM Model ---
    model = Sequential([
        LSTM(50, return_sequences=True, input_shape=(x_train.shape[1], 1)),
        Dropout(0.2),
        LSTM(50, return_sequences=False),
        Dropout(0.2),
        Dense(1)
    ])

    model.compile(optimizer='adam', loss='mean_squared_error')
    print("🧠 Training the LSTM model... (This may take a few minutes)")
    model.fit(x_train, y_train, batch_size=32, epochs=25, verbose=0)
    print("✅ Model training complete.")

    # --- Make a Prediction ---
    last_60_days = data[-sequence_length:].values
    last_60_days_scaled = scaler.transform(last_60_days)

    X_test = [last_60_days_scaled]
    X_test = np.array(X_test)
    X_test = np.reshape(X_test, (X_test.shape[0], X_test.shape[1], 1))

    pred_price_scaled = model.predict(X_test)
    predicted_price = scaler.inverse_transform(pred_price_scaled)[0][0]

    # --- Generate Verdict ---
    # --- THE FINAL FIX ---
    last_actual_price = data.iloc[-1, 0]
    # -------------------
    
    print("\n" + "="*50)
    print(f"📊 ANALYSIS FOR {ticker.upper()}")
    print("="*50)
    print(f"Last Actual Close Price: ${last_actual_price:.2f}")
    print(f"Predicted Next Day's Close Price: ${predicted_price:.2f}")
    
    if predicted_price > last_actual_price:
        change_percent = ((predicted_price - last_actual_price) / last_actual_price) * 100
        print(f"\n📈 Verdict: BUY")
        print(f"The model predicts a potential increase of ${predicted_price - last_actual_price:.2f} ({change_percent:.2f}%).")
    else:
        change_percent = ((last_actual_price - predicted_price) / last_actual_price) * 100
        print(f"\n📉 Verdict: HOLD / SELL")
        print(f"The model predicts a potential decrease of ${last_actual_price - predicted_price:.2f} ({change_percent:.2f}%).")
        
    print("="*50)
    print("\n⚠️ DISCLAIMER: This is not financial advice. It is an automated prediction based on historical price data only.")

    # --- Visualization ---
    plt.style.use('fivethirtyeight')
    plt.figure(figsize=(16,8))
    plt.title(f'{ticker.upper()} Stock Price Prediction')
    plt.xlabel('Date', fontsize=18)
    plt.ylabel('Close Price USD ($)', fontsize=18)
    plt.plot(df['Close'])
    
    last_date = df.index[-1]
    next_day = last_date + pd.Timedelta(days=1)
    
    plt.scatter(next_day, predicted_price, color='red', lw=5, label='Predicted Next Day Price')
    plt.legend()
    plt.show()


# ==============================================================================
# Step 3: Run the Analysis
# ==============================================================================
if __name__ == "__main__":
    ticker_symbol = input("Enter the stock ticker symbol (e.g., AAPL, GOOGL, MSFT): ").strip().upper()
    analyze_stock(ticker_symbol)
