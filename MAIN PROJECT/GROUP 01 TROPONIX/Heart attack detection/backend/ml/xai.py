import numpy as np
import matplotlib.pyplot as plt
import os


def risk_category(prob):
    """
    Convert probability into human-friendly risk category.
    """
    if prob < 0.30:
        return "LOW"
    elif prob < 0.70:
        return "MEDIUM"
    else:
        return "HIGH"


def sort_contributions(explanation):
    """
    Sort explanations by absolute contribution (most important first)
    """
    return sorted(explanation, key=lambda x: abs(x[2]), reverse=True)


def generate_text_explanation(prob, explanation, top_k=3):
    """
    Convert numeric explanation into natural language explanation.
    """
    cat = risk_category(prob)
    sorted_exp = sort_contributions(explanation)[:top_k]

    reasons_pos = []
    reasons_neg = []

    for feature, value, contrib in sorted_exp:
        if contrib >= 0:
            reasons_pos.append(f"{feature} (value={value}) increased risk")
        else:
            reasons_neg.append(f"{feature} (value={value}) reduced risk")

    text = f"Predicted MI Risk: {prob*100:.2f}% ({cat} risk)\n\n"

    if reasons_pos:
        text += "Main factors increasing risk:\n"
        for r in reasons_pos:
            text += f" - {r}\n"

    if reasons_neg:
        text += "\nMain factors decreasing risk:\n"
        for r in reasons_neg:
            text += f" - {r}\n"

    return text


def plot_local_explanation(explanation, prob, save_path=None):
    """
    Plot local feature contributions for one patient.
    """
    features = [e[0] for e in explanation]
    contribs = [e[2] for e in explanation]

    plt.figure(figsize=(8, 4))
    plt.barh(features, contribs)
    plt.axvline(0, linewidth=1)
    plt.title(f"Local Explanation (MI Risk = {prob*100:.2f}%)")
    plt.xlabel("Risk Contribution (log-odds)")
    plt.ylabel("Feature")
    plt.grid(True, axis='x', linestyle="--", alpha=0.4)
    plt.tight_layout()

    if save_path:
        os.makedirs(os.path.dirname(save_path), exist_ok=True)
        plt.savefig(save_path, dpi=200)
        print(f"Saved local explanation plot to: {save_path}")

    plt.show()
