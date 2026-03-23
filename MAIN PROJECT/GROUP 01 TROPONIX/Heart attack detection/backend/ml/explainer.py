import torch
from transformers import AutoTokenizer, AutoModelForCausalLM, pipeline

_MODEL = None
_TOKENIZER = None
_GENERATOR = None
MODEL_ID = "TinyLlama/TinyLlama-1.1B-Chat-v1.0"


def _load_model():
    global _MODEL, _TOKENIZER, _GENERATOR

    if _GENERATOR is not None:
        return

    print("🔄 Loading explainer model (one-time)...")

    _TOKENIZER = AutoTokenizer.from_pretrained(MODEL_ID)

    device = "cuda" if torch.cuda.is_available() else "cpu"

    _MODEL = AutoModelForCausalLM.from_pretrained(
        MODEL_ID,
        dtype=torch.float16 if device == "cuda" else torch.float32
    ).to(device)

    _GENERATOR = pipeline(
        "text-generation",
        model=_MODEL,
        tokenizer=_TOKENIZER,
        device=0 if device == "cuda" else -1
    )

def generate_human_explanation(input_data: dict) -> str:
    _load_model()   # ← loads ONLY on first request

    biomarkers_text = "\n".join(
        f"{k}: {v}" for k, v in input_data.get("reasons", {}).items()
    )

    prompt = f"""
You are a medical explanation assistant.

Rules:
- Do NOT diagnose a heart attack.
- Do NOT add medical facts not present.
- Use calm, patient-friendly language.
- Mention only the biomarkers listed.
- Always include a medical disclaimer.

Input data:
Risk score: {input_data.get("risk_score")}
Risk label: {input_data.get("label")}

Biomarkers:
{biomarkers_text}

Write a short explanation for a patient.
"""

    output = _GENERATOR(
        prompt,
        max_new_tokens=120,
        do_sample=False,
        temperature=0.2
    )

    return output[0]["generated_text"]
