def validate_crop_stage(current_stage: str, valid_stages: list[str]) -> tuple[bool, str]:
    if current_stage not in valid_stages:
        return False, f"Current stage ({current_stage}) is not valid for this action. Valid stages: {', '.join(valid_stages)}."
    return True, "Crop stage is valid."
