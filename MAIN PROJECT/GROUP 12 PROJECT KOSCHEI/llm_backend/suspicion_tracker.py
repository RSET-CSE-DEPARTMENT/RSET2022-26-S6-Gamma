# suspicion_tracker.py - TRACK SUSPICION BETWEEN PLAYERS
# Key change: detect real suspicion signals from natural language,
# not just exact keyword hits on "suspicious"/"impostor".

import re
import time
from typing import Dict, List, Tuple
from collections import defaultdict


# ─────────────────────────────────────────────────────────────────────────────
# Signal patterns  (pattern, weight)
# Higher weight = stronger suspicion signal
# ─────────────────────────────────────────────────────────────────────────────
_SUSPICION_SIGNALS: List[Tuple[str, float]] = [
    # Explicit accusations
    (r'\bimpostor\b',               3.0),
    (r'\bit\'?s\s+(?:you|them)\b',  3.0),
    (r'\blying\b',                  2.5),
    (r'\bliar\b',                   2.5),
    (r'\bnot\s+human\b',            3.0),
    # Direct suspicion words
    (r'\bsus\b',                    1.5),
    (r'\bsuspicious\b',             2.0),
    (r'\bsketch\w*\b',              1.0),
    (r'\bweird\b',                  0.5),
    (r'\boff\b',                    0.3),
    # Behavioural challenges
    (r'\bwhere\s+were\s+you\b',     1.0),
    (r'\bwhere\s+was\s+\w+\b',      0.8),
    (r'\bwhy\s+(?:were|was|are|is)\b', 0.5),
    (r'\byou\s+weren\'?t\s+there\b', 1.5),
    (r'\bsaw\s+you\b',              1.0),
    (r'\bdidn\'?t\s+see\s+you\b',   1.2),
    (r'\bnot\s+there\b',            1.0),
    (r'\bacting\s+(?:weird|strange|off)\b', 0.8),
    (r'\bdon\'?t\s+trust\b',        1.5),
    (r'\bnot\s+sure\s+about\b',     0.8),
    # Accusation phrases
    (r'\bi\s+think\s+it\'?s\b',     2.0),
    (r'\bvote\s+(?:out|off)\b',     2.5),
    (r'\beject\b',                  2.5),
    (r'\bkick\b',                   1.5),
]

_COMPILED_SIGNALS = [(re.compile(p, re.IGNORECASE), w) for p, w in _SUSPICION_SIGNALS]


def detect_suspicion_weight(message: str) -> float:
    """Return total suspicion weight from a message (0 = none)."""
    total = 0.0
    for pattern, weight in _COMPILED_SIGNALS:
        if pattern.search(message):
            total += weight
    return total


def extract_accused_player(message: str, known_players: List[str]) -> List[str]:
    """
    Try to find which player(s) are being accused in a message.
    Returns list of matching player IDs.
    """
    accused = []
    msg_lower = message.lower()
    for pid in known_players:
        if pid.lower() in msg_lower:
            accused.append(pid)
    # Also catch generic "Player N" patterns not yet in known_players
    for m in re.findall(r'[Pp]layer\s*\d+', message):
        pid = m.replace(' ', '')
        if pid not in accused:
            accused.append(pid)
    return accused


class SuspicionTracker:
    """
    Tracks suspicion levels between players.

    Scoring:
      Direct accusation ("it's you", "impostor")  : +3.0
      Indirect suspicion ("sus", "weird", etc.)   : +0.3 – 2.0 (signal-weighted)
      Defense of someone                           : -2.0
      Alibi provided                               : -1.0
    """

    def __init__(self):
        # suspicion_matrix[accuser][accused] = cumulative score
        self.suspicion_matrix: Dict[str, Dict[str, float]] = defaultdict(
            lambda: defaultdict(float)
        )
        self.suspicion_reasons: Dict[Tuple[str, str], List[str]] = defaultdict(list)
        self.last_update: Dict[Tuple[str, str], float] = {}

    # ── Write ─────────────────────────────────────────────────────────────────

    def add_accusation(self, accuser: str, accused: str,
                       reason: str = "", weight: float = 3.0):
        self.suspicion_matrix[accuser][accused] += weight
        self.suspicion_reasons[(accuser, accused)].append(f"Accused: {reason}")
        self.last_update[(accuser, accused)] = time.time()
        print(f"   📊 Suspicion: {accuser} → {accused} "
              f"(+{weight:.1f}) = {self.suspicion_matrix[accuser][accused]:.1f}")

    def add_suspicion(self, accuser: str, accused: str,
                      reason: str = "", weight: float = 1.0):
        self.suspicion_matrix[accuser][accused] += weight
        self.suspicion_reasons[(accuser, accused)].append(f"Suspicious: {reason}")
        self.last_update[(accuser, accused)] = time.time()

    def add_defense(self, defender: str, defended: str,
                    reason: str = "", weight: float = -2.0):
        self.suspicion_matrix[defender][defended] += weight
        self.suspicion_reasons[(defender, defended)].append(f"Defended: {reason}")
        self.last_update[(defender, defended)] = time.time()

    def process_message(self, speaker: str, message: str,
                        known_players: List[str]):
        """
        Automatically extract suspicion signals from any message and update
        the tracker.  Call this for every incoming player message.
        """
        weight = detect_suspicion_weight(message)
        if weight <= 0:
            return

        # Who is being accused?
        targets = extract_accused_player(message, known_players)

        # Remove self-accusation
        targets = [t for t in targets if t.lower() != speaker.lower()]

        if targets:
            per_target = weight / len(targets)
            for target in targets:
                if weight >= 2.5:
                    self.add_accusation(speaker, target,
                                        reason=message[:60], weight=per_target)
                else:
                    self.add_suspicion(speaker, target,
                                       reason=message[:60], weight=per_target)
        # No named target — add diffuse suspicion against "unknown"
        # (useful for tracking that the group is generally on alert)

    # ── Read ──────────────────────────────────────────────────────────────────

    def get_most_suspected(self, limit: int = 3) -> List[Tuple[str, float]]:
        total: Dict[str, float] = defaultdict(float)
        for accused_dict in self.suspicion_matrix.values():
            for accused, score in accused_dict.items():
                if score > 0:
                    total[accused] += score
        return sorted(total.items(), key=lambda x: x[1], reverse=True)[:limit]

    def get_least_suspected(self, limit: int = 3) -> List[Tuple[str, float]]:
        total: Dict[str, float] = defaultdict(float)
        for accused_dict in self.suspicion_matrix.values():
            for accused, score in accused_dict.items():
                total[accused] += score
        return sorted(total.items(), key=lambda x: x[1])[:limit]

    def who_suspects(self, player_id: str) -> List[Tuple[str, float]]:
        out = []
        for accuser, d in self.suspicion_matrix.items():
            if player_id in d and d[player_id] > 0:
                out.append((accuser, d[player_id]))
        return sorted(out, key=lambda x: x[1], reverse=True)

    def get_suspicion_score(self, accuser: str, accused: str) -> float:
        return self.suspicion_matrix[accuser].get(accused, 0.0)

    def get_suspicion_summary(self) -> str:
        if not self.suspicion_matrix:
            return "No suspicions recorded"
        lines = ["📊 SUSPICION SUMMARY:"]
        for player, score in self.get_most_suspected(5):
            by = ', '.join(f"{n}({s:.1f})" for n, s in self.who_suspects(player))
            lines.append(f"   • {player}: {score:.1f} pts (by: {by})")
        return "\n".join(lines)

    def get_strategic_target(self,
                             exclude_players: List[str] = None
                             ) -> Tuple[str, str]:
        """
        Best accusation target for the impostor.
        Prefers someone with light existing suspicion (easier to tip)
        but not already the top suspect (avoid pile-on that looks obvious).
        """
        exclude_players = exclude_players or []
        scores: Dict[str, Tuple[float, str]] = {}

        for player in self.get_all_players():
            if player in exclude_players:
                continue
            total_susp = sum(
                s for d in self.suspicion_matrix.values()
                for p, s in d.items() if p == player and s > 0
            )
            accusations_made = sum(
                1 for s in self.suspicion_matrix.get(player, {}).values() if s > 0
            )
            score = 0
            if total_susp < 2:
                score += 3; reason = "appears innocent"
            elif total_susp < 5:
                score += 2; reason = "some suspicion"
            else:
                score -= 5; reason = "already heavily suspected"
            score += -3 if accusations_made >= 2 else 2
            scores[player] = (score, reason)

        if not scores:
            return None, "no valid targets"
        best = max(scores.items(), key=lambda x: x[1][0])
        return best[0], best[1][1]

    def get_trust_scores(self, disguised_as: str,
                         conversation_buffer: list) -> Dict[str, float]:
        """
        Compute a trust score for each real player toward the impostor.
        Uses only data already present — no new signals needed.

        Score per player:
          +0.5  per message they sent in this conversation (engagement = some trust)
          -2.0  for every suspicion point they hold toward the impostor
          +1.0  if they acted on a redirect (started suspecting someone the impostor targeted)

        Positive = trusting, Negative = skeptical.
        """
        # Count messages per real player in the buffer
        msg_counts: Dict[str, int] = defaultdict(int)
        for entry in conversation_buffer:
            if not entry.get('is_impostor', False):
                msg_counts[entry['player_id']] += 1

        # Who has suspicion toward the impostor
        # suspicion_matrix[accuser][accused]
        suspicion_toward_impostor: Dict[str, float] = {
            accuser: self.suspicion_matrix[accuser].get(disguised_as, 0.0)
            for accuser in self.suspicion_matrix
        }

        # Who acted on a redirect — i.e. who suspects someone the impostor
        # seeded doubt about.  Proxy: any player who holds suspicion toward
        # someone OTHER than the impostor, weighted by how much.
        redirect_bonus: Dict[str, float] = defaultdict(float)
        for accuser, accused_dict in self.suspicion_matrix.items():
            for accused, score in accused_dict.items():
                if accused != disguised_as and score > 0:
                    # This player is suspicious of someone else — they may have
                    # believed a redirect from the impostor
                    redirect_bonus[accuser] += min(score * 0.3, 1.0)

        # Combine into a single score per player
        all_players = set(msg_counts.keys()) | set(suspicion_toward_impostor.keys())
        scores: Dict[str, float] = {}
        for pid in all_players:
            if pid == disguised_as:
                continue
            engagement  = msg_counts.get(pid, 0) * 0.5
            suspicion   = suspicion_toward_impostor.get(pid, 0.0) * -2.0
            redirected  = redirect_bonus.get(pid, 0.0)
            scores[pid] = round(engagement + suspicion + redirected, 2)

        return scores

    def get_all_players(self) -> List[str]:
        players = set(self.suspicion_matrix.keys())
        for d in self.suspicion_matrix.values():
            players.update(d.keys())
        return list(players)

    def decay_suspicion(self, decay_rate: float = 0.1):
        current = time.time()
        for (accuser, accused), t in list(self.last_update.items()):
            if current - t > 300:   # 5 minutes
                old = self.suspicion_matrix[accuser][accused]
                self.suspicion_matrix[accuser][accused] *= (1 - decay_rate)
                if abs(self.suspicion_matrix[accuser][accused]) < 0.1:
                    del self.suspicion_matrix[accuser][accused]