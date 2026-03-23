# client.py
import requests

BASE = "http://127.0.0.1:8000"  # change to your server URL if using ngrok or remote host

print("Simple client for OS RAG server")
topic = input("Topic label (used for chat memory scoping, e.g. 'os'): ").strip() or "os"

while True:
    q = input("Ask a question (or type 'exit'): ").strip()
    if q.lower() in ("exit", "quit"):
        break
    payload = {"topic": topic, "question": q}
    try:
        r = requests.post(f"{BASE}/ask", json=payload, timeout=60)
        if r.ok:
            print("Answer:\n", r.json().get("answer"))
        else:
            print("Server error:", r.status_code, r.text)
    except Exception as e:
        print("Request failed:", e)
