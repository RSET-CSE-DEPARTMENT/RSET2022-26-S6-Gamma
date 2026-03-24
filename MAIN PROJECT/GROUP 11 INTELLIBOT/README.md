# 📚 IntelliBot – Multi-Subject AI Academic Assistant

IntelliBot is an AI-powered academic assistant designed to help students quickly understand concepts across multiple Computer Science subjects. It uses **Retrieval-Augmented Generation (RAG)** with **LangChain, FAISS, and Google Gemini** to provide accurate, syllabus-based answers.

---

## 🚀 Features

* 🤖 AI-powered question answering (Gemini API)
* 📖 Multi-subject support:

  * Operating Systems (OS)
  * Computer Organization & Architecture (COA)
  * Database Management Systems (DBMS)
  * Compiler Design (CD)
  * Python Programming
* 📂 Upload teacher notes (PDF, DOCX, PPTX, TXT)
* 🧠 Context-aware responses using chat memory
* 🔍 RAG-based retrieval from syllabus + notes
* 💾 Persistent notes storage
* 🌐 REST API using FastAPI

---

## 🏗️ Tech Stack

### Backend

* FastAPI
* LangChain
* FAISS (Vector Database)
* HuggingFace Embeddings
* Google Gemini API

### Frontend

* React (with Axios)

### Other Tools

* PyMuPDF (PDF reading)
* python-docx
* python-pptx

---

## 📁 Project Structure

```
intellibot/
│
├── server.py              # Backend FastAPI server
├── os.json               # OS syllabus
├── coa.json              # COA syllabus
├── dbms.json             # DBMS syllabus
├── cd.json               # Compiler Design syllabus
├── python.json           # Python syllabus
├── uploads/              # Uploaded teacher notes
├── notes_data.json       # Stored notes metadata
├── frontend/             # React frontend
└── venv/                 # Virtual environment
```

---

## ⚙️ Setup Instructions

### 1️⃣ Clone the Repository

```
git clone <your-repo-link>
cd intellibot
```

---

### 2️⃣ Create Virtual Environment

```
python -m venv venv
venv\Scripts\activate   (Windows)
```

---

### 3️⃣ Install Dependencies

```
pip install fastapi uvicorn pydantic python-multipart
pip install langchain langchain-community langchain-google-genai
pip install sentence-transformers faiss-cpu
pip install pymupdf python-docx python-pptx
```

---

### 4️⃣ Add Gemini API Key

In `server.py`:

```
os.environ["GOOGLE_API_KEY"] = "YOUR_API_KEY"
```

---

### 5️⃣ Run Backend

```
python server.py
```

Server runs at:

```
http://127.0.0.1:8000
```

---

### 6️⃣ Run Frontend

```
cd frontend
npm install
npm start
```

---

## 🧠 How It Works

1. JSON syllabus files are converted into documents
2. Documents are split into chunks
3. FAISS creates vector embeddings
4. User asks a question
5. Relevant chunks are retrieved
6. Gemini generates the final answer

---

## 📤 Uploading Teacher Notes

* Go to Admin Dashboard
* Select subject
* Upload file (PDF/DOCX/PPTX/TXT)

✅ The system:

* Extracts text
* Converts into embeddings
* Adds to vector database

Now AI can answer from teacher notes too.

---

## 🧪 Example Questions

### OS

* Explain deadlock and its prevention

### DBMS

* Explain normalization with examples

### COA

* Explain instruction cycle

### CD

* What is lexical analysis?

### Python

* Explain recursion with program

---

## 🔮 Future Enhancements

* 📱 Mobile app integration (Flutter)
* 🎙️ Voice-based queries
* 📊 Student performance tracking
* 🧑‍🎓 Personalized learning system
* 🌐 Cloud deployment with scaling

---

## 👨‍💻 Contributors

* Sheba Reji
* Nidha Rahiman Mothirapeedika
* P S Ashna Parveen
* Noel Mathachan Mampilly

---

## 📜 License

This project is for educational purposes.

---

## 💡 Final Note

IntelliBot combines **AI + syllabus-based learning** to provide **accurate, reliable academic answers**, making it a powerful tool for students.
