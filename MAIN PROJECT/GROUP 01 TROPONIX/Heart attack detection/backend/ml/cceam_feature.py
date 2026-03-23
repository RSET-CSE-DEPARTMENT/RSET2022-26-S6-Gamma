import numpy as np

def cceam_predict_from_initial_troponin(t0: float) -> float:
    """
    Explainable additive prediction from initial troponin
    """
    if t0 is None or t0 <= 0:
        return 0.15  # baseline risk

    base_risk = 0.15
    weight = 0.6

    troponin_effect = np.log1p(t0)
    score = base_risk + weight * troponin_effect

    probability = 1 / (1 + np.exp(-score))
    return round(float(probability), 4)
