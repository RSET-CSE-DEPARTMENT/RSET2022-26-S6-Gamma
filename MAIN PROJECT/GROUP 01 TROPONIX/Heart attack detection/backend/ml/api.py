from fastapi import FastAPI, Request
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from expl import explain_risk
from model import ExplainableAdditiveModel
from xai import generate_text_explanation, risk_category
from pdf_report import save_patient_pdf_report
from temporal_features import extract_temporal_troponin_features

import os
import json
import tempfile
import joblib
import numpy as np
import pandas as pd
import requests
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# ================= LOAD STATIC MODELS =================
MI_MODEL = joblib.load(os.path.join(BASE_DIR, "ebm_model1.pkl"))
MI_SCALER = joblib.load(os.path.join(BASE_DIR, "scaler_dataset2.pkl"))

HEART_MODEL = joblib.load(os.path.join(BASE_DIR, "ebm_model.pkl"))
HEART_SCALER = joblib.load(os.path.join(BASE_DIR, "scaler_dataset1.pkl"))

MI_FEATURE_ORDER = json.load(
    open(os.path.join(BASE_DIR, "feature_map_mi.json"))
)["feature_names_in_order"]

HEART_FEATURE_ORDER = json.load(
    open(os.path.join(BASE_DIR, "feature_map_heart.json"))
)["feature_names_in_order"]

# ================= LOAD CCEAM =================
TROPONIN_1H_MODEL = joblib.load(os.path.join(BASE_DIR, "troponin_1h_model.pkl"))
TROPONIN_2H_MODEL = joblib.load(os.path.join(BASE_DIR, "troponin_2h_model.pkl"))
CCEAM_MODEL = joblib.load(os.path.join(BASE_DIR, "cceam_temporal_model.pkl"))
CCEAM_SCALER = joblib.load(os.path.join(BASE_DIR, "cceam_temporal_scaler.pkl"))

# ================= LOAD CUSTOM EAM (for XAI reports) =================
EAM_MODEL = ExplainableAdditiveModel.load_model(
    os.path.join(BASE_DIR, "models", "model_eam.pkl")
)

# ================= SCHEMA =================
class Input(BaseModel):
    Age: float | None = None
    Gender: int | None = None
    BMI: float | None = None
    Cholesterol: float | None = None
    Triglyceride: float | None = None
    CRP: float | None = None
    Homocysteine: float | None = None
    Troponin: float | None = None
    CK_MB: float | None = None

# ================= UTIL =================
def build_dataframe(feature_order: list, values: dict):
    row = {}
    for f in feature_order:
        row[f] = values.get(f, 0)
    df = pd.DataFrame([row])
    return df[feature_order]

# ================= CORE CCEAM FUNCTION =================
def run_cceam(age, gender, troponin, ckmb):

    troponin_input = pd.DataFrame([{
        "Troponin": troponin,
        "CK_MB": ckmb
    }])

    t1 = float(TROPONIN_1H_MODEL.predict(troponin_input)[0])
    t2 = float(TROPONIN_2H_MODEL.predict(troponin_input)[0])

    ckmb_tiny = min(np.log1p(ckmb) / 10.0, 0.4)

    values = {
        "Age": age,
        "Gender": gender,
        "Troponin": troponin,
        "Troponin_1h": t1,
        "Troponin_2h": t2,
        "CK_MB": ckmb_tiny
    }

    X = build_dataframe(CCEAM_SCALER.feature_names_in_, values)
    X_scaled = CCEAM_SCALER.transform(X)

    base_prob = float(CCEAM_MODEL.predict_proba(X_scaled)[0][1])

    eps = 1e-6
    logit = np.log((base_prob + eps) / (1 - base_prob + eps))
    logit = logit / 3.0
    prob = 1 / (1 + np.exp(-logit))
    prob = min(max(prob, 0.01), 0.99)

    return prob, t1, t2

# ================= UNIFIED ENDPOINT =================
@app.post("/predict")
def predict(data: Input):

    user = data.dict()
    details = {}

    # -------- MI --------
    if user.get("Troponin") is not None:
        troponin_ngL = user.get("Troponin", 0) * 10
        mi_values = {
            "Age": user.get("Age", 0),
            "Gender": user.get("Gender", 0),
            "Troponin": troponin_ngL,
            "CKMB": user.get("CK_MB", 0)
        }
        X_mi = build_dataframe(MI_FEATURE_ORDER, mi_values)
        X_scaled = MI_SCALER.transform(X_mi)
        prob = float(MI_MODEL.predict_proba(X_scaled)[0][1])
        details["MI"] = {"prob": prob, "conf": 1.0, "ran": True}

    # -------- HEART --------
    if any([user.get("BMI"), user.get("Cholesterol"),
            user.get("Triglyceride"), user.get("CRP"),
            user.get("Homocysteine")]):

        heart_values = {
            "Age": user.get("Age", 0),
            "Gender": user.get("Gender", 0),
            "BMI": user.get("BMI", 0),
            "Cholesterol": user.get("Cholesterol", 0),
            "Triglyceride": user.get("Triglyceride", 0),
            "CRP": user.get("CRP", 0),
            "Homocysteine": user.get("Homocysteine", 0)
        }

        X_heart = build_dataframe(HEART_FEATURE_ORDER, heart_values)
        X_scaled = HEART_SCALER.transform(X_heart)
        prob = float(HEART_MODEL.predict_proba(X_scaled)[0][1])
        details["Heart"] = {"prob": prob, "conf": 1.0, "ran": True}

    # -------- CORE CCEAM --------
    if user.get("Troponin") is not None and user.get("CK_MB") is not None:
        troponin_ngL = user["Troponin"] * 10

        cceam_prob, t1, t2 = run_cceam(
            user["Age"] or 0,
            user["Gender"] or 0,
            troponin_ngL,
            user["CK_MB"]
        )

        details["CCEAM"] = {
            "prob": cceam_prob,
            "troponin_1h": t1,
            "troponin_2h": t2,
            "ran": True
        }

        final_prob = cceam_prob
        model_used = "CCEAM Core Model"

    else:
        # fallback to max of static models
        probs = [d["prob"] for d in details.values()]
        if not probs:
            return {
                "final_label": "Unable to predict",
                "final_prob": None,
                "final_conf": 0.0,
                "details": details,
                "user": user,
            }

        final_prob = max(probs)
        model_used = "Static Model"

    final_label = "Yes" if final_prob >= 0.5 else "No"

    explanation = explain_risk(
        probability=final_prob,
        inputs=user
    )

    return {
        "final_label": final_label,
        "final_prob": final_prob,
        "final_conf": 1.0,
        "model_used": model_used,
        "explanation": explanation,
        "details": details,
        "user": user
    }
@app.post("/predict/cceam")
def predict_cceam(data: Input):

    if data.Troponin is None or data.CK_MB is None:
        return {"error": "Troponin and CK_MB required"}
    troponin_ngL = data.Troponin * 10

    prob, t1, t2 = run_cceam(
        data.Age or 0,
        data.Gender or 0,
        troponin_ngL,
        data.CK_MB
    )
    return {
        "probability": round(float(prob), 4),
        "troponin_1h": round(t1, 4),
        "troponin_2h": round(t2, 4),
        "model_used": "CCEAM Core Model"
    }

@app.get("/search/medical")
def search_medical(q: str):

    try:
        # Step 1: Search PubMed IDs
        search_url = (
            "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi"
            f"?db=pubmed&retmode=json&retmax=5&term={q}"
        )

        search_resp = requests.get(search_url).json()
        id_list = search_resp.get("esearchresult", {}).get("idlist", [])

        if not id_list:
            return {"results": []}

        ids = ",".join(id_list)

        # Step 2: Fetch article details
        summary_url = (
            "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi"
            f"?db=pubmed&retmode=json&id={ids}"
        )

        summary_resp = requests.get(summary_url).json()

        results = []

        for pid in id_list:
            article = summary_resp["result"].get(pid)
            if not article:
                continue

            results.append({
                "title": article.get("title"),
                "authors": ", ".join([a["name"] for a in article.get("authors", [])]),
                "link": f"https://pubmed.ncbi.nlm.nih.gov/{pid}/"
            })

        return {"results": results}

    except Exception as e:
        return {"error": str(e)}


# ================= RECOMMEND LITERATURE =================
@app.post("/recommend-literature")
async def recommend_literature(request: Request):
    """
    Extract keywords from the prediction result and fetch relevant
    PubMed articles. Returns articles + a 'why' explanation string.
    """
    try:
        data = await request.json()
        user        = data.get("user", {})
        final_prob  = float(data.get("final_prob") or 0)
        explanation = data.get("explanation", {})

        # ── Build keyword list from biomarker values ──────────────────────
        keywords  = []
        why_parts = []

        risk_cat = risk_category(final_prob)

        if risk_cat == "HIGH":
            keywords.append("acute myocardial infarction treatment")
            why_parts.append("your HIGH risk assessment")
        elif risk_cat == "MEDIUM":
            keywords.append("cardiovascular risk reduction")
            why_parts.append("your MEDIUM risk assessment")
        else:
            keywords.append("cardiovascular disease prevention")
            why_parts.append("your LOW risk assessment")

        troponin      = float(user.get("Troponin")    or 0)
        ckmb          = float(user.get("CK_MB")        or 0)
        crp           = float(user.get("CRP")          or 0)
        cholesterol   = float(user.get("Cholesterol")  or 0)
        triglyceride  = float(user.get("Triglyceride") or 0)
        homocysteine  = float(user.get("Homocysteine") or 0)
        bmi           = float(user.get("BMI")          or 0)

        if troponin > 0.04:
            keywords.append("elevated troponin cardiac biomarker")
            why_parts.append("elevated troponin")
        if ckmb > 5:
            keywords.append("CK-MB myocardial infarction")
            why_parts.append("elevated CK-MB")
        if crp > 3:
            keywords.append("C-reactive protein cardiovascular inflammation")
            why_parts.append("elevated inflammation markers")
        if cholesterol > 200:
            keywords.append("hypercholesterolemia cardiovascular risk")
            why_parts.append("elevated cholesterol")
        if triglyceride > 150:
            keywords.append("hypertriglyceridemia heart disease")
            why_parts.append("elevated triglycerides")
        if homocysteine > 15:
            keywords.append("hyperhomocysteinemia cardiovascular")
            why_parts.append("elevated homocysteine")
        if bmi > 30:
            keywords.append("obesity cardiovascular risk")
            why_parts.append("elevated BMI")

        # Use at most the two most specific keyword strings
        search_terms = keywords[:2]
        query = " AND ".join(search_terms)

        # ── PubMed search ─────────────────────────────────────────────────
        search_url = (
            "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi"
            f"?db=pubmed&retmode=json&retmax=5&term={query}"
        )
        search_resp = requests.get(search_url, timeout=8).json()
        id_list = search_resp.get("esearchresult", {}).get("idlist", [])

        if not id_list:
            return {"results": [], "why": "No matching articles found.", "query": query}

        ids = ",".join(id_list)
        summary_url = (
            "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi"
            f"?db=pubmed&retmode=json&id={ids}"
        )
        summary_resp = requests.get(summary_url, timeout=8).json()

        results = []
        for pid in id_list:
            article = summary_resp["result"].get(pid)
            if not article:
                continue
            results.append({
                "title":   article.get("title", ""),
                "authors": ", ".join([a["name"] for a in article.get("authors", [])[:3]]),
                "link":    f"https://pubmed.ncbi.nlm.nih.gov/{pid}/"
            })

        # ── Build 'why' sentence ──────────────────────────────────────────
        if why_parts:
            why = (
                f"Based on {', '.join(why_parts)}, "
                "we've curated these relevant cardiovascular research articles for you."
            )
        else:
            why = "General cardiovascular health resources based on your profile."

        return {"results": results, "why": why, "query": query}

    except Exception as e:
        return {"error": str(e)}


# ================= GENERATE PDF REPORT =================
@app.post("/generate-report")
async def generate_report(request: Request):

    data = await request.json()

    # The frontend sends the full latestPredictionResult which includes:
    #   final_prob, final_label, final_conf, explanation, user, details
    user   = data.get("user", {})
    detail = data.get("details", {})

    # ── Use the risk already computed by /predict ──────────────────────────
    risk     = float(data.get("final_prob") or 0)
    category = risk_category(risk)

    # ── Resolve troponin time-series ───────────────────────────────────────
    troponin_val = float(user.get("Troponin", 0) or 0)
    ckmb_val     = float(user.get("CK_MB", 0) or 0)

    cceam_detail = detail.get("CCEAM", {})

    if cceam_detail.get("ran") and troponin_val > 0:
        # Reuse predicted values from CCEAM
        t1 = float(cceam_detail.get("troponin_1h", troponin_val))
        t2 = float(cceam_detail.get("troponin_2h", troponin_val))

    elif troponin_val > 0:
        # Predict if CCEAM not run
        trop_input = pd.DataFrame([{
            "Troponin": troponin_val,
            "CK_MB": ckmb_val
        }])

        t1 = float(TROPONIN_1H_MODEL.predict(trop_input)[0])
        t2 = float(TROPONIN_2H_MODEL.predict(trop_input)[0])

    else:
        # No troponin provided
        t1 = t2 = 0.0

    # ── Generate temporal features (used internally by EAM) ────────────────
    temporal = extract_temporal_troponin_features(
        values=[troponin_val, t1, t2],
        times=[0, 60, 120]
    )

    # ── Build patient data for explanation model ───────────────────────────
    patient_data = {
    "Age": float(user.get("Age", 0) or 0),
    "Gender": int(user.get("Gender", 0) or 0),

    "Troponin": troponin_val,
    "Troponin_1h": t1,
    "Troponin_2h": t2,

    "CK_MB": ckmb_val,

    **temporal
    }

    # ── Get feature contributions from EAM ─────────────────────────────────
    # ── Get feature contributions from EAM ─────────────────────────────────
    explanation, _ = EAM_MODEL.explain_instance(patient_data)

    # Separate temporal and visible features
    temporal_features = {
        "Troponin_Initial",
        "Troponin_Peak",
        "Troponin_Delta",
        "Troponin_Slope",
        "Troponin_AUC",
        "Time_To_Peak",
        "Troponin_Rise_Flag"
    }

    visible_explanation = []
    temporal_contribution = 0.0

    for feature, value, contrib in explanation:

        contrib = abs(float(contrib))  # remove negative sign

        if feature in temporal_features:
            temporal_contribution += contrib
        else:
            visible_explanation.append((feature, value, contrib))

    # redistribute temporal contribution to troponin readings
    total_trop = troponin_val + (t1/10) + (t2/10)

    visible_explanation.append(
        ("Troponin", troponin_val,
        temporal_contribution * (troponin_val / total_trop))
    )

    visible_explanation.append(
        ("Troponin_1h", t1/10,
        temporal_contribution * ((t1/10) / total_trop))
    )

    visible_explanation.append(
        ("Troponin_2h", t2/10,
        temporal_contribution * ((t2/10) / total_trop))
    )

    explanation = visible_explanation
    text_explanation = generate_text_explanation(risk, explanation)
        # ── Generate PDF report ────────────────────────────────────────────────
    pdf_path = save_patient_pdf_report(
        patient_data=patient_data,
        risk=risk,
        category=category,
        explanation=explanation,
        text_explanation=text_explanation
    )

    return FileResponse(
        pdf_path,
        media_type="application/pdf",
        filename="Heart_Risk_Report.pdf"
    )