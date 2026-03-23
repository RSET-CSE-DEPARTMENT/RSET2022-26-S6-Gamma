// ===============================
// ML API BASE
// ===============================
export const ML_API = "http://localhost:8000";

// ===============================
// UNIFIED PREDICTION (calls /predict)
// ===============================
export async function predictUnified(payload) {
  const res = await fetch(`${ML_API}/predict`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Predict API error: ${error}`);
  }

  // returns unified structure:
  // final_label, final_prob, final_conf, details, user, cceam (optional)
  return res.json();
}

// ===============================
// AUTO MODEL SELECTOR (fixed & case-tolerant)
// Accepts both Troponin/CKMB and troponin/ckmb and CK_MB
// ===============================
export function autoSelectModel(data) {
  const hasTroponin =
    (data.Troponin !== undefined && data.Troponin !== null) ||
    (data.troponin !== undefined && data.troponin !== null);

  const hasCKMB =
    (data.CKMB !== undefined && data.CKMB !== null) ||
    (data.ckmb !== undefined && data.ckmb !== null) ||
    (data.CK_MB !== undefined && data.CK_MB !== null) ||
    (data.ck_mb !== undefined && data.ck_mb !== null);

  if (hasTroponin || hasCKMB) return "dataset2";
  return "dataset1";
}

// ===============================
// DATASET 1 PREDICT (back-compat wrapper)
// Uses unified endpoint but maps payload/result so older UI can still call this
// Important: do NOT strip Troponin/CK_MB — preserve them
// ===============================
export async function predictDataset1(payload) {
  const unifiedPayload = {
    Age: payload.Age ?? null,
    Gender: payload.Gender ?? null,
    BMI: payload.BMI ?? null,
    Cholesterol: payload.Cholesterol ?? null,
    Triglyceride: payload.Triglyceride ?? null,
    CRP: payload.CRP ?? payload.crp ?? null,
    Homocysteine: payload.Homocysteine ?? payload.homocysteine ?? null,

    // Preserve MI markers if provided
    Troponin: payload.Troponin ?? payload.troponin ?? null,
    CK_MB: payload.CK_MB ?? payload.CKMB ?? payload.ckmb ?? null
  };

  const resp = await predictUnified(unifiedPayload);

  // Map unified response to old shape expected by original UI
  const heart = resp.details && resp.details.Heart ? resp.details.Heart : null;

  const probability =
    heart && typeof heart.prob !== "undefined"
      ? heart.prob
      : resp.final_prob;

  const shap_values = [];
  if (heart) {
    shap_values.push(`ran: ${heart.ran}`);
    if (heart.missing?.length)
      shap_values.push(`missing: ${heart.missing.join(", ")}`);
    if (heart.imputed?.length)
      shap_values.push(`imputed: ${heart.imputed.join(", ")}`);
    if (heart.prob !== null && heart.prob !== undefined)
      shap_values.push(`prob: ${heart.prob}`);
    shap_values.push(`conf: ${heart.conf}`);
  }

  return {
    probability: probability ?? 0,
    shap_values,
    model_used: "Dataset 1 (Cholesterol/CRP)",
    raw: resp
  };
}

// ===============================
// DATASET 2 PREDICT (back-compat wrapper)
// Uses unified endpoint but maps payload/result so older UI can still call this
// Important: do NOT strip Heart features — preserve them
// ===============================
export async function predictDataset2(payload) {
  const unifiedPayload = {
    Age: payload.Age ?? null,
    Gender: payload.Gender ?? null,

    Troponin: payload.Troponin ?? payload.troponin ?? null,
    CK_MB: payload.CK_MB ?? payload.CKMB ?? payload.ckmb ?? null,

    // Preserve heart features if present
    BMI: payload.BMI ?? payload.bmi ?? null,
    Cholesterol: payload.Cholesterol ?? payload.cholesterol ?? null,
    Triglyceride: payload.Triglyceride ?? payload.triglyceride ?? null,
    CRP: payload.CRP ?? payload.crp ?? null,
    Homocysteine: payload.Homocysteine ?? payload.homocysteine ?? null
  };

  const resp = await predictUnified(unifiedPayload);

  // Map to old shape using MI model details
  const mi = resp.details && resp.details.MI ? resp.details.MI : null;

  const probability =
    mi && typeof mi.prob !== "undefined"
      ? mi.prob
      : resp.final_prob;

  const shap_values = [];
  if (mi) {
    shap_values.push(`ran: ${mi.ran}`);
    if (mi.missing?.length)
      shap_values.push(`missing: ${mi.missing.join(", ")}`);
    if (mi.imputed?.length)
      shap_values.push(`imputed: ${mi.imputed.join(", ")}`);
    if (mi.prob !== null && mi.prob !== undefined)
      shap_values.push(`prob: ${mi.prob}`);
    shap_values.push(`conf: ${mi.conf}`);
  }

  return {
    probability: probability ?? 0,
    shap_values,
    model_used: "Dataset 2 (MI Markers)",
    raw: resp
  };
}

// ===============================
// 🆕 CCEAM TEMPORAL PREDICTION (ADDED)
// Does NOT affect any existing flow
// Uses /predict/cceam endpoint
// ===============================
export async function predictCCEAM(payload) {
  const res = await fetch(`${ML_API}/predict/cceam`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`CCEAM API error: ${error}`);
  }

  return res.json();
}
