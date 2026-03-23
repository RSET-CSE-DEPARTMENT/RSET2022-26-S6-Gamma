import numpy as np
import pickle

from binning import create_quantile_bins, find_bin
from constraints import enforce_monotonic_increasing


def sigmoid(x):
    return 1 / (1 + np.exp(-x))


class ExplainableAdditiveModel:
    """
    Custom Explainable Additive Model (GAM-inspired)
    for myocardial infarction prediction.
    """

    def __init__(self, features, n_bins=10, lr=0.01, epochs=50):
        self.features = features
        self.n_bins = n_bins
        self.lr = lr
        self.epochs = epochs

        self.bias = 0.0
        self.bin_edges = {}
        self.weights = {}
        self.constraints = {}

    def set_constraints(self, constraints):
        """
        Example:
        {
            "Age": "increasing",
            "Troponin": "increasing",
            "CK_MB": "increasing"
        }
        """
        self.constraints = constraints

    def fit(self, X, y):
        """
        Train the explainable additive model.
        """

        # Initialize bins and weights
        for f in self.features:
            if f == "Gender":
                self.weights[f] = np.zeros(2)
            else:
                self.bin_edges[f] = create_quantile_bins(
                    X[f].values, self.n_bins
                )
                self.weights[f] = np.zeros(self.n_bins)

        # Training loop
        for epoch in range(self.epochs):
            for i in range(len(X)):
                logit = self.bias
                bin_indices = {}

                # Forward pass
                for f in self.features:
                    if f == "Gender":
                        idx = int(X.iloc[i][f])
                    else:
                        idx = find_bin(
                            X.iloc[i][f],
                            self.bin_edges[f]
                        )

                    bin_indices[f] = idx
                    logit += self.weights[f][idx]

                pred = sigmoid(logit)
                grad = pred - y.iloc[i]

                # Update bias
                self.bias -= self.lr * grad

                # Update feature weights
                for f, idx in bin_indices.items():
                    self.weights[f][idx] -= self.lr * grad

            # Apply monotonic constraints after each epoch
            self._apply_constraints()

            if (epoch + 1) % 10 == 0:
                print(f"Epoch {epoch + 1}/{self.epochs} completed")

    def _apply_constraints(self):
        """
        Enforce monotonic constraints on feature weights.
        """
        for f, constraint in self.constraints.items():
            if constraint == "increasing":
                self.weights[f] = enforce_monotonic_increasing(
                    self.weights[f]
                )

    def predict_proba(self, X):
        """
        Predict probability of myocardial infarction.
        """
        probs = []

        for i in range(len(X)):
            logit = self.bias

            for f in self.features:
                if f == "Gender":
                    idx = int(X.iloc[i][f])
                else:
                    idx = find_bin(
                        X.iloc[i][f],
                        self.bin_edges[f]
                    )

                logit += self.weights[f][idx]

            probs.append(sigmoid(logit))

        return np.array(probs)

    def explain_instance(self, x):
        """
        Generate exact feature-level explanation for one patient.
        """
        explanation = []
        logit = self.bias

        for f in self.features:
            if f == "Gender":
                idx = int(x[f])
            else:
                idx = find_bin(
                    x[f],
                    self.bin_edges[f]
                )

            contribution = self.weights[f][idx]
            logit += contribution
            explanation.append((f, x[f], contribution))

        return explanation, sigmoid(logit)

    def save_model(self, filepath):
        """
        Save trained model to disk.
        """
        with open(filepath, "wb") as f:
            pickle.dump(self, f)

    @staticmethod
    def load_model(filepath):
        """
        Load trained model from disk.
        """
        with open(filepath, "rb") as f:
            return pickle.load(f)
