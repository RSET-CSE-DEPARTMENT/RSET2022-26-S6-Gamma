def validate_vital(data):

    required = [
        "patient_id",
        "stay_id",
        "timestamp",
        "systolicBP",
        "diastolicBP"
    ]

    return all(k in data for k in required)


def validate_stay(data):

    required = [
        "patient_id",
        "admissionTime"
    ]

    return all(k in data for k in required)
