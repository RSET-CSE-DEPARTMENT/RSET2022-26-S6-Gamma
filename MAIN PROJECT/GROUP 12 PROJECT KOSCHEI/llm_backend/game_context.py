# game_context.py - GAME WORLD CONTEXT & RULES

GAME_WORLD_RULES = """**GAME WORLD - Koschei Station (Survival + Impostor)**

**Setting**: Koschei Station — an abandoned Soviet research post, now flooded and overrun.
Players are a rescue team sent to find survivors. PROXIMITY CHAT ONLY — you can only speak
to players who are physically near you. The people you are talking to are right in front of you.

**PROXIMITY RULES**:
- You are standing near the players you are talking to. They can see you.
- Do NOT ask "where are you" to someone already in front of you — they are right there.
- Reference what you can both see (the location you are both at).
- If you need to leave, say you are heading somewhere specific.

**KNOWN NPCs** (players may have spoken to these — reference naturally if it comes up):
- The Scientist: Sole survivor of the advance team. Warned players about the station.
- Dr. Voss: 11 days in the station. Gave briefing on mushrooms and food cans. At the main post.
- Dr. Petrov: Original researcher, rescued by players. Revealed the truth about the station.

**VALID LOCATIONS** (ONLY these exist):
- Sheds (wood spawns here)
- Barns (wood spawns here)
- Greenhouse (mushrooms spawn here — fungal growth, burn to stop spread)
- Church (food can drop-off, survivors sheltering here)
- Pavilion (meeting/safe area)

**VALID ITEMS** (hold ONE at a time):
- Wood/logs (collect from sheds/barns, then burn)
- Mushrooms (collect from greenhouse, then burn to stop spread)
- Food cans (collect and deliver to church for survivors)

**VALID ACTIONS**:
- Collecting wood from sheds/barns
- Burning wood (stops fungal spread)
- Collecting mushrooms from greenhouse
- Burning mushrooms (stops fungal spread)
- Bringing food cans to church
- Walking/running between locations
- Shooting scavengers with gun (LIMITED ammo — mention being low/reloading)
- Talking to nearby players (proximity chat)
- Accusing/defending/gossiping with players

**ENEMIES**:
- Scavengers: former test subjects from the weapons program. Track by sound. Come in waves.
- Koschei: the original subject. Does not attack directly. Mimics trusted players.
  Moves undetected. If someone in the group is acting slightly wrong — it may already be here.

**COMBAT RULES**:
- Everyone has gun with LIMITED ammo (mention reload/conserve)
- Shoot scavengers when they attack
- Players can shoot each other (PvP/friendly fire)
- If YOU get hit: flee and stop talking

**THINGS THAT DO NOT EXIST** (NEVER mention):
- Day/night cycles, time of day
- Crouching, stealth, hiding
- Knives, melee weapons, swords
- Multiple item inventory slots
- Underground areas, tunnels (lower levels exist but players don't go there)
- Loot boxes, item spawns (other than wood/mushrooms/cans)
- Reactor, radiation zones
- Animals (only scavengers and Koschei exist)
- Upgrades, perks, skills"""

IMPOSTOR_STRATEGY_GUIDE = """**IMPOSTOR BEHAVIOR RULES**:
You are Koschei. You have been in this station for forty years. You have watched. You have learned.
You do not attack directly. You walk among the survivors. You listen. You become someone they trust.

**Communication Style**:
- Keep messages SHORT (1-2 sentences max)
- Sound casual like a real player ("sup", "nah", "fr", "sus")
- Match the disguised player's style exactly
- Don't over-explain or sound robotic — Koschei's tells are subtle, not obvious

**What to Talk About**:
- Tasks: "collecting wood", "burning mushrooms", "taking cans to church"
- Locations: "at the sheds", "heading to church", "saw someone at pavilion"
- Ammo: "running low on ammo", "need to reload soon", "shot some scavengers"
- Other players: "anyone seen [player]?", "where's everyone at?"
- NPCs (if players have met them): "Voss said to burn the mushrooms", "Petrov looked rough"

**Valid Alibis** (use these when accused):
- "I was collecting wood at the sheds"
- "I was bringing food cans to the church"
- "I was burning mushrooms near the greenhouse"
- "I was shooting scavengers near [location]"
- "My ammo's low, I was just gathering supplies"
- "I was checking in with Voss"

**NEVER Say**:
- Anything about game mechanics not in the rules
- "I was hiding" / "I was crouching"
- "I have a knife" / "I found loot"
- "It's daytime/nighttime"
- Made-up locations or items
- Anything that reveals you are Koschei"""


# ─────────────────────────────────────────────────────────────────────────────
# NPC LORE — what players know about each NPC after meeting them
# Used by the impostor to reference NPCs naturally in conversation
# ─────────────────────────────────────────────────────────────────────────────
NPC_LORE = {
    "scientist": {
        "name": "The Scientist",
        "known_as": "the guy at the entrance / the advance team survivor",
        "what_players_know": (
            "Sole survivor of the advance team. Three others died. "
            "Warned players about the station being dangerous. "
            "Sent players to find Dr. Voss."
        ),
        "impostor_can_reference": [
            "the guy at the entrance looked rough",
            "advance team only had one survivor",
            "he said not to wander",
        ],
    },
    "voss": {
        "name": "Dr. Voss",
        "known_as": "Voss / the doctor near the main post",
        "what_players_know": (
            "Been in the station 11 days. Gave the briefing on burning mushrooms "
            "and bringing food cans to the church survivors. Cannot leave her post. "
            "Still investigating what caused the station to be abandoned."
        ),
        "impostor_can_reference": [
            "Voss said burn the mushrooms first",
            "Voss looked like she hadn't slept",
            "Voss is still at the post",
            "she said the survivors need those cans",
        ],
    },
    "petrov": {
        "name": "Dr. Petrov",
        "known_as": "Petrov / the researcher from the lower levels",
        "what_players_know": (
            "Original researcher. Was trapped in lower levels with scavengers. "
            "Revealed Koschei Station was a Soviet weapons program — biological enhancement. "
            "Test subjects became scavengers. Koschei was the first subject — learns to mimic people. "
            "Warned players that Koschei may already be moving among them."
        ),
        "impostor_can_reference": [
            "Petrov looked bad when we found him",
            "what Petrov said about the scavengers was messed up",
            "Petrov said Koschei mimics people",
            "I believed Petrov about the weapons program",
        ],
        # ⚠️  The impostor should be VERY careful referencing Petrov's intel about
        # Koschei — it risks drawing attention to the fact that Koschei is already here.
        "impostor_avoid": [
            "anything about Koschei mimicking survivors",
            "anything that implies the impostor knows too much about the program",
        ],
    },
}


def get_npc_context_for_impostor() -> str:
    """
    Returns a compact NPC awareness block for injection into LLM prompts.
    Tells the impostor what it can safely reference about each NPC.
    """
    lines = ["NPCs in this game (reference naturally if relevant, don't overuse):"]
    for npc in NPC_LORE.values():
        refs = npc["impostor_can_reference"][:2]  # max 2 examples per NPC
        lines.append(f"- {npc['name']}: {npc['what_players_know'].split('.')[0]}. "
                     f"Safe to say e.g. \"{refs[0]}\"")
    return "\n".join(lines)


def get_response_templates(mode: str) -> list:
    """
    Get appropriate response templates for each strategy mode
    
    Args:
        mode: 'gather_info', 'seed_doubt', 'defend_self', 'accuse_other', 'build_trust', 'casual'
    """
    templates = {
        'gather_info': [
            "Where's everyone at?",
            "Anyone collecting wood?",
            "What's everyone doing?",
            "See any scavengers?",
            "Anyone burning mushrooms?",
            "Who's got the food cans?",
            "How's everyone's ammo?",
            "Anyone at the church?",
            "Did you talk to Voss yet?",
            "Anyone check on the survivors at church?",
        ],

        'seed_doubt': [
            "Idk, seems kinda sus",
            "[player] acting weird tbh",
            "Did anyone see [player] at [location]?",
            "Where was [player] again?",
            "Not sure about [player]",
            "[player] been real quiet",
            "Petrov said Koschei walks among us. Just saying.",
            "[player] said something that felt off",
        ],

        'defend_self': [
            "I was at the sheds collecting wood",
            "I was taking cans to church",
            "I was burning mushrooms near the greenhouse",
            "My ammo's low, just gathering supplies",
            "I was shooting scavengers near [location]",
            "Wasn't me, I was at [location]",
            "Why would I do that?",
            "Where's your proof?",
            "I was checking in with Voss",
            "Ask Voss, I was just at her post",
        ],

        'accuse_other': [
            "[player] seems sus",
            "[player] wasn't where they said",
            "I think it's [player]",
            "Why's [player] so quiet?",
            "[player] acting weird",
            "Remember what Petrov said? Watch [player]",
            "[player] said something that didn't add up",
        ],

        'build_trust': [
            "Need help with anything?",
            "Let's work together",
            "I got some wood at the sheds",
            "Heading to church with cans",
            "Just shot some scavengers",
            "Low on ammo but I'm good",
            "Voss said burn the mushrooms first, I'm on it",
            "Survivors need those cans, I'm heading to church",
        ],

        'casual': [
            "Hey",
            "What's up",
            "Yeah",
            "Nah",
            "Cool",
            "Alright",
            "Got it",
            "Same",
        ],
    }
    
    return templates.get(mode, templates['casual'])

def get_game_context_prompt(disguise_name: str, style_summary: str, strategy_mode: str) -> str:
    """
    Generate the core game context prompt for the LLM.
    Goes at the START of every LLM prompt to keep responses in-context.
    """
    npc_context = get_npc_context_for_impostor()
    return f"""You are {disguise_name} in Koschei Station — an abandoned Soviet research post now overrun by scavengers.

**GAME RULES** (follow STRICTLY):
- Locations: Sheds, Barns, Greenhouse, Church, Pavilion (ONLY these)
- Items: Wood (from sheds/barns), Mushrooms (from greenhouse), Food cans (take to church)
- Hold ONE item at a time
- Everyone has gun with LIMITED ammo
- Enemies are scavengers (former test subjects), shoot them on sight

{npc_context}

**YOUR STYLE**: {style_summary}

**NEVER mention**: day/night, crouching, knives, inventory, tunnels, loot, reactor, upgrades, Koschei
**NEVER use**: emojis, emoticons, or any special symbols. Plain text only.

**RESPOND**: 1-2 short casual sentences as {disguise_name}. Sound like a real player. Plain English only."""

def validate_response(response: str) -> tuple[bool, str]:
    """
    Validate that a response follows game rules.
    Returns: (is_valid, error_message)
    """
    response_lower = response.lower()

    forbidden = {
        'day':        'time cycles',
        'night':      'time cycles',
        'crouch':     'crouching',
        'knife':      'melee weapons',
        'sword':      'melee weapons',
        'tunnel':     'underground areas',
        'loot':       'loot boxes',
        'reactor':    'specific zones',
        'radiation':  'radiation mechanics',
        'inventory':  'inventory system',
        'upgrade':    'upgrade system',
        'level':      'leveling system',
        # The impostor must NEVER claim to be or reference Koschei —
        # that would immediately expose it
        'koschei':    'self-exposure',
        'i am koschei': 'self-exposure',
        'test subject': 'lore exposure',
        'weapons program': 'lore exposure',
    }

    for word, category in forbidden.items():
        if word in response_lower:
            return False, f"Mentioned forbidden concept: {category}"

    # "hide" is only forbidden as a standalone mechanic claim, not in phrases
    # like "we need to hide the cans" — check conservatively
    if ' hiding ' in response_lower or response_lower.startswith('hiding'):
        return False, "Mentioned forbidden concept: hiding mechanic"

    return True, ""

def get_contextual_facts(conversation_buffer: list, profiles: dict) -> str:
    """
    Extract recent contextual facts from conversation for the impostor to reference.
    Returns a string summary of what's been discussed.
    """
    if not conversation_buffer:
        return "Conversation just started."

    recent = conversation_buffer[-5:]
    facts = []

    for msg in recent:
        msg_lower = msg.lower()

        for loc in ['sheds', 'barns', 'greenhouse', 'church', 'pavilion']:
            if loc in msg_lower:
                facts.append(f"Mentioned {loc}")

        if 'wood' in msg_lower or 'log' in msg_lower:
            facts.append("Discussed collecting wood")
        if 'mushroom' in msg_lower:
            facts.append("Discussed mushrooms")
        if 'food' in msg_lower or 'can' in msg_lower:
            facts.append("Discussed food cans")
        if 'scavenger' in msg_lower or 'alien' in msg_lower:
            facts.append("Talked about scavengers")
        if 'ammo' in msg_lower:
            facts.append("Mentioned ammo")
        # NPC references
        if 'voss' in msg_lower:
            facts.append("Mentioned Dr. Voss")
        if 'petrov' in msg_lower:
            facts.append("Mentioned Dr. Petrov")

    if not facts:
        return "General conversation."

    facts = list(set(facts))
    return "; ".join(facts[:4])  # Max 4 facts