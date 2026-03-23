# explainer_light.py
# Ultra-light human explanation engine (no ML models)

def explain_risk(probability, inputs):
    explanations = []

    # ---------- Normalize None values ----------
    def safe(key):
        value = inputs.get(key)
        if value is None:
            return 0
        try:
            return float(value)
        except:
            return 0

    troponin = safe("Troponin")
    crp = safe("CRP")
    cholesterol = safe("Cholesterol")
    triglyceride = safe("Triglyceride")
    homocysteine = safe("Homocysteine")

    # ---------- Overall risk ----------
    if probability >= 0.7:
        level = "high"
        summary = (
            "Your results suggest a higher-than-normal risk for heart-related problems. "
            "This does not confirm a heart attack, but medical attention is advised."
        )
    elif probability >= 0.4:
        level = "moderate"
        summary = (
            "Your results show a moderate cardiovascular risk. "
            "Some values are outside the ideal range and should be monitored."
        )
    else:
        level = "low"
        summary = (
            "Your results indicate a low cardiovascular risk at this time. "
            "Most values are within acceptable ranges."
        )

    # ---------- Biomarker checks ----------
    if troponin > 0.04:
        explanations.append(
            "Troponin is elevated, which may indicate stress or injury to heart muscle."
        )

    if crp > 3:
        explanations.append(
            "CRP levels are high, suggesting inflammation that can increase heart risk."
        )

    if cholesterol > 200:
        explanations.append(
            "Cholesterol levels are above the recommended range, which may contribute to plaque buildup in arteries."
        )

    if triglyceride > 150:
        explanations.append(
            "Triglyceride levels are elevated and may increase long-term cardiovascular risk."
        )

    if homocysteine > 15:
        explanations.append(
            "Homocysteine is higher than normal, which is associated with increased risk of heart disease."
        )

    if not explanations:
        explanations.append(
            "No individual biomarker is severely abnormal, but overall risk is based on combined factors."
        )

    return {
        "risk_level": level,
        "summary": summary,
        "details": explanations
    }
