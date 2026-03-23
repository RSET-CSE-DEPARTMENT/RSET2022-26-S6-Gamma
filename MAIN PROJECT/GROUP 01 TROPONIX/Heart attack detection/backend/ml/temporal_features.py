import numpy as np


def extract_temporal_troponin_features(values, times):
    """
    values: list of troponin values [t0, t1, t2, ...]
    times:  list of timestamps (minutes or hours) [0, 60, 120, ...]
    """

    values = np.array(values, dtype=float)
    times = np.array(times, dtype=float)

    initial = values[0]
    peak = values.max()
    delta = peak - initial

    total_time = times[-1] - times[0] + 1e-6
    slope = delta / total_time

    auc = np.trapz(values, times)
    time_to_peak = times[values.argmax()] - times[0]

    # Clinical rise flag (can be tuned)
    rise_flag = int(delta >= 0.02)

    return {
        "Troponin_Initial": initial,
        "Troponin_Peak": peak,
        "Troponin_Delta": delta,
        "Troponin_Slope": slope,
        "Troponin_AUC": auc,
        "Time_To_Peak": time_to_peak,
        "Troponin_Rise_Flag": rise_flag,
    }
