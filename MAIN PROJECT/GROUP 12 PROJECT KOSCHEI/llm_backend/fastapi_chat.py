# fastapi_chat.py - V5.0 FACT-BASED DECEPTIVE IMPOSTOR
# Key changes vs V4:
#   - Suspicion tracker reads ALL messages (not just keyword hits)
#   - Facts extracted from conversation at end → stored in PlayerProfile
#   - DeceptionStrategy produces a DeceptionIntent (structured WHAT)
#   - LLM only does style rendering (HOW) — smaller, cleaner prompt
#   - Conversation arc: gather → trust → seed_doubt/accuse
#   - Style summary generated once at conversation start, cached for whole convo

from fastapi import FastAPI, Body
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, List, Optional, Tuple
import time
import random
from datetime import datetime, timezone
from collections import deque
import uvicorn

from player_profiling import (
    PlayerProfileManager, PlayerProfile,
    extract_facts_from_conversation,
    extract_facts_from_message,
)
from suspicion_tracker import SuspicionTracker
from deception_strategy import DeceptionStrategy, DeceptionMode, DeceptionIntent

from chromatesting import (
    generate_npc_reply_fast,
    add_player_message_with_group,
    query_collection,
    player_messages,
)

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ═══════════════════════════════════════════════════════════════════════════════
# GLOBAL STATE
# ═══════════════════════════════════════════════════════════════════════════════

profile_manager   = PlayerProfileManager()
suspicion_tracker = SuspicionTracker()

recent_history: Dict[str, deque] = {}
active_players: set = set()

current_groups: Dict[str, Dict] = {}
last_group_update_time: float = 0.0

global_message_buffer: deque = deque(maxlen=40)
global_summary: str = "Match just started. Players are exploring."
game_start_time: float = time.time()   # set when server starts; reset on /session/reset


# ═══════════════════════════════════════════════════════════════════════════════
# CONVERSATION STATE
# ═══════════════════════════════════════════════════════════════════════════════

class ConversationState:

    def __init__(self, group_id: str, disguise_player_id: str,
                 group_members: List[str] = None):
        self.group_id           = group_id
        self.disguise_player_id = disguise_player_id
        # Players physically nearby — known at conversation start from group data
        self.group_members: List[str] = group_members or []

        self.buffer: deque = deque(maxlen=20)

        # Style summary — generated ONCE at conversation start from player history
        self.style_summary: Optional[str] = None

        # Strategy engine
        self.strategy = DeceptionStrategy(disguise_player_id)

        # Timing / limits
        self.started_at              = time.time()
        self.last_activity           = time.time()
        self.last_impostor_response  = 0.0
        self.goodbye_detected        = False
        self.message_count           = 0
        self.impostor_message_count  = 0
        self.max_messages            = 30
        self.idle_timeout            = 90

    def add_message(self, player_id: str, message: str, is_impostor: bool):
        self.buffer.append({
            "player_id":   player_id,
            "message":     message,
            "is_impostor": is_impostor,
            "timestamp":   time.time(),
        })
        self.last_activity = time.time()
        self.message_count += 1
        if is_impostor:
            self.impostor_message_count  += 1
            self.last_impostor_response   = time.time()
            self.strategy.message_count  += 1   # advance the temporal arc

        # ── Suspicion detection on every real player message ──────────────────
        if not is_impostor:
            known = list(profile_manager.profiles.keys())
            suspicion_tracker.process_message(player_id, message, known)

            # Also detect if the disguised player is being accused directly
            if self.disguise_player_id.lower() in message.lower():
                from suspicion_tracker import detect_suspicion_weight
                w = detect_suspicion_weight(message)
                if w >= 1.5:
                    self.strategy.has_been_accused = True
                    self.strategy.accusation_count += 1
                    print(f"   ⚠️ Impostor ({self.disguise_player_id}) accused! "
                          f"weight={w:.1f}")

            # ── Mid-convo fact extraction during GATHER_INFO ──────────────────
            # When the impostor is asking questions, immediately extract facts from
            # player replies so the strategy layer knows what was learned and can
            # advance the arc as soon as intel is sufficient — not just at convo end.
            if self.strategy.current_mode == DeceptionMode.GATHER_INFO:
                new_facts = extract_facts_from_message(message, round_id="r1")
                if new_facts:
                    profile = profile_manager.get_or_create_profile(player_id)
                    added = 0
                    for fact in new_facts:
                        before = len(profile.known_facts)
                        profile.add_fact(fact.fact_type, fact.description,
                                         fact.source, round_id="r1")
                        if len(profile.known_facts) > before:
                            added += 1
                    if added:
                        self.strategy.facts_gathered += added
                        print(f"   📥 Mid-convo: +{added} facts from {player_id} "
                              f"(total gathered={self.strategy.facts_gathered})")

    def should_respond(self, last_msg_player_id: str) -> Tuple[bool, str]:
        if last_msg_player_id == self.disguise_player_id:
            return False, "self"

        time_since = time.time() - self.last_impostor_response
        if self.last_impostor_response > 0 and time_since < 5.0:
            return False, f"cooldown {time_since:.1f}s"

        # Always respond if accused
        if self.strategy.has_been_accused:
            return True, "MUST DEFEND"

        # Strategic check
        last_msg = list(self.buffer)[-1]['message'] if self.buffer else ""
        should, reason = self.strategy.should_respond_to_message(
            last_msg, {'message_count': self.message_count}
        )
        if should:
            return True, reason

        # Probabilistic fallback based on group size
        human_players = {m['player_id'] for m in self.buffer if not m['is_impostor']}
        n = len(human_players)
        if n == 1:
            return True, "1-on-1"
        elif n == 2:
            return random.random() < 0.7, "2-player (70%)"
        else:
            return random.random() < 0.4, f"{n}-player (40%)"

    def is_finished(self) -> Tuple[bool, str]:
        if self.goodbye_detected:
            return True, "goodbye"
        if self.message_count >= self.max_messages:
            return True, "max messages"
        if time.time() - self.last_activity > self.idle_timeout:
            return True, "idle timeout"
        if self.impostor_message_count >= 10:
            return True, "impostor limit"
        return False, "active"

    def get_buffer_text(self) -> str:
        if not self.buffer:
            return "(conversation just started)"
        return "\n".join(f"{m['player_id']}: {m['message']}" for m in self.buffer)

    def get_conversation_summary(self) -> str:
        players = {m['player_id'] for m in self.buffer}
        trust = suspicion_tracker.get_trust_scores(
            self.disguise_player_id, list(self.buffer)
        )
        trust_str = ", ".join(f"{p}:{s:+.1f}" for p, s in sorted(trust.items()))
        return (
            f"📊 CONVERSATION SUMMARY\n"
            f"   Duration:  {time.time()-self.started_at:.0f}s\n"
            f"   Messages:  {self.message_count} ({self.impostor_message_count} impostor)\n"
            f"   Players:   {', '.join(players)}\n"
            f"   Arc stage: {self.strategy.current_mode.value}\n"
            f"   Facts gathered: {self.strategy.facts_gathered}\n"
            f"   Trust scores: {trust_str or 'none yet'}"
        )


active_conversations: Dict[str, ConversationState] = {}


# ═══════════════════════════════════════════════════════════════════════════════
# IMPOSTOR STATE
# ═══════════════════════════════════════════════════════════════════════════════

class ImpostorState:
    def __init__(self):
        self.disguised_as:    Optional[str] = None
        self.is_active:       bool          = False
        self.target_group_id: Optional[str] = None
        self.visited_group_ids: list        = []

    def reset(self):
        if self.target_group_id and self.target_group_id not in self.visited_group_ids:
            self.visited_group_ids.append(self.target_group_id)
        self.visited_group_ids = self.visited_group_ids[-10:]
        self.disguised_as    = None
        self.is_active       = False
        self.target_group_id = None

    @property
    def last_visited_group_id(self) -> Optional[str]:
        return self.visited_group_ids[-1] if self.visited_group_ids else None

impostor = ImpostorState()


class ImpostorSpawnControl:
    def __init__(self):
        self.spawn_interval       = 60.0   # wait between despawn and next spawn
        self.initial_delay        = 60.0   # wait before EVER spawning for the first time
        self.last_despawn         = 0.0
        self.first_spawn_done     = False
        self.min_group_size       = 1

    def should_spawn_now(self) -> bool:
        if impostor.is_active:
            return False
        # Wait at least 1 minute from game start before first spawn
        if not self.first_spawn_done:
            if time.time() - game_start_time < self.initial_delay:
                return False
        # After despawn, wait spawn_interval before next spawn
        if self.last_despawn > 0:
            if time.time() - self.last_despawn < self.spawn_interval:
                return False
        valid = [g for g in current_groups.values()
                 if g.get('size', 0) >= self.min_group_size]
        return len(valid) > 0

    def record_despawn(self):
        self.last_despawn     = time.time()
        self.first_spawn_done = True

spawn_control = ImpostorSpawnControl()


# ═══════════════════════════════════════════════════════════════════════════════
# HELPERS
# ═══════════════════════════════════════════════════════════════════════════════

def normalize_player_id(pid: str) -> str:
    return pid.lower().replace(" ", "_") if pid else ""

def is_valid_player_id(pid) -> bool:
    if not pid or not isinstance(pid, str):
        return False
    pid = str(pid).strip()
    if len(pid) < 2 or pid.isdigit():
        return False
    if pid.lower() in ("string", "null", "none", "0", ""):
        return False
    if pid.startswith("impostor_"):
        return False
    return True

def update_player_history(player_id: str, message: str):
    if player_id not in recent_history:
        recent_history[player_id] = deque(maxlen=20)
    recent_history[player_id].append(message)

def update_global_summary():
    global global_summary
    if len(global_message_buffer) < 5:
        return
    recent = list(global_message_buffer)[-20:]
    lines  = [f"{m['player_id']}: {m['message']}"
              for m in recent if not m['player_id'].startswith('impostor_')]
    transcript = "\n".join(lines)
    prompt = (
        "Summarise this Chernobyl survival game chat in ONE sentence (max 20 words).\n"
        "Only mention: Sheds, Barns, Greenhouse, Church, Pavilion, collecting wood/mushrooms, "
        "taking cans, shooting aliens.\n"
        f"Messages:\n{transcript}\nSummary:"
    )
    try:
        from langchain_ollama import ChatOllama
        _llm = ChatOllama(model="llama3.2:3b", temperature=0.3,
                          base_url="http://127.0.0.1:11434",
                          num_ctx=256, num_predict=40)
        resp = _llm.invoke(prompt)
        cand = (resp.content or "").strip().split("\n")[0].strip()
        if len(cand) > 10:
            global_summary = cand
            print(f"   📝 Summary: {global_summary}")
    except Exception as e:
        print(f"   ⚠️ Summary failed ({e})")


def choose_target_group() -> Optional[Dict]:
    if len(current_groups) < 2:
        return None

    valid = [g for g in current_groups.values()
             if g['size'] >= spawn_control.min_group_size
             and g['group_id'] not in impostor.visited_group_ids]

    if not valid:
        print("   ♻️ All groups visited — resetting history")
        impostor.visited_group_ids.clear()
        valid = [g for g in current_groups.values()
                 if g['size'] >= spawn_control.min_group_size
                 and g['group_id'] != impostor.last_visited_group_id]
    if not valid:
        valid = [g for g in current_groups.values()
                 if g['size'] >= spawn_control.min_group_size]
    if not valid:
        return None

    def score(g):
        pos = g.get('center_position', [0,0,0])
        dist = sum(
            ((pos[0]-o['center_position'][0])**2 +
             (pos[2]-o['center_position'][2])**2)**0.5
            for o in current_groups.values() if o['group_id'] != g['group_id']
        )
        return dist - (g['size'] - 1) * 5.0

    return max(valid, key=score)


def choose_impostor_disguise(target_group_id: Optional[str] = None) -> Optional[str]:
    try:
        target_members     = set()
        target_group_pos   = None

        if target_group_id and target_group_id in current_groups:
            raw = current_groups[target_group_id].get('player_ids', [])
            target_members   = {normalize_player_id(p) for p in raw if is_valid_player_id(p)}
            target_group_pos = current_groups[target_group_id].get('center_position', [0,0,0])

        candidates = []
        for gid, gdata in current_groups.items():
            if gid == target_group_id:
                continue
            gpos = gdata.get('center_position', [0,0,0])
            dist = (((gpos[0]-target_group_pos[0])**2 +
                     (gpos[2]-target_group_pos[2])**2)**0.5
                    if target_group_pos else 0)
            for pid in gdata.get('player_ids', []):
                if not is_valid_player_id(pid):
                    continue
                if normalize_player_id(pid) in target_members:
                    continue
                candidates.append({'player_id': pid, 'distance': dist})

        if not candidates:
            return "Player_Default"
        candidates.sort(key=lambda x: x['distance'], reverse=True)
        return candidates[0]['player_id']

    except Exception as e:
        print(f"❌ Disguise selection error: {e}")
        return "Player_Default"


def generate_style_summary(player_id: str) -> str:
    """
    Generate style summary from the player's last 20 messages — ONCE per conversation.
    Falls back to a sensible default if not enough data.
    """
    msgs = list(recent_history.get(player_id, []))
    if not msgs or len(msgs) < 3:
        return "Casual gamer, short responses, friendly tone."
    try:
        from stylometric import summarize_player_style
        summary = summarize_player_style(player_id, msgs)
        print(f"   🖊️ Style ({player_id}): {summary[:80]}...")
        return summary
    except Exception as e:
        print(f"   ⚠️ Style LLM failed ({e})")
        avg = sum(len(m.split()) for m in msgs) / len(msgs)
        if avg < 4:
            return "Very short messages, blunt, minimal punctuation."
        if avg < 8:
            return "Brief casual chat, informal, short sentences."
        return "Longer messages, explains actions clearly."


# ═══════════════════════════════════════════════════════════════════════════════
# IMPOSTOR MESSAGE GENERATION
# ═══════════════════════════════════════════════════════════════════════════════

def generate_impostor_message(conv: ConversationState):
    """
    Returns (reply_text, intent) so the caller can detect flee intent.
    1. Strategy layer  → DeceptionIntent  (WHAT to do strategically)
    2. LLM             → responds naturally, with intent woven in
    """
    print(f"\n{'─'*50}")
    print(f"🤖 GENERATING REPLY  (arc msg #{conv.strategy.message_count})")

    if conv.style_summary is None:
        conv.style_summary = generate_style_summary(conv.disguise_player_id)

    disguise_profile = profile_manager.get_or_create_profile(conv.disguise_player_id)
    known_facts_text = disguise_profile.get_facts_as_text(5)
    if known_facts_text:
        print(f"   📌 Known facts: {known_facts_text}")

    profiles = {pid: p.to_dict() for pid, p in profile_manager.profiles.items()}

    last_entry   = list(conv.buffer)[-1] if conv.buffer else {}
    last_message = last_entry.get('message', '')
    speaker_name = last_entry.get('player_id', 'someone')

    trust_scores = suspicion_tracker.get_trust_scores(
        disguised_as=conv.disguise_player_id,
        conversation_buffer=list(conv.buffer),
    )
    if trust_scores:
        print(f"   🤝 Trust: { {p: f'{s:+.1f}' for p, s in trust_scores.items()} }")

    intent: DeceptionIntent = conv.strategy.get_intent(
        message=last_message,
        profiles=profiles,
        suspicion_tracker=suspicion_tracker,
        known_facts_text=known_facts_text,
        trust_scores=trust_scores,
    )
    print(f"   🎯 Intent: [{intent.action}]")

    t0 = time.time()
    reply = generate_npc_reply_fast(
        disguise_name=conv.disguise_player_id,
        style_summary=conv.style_summary,
        conversation=conv.get_buffer_text(),
        last_message=last_message,
        speaker_name=speaker_name,
        group_members=conv.group_members,
        intent=intent,
        strategy_mode=conv.strategy.current_mode.value,
        all_players=list(active_players),
    )
    print(f"   ⏱️ {time.time()-t0:.2f}s  💬 {reply}")
    print(f"{'─'*50}\n")
    return reply, intent


def _generate_cover_blown_response(disguised_as: str, conv: "ConversationState",
                                    attempt_convince: bool) -> Optional[str]:
    """
    Called when the real player the impostor was disguised as enters the group.
    Two strategies:
      attempt_convince=True  — point at the real player to sow confusion
      attempt_convince=False — brief exit line, then flee
    """
    from chromatesting import generate_npc_reply_fast
    from deception_strategy import DeceptionIntent

    style = conv.style_summary or "Casual gamer, short responses."

    if attempt_convince:
        intent = DeceptionIntent(
            action='casual',
            detail=(
                f"Someone claiming to be you just showed up. "
                f"Say something short and panicked that makes others doubt the newcomer, "
                f"like 'wait who is that' or 'that is not me'."
            )
        )
    else:
        intent = DeceptionIntent(
            action='casual',
            detail="Say you have to go right now, very briefly."
        )

    # Who just walked in is the real player (disguised_as) — treat them as speaker
    try:
        reply = generate_npc_reply_fast(
            disguise_name=disguised_as,
            style_summary=style,
            conversation=conv.get_buffer_text(),
            last_message=f"{disguised_as} just walked in",
            speaker_name=disguised_as,
            group_members=conv.group_members,
            intent=intent,
            strategy_mode="casual",
        )
        return reply
    except Exception as e:
        print(f"   \u274c Cover-blown response failed: {e}")
        return "wait who is that" if attempt_convince else "I gotta go"


def detect_goodbye(message: str) -> bool:
    return any(k in message.lower()
               for k in ["bye","goodbye","see ya","later","gotta go","gtg","brb","afk"])


# ═══════════════════════════════════════════════════════════════════════════════
# API ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

@app.post("/chat")
def receive_message(
    player_id: str = Body(..., embed=True),
    message:   str = Body(..., embed=True),
    group_id:  str = Body("solo", embed=True),
):
    player_id = player_id.strip()
    message   = message.strip()
    group_id  = (group_id or "solo").strip()
    timestamp = datetime.now(timezone.utc).isoformat()

    print(f"\n{'='*60}")
    print(f"💬 [{player_id}] in {group_id}: {message}")

    active_players.add(player_id)

    # Detect if real player exposes disguise — cover blown
    if impostor.is_active and impostor.disguised_as == player_id:
        print(f"⚠️ Real {player_id} appeared — cover blown!")

        # Generate a panic response before resetting —
        # 50/50: try to convince the group vs. flee immediately
        conv = active_conversations.get(impostor.target_group_id)
        if conv:
            import random
            panic_msg = _generate_cover_blown_response(
                impostor.disguised_as, conv, attempt_convince=random.random() < 0.5
            )
            if panic_msg:
                panic_ts = datetime.now(timezone.utc).isoformat()
                add_player_message_with_group(
                    text=panic_msg,
                    player_id=f"impostor_{impostor.disguised_as}",
                    round_id="r1", group_id=impostor.target_group_id,
                    location="Unknown", timestamp=panic_ts,
                )
                response_data["impostor_message"] = {
                    "player_id": impostor.disguised_as,
                    "message":   panic_msg,
                    "timestamp": panic_ts,
                    "cover_blown": True,
                }
                print(f"💥 Cover-blown response: {panic_msg}")

        impostor.reset()
        if impostor.target_group_id in active_conversations:
            del active_conversations[impostor.target_group_id]

    # Profile + statement analysis
    statement = profile_manager.analyze_message(player_id, message, location=group_id)
    print(f"   📝 Category: {statement.category}")

    # DB store
    try:
        add_player_message_with_group(
            text=message, player_id=player_id,
            round_id="r1", group_id=group_id,
            location="Unknown", timestamp=timestamp,
        )
    except Exception as e:
        print(f"⚠️ DB store failed: {e}")

    update_player_history(player_id, message)
    global_message_buffer.append({'player_id': player_id, 'message': message,
                                   'timestamp': timestamp})

    if len(global_message_buffer) % 5 == 0:
        update_global_summary()

    response_data = {
        "player_id": player_id, "message": message,
        "timestamp": timestamp, "group_id": group_id,
        "impostor_message": None,
    }

    # ── Impostor conversation handling ────────────────────────────────────────
    if impostor.is_active and impostor.target_group_id == group_id:
        conv = active_conversations.get(group_id)
        if not conv:
            group_data    = current_groups.get(group_id, {})
            group_members = [p for p in group_data.get('player_ids', [])
                             if is_valid_player_id(p)]
            conv = ConversationState(group_id, impostor.disguised_as,
                                     group_members=group_members)
            active_conversations[group_id] = conv
            print(f"🆕 Conversation started with: {group_members}")
            # Generate style summary NOW (once) at conversation start
            conv.style_summary = generate_style_summary(impostor.disguised_as)

        conv.add_message(player_id, message, is_impostor=False)

        if detect_goodbye(message):
            conv.goodbye_detected = True
            print("👋 Goodbye detected")

        should_respond, reason = conv.should_respond(player_id)
        print(f"🤔 Respond? {should_respond} ({reason})")

        if should_respond:
            try:
                impostor_msg, intent = generate_impostor_message(conv)
                if impostor_msg:
                    impostor_ts = datetime.now(timezone.utc).isoformat()
                    add_player_message_with_group(
                        text=impostor_msg,
                        player_id=f"impostor_{impostor.disguised_as}",
                        round_id="r1", group_id=group_id,
                        location="Unknown", timestamp=impostor_ts,
                    )
                    conv.add_message(impostor.disguised_as, impostor_msg, is_impostor=True)
                    global_message_buffer.append({
                        'player_id': f"impostor_{impostor.disguised_as}",
                        'message': impostor_msg, 'timestamp': impostor_ts,
                    })
                    is_fleeing = intent.action == 'flee'
                    response_data["impostor_message"] = {
                        "player_id": impostor.disguised_as,
                        "message":   impostor_msg,
                        "timestamp": impostor_ts,
                        "fleeing":   is_fleeing,
                    }
                    print(f"{'🏃 FLEEING' if is_fleeing else '✅'} Replied as {impostor.disguised_as}")

                    # Flee intent — end the conversation immediately after this message
                    if is_fleeing:
                        conv.goodbye_detected = True
            except Exception as e:
                import traceback
                print(f"❌ Reply failed: {e}")
                traceback.print_exc()

        # Check for conversation end
        finished, reason = conv.is_finished()
        if finished:
            print(f"\n{conv.get_conversation_summary()}")
            print(f"\n{suspicion_tracker.get_suspicion_summary()}")
            print(f"🏁 Ended: {reason}\n")

            # ── Extract + save facts from this conversation ───────────────────
            # Do this for every real player who participated
            real_players = {m['player_id'] for m in conv.buffer
                            if not m['is_impostor']}
            for pid in real_players:
                p = profile_manager.get_or_create_profile(pid)
                extract_facts_from_conversation(
                    player_id=pid,
                    conversation_buffer=list(conv.buffer),
                    profile=p,
                    round_id="r1",
                )

            del active_conversations[group_id]
            impostor.reset()

    print(f"{'='*60}\n")
    return response_data


@app.post("/groups/sync")
def sync_groups(groups: List[Dict] = Body(..., embed=True),
                timestamp: str = Body(..., embed=True)):
    global current_groups, last_group_update_time
    current_groups.clear()
    for g in groups:
        gid = g.get('group_id')
        if gid:
            current_groups[gid] = {
                'group_id':        gid,
                'player_ids':      g.get('player_ids', []),
                'center_position': g.get('center_position', [0,0,0]),
                'size':            g.get('size', 0),
            }
    last_group_update_time = time.time()
    return {'success': True, 'groups_received': len(current_groups)}


@app.get("/impostor/check_spawn")
def check_impostor_spawn():
    if impostor.is_active and impostor.target_group_id:
        conv = active_conversations.get(impostor.target_group_id)
        if conv:
            finished, reason = conv.is_finished()
            if finished:
                return {'should_spawn': False, 'should_despawn': True,
                        'reason': f'Conversation ended: {reason}'}
        return {'should_spawn': False, 'should_despawn': False, 'reason': 'Active'}

    if len(current_groups) < 2:
        return {'should_spawn': False, 'should_despawn': False,
                'reason': f'Need 2+ groups (have {len(current_groups)})'}

    if spawn_control.should_spawn_now():
        target = choose_target_group()
        if target:
            disguise = choose_impostor_disguise(target['group_id'])
            return {
                'should_spawn':           True,
                'should_despawn':         False,
                'target_group_id':        target['group_id'],
                'target_group_position':  target['center_position'],
                'target_group_members':   target['player_ids'],
                'disguise_as':            disguise,
                'engagement_rate':        0.5,
                'conversation_duration':  60.0,
            }

    return {'should_spawn': False, 'should_despawn': False, 'reason': 'Waiting'}


@app.post("/impostor/activate")
def activate_impostor(
    target_player_id: Optional[str] = Body(None),
    target_group_id:  Optional[str] = Body(None),
    engagement_rate:  float          = Body(0.5),
):
    impostor.disguised_as = (target_player_id
                             if target_player_id
                             else choose_impostor_disguise(target_group_id))
    if not impostor.disguised_as:
        return {"success": False, "message": "No suitable disguise"}
    impostor.is_active       = True
    impostor.target_group_id = target_group_id
    print(f"✅ Impostor activated as {impostor.disguised_as} in {target_group_id}")
    return {"success": True, "disguised_as": impostor.disguised_as,
            "target_group_id": target_group_id}


@app.post("/impostor/deactivate")
def deactivate_impostor():
    old = impostor.disguised_as
    impostor.reset()
    spawn_control.record_despawn()
    if impostor.target_group_id in active_conversations:
        del active_conversations[impostor.target_group_id]
    print(f"🛑 Impostor deactivated (was {old})")
    return {"success": True}


@app.get("/impostor/status")
def impostor_status():
    return {
        "is_active":            impostor.is_active,
        "disguised_as":         impostor.disguised_as,
        "target_group_id":      impostor.target_group_id,
        "active_conversations": list(active_conversations.keys()),
    }


@app.get("/profiles")
def get_profiles():
    return {
        "profiles": {pid: p.to_dict() for pid, p in profile_manager.profiles.items()}
    }


@app.get("/suspicions")
def get_suspicions():
    return {
        "summary":       suspicion_tracker.get_suspicion_summary(),
        "most_suspected": suspicion_tracker.get_most_suspected(5),
    }


@app.post("/session/reset")
def reset_session():
    active_players.clear()
    recent_history.clear()
    active_conversations.clear()
    global_message_buffer.clear()
    impostor.reset()
    profile_manager.profiles.clear()
    suspicion_tracker.suspicion_matrix.clear()
    global game_start_time
    game_start_time = time.time()
    spawn_control.last_despawn     = 0.0
    spawn_control.first_spawn_done = False
    print("🗑️ Session reset")
    return {"success": True}


@app.get("/")
def root():
    return {
        "status":          "online",
        "version":         "5.0 - Fact-based deceptive impostor",
        "impostor_active": impostor.is_active,
        "tracked_groups":  len(current_groups),
        "tracked_players": len(profile_manager.profiles),
    }


if __name__ == "__main__":
    print("🚀 Impostor Chat Server V5.0 — FACT-BASED DECEPTION")
    print("─" * 50)
    print("What's new:")
    print("  [✓] Facts extracted from every conversation → player profiles")
    print("  [✓] Impostor uses real player facts as alibi material")
    print("  [✓] Suspicion tracker reads ALL messages (not just keywords)")
    print("  [✓] Strategy → DeceptionIntent → LLM renders style only")
    print("  [✓] Temporal arc: gather info → build trust → seed doubt/accuse")
    print("  [✓] Style summary generated once at convo start, cached")
    print("─" * 50)
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="warning")