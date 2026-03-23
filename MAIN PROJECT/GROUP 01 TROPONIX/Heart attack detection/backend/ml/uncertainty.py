import numpy as np
import pandas as pd
from model import ExplainableAdditiveModel


def bootstrap_predict(
    base_model: ExplainableAdditiveModel,
    X_train: pd.DataFrame,
    y_train: pd.Series,
    X_test: pd.DataFrame,
    n_bootstrap: int = 30,
    quantiles=(0.05, 0.95),
):
    """
    Bootstrap uncertainty estimation for CC-EAM.
    """

    probs = []

    for i in range(n_bootstrap):
        # Resample training data
        idx = np.random.choice(len(X_train), size=len(X_train), replace=True)
        X_resampled = X_train.iloc[idx]
        y_resampled = y_train.iloc[idx]

        # Clone model
        model = ExplainableAdditiveModel(
            features=base_model.features,
            n_bins=base_model.n_bins,
            lr=base_model.lr,
            epochs=base_model.epochs
        )

        model.set_constraints(base_model.constraints)
        model.fit(X_resampled, y_resampled)

        # Predict
        p = float(model.predict_proba(X_test)[0])
        probs.append(p)

    probs = np.array(probs)

    mean = probs.mean()
    low = np.quantile(probs, quantiles[0])
    high = np.quantile(probs, quantiles[1])

    return {
        "mean": float(mean),
        "low": float(low),
        "high": float(high),
        "std": float(probs.std())
    }
