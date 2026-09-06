def validate_equipment(owned_equipment: list[str], required_equipment: list[str]) -> tuple[bool, str]:
    missing = [eq for eq in required_equipment if eq not in owned_equipment]
    if missing:
        return False, f"Missing required equipment: {', '.join(missing)}."
    return True, "All required equipment is available."
