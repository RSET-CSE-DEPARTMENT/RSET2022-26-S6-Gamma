🫀 Troponix

A full-stack web app for cardiovascular risk prediction using blood biomarkers and machine learning.

🚀 Features
🔐 Patient & Clinician login
📊 Risk prediction (Low / Moderate / High)
🤖 ML models for:
General risk (cholesterol, CRP, BMI)
Acute MI detection (troponin, CK-MB)
📈 Explainable results
🏥 Nearby hospital finder
📚 PubMed search
🛠️ Tech Stack
Frontend: HTML, CSS, JavaScript
Backend: Node.js (Express)
ML API: FastAPI + Scikit-learn
⚙️ Setup
Backend
cd backend
npm install
node server.js
ML API
cd ml_api
pip install -r requirements.txt
uvicorn api:app --reload
Frontend

Open index.html in browser

🔌 API
POST /predict/dataset1
POST /predict/dataset2
POST /auth/login
