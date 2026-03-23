# player_profiling.py - PLAYER BEHAVIOR & STATEMENT TRACKING
# Key change: profiles now store extracted "facts" that survive across conversations.
# These facts become the impostor's raw material for believable lies.

from dataclasses import dataclass, field
from typing import List, Dict, Optional
from datetime import datetime
from collections import deque
import re

VALID_LOCATIONS = ["sheds", "barns", "greenhouse", "church", "pavilion"]
VALID_ACTIONS   = ["collecting wood", "collecting mushrooms", "burning wood",
                   "burning mushrooms", "taking cans", "shooting aliens", "bringing food"]

@dataclass
class PlayerStatement:
    timestamp: str
    location: str
    statement: str
    category: str  # 'location','action','observation','accusation','defense','general'
    mentioned_players: List[str] = field(default_factory=list)
    mentioned_locations: List[str] = field(default_factory=list)


@dataclass
class PlayerFact:
    """
    A verified or claimed fact about a player — persists across conversations.
    The impostor draws on these to construct lies that sound like the real player.

    source: 'claimed'  — player said this themselves
            'observed' — another player reported seeing them
            'inferred' — extracted from context
    """
    fact_type: str       # 'location', 'action', 'observation', 'claim'
    description: str     # e.g. "was at Sheds collecting wood"
    source: str          # 'claimed' | 'observed' | 'inferred'
    round_id: str
    timestamp: str
    confidence: float = 1.0


@dataclass
class PlayerProfile:
    player_id: str

    # ── Communication style ──────────────────────────────────────────────────
    avg_message_length: float = 5.0
    uses_caps: bool = False
    uses_punctuation: bool = True
    common_phrases: List[str] = field(default_factory=list)
    style_summary: Optional[str] = None   # cached LLM style summary

    # ── Per-conversation rolling buffer ──────────────────────────────────────
    statements: deque = field(default_factory=lambda: deque(maxlen=50))

    # ── PERSISTENT FACTS — the impostor's lie-bank ───────────────────────────
    # Populated at the end of each conversation via extract_facts_from_conversation()
    known_facts: List[PlayerFact] = field(default_factory=list)

    # ── Frequency counters ───────────────────────────────────────────────────
    locations_visited: Dict[str, int] = field(default_factory=dict)
    actions_mentioned: Dict[str, int] = field(default_factory=dict)
    players_mentioned: Dict[str, int] = field(default_factory=dict)

    # ── Suspicion data ───────────────────────────────────────────────────────
    accused_by: Dict[str, int] = field(default_factory=dict)
    accused_others: Dict[str, int] = field(default_factory=dict)

    def add_statement(self, statement: str, location: str, category: str,
                      mentioned_players: List[str] = None,
                      mentioned_locations: List[str] = None):
        stmt = PlayerStatement(
            timestamp=datetime.utcnow().isoformat(),
            location=location,
            statement=statement,
            category=category,
            mentioned_players=mentioned_players or [],
            mentioned_locations=mentioned_locations or [],
        )
        self.statements.append(stmt)
        if location and location != "Unknown":
            self.locations_visited[location] = self.locations_visited.get(location, 0) + 1
        for p in (mentioned_players or []):
            self.players_mentioned[p] = self.players_mentioned.get(p, 0) + 1

    def add_fact(self, fact_type: str, description: str, source: str,
                 round_id: str = "r1", confidence: float = 1.0):
        """Persist a fact; skip exact duplicates; cap at 30."""
        if any(f.description == description for f in self.known_facts):
            return
        self.known_facts.append(PlayerFact(
            fact_type=fact_type, description=description,
            source=source, round_id=round_id,
            timestamp=datetime.utcnow().isoformat(),
            confidence=confidence,
        ))
        if len(self.known_facts) > 30:
            self.known_facts = self.known_facts[-30:]

    def get_alibi_facts(self, limit: int = 5) -> List[PlayerFact]:
        """Most recent location/action/claim facts — used for alibi generation."""
        relevant = [f for f in self.known_facts
                    if f.fact_type in ('location', 'action', 'claim')]
        return relevant[-limit:]

    def get_facts_as_text(self, limit: int = 5) -> str:
        """
        Compact text for the LLM prompt.
        e.g. "was at Sheds; collecting wood; saw Player3 at Church"
        """
        facts = self.get_alibi_facts(limit)
        if not facts:
            return ""
        return "; ".join(f.description for f in facts)

    def get_recent_statements(self, n: int = 10,
                              category: Optional[str] = None) -> List[PlayerStatement]:
        if category:
            return [s for s in list(self.statements)[-n:] if s.category == category]
        return list(self.statements)[-n:]

    def update_style(self, message: str):
        words = message.split()
        total = len(self.statements)
        if total > 0:
            self.avg_message_length = (
                self.avg_message_length * total + len(words)
            ) / (total + 1)
        if any(w.isupper() and len(w) > 1 for w in words):
            self.uses_caps = True
        if any(c in message for c in '!?.'):
            self.uses_punctuation = True

    def to_dict(self) -> dict:
        return {
            'player_id': self.player_id,
            'avg_message_length': self.avg_message_length,
            'uses_caps': self.uses_caps,
            'uses_punctuation': self.uses_punctuation,
            'style_summary': self.style_summary,
            'known_facts': [
                {'fact_type': f.fact_type, 'description': f.description,
                 'source': f.source, 'round_id': f.round_id,
                 'timestamp': f.timestamp, 'confidence': f.confidence}
                for f in self.known_facts[-10:]
            ],
            'statements': [
                {'timestamp': s.timestamp, 'location': s.location,
                 'statement': s.statement, 'category': s.category,
                 'mentioned_players': s.mentioned_players,
                 'mentioned_locations': s.mentioned_locations}
                for s in list(self.statements)[-20:]
            ],
            'locations_visited': self.locations_visited,
            'actions_mentioned': self.actions_mentioned,
            'players_mentioned': self.players_mentioned,
            'accused_by': self.accused_by,
            'accused_others': self.accused_others,
        }


# ─────────────────────────────────────────────────────────────────────────────
# Fact extraction
# ─────────────────────────────────────────────────────────────────────────────

_LOCS_RE = "|".join(VALID_LOCATIONS)

def extract_facts_from_message(message: str, round_id: str = "r1") -> List[PlayerFact]:
    """Rule-based fact extraction from one player message."""
    facts: List[PlayerFact] = []
    msg = message.lower()

    # Location claims
    for m in re.finditer(
        r'\b(?:i was|i\'m|im|i am|at|heading to|went to|near)\s+(?:the\s+)?(' + _LOCS_RE + r')\b',
        msg,
    ):
        loc = m.group(1).capitalize()
        facts.append(PlayerFact('location', f"was at {loc}", 'claimed', round_id,
                                datetime.utcnow().isoformat()))

    # Action claims
    for action in VALID_ACTIONS:
        if action in msg:
            facts.append(PlayerFact('action', action, 'claimed', round_id,
                                    datetime.utcnow().isoformat()))

    # Observations about others ("saw Player2 at church")
    m = re.search(
        r'\b(?:saw|spotted|noticed)\s+(player\s*\d+)\s+(?:at|near)\s+(?:the\s+)?(' + _LOCS_RE + r')\b',
        msg,
    )
    if m:
        facts.append(PlayerFact(
            'observation',
            f"saw {m.group(1).title().replace(' ','')} at {m.group(2).capitalize()}",
            'claimed', round_id, datetime.utcnow().isoformat(),
        ))

    return facts


def extract_facts_from_conversation(
    player_id: str,
    conversation_buffer: list,
    profile: "PlayerProfile",
    round_id: str = "r1",
):
    """
    Called at end of each conversation.
    Scans messages the real player sent and saves extracted facts to their profile.
    """
    added = 0
    for msg_dict in conversation_buffer:
        if msg_dict.get('player_id') != player_id:
            continue
        if msg_dict.get('is_impostor', False):
            continue
        for fact in extract_facts_from_message(msg_dict.get('message', ''), round_id):
            before = len(profile.known_facts)
            profile.add_fact(fact.fact_type, fact.description, fact.source, round_id)
            if len(profile.known_facts) > before:
                added += 1

    print(f"   📌 Facts saved for {player_id}: +{added} new, {len(profile.known_facts)} total")


# ─────────────────────────────────────────────────────────────────────────────
# Manager
# ─────────────────────────────────────────────────────────────────────────────

class PlayerProfileManager:

    def __init__(self):
        self.profiles: Dict[str, PlayerProfile] = {}

    def get_or_create_profile(self, player_id: str) -> PlayerProfile:
        if player_id not in self.profiles:
            self.profiles[player_id] = PlayerProfile(player_id=player_id)
        return self.profiles[player_id]

    def analyze_message(self, player_id: str, message: str,
                        location: str = "Unknown") -> PlayerStatement:
        profile = self.get_or_create_profile(player_id)
        msg = message.lower()

        category = "general"
        mentioned_locations = []
        for loc in VALID_LOCATIONS:
            if loc in msg:
                mentioned_locations.append(loc.capitalize())
                category = "location"

        if any(w in msg for w in ["collected","collecting","found","fighting",
                                   "burned","burning","went to","took","taking"]):
            category = "action"
        if any(w in msg for w in ["saw","seen","noticed","spotted","watched"]):
            category = "observation"
        if any(w in msg for w in ["suspicious","sus","lying","liar",
                                   "impostor","it's you","you're the"]):
            category = "accusation"
        if any(w in msg for w in ["wasn't me","i didn't","i was at","i swear","not me"]):
            category = "defense"

        mentioned_players = list(set(re.findall(r'[Pp]layer\s*\d+', message)))

        profile.add_statement(message, location, category,
                              mentioned_players, mentioned_locations)
        profile.update_style(message)
        return profile.statements[-1]

    def get_player_summary(self, player_id: str) -> str:
        if player_id not in self.profiles:
            return f"{player_id}: No data"
        p = self.profiles[player_id]
        parts = [f"Profile of {player_id}:"]
        parts.append(f"  Style: {'Brief' if p.avg_message_length < 5 else 'Detailed'} messages")
        if p.locations_visited:
            top = sorted(p.locations_visited.items(), key=lambda x: x[1], reverse=True)[:3]
            parts.append(f"  Locations: {', '.join(f'{l}({c})' for l,c in top)}")
        if p.known_facts:
            parts.append(f"  Known facts: {p.get_facts_as_text(3)}")
        if p.accused_by:
            parts.append(f"  Accused by: {', '.join(p.accused_by.keys())}")
        return "\n".join(parts)

    def get_all_profiles_summary(self) -> str:
        if not self.profiles:
            return "No player data"
        return "\n\n".join(self.get_player_summary(pid) for pid in self.profiles)