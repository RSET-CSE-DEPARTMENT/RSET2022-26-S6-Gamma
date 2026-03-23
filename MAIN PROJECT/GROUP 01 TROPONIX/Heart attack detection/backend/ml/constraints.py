def enforce_monotonic_increasing(weights):
    """
    Enforce non-decreasing weights.
    """
    for i in range(1, len(weights)):
        if weights[i] < weights[i - 1]:
            weights[i] = weights[i - 1]
    return weights
