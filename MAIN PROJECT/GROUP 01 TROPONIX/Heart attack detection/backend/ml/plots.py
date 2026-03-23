import matplotlib.pyplot as plt
import numpy as np
import os


def plot_feature_effect(model, feature, save_path=None):
    """
    Plot global feature effect curve for the given feature.
    Uses bin edges so x-axis has meaning.
    """
    weights = model.weights[feature]

    # Gender is categorical -> plot as 2 bars
    if feature == "Gender":
        plt.figure(figsize=(6, 4))
        plt.bar(["Female (0)", "Male (1)"], weights)
        plt.title("Feature Effect: Gender")
        plt.ylabel("Risk Contribution (log-odds)")
        plt.grid(True, axis="y", linestyle="--", alpha=0.4)
        plt.tight_layout()
    else:
        edges = model.bin_edges[feature]
        mids = (edges[:-1] + edges[1:]) / 2  # midpoint of each bin

        plt.figure(figsize=(7, 4))
        plt.plot(mids, weights, marker="o")
        plt.title(f"Feature Effect: {feature}")
        plt.xlabel(f"{feature} (value)")
        plt.ylabel("Risk Contribution (log-odds)")
        plt.grid(True, linestyle="--", alpha=0.4)
        plt.tight_layout()

    if save_path:
        os.makedirs(os.path.dirname(save_path), exist_ok=True)
        plt.savefig(save_path, dpi=200)
        print(f"Saved global plot to: {save_path}")

    plt.show()
