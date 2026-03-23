def slice_candidates(candidates, num_slices):
    if num_slices <= 1:
        return [candidates]

    slice_size = max(1, len(candidates) // num_slices)

    slices = []
    for i in range(num_slices):
        start = i * slice_size
        end = (i + 1) * slice_size
        segment = candidates[start:end]
        if segment:
            slices.append(segment)

    return slices