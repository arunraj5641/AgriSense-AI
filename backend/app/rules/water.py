def validate_water(irrigation_type: str | None, crop_water_needs: str) -> tuple[bool, str]:
    if crop_water_needs == "high" and irrigation_type in [None, "rainfed"]:
        return False, "High water needs crop requires irrigation, but only rainfed is available."
    return True, "Water availability is sufficient."
