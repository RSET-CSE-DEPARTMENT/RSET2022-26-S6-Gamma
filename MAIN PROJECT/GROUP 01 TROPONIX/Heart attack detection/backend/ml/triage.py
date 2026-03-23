def ed_triage_decision(
    prob: float,
    uncertainty: dict,
    temporal_features: dict
):
    """
    ED triage rules layered on top of CC-EAM output.
    Returns triage category + rationale.
    """

    delta = temporal_features["Troponin_Delta"]
    slope = temporal_features["Troponin_Slope"]
    peak = temporal_features["Troponin_Peak"]
    time_to_peak = temporal_features["Time_To_Peak"]

    low = uncertainty["low"]
    high = uncertainty["high"]

    reasons = []

    # 🔴 RED ZONE — Immediate MI protocol
    if (
        peak >= 0.4 or
        (delta >= 0.2 and slope >= 0.003) or
        (prob >= 0.75 and low >= 0.65)
    ):
        reasons.append("High troponin peak or rapid rise with high confidence")
        return {
            "triage": "RED",
            "action": "Immediate cardiology consult, ECG, MI protocol",
            "reasons": reasons
        }

    # 🟠 ORANGE ZONE — Observation required
    if (
        prob >= 0.40 or
        delta >= 0.05 or
        time_to_peak < 90
    ):
        reasons.append("Moderate risk or early troponin rise")
        return {
            "triage": "ORANGE",
            "action": "Repeat troponin, ECG monitoring, clinical observation",
            "reasons": reasons
        }

    # 🟢 GREEN ZONE — Low risk
    reasons.append("Low probability and stable troponin trend")
    return {
        "triage": "GREEN",
        "action": "Low risk – consider discharge with follow-up",
        "reasons": reasons
    }
