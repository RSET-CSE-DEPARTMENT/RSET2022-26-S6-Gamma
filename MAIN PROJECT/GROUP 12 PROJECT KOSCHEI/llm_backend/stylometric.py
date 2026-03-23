# stylometric.py
from langchain_ollama import ChatOllama

OLLAMA_BASE = "http://127.0.0.1:11434"
llm = ChatOllama(model="llama3.2:1b", temperature=0.5, base_url=OLLAMA_BASE)

def summarize_player_style(player_id: str, messages: list[str]) -> str:
    """
    Analyzes a player's writing style for NPC imitation.
    Returns concise style description focused on mimicry.
    """
    if not messages:
        return "casual game chat, short responses"
    
    # Limit to recent messages for relevance
    recent = messages[-10:] if len(messages) > 10 else messages
    
    prompt = f"""Analyze this player's chat style for imitation in a multiplayer survival game.

Player messages:
{chr(10).join(f"- {msg}" for msg in recent)}

Describe in 2-3 SHORT sentences:
1. Message length (very short/short/medium/long)
2. Grammar style (perfect/casual/lots of typos/shorthand like "u" "ur")
3. Tone (friendly/serious/joking/sarcastic/helpful)
4. Any unique quirks (emojis, slang, phrases, ALL CAPS, punctuation style)

Keep it concise and actionable for mimicking their style."""
    
    response = llm.invoke(prompt)
    summary = response.content.strip()
    
    # Fallback if response is too long or generic
    if len(summary) > 300:
        summary = summary[:300] + "..."
    
    return summary