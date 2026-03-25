# Aidie – Assistive App for Children with ADHD

**Aidie** is an Android app designed to help children with ADHD better understand and regulate their emotions. It uses on‑device facial emotion recognition via **TensorFlow Lite** and a secure cloud backend powered by **Firebase** to store profiles, emotion logs, and progress reports for Parent/Teacher.

---

## Overview

Aidie detects the child’s real‑time facial expressions (e.g., happy, sad, frustrated, calm).

Key goals:
- Support emotion‑regulation and self‑awareness for children with ADHD.  
- Improve child’s performance in daily activities, learning, and social interactions.  
- Provide insights for caregivers via secure cloud storage.

---

## Features

### Emotion Recognition

- Real‑time facial emotion recognition from the device camera (happy, sad, angry, neutral, etc.) using a TensorFlow Lite model.  
- Simple, child‑friendly UI built with **Android Studio** and Jetpack Compose.  

### Educational and Fun Games

- Short, interactive mini‑games that reinforce emotion‑labeling and self‑regulation skills.  
- Tasks that adapt difficulty based on detected emotional state (e.g., calming exercises when frustration is high).  
- Positive‑reinforcement mechanics to motivate engagement.  

### Parent/Teacher Dashboard

- User profiles stored in **Firebase Firestore**.  
- **Parent/teacher dashboard** to view emotion trends and event‑based logs.  
- Assign tasks to children based on their performance  

---

## Tech Stack

- **Mobile:** Android Studio, Kotlin, Jetpack Compose  
- **AI / ML:** TensorFlow, TensorFlow Lite (emotion‑classification model on device)  
- **Backend:** Firebase (Firestore database, Firebase Authentication, optional Firebase Cloud Storage for logs)  
- **Training:** Python scripts for training the facial‑emotion model and exporting to `.tflite`.  

---

## Getting Started

### Prerequisites

- Android Studio (latest stable) with Kotlin support  
- Android device (or emulator) with camera access  
- A Firebase account (to connect the backend)  

---

## Usage

### For Children

- Open **Aidie** and allow camera permissions.  
- The app shows a friendly character and a simple text label (e.g., “Happy”, “Calm”) based on facial expression.  
- Play **educational and fun games** that help practice emotion‑labeling and self‑regulation in engaging ways.
- Complete tasks assigned by Parent/Teacher

### For Parents / Teachers

- Sign in via the **parent/teacher dashboard** (Firebase Authentication).  
- View emotion‑trend timelines.  
- Check **performance metrics** such as task‑completion rate, attention indicators, and engagement scores.
- Assign tasks based on performance  

---
