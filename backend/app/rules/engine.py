from app.rules.budget import validate_budget
from app.rules.equipment import validate_equipment
from app.rules.water import validate_water
from app.rules.farm_size import validate_farm_size
from app.rules.crop_stage import validate_crop_stage
from app.rules.weather import validate_weather
from typing import Any

class RuleEngine:
    @staticmethod
    def evaluate_constraints(
        budget_available: float,
        estimated_cost: float,
        owned_equipment: list[str],
        required_equipment: list[str],
        irrigation_type: str | None,
        crop_water_needs: str,
        farm_size: float,
        min_required_size: float,
        current_stage: str,
        valid_stages: list[str],
        weather_data: dict[str, Any] | None = None,
        action: str | None = None
    ) -> dict:
        results = {
            "budget": validate_budget(budget_available, estimated_cost),
            "equipment": validate_equipment(owned_equipment, required_equipment),
            "water": validate_water(irrigation_type, crop_water_needs),
            "farm_size": validate_farm_size(farm_size, min_required_size),
            "crop_stage": validate_crop_stage(current_stage, valid_stages)
        }
        
        if weather_data is not None:
            results["weather"] = validate_weather(action or "", weather_data)
        
        all_passed = all(passed for passed, _ in results.values())
        return {
            "is_valid": all_passed,
            "details": results
        }

