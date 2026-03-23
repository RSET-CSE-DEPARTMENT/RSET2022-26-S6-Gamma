# AI Prop Hunt Game 🎮🧠

A Unity-based AI-driven **Prop Hunt** game where the player must seek and catch AI-controlled Hiders that can disguise themselves as props in the environment. Built using Unity and ML-Agents, the game showcases the use of reinforcement learning to develop intelligent hiding behavior.

github link for complete game : https://github.com/vishwanath4002/AIprophunt

---

## 🕹️ Game Overview

In this AI Prop Hunt game:

- **You play as the Seeker**, navigating the map to find and catch hidden Hiders.
- **Hiders are AI agents** trained using Unity ML-Agents. They disguise themselves as props and attempt to stay undetected.
- The Hiders:
  - Use ray perception sensors to detect nearby props.
  - Can transform into props at optimal times to avoid detection.
  - Learn to choose strategic positions and timings using reinforcement learning.

The Seeker:
- Uses a **NavMeshAgent** to patrol.
- Detects Hiders based on movement and raycast analysis.
- Chases and catches Hiders by colliding with them.

---

## 🧠 AI Features

### Seeker Agent
- Systematically clears the room.
- Detects and chases suspicious objects.
- Reacts dynamically to Hider movement.

### Hider Agent
- Uses ML-Agents for reinforcement learning.
- Transforms into props intelligently.
- Observes surroundings to plan hiding strategies.

---

## 🎮 Game Features

- **Main Menu** with Play and Exit options.
- **Hider Selection** before game starts.
- **Countdown** before gameplay begins with sound effects.
- **Game UI** includes:
  - Timer
  - Scoreboard (Hiders caught / Total)
- **Pause Menu** with Resume and Exit.
- **Game Over Conditions:**
  - **Win** by catching all Hiders in time.
  - **Lose** if time runs out.
- **End Screen** with Restart and Main Menu options.
- **Dynamic Sound Effects** for:
  - Countdown
  - Win
  - Lose

---

## 🧑‍💻 Team Members

This project was developed by students of **S6 CSE GAMMA (2022–2026)** Of Rajagiri School of Engineering and Technology.

- **Serah Grace Kurian**
- **Vishwanath Pradeep**
- **Nandhaakishore S**
- **Yuhan John**

---

## 🛠️ Technologies Used

- **Unity 2022.3.58f1**
- **C#**
- **Unity ML-Agents**
- **NavMesh System**
- **Rigidbody Physics**
- **Ray Perception Sensors**
