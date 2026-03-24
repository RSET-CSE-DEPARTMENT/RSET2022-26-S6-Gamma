# 🧬 Project Koschei

> *"You don't know who to trust anymore."*

A **3D first-person multiplayer social deduction game** set in a fictionalised Chernobyl Exclusion Zone. Players are a government task force investigating unexplained disappearances — but one among them is not human. Powered by a locally-hosted, memory-augmented Large Language Model, the alien impostor converses, deceives, and adapts in real time.

---

## 🎮 Game Overview

Players cooperate to explore the environment, complete tasks, rescue researchers, and eliminate the alien threat. Meanwhile, **Alien-01** — controlled by an LLM — infiltrates player groups, mimics their writing styles, and tries to survive until it can eliminate the team.

Unlike traditional impostor games, there is **no voting system**. Suspicion is resolved through **direct combat**.

### Player Objectives
- Complete tasks around the map
- Interrogate, defend, and communicate via proximity chat
- Hunt and eliminate Alien-01
- Rescue NPC researchers

### Alien Objectives
- Survive without being detected
- Mimic a human player's identity and speech style
- Sow doubt and manipulate conversations
- Eliminate players when the opportunity arises

---

## 🏗️ System Architecture

```
Unity (Client)
    ↕  REST API (HTTP/JSON)
FastAPI Backend (Python)
    ├── LangChain Orchestrator
    ├── Ollama (Local LLM + Embeddings)
    └── ChromaDB (Vector Memory Store)
```

Unity sends player chat and game events to the Python backend. The backend retrieves relevant memories, assembles a prompt, queries the local LLM, and returns the alien's reply — which is then displayed in-game.

---

## 🧩 Core Systems

### 1. 🗺️ Map & World Design
The game is set in a fictionalised Chernobyl Exclusion Zone featuring:
- A forest area with wandering animals
- Researcher buildings in the exclusion zone
- A nuclear reactor as the final stage
- Interactable objects (keys, tools, logs, devices) with `E` to interact
- Environmental storytelling props and collectible lore pages
- A day/night cycle affecting gameplay and atmosphere

All interactable states (picked up, opened, solved) are **synced over the network**.

---

### 2. 🚶 Player Systems

#### Movement & Actions
Players can: move, sprint, jump, crouch, look around, use chat, interact with objects and NPCs, manage an inventory, and use weapons.

#### Weapon Mechanics
- Guns and knives with limited ammo
- Collect items from the map to craft larger weapons with NPC researchers
- Weapon switching, reload animations, and scoped aiming
- **Server-authoritative damage** to prevent cheating

---

### 3. 🤖 NPC System

NPC researchers use LLMs to provide players with **useful story information and quests**. Their AI is built on a **Finite State Machine (FSM) / Behaviour Tree** with states:

| State   | Behaviour                          |
|---------|------------------------------------|
| Idle    | Stands or sits in a location       |
| Wander  | Patrols on a NavMesh schedule      |
| Speak   | Responds to player proximity       |
| React   | Reacts to nearby events            |
| Flee    | Runs from danger                   |

NPC perception uses **line-of-sight and hearing radius**. Dialogue is triggered by a collider and responses come from the LLM backend.

---

### 4. 👾 Alien AI (Alien-01)

The alien is the centrepiece of the game's AI. It operates in macro-states managed by an FSM/Behaviour Tree:

```
Hunt → Deceive → Escape
```

Within each state, fuzzy logic picks the best action. The LLM handles all natural language dialogue.

#### Proximity & Group Logic

Two collider radii are used around each player:

| Radius      | Purpose                                                    |
|-------------|-----------------------------------------------------------|
| Chat radius | Short — only players within this range see your messages  |
| Group radius| Larger — defines visible "groups" even without talking    |

**How the Alien picks a target group:**
1. The game continuously tracks player clusters using the group radius.
2. For each group, it computes the centroid (location) and size.
3. The alien targets the **farthest group**, with priority given to **smaller groups**.
4. The alien never revisits the group it was just at.

**How the Alien picks a disguise:**
1. Once a target group is chosen, find the group that is **farthest away** from that target group.
2. Randomly select one player from that far-away group.
3. The alien disguises as that player's identity for the conversation.

#### Conversation Lifecycle
A conversation **starts** when the alien is within chat range and a nearby player sends a message.

A conversation **ends** when:
- All players leave chat range for a timeout period, OR
- A goodbye signal is detected (`bye`, `gtg`, `see you`), OR
- A maximum message count or time limit is reached.

On conversation end, the alien sends an exit line ("I have to go") and wanders away.

---

### 5. 🌐 Networking (Unity Netcode for GameObjects)

Multiplayer is handled server-authoritatively with Unity Netcode for GameObjects.

**What is synced over the network:**
- Player movement and animations
- Weapon fire and damage
- Item pickups
- Proximity chat messages (filtered by radius server-side)
- NPC states (location, behaviour, events)
- Round/lobby state (host, join, role assignment, round cycle)

**Roles assigned at match start:** human soldiers, scientists, and Alien-01.

---

### 6. 💬 Chat System

#### Proximity Chat
Messages sent by a player are **only received by players within the short chat radius**. The server filters who receives each message based on spatial proximity. This is the primary social mechanic — you can't hear conversations happening across the map.

#### NPC/AI Chat (Backend-Driven)
When a player talks to an NPC or the alien, the message is sent to the Python backend:
1. Message is stored in ChromaDB
2. Relevant memories are retrieved
3. LLM generates a contextual reply
4. Reply is returned to Unity and displayed with the NPC's name and colour

---

### 7. 🐍 Backend (FastAPI + Ollama + ChromaDB)

The backend is a **locally hosted Python server** built with FastAPI. Running the LLM locally means zero latency from external API calls and full control over prompts.

#### API Endpoints

| Endpoint          | Method | Purpose                                              |
|-------------------|--------|------------------------------------------------------|
| `/ingest/chat`    | POST   | Store a player message; trigger alien reply if needed |
| `/ingest/event`   | POST   | Store a game event (kill, sighting, sabotage, etc.)  |
| `/npc/reply`      | POST   | Generate and return an NPC/alien dialogue response   |

**Input validation** is handled by Pydantic models.

#### ChromaDB Memory Collections

Three vector collections keep retrieval focused:

| Collection       | Stores                                                    |
|------------------|-----------------------------------------------------------|
| `player_messages`| Every player chat message with metadata                   |
| `game_events`    | Normalised game events (kills, sightings, sabotage, etc.) |
| `npc_memory`     | Things the alien has said, claimed, or planned            |

Each document stores: `player_id`, `group`, `round_id`, `location`, `timestamp`.

#### LangChain Orchestration Pipeline

```
InputNormalizer → EventLogger → RetrieverMulti → ContextAssembler
    → LLMCall (Ollama) → OutputParser → MemoryWriter → Responder
```

1. **InputNormalizer** — validates and structures the incoming payload.
2. **EventLogger** — writes player chat or events to ChromaDB.
3. **RetrieverMulti** — runs parallel semantic searches across all 3 collections.
4. **ContextAssembler** — builds the full context block + imitation profile.
5. **LLMCall** — sends the prompt to Ollama (e.g. `llama3.1:8b`).
6. **OutputParser** — enforces structured JSON output; retries on parse failure.
7. **MemoryWriter** — writes the alien's reply and any extracted claims back to `npc_memory`.
8. **Responder** — returns the reply to Unity.

---

### 8. 🧠 LLM Memory & Stylometry

#### Retrieval Strategy (RAG)
For each incoming message to the alien, the backend:
1. Embeds the player's message + a situation string (`loc=Admin | round=r3 | near=[p2,p7]`)
2. Retrieves top-k matches from all 3 collections filtered by `game_id` and `round_id`
3. Retrieves the last **20 messages** from the **player being imitated** for stylometry

#### Stylometry Cache
- At the **start of each conversation**, the target player's 20 most recent messages are fetched.
- A **style summary** is generated once (tone, sentence length, vocabulary quirks, emoji use).
- This style prompt is cached and reused for the entire conversation — no repeated queries.

#### Conversation Buffer
- An in-memory buffer holds the **last 10–20 turns** of the current conversation.
- This buffer is the **primary context** for generating replies (more important than retrieved DB snippets).
- Older DB messages are only retrieved if the player references past events ("remember last round...").

#### Global Game Summary
- A rolling summary (~1–3 sentences) of recent match events is maintained.
- Updated every ~5 new messages using an LLM summarisation step.
- Included in every alien prompt so it can reference global events believably.

#### Prompt Structure (per alien reply)
```
[System]   You are Alien-01. Goals: survive, deceive, blend in.
[Style]    You are chatting as <Player X>. Their style: <cached summary>.
[Global]   Recent match events: <global_summary>.
[Buffer]   <Last N turns of this conversation>
[Optional] <Retrieved DB snippets if needed>
[User]     PLAYER SAID: "<message>" — RESPOND AS Alien-01.
```

The LLM returns structured JSON:
```json
{
  "reply": "...",
  "claims": ["..."],
  "accusations": ["..."],
  "intent": "stall | shift_blame | deflect | appease",
  "deception": "none | subtle | moderate"
}
```

Impostor messages are stored with a distinct ID (e.g. `impostor_Player2`) so they are never confused with the real player's message history.

---

### 9. 🗃️ Database Schema

Every message stored in ChromaDB includes:

| Field         | Description                                          |
|---------------|------------------------------------------------------|
| `player_id`   | e.g. `Player1` or `impostor_Player2`                 |
| `message`     | Raw text of the message                              |
| `timestamp`   | Epoch milliseconds                                   |
| `player_group`| Which proximity group the player was in              |
| `location`    | Map area/room                                        |
| `round_id`    | Current game round                                   |
| `game_id`     | Current game session                                 |

---

### 10. 📖 Story & Missions

- Main story beats are triggered by Unity **trigger zones** in the map.
- Players collect **lore pages** scattered around the world.
- NPC researchers give players tasks tracked by a **task manager system**.
- Player progress and task completion states are network-synced.

---

### 11. 🖥️ UI / UX

| Component   | Contents                                            |
|-------------|-----------------------------------------------------|
| HUD         | Health, ammo, task list, objective indicators       |
| Menus       | Main menu, pause, settings (graphics, keybinds), networking (host/join) |
| Debug Panel | NPC memory viewer, chat logs, AI state display (dev only) |

---

## 🛠️ Tech Stack

| Layer        | Technology                                     |
|--------------|------------------------------------------------|
| Game Engine  | Unity (C#)                                     |
| Multiplayer  | Unity Netcode for GameObjects                  |
| Backend      | Python, FastAPI                                |
| LLM Runtime  | Ollama (`llama3.1:8b` or `llama3.3:70b`)       |
| Embeddings   | `nomic-embed-text` or `bge-m3` via Ollama      |
| Vector DB    | ChromaDB (persistent, local)                   |
| AI Framework | LangChain (LCEL graph)                         |
| Validation   | Pydantic                                       |

---

## ⚙️ Setup Guide

### Prerequisites
- Unity (latest LTS) with Netcode for GameObjects package
- Python 3.10+
- [Ollama](https://ollama.ai) installed and running locally
- Git

### Backend Setup
```bash
# Clone the repo
git clone <repo-url>
cd project-koschei/backend

# Install dependencies
pip install -r requirements.txt

# Pull the LLM and embedding model
ollama pull llama3.1:8b
ollama pull nomic-embed-text

# Run the backend server
uvicorn main:app --host 0.0.0.0 --port 8000
```

### Unity Setup
1. Open the project in Unity.
2. Install **Netcode for GameObjects** via the Package Manager.
3. Set the backend URL in the `GameConfig` ScriptableObject to `http://localhost:8000`.
4. Press Play in the Editor or build for Windows.

---

## 🗺️ Team Responsibilities

| Area                  | Owner(s)        |
|-----------------------|-----------------|
| Map & World Design    | Nanda           |
| Player Systems        | Nanda           |
| NPC Systems           | Sera + Vish     |
| Alien AI              | Visera          |
| Networking            | Stree           |
| Chat System           | Sera + Vish + Stree |
| Backend & LLM         | Sera + Vish     |
| Story & Missions      | Nanda + Sreemon |
| UI/UX & Art           | Nanda           |

---

## 🔭 Research Areas

This project contributes to active research in:
- **LLM-driven autonomous agents** in real-time environments
- **Memory-augmented dialogue systems** using vector retrieval
- **Social deception modelling** in multiplayer games
- **Stylometric mimicry** and identity imitation
- Trust and alignment in adversarial AI-human interactions

---

## 🌟 Stretch Features (Post-Alpha)

- Voice chat with lip-sync
- AI voice responses via TTS
- Physics-based interactions
- Dynamic weather system
- Multiple alien enemy types
- More NPC personalities and lore depth

---

*Project Koschei — Where the monster learns to speak like you.*
