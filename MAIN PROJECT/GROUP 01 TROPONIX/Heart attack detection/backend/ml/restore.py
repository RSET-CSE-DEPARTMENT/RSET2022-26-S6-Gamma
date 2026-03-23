import numpy as np
import pandas as pd


def generate_synthetic_troponin(row, seed=None):
    """
    Generate synthetic Troponin values at 1h and 2h
    using clinically guided rules.
    """

    if seed is not None:
        np.random.seed(seed)

    # -------------------------------
    # Read baseline values
    # -------------------------------
    t0 = row["Troponin"]
    label = row["MI_Label"]

    # -------------------------------
    # Normalize label (robust)
    # -------------------------------
    if isinstance(label, str):
        label = label.lower().strip()
        label = 1 if label in ["positive", "mi", "yes", "1"] else 0

    # -------------------------------
    # Safety: ensure non-negative baseline
    # -------------------------------
    t0 = max(float(t0), 0.001)

    # -------------------------------
    # Generate deltas
    # -------------------------------
    # MI-positive patients
    if label == 1:
        delta_1h = np.random.uniform(0.20 * t0, 0.60 * t0)
        delta_2h = np.random.uniform(0.50 * t0, 1.20 * t0)

    # MI-negative patients
    else:
        delta_1h = np.random.uniform(0.0, 0.05 * t0)
        delta_2h = np.random.uniform(0.0, 0.10 * t0)

    # -------------------------------
    # Enforce monotonic rise
    # -------------------------------
    t1 = t0 + delta_1h
    t2 = t0 + delta_2h

    if t2 < t1:
        t2 = t1 + np.random.uniform(0.01 * t0, 0.05 * t0)

    # -------------------------------
    # Return synthetic features
    # -------------------------------
    return pd.Series({
        "Troponin_1h": round(t1, 6),
        "Troponin_2h": round(t2, 6),
        "Delta_Trop_1h": round(t1 - t0, 6),
        "Delta_Trop_2h": round(t2 - t0, 6)
    })


def augment_dataset(
    input_csv="data/MI_Augmented_10k_Cleaned.csv",
    output_csv="data/MI_Temporal_Augmented.csv"
):
    """
    Apply synthetic temporal augmentation to entire dataset.
    """

    print("📥 Loading dataset...")
    df = pd.read_csv(input_csv)

    # -------------------------------
    # Validate required columns
    # -------------------------------
    required_cols = {"Troponin", "MI_Label"}
    if not required_cols.issubset(df.columns):
        raise ValueError(
            f"Dataset must contain columns: {required_cols}"
        )

    # -------------------------------
    # Apply augmentation row-wise
    # -------------------------------
    print("⚙️ Generating synthetic temporal features...")
    synthetic_features = df.apply(
        generate_synthetic_troponin,
        axis=1
    )

    # -------------------------------
    # Merge and save
    # -------------------------------
    df_aug = pd.concat([df, synthetic_features], axis=1)
    df_aug.to_csv(output_csv, index=False)

    print("\n✅ Synthetic temporal augmentation completed")
    print(f"📄 Output saved to: {output_csv}")
    print("\nNew columns added:")
    for col in synthetic_features.columns:
        print(f"  • {col}")


if __name__ == "__main__":
    augment_dataset()