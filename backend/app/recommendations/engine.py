from app.rules.engine import RuleEngine

# Simplified deterministic knowledge base for MVP
KNOWLEDGE_BASE = {
    "apply_fertilizer": {
        "estimated_cost": 500.0,
        "required_equipment": ["tractor", "spreader"],
        "water_needs": "medium",
        "min_size": 1.0,
        "valid_stages": ["vegetative", "flowering"],
        "success_msg": "Apply NPK fertilizer evenly using spreader.",
        "alt_msg": "Consider manual fertilizer application using backpack sprayer (lower cost, manual labor)."
    },
    "harvest": {
        "estimated_cost": 2000.0,
        "required_equipment": ["harvester"],
        "water_needs": "low",
        "min_size": 2.0,
        "valid_stages": ["maturity"],
        "success_msg": "Proceed with mechanical harvesting.",
        "alt_msg": "Contract manual labor for harvesting or rent equipment."
    }
}

class RecommendationEngine:
    @staticmethod
    def generate(
        action: str,
        budget: float,
        equipment: list[str],
        irrigation: str | None,
        farm_size: float,
        crop_stage: str
    ) -> dict:
        if action not in KNOWLEDGE_BASE:
            return {
                "recommendation": "Unknown action.",
                "explanation": "No rules defined for this action.",
                "constraints_considered": {},
                "estimated_cost": 0.0,
                "confidence_score": 0.0
            }
            
        reqs = KNOWLEDGE_BASE[action]
        eval_result = RuleEngine.evaluate_constraints(
            budget_available=budget,
            estimated_cost=reqs["estimated_cost"],
            owned_equipment=equipment,
            required_equipment=reqs["required_equipment"],
            irrigation_type=irrigation,
            crop_water_needs=reqs["water_needs"],
            farm_size=farm_size,
            min_required_size=reqs["min_size"],
            current_stage=crop_stage,
            valid_stages=reqs["valid_stages"]
        )
        
        if eval_result["is_valid"]:
            return {
                "recommendation": reqs["success_msg"],
                "explanation": "All farm constraints met successfully.",
                "constraints_considered": eval_result["details"],
                "estimated_cost": reqs["estimated_cost"],
                "confidence_score": 0.95
            }
        else:
            return {
                "recommendation": reqs["alt_msg"],
                "explanation": "Primary recommendation rejected due to constraints.",
                "constraints_considered": eval_result["details"],
                "estimated_cost": reqs["estimated_cost"] * 0.5,
                "confidence_score": 0.70
            }
