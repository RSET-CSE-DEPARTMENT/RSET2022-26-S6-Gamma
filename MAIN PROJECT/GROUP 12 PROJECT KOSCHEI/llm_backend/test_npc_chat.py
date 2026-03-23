# test_npc_chat.py
import requests
url = "http://127.0.0.1:8000/chat"
for msg in ["hey anyone near Church?", "Where were you last round?", "I was fixing wires in Pavillion"]:
    r = requests.post(url, json={"player_id":"p1", "message": msg})
    print("PLAYER:", msg)
    print("NPC :", r.json().get("npc_reply"))
