# chromatesting.py - OPTIMIZED WITH GAME CONTEXT
# generate_npc_reply_fast: response-first natural conversation,
# strategic intent woven in only where appropriate.

import chromadb
import time
import re
import unicodedata
import random
from uuid import uuid4
from datetime import datetime
from typing import TYPE_CHECKING

from langchain_ollama import OllamaEmbeddings, ChatOllama
from game_context import get_response_templates, validate_response

if TYPE_CHECKING:
    from deception_strategy import DeceptionIntent

OLLAMA_BASE = "http://127.0.0.1:11434"


# ── ChromaDB setup ────────────────────────────────────────────────────────────

class OllamaWrapper:
    def __init__(self, model_name: str):
        self.embedder = OllamaEmbeddings(model=model_name, base_url=OLLAMA_BASE)
    def __call__(self, input: list[str]):
        return self.embedder.embed(input)
    def name(self):
        return "ollama"

client = chromadb.PersistentClient(path="./chroma")
embed  = OllamaWrapper("snowflake-arctic-embed")

def _safe_get(name, embedding_function):
    names = [c.name for c in client.list_collections()]
    if name in names:
        return client.get_or_create_collection(name=name)
    return client.get_or_create_collection(name=name, embedding_function=embedding_function)

player_messages = _safe_get("player_messages", embed)
game_events     = _safe_get("game_events",     embed)
npc_memory      = _safe_get("npc_memory",      embed)


def strip_non_ascii(text: str) -> str:
    text = unicodedata.normalize('NFKD', text)
    text = re.sub(r'[^ -~]', '', text)
    return re.sub(r'  +', ' ', text).strip()


# ── DB helpers ────────────────────────────────────────────────────────────────

def add_player_message_with_group(text, player_id, round_id, group_id,
                                   location="Unknown", timestamp=None):
    if timestamp is None:
        timestamp = datetime.utcnow().isoformat()
    player_messages.add(
        documents=[text],
        metadatas=[{"player_id": player_id, "round_id": round_id,
                    "group_id": group_id, "location": location,
                    "timestamp": timestamp}],
        ids=[f"msg-{uuid4()}"],
    )

def query_collection(collection, query, k=3, filters=None):
    if filters:
        return collection.query(query_texts=[query], n_results=k, where=filters)
    return collection.query(query_texts=[query], n_results=k)


# ── LLM (memory-friendly) ─────────────────────────────────────────────────────

llm = ChatOllama(
    model="llama3.2:3b",
    temperature=0.8,
    base_url=OLLAMA_BASE,
    num_ctx=512,      # raised: needs room for prompt + full reply
    num_predict=60,   # raised: was 35, too short for 1-2 sentences
    top_p=0.9,
    top_k=20,
)


def _clean_reply(raw: str) -> str:
    """Strip quotes, preamble, hard-cap at 2 sentences."""
    reply = raw.strip()
    if (reply.startswith('"') and reply.endswith('"')) or \
       (reply.startswith("'") and reply.endswith("'")):
        reply = reply[1:-1].strip()
    reply = re.sub(r'^["\']|["\']$', '', reply).strip()
    if ':' in reply and reply.index(':') < 20:
        reply = reply.split(':', 1)[1].strip()
    sentences = reply.split('. ')
    if len(sentences) > 2:
        reply = '. '.join(sentences[:2])
        if not reply.endswith('.'):
            reply += '.'
    return strip_non_ascii(reply)


def generate_npc_reply_fast(
    disguise_name: str,
    style_summary: str,
    conversation: str,
    last_message: str,
    speaker_name: str,
    group_members: list,
    intent: "DeceptionIntent",
    strategy_mode: str = "casual",
    all_players: list = None,       # every player currently in the match
) -> str:
    """
    Generate a natural reply that:
      1. Responds to what the speaker just said
      2. Weaves in strategic intent only where it fits naturally
      3. Knows all players currently in the game
      4. On invalid response: retries up to 2 times before falling back to template
    """
    nearby = [p for p in (group_members or [])
              if p != disguise_name and p != speaker_name]
    if nearby:
        nearby_line = f"Others nearby: {', '.join(nearby)}."
    elif group_members:
        nearby_line = f"Just you and {speaker_name} here right now."
    else:
        nearby_line = f"You are talking directly to {speaker_name}."

    # All players in the match — so the impostor can reference anyone by name
    all_players_clean = [p for p in (all_players or []) if p != disguise_name]
    players_line = (
        f"Players in this match: {', '.join(all_players_clean)}."
        if all_players_clean else ""
    )

    directive = intent.to_prompt_fragment()
    natural_modes = {'gather_info', 'build_trust', 'casual'}

    if strategy_mode in natural_modes:
        if intent.action == 'ask_location' and random.random() > 0.35:
            task_line = f"Respond naturally to what {speaker_name} said."
        else:
            task_line = (
                f"Respond naturally to what {speaker_name} said. "
                f"If it fits, also: {directive}"
            )
    else:
        task_line = f"Respond to {speaker_name}. Your goal: {directive}"

    def build_prompt(extra_instruction: str = "") -> str:
        return (
            f"You are {disguise_name} in Koschei Station. Scavengers everywhere.\n"
            f"Talking face-to-face with {speaker_name}. {nearby_line}\n"
            f"You have seen these players around the station before — not your first meeting.\n"
            f"{players_line}\n"
            f"Locations: Sheds, Barns, Greenhouse, Church, Pavilion.\n"
            f"Actions: collecting wood/mushrooms, cans to church, shooting scavengers.\n"
            f"Style: {style_summary}\n"
            f"NO: day/night, knives, tunnels, inventory, emojis, word Koschei. Plain text.\n"
            f"No quotes around reply.{(' ' + extra_instruction) if extra_instruction else ''}\n"
            f"\nChat:\n{conversation[-150:]}\n"
            f"\n{speaker_name}: {last_message}\n"
            f"\n{task_line}\n"
            f"{disguise_name} (1-2 casual sentences, no quotes):"
        )

    max_attempts = 3
    last_error = ""

    for attempt in range(max_attempts):
        try:
            extra = f"Avoid mentioning: {last_error}." if last_error else ""
            response = llm.invoke(build_prompt(extra))
            reply = _clean_reply(response.content or "")

            is_valid, error = validate_response(reply)
            if is_valid:
                return reply

            last_error = error
            print(f"   ⚠️ Attempt {attempt+1} invalid ({error}), retrying...")

        except Exception as e:
            print(f"   ❌ LLM error attempt {attempt+1}: {e}")
            last_error = str(e)

    # All retries failed — fall back to template
    print(f"   ⚠️ All {max_attempts} attempts failed, using template")
    return strip_non_ascii(random.choice(get_response_templates(strategy_mode)))


# ── Backward compat ───────────────────────────────────────────────────────────

class _CasualIntent:
    """Minimal intent stub for backward-compat calls."""
    action = 'casual'
    def to_prompt_fragment(self):
        return "Say something casual about the game."

def generate_npc_reply(player_text, round_id="r1",
                        imitate_player_id=None, recent_msgs=None):
    return generate_npc_reply_fast(
        disguise_name=imitate_player_id or "Player",
        style_summary="Casual gamer",
        conversation=player_text,
        last_message=player_text,
        speaker_name="someone",
        group_members=[],
        intent=_CasualIntent(),
        strategy_mode="casual",
    )