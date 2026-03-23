import numpy as np

def create_quantile_bins(values, n_bins=10):
    """
    Compute quantile-based bin edges.
    """
    return np.quantile(values, np.linspace(0, 1, n_bins + 1))


def find_bin(value, bin_edges):
    """
    Find bin index for a value.
    """
    return np.searchsorted(bin_edges[1:-1], value)
