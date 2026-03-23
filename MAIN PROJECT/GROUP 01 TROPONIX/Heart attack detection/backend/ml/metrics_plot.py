import os
import pandas as pd
import matplotlib.pyplot as plt

from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    roc_curve
)

from model import ExplainableAdditiveModel


def load_dataset(csv_path):
    df = pd.read_csv(csv_path)

    X = df[["Age", "Gender", "Troponin", "CK_MB"]]

    # ✅ Ensure labels are numeric 0/1
    # If already numeric, this will not harm.
    y = df["MI_Label"]
    if y.dtype == "object":
        y = y.map({"Negative": 0, "Positive": 1})

    if y.isnull().any():
        raise ValueError(
            "MI_Label contains unexpected values. "
            "Check if labels are 'Positive/Negative' or numeric 0/1."
        )

    return X, y


def evaluate_and_plot(model, X_test, y_test, save_dir="reports/metrics"):
    os.makedirs(save_dir, exist_ok=True)

    # Predict
    probs = model.predict_proba(X_test)
    preds = (probs >= 0.5).astype(int)

    # Metrics
    acc = accuracy_score(y_test, preds)
    prec = precision_score(y_test, preds, zero_division=0)
    rec = recall_score(y_test, preds, zero_division=0)
    f1 = f1_score(y_test, preds, zero_division=0)
    auc = roc_auc_score(y_test, probs)

    metrics = {
        "Accuracy": acc,
        "Precision": prec,
        "Recall": rec,
        "F1-score": f1,
        "ROC-AUC": auc
    }

    # Print metrics in console (for logs)
    print("\n--- CC-EAM Model Evaluation ---")
    for k, v in metrics.items():
        print(f"{k}: {v:.4f}")

    # ----------- Plot 1: Bar chart of all metrics -----------
    plt.figure(figsize=(8, 5))
    plt.bar(metrics.keys(), metrics.values())
    plt.ylim(0, 1.05)
    plt.title("CC-EAM Performance Metrics")
    plt.ylabel("Score")
    plt.grid(True, axis="y", linestyle="--", alpha=0.4)
    plt.tight_layout()

    bar_path = os.path.join(save_dir, "metrics_bar_chart.png")
    plt.savefig(bar_path, dpi=200)
    print(f"\n✅ Saved metrics bar chart: {bar_path}")
    plt.show()

    # ----------- Plot 2: ROC Curve -----------
    fpr, tpr, _ = roc_curve(y_test, probs)

    plt.figure(figsize=(6, 5))
    plt.plot(fpr, tpr, label=f"CC-EAM (AUC={auc:.3f})")
    plt.plot([0, 1], [0, 1], linestyle="--", label="Random Guess")
    plt.title("ROC Curve - CC-EAM")
    plt.xlabel("False Positive Rate")
    plt.ylabel("True Positive Rate")
    plt.grid(True, linestyle="--", alpha=0.4)
    plt.legend()
    plt.tight_layout()

    roc_path = os.path.join(save_dir, "roc_curve.png")
    plt.savefig(roc_path, dpi=200)
    print(f"✅ Saved ROC curve: {roc_path}")
    plt.show()


if __name__ == "__main__":

    # ✅ Recommended: use relative path
    csv_path = "data/MI_Augmented_10k_Cleaned.csv"

    # Load dataset
    X, y = load_dataset(csv_path)

    # Split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    # Train CC-EAM model
    model = ExplainableAdditiveModel(
        features=["Age", "Gender", "Troponin", "CK_MB"],
        n_bins=10,
        lr=0.01,
        epochs=50
    )

    model.set_constraints({
        "Age": "increasing",
        "Troponin": "increasing",
        "CK_MB": "increasing"
    })

    model.fit(X_train, y_train)

    # Evaluate + generate plots
    evaluate_and_plot(model, X_test, y_test)
