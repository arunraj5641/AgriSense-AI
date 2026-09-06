def validate_budget(budget_available: float, estimated_cost: float) -> tuple[bool, str]:
    if budget_available < estimated_cost:
        return False, f"Estimated cost ({estimated_cost}) exceeds available budget ({budget_available})."
    return True, "Budget is sufficient."
