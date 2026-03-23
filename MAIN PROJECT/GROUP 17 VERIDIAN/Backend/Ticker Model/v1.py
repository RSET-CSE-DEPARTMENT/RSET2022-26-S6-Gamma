import google.generativeai as genai
from google.api_core import exceptions
import os

# --- PASTE YOUR *NEW* KEY HERE ---
# Do not use the key starting with AIza...khC_fE (it is exposed)
MY_API_KEY = "AIzaSyBxsTCKkX1NlvUldxBfJM9g-qBdtkhC_fE"

genai.configure(api_key=MY_API_KEY)

def get_ticker_symbol(user_input):
    # Use the alias that worked for your list
    model = genai.GenerativeModel('gemini-flash-latest')
    
    prompt = f"""
    You are a strict financial data converter.
    Input: "{user_input}"
    Task: Convert to the correct stock ticker symbol (e.g., AAPL).
    Rules: 
    - Output ONLY the ticker. 
    - If invalid/private, output "ERROR: Ticker not found".
    """
    
    try:
        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        return f"ERROR: {e}"

# --- INTERACTIVE LOOP ---
print("--- Veridian Ticker Finder ---")
print("Type a company name to get its ticker.")
print("Type 'exit' or 'quit' to stop.\n")

while True:
    # Get input from the user
    user_query = input("Enter company name: ").strip()
    
    # Check for exit command
    if user_query.lower() in ['exit', 'quit']:
        print("Exiting...")
        break
    
    # Skip empty inputs
    if not user_query:
        continue

    # Get and print result
    print("Searching...")
    result = get_ticker_symbol(user_query)
    print(f"ticker: {result}")
    print("-" * 30)
