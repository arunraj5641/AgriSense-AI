def validate_farm_size(farm_size: float, min_required_size: float) -> tuple[bool, str]:
    if farm_size < min_required_size:
        return False, f"Farm size ({farm_size}) is less than required minimum ({min_required_size})."
    return True, "Farm size is sufficient."
