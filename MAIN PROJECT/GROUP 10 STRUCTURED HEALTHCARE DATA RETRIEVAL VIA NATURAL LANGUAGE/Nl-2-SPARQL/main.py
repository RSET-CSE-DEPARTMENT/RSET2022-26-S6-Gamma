from fastapi import APIRouter
from pydantic import BaseModel
from data_layer.ingestion import readmit_patient, add_vital_observation, update_kg_with_alert
from ai_engine.lstm_service import run_prediction

router = APIRouter()

class VitalRequest(BaseModel):
    patient_id: str
    stay_id: str
    hr: int; sys: int; dia: int; rr: int
    temp: float; spo2: int

@router.post("/readmit/{patient_id}")
def api_readmit_patient(patient_id: str):
    stay_id = readmit_patient(patient_id)
    return {"status": "success", "stay_id": stay_id}

@router.post("/add_vitals")
def add_vitals_endpoint(req: VitalRequest):
    timestamp, obs_id = add_vital_observation(
        req.stay_id, req.hr, req.sys, req.dia, req.rr, req.temp, req.spo2
    )
    risk_label, confidence = run_prediction(req.stay_id)
    if risk_label != "Collecting Data...":
        update_kg_with_alert(obs_id, risk_label, confidence)
    
    return {
        "status": "success",
        "timestamp": timestamp,
        "alert": {"label": risk_label, "confidence": confidence}
    }
