from typing import Any
from app.rules.engine import RuleEngine

# Comprehensive deterministic agricultural knowledge base (10 actions)
KNOWLEDGE_BASE: dict[str, dict[str, Any]] = {
    "apply_fertilizer": {
        "name": "Fertilizer Application",
        "category": "Nutrient Management",
        "estimated_cost": 500.0,
        "required_equipment": ["tractor", "spreader"],
        "water_needs": "medium",
        "min_size": 1.0,
        "valid_stages": ["vegetative", "flowering"],
        "success_msg": "Apply NPK fertilizer evenly using spreader according to soil test recommendations.",
        "alt_msg": "Consider manual fertilizer application using backpack sprayer or organic compost top-dressing.",
        "scientific_basis": "ICAR-TNAU split fertilizer application protocol prevents nitrogen volatilization."
    },
    "irrigation": {
        "name": "Irrigation Scheduling",
        "category": "Water Management",
        "estimated_cost": 200.0,
        "required_equipment": ["pump"],
        "water_needs": "medium",
        "min_size": 0.5,
        "valid_stages": ["sowing", "germination", "vegetative", "flowering", "maturity"],
        "success_msg": "Execute scheduled drip/furrow irrigation cycle based on evapotranspiration deficit.",
        "alt_msg": "Apply localized straw mulching and alternate-furrow deficit irrigation to conserve soil moisture.",
        "scientific_basis": "FAO Irrigation and Drainage Paper 56 crop evapotranspiration scheduling."
    },
    "pest_control": {
        "name": "Pest & Disease Control",
        "category": "Plant Health",
        "estimated_cost": 350.0,
        "required_equipment": ["sprayer"],
        "water_needs": "low",
        "min_size": 0.5,
        "valid_stages": ["vegetative", "flowering"],
        "success_msg": "Deploy targeted IPM biopesticide spray adhering to safety intervals and economic injury levels.",
        "alt_msg": "Implement biological pest controls, light traps, and neem-based manual spray (Azadirachtin).",
        "scientific_basis": "NCIPM-ICAR Integrated Pest Management thresholds for solanaceous and cereal crops."
    },
    "harvest": {
        "name": "Crop Harvesting",
        "category": "Harvest Operations",
        "estimated_cost": 2000.0,
        "required_equipment": ["harvester"],
        "water_needs": "low",
        "min_size": 2.0,
        "valid_stages": ["maturity"],
        "success_msg": "Proceed with mechanized combine harvesting under dry atmospheric moisture conditions.",
        "alt_msg": "Contract organized manual labor for sickle harvesting and mobile threshing rental.",
        "scientific_basis": "CIAE-ICAR grain shatter minimization and optimal moisture threshold (14-17%)."
    },
    "machinery_hire": {
        "name": "Machinery Hire",
        "category": "Farm Mechanization",
        "estimated_cost": 800.0,
        "required_equipment": [],
        "water_needs": "low",
        "min_size": 0.5,
        "valid_stages": ["land_preparation", "sowing", "vegetative", "flowering", "maturity"],
        "success_msg": "Book tractor and rotavator from nearby Custom Hiring Centre (CHC) under sub-mission mechanization.",
        "alt_msg": "Form peer farmer machinery-sharing collective or utilize bullock-drawn secondary implements.",
        "scientific_basis": "ICAR-AICRP Farm Mechanization operational efficiency and capital minimization."
    },
    "seed_selection": {
        "name": "Seed Selection & Treatment",
        "category": "Crop Establishment",
        "estimated_cost": 300.0,
        "required_equipment": [],
        "water_needs": "low",
        "min_size": 0.2,
        "valid_stages": ["land_preparation", "sowing", "germination"],
        "success_msg": "Procure certified high-yielding, drought/salinity-tolerant foundation seeds treated with bio-fungicide.",
        "alt_msg": "Select and clean vetted farmer-saved seed using 10% brine flotation and Trichoderma seed coating.",
        "scientific_basis": "National Seeds Corporation & ICAR-IIMR certified seed purity and germination norms (>85%)."
    },
    "soil_amendment": {
        "name": "Soil Amendment & Conditioning",
        "category": "Soil Health",
        "estimated_cost": 450.0,
        "required_equipment": ["tractor"],
        "water_needs": "low",
        "min_size": 0.5,
        "valid_stages": ["land_preparation", "vegetative"],
        "success_msg": "Incorporate agricultural gypsum/dolomite lime and well-decomposed FYM to correct soil pH and bulk density.",
        "alt_msg": "Incorporate in-situ green manure crops (Sesbania/Sunn hemp) and biochar for organic soil restoration.",
        "scientific_basis": "TNAU Soil Fertility Management and ICAR Central Soil Salinity Research Institute guidelines."
    },
    "crop_protection": {
        "name": "Preventive Crop Protection",
        "category": "Plant Health",
        "estimated_cost": 400.0,
        "required_equipment": ["sprayer"],
        "water_needs": "low",
        "min_size": 0.5,
        "valid_stages": ["vegetative", "flowering", "maturity"],
        "success_msg": "Erect yellow/blue sticky cards, pheromone lures, and prophylactic microbial biocontrol barriers.",
        "alt_msg": "Plant border barrier crops (sorghum/maize) and install bird perches across field perimeter.",
        "scientific_basis": "FAO Agro-Ecosystem Analysis (AESA) and push-pull habitat manipulation standards."
    },
    "post_harvest_storage": {
        "name": "Post-Harvest Storage",
        "category": "Post-Harvest Management",
        "estimated_cost": 250.0,
        "required_equipment": [],
        "water_needs": "low",
        "min_size": 0.5,
        "valid_stages": ["maturity", "post_harvest"],
        "success_msg": "Store threshed and sun-dried grain in multi-layer hermetic PICS bags in a ventilated, rodent-proof warehouse.",
        "alt_msg": "Utilize cleaned galvanized iron bins or treated traditional granaries with dry neem leaves.",
        "scientific_basis": "IRRI & FAO Grain Storage Technical Bulletin on hermetic storage against mycotoxins and weevils."
    },
    "crop_transportation": {
        "name": "Crop Transportation & Logistics",
        "category": "Supply Chain & Market Access",
        "estimated_cost": 600.0,
        "required_equipment": ["trailer"],
        "water_needs": "low",
        "min_size": 1.0,
        "valid_stages": ["maturity", "post_harvest"],
        "success_msg": "Dispatch produce via covered tractor-trailer directly to contracted processing facility or APMC terminal.",
        "alt_msg": "Aggregate cargo with neighboring farmers using hired mini-truck or commercial logistics provider.",
        "scientific_basis": "MoAFW Agricultural Marketing Infrastructure (AMI) post-harvest transit loss mitigation."
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
        crop_stage: str,
        soil_report: dict[str, Any] | None = None,
        crop_type: str | None = None,
        weather_data: dict[str, Any] | None = None
    ) -> dict:
        if action not in KNOWLEDGE_BASE:
            return {
                "recommendation": "Unknown action.",
                "explanation": "No rules defined for this action in knowledge base.",
                "constraints_considered": {},
                "estimated_cost": 0.0,
                "confidence_score": 0.0,
                "evaluation": {},
                "alternative": None,
                "resource_snapshot": None
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
            valid_stages=reqs["valid_stages"],
            weather_data=weather_data,
            action=action
        )
        
        # Build structured evaluation metadata
        owned_lower = [e.lower() for e in equipment]
        missing_equipment = [
            req for req in reqs["required_equipment"]
            if req.lower() not in owned_lower
        ]
        
        # Parse soil nutrients if provided
        soil_eval: dict[str, Any] = {
            "status": "Optimal",
            "nitrogen": "Medium",
            "phosphorus": "Medium",
            "potassium": "Medium"
        }
        if soil_report:
            n = soil_report.get("nitrogen")
            p = soil_report.get("phosphorus")
            k = soil_report.get("potassium")
            om = soil_report.get("organic_matter")
            
            n_status = "Low" if (n is not None and n < 20) else ("High" if (n is not None and n > 40) else "Medium")
            p_status = "Low" if (p is not None and p < 20) else ("High" if (p is not None and p > 40) else "Medium")
            k_status = "Low" if (k is not None and k < 20) else ("High" if (k is not None and k > 40) else "Medium")
            
            if n_status == "Low":
                status_summary = "Nitrogen Deficient"
            elif om is not None and om < 1.5:
                status_summary = "Low Organic Matter"
            else:
                status_summary = "Adequate Fertility"
                
            soil_eval = {
                "status": status_summary,
                "nitrogen": n_status,
                "phosphorus": p_status,
                "potassium": k_status,
                "raw": {
                    "nitrogen": n,
                    "phosphorus": p,
                    "potassium": k,
                    "organic_matter": om
                }
            }
        else:
            soil_eval["status"] = "Standard Levels"

        # Format weather evaluation
        weather_eval = None
        if weather_data is not None:
            w_passed, w_reason = eval_result["details"].get("weather", (True, "Weather nominal"))
            weather_eval = {
                "passed": w_passed,
                "condition": weather_data.get("condition", "Clear"),
                "temperature": weather_data.get("temperature", 28.0),
                "humidity": weather_data.get("humidity", 60.0),
                "rainfall_mm": weather_data.get("rainfall_mm", 0.0),
                "precipitation_probability": weather_data.get("precipitation_probability", 0),
                "wind_speed_kmh": weather_data.get("wind_speed_kmh", 10.0),
                "source": weather_data.get("source", "AgroClimatic"),
                "reason": w_reason
            }

        evaluation_metadata = {
            "budget": {
                "passed": budget >= reqs["estimated_cost"],
                "available": budget,
                "required": reqs["estimated_cost"]
            },
            "equipment": {
                "passed": len(missing_equipment) == 0,
                "owned": equipment,
                "required": reqs["required_equipment"],
                "missing": missing_equipment
            },
            "crop_stage": {
                "passed": crop_stage.lower() in [s.lower() for s in reqs["valid_stages"]],
                "stage": crop_stage.capitalize(),
                "valid_stages": reqs["valid_stages"]
            },
            "water": {
                "passed": eval_result["details"]["water"][0],
                "irrigation": irrigation.capitalize() if irrigation else "Rainfed",
                "required": reqs["water_needs"]
            },
            "farm_size": {
                "passed": farm_size >= reqs["min_size"],
                "size": farm_size,
                "min_required": reqs["min_size"]
            },
            "soil": soil_eval
        }
        if weather_eval:
            evaluation_metadata["weather"] = weather_eval

        # Build Resource Snapshot & Influence Explanation
        influence_reasons = []
        if budget < reqs["estimated_cost"]:
            influence_reasons.append(
                f"Available budget of ${budget:,.2f} is insufficient for mechanized ${reqs['estimated_cost']:,.2f} cost, prompting a lower-capital advisory path."
            )
        else:
            influence_reasons.append(
                f"Sufficient budget of ${budget:,.2f} covers the estimated ${reqs['estimated_cost']:,.2f} operational requirement."
            )

        if missing_equipment:
            influence_reasons.append(
                f"Farm lacks required equipment ({', '.join(missing_equipment)}), shifting advisory to manual or rental alternatives."
            )
        elif reqs["required_equipment"]:
            influence_reasons.append(
                f"Required machinery ({', '.join(reqs['required_equipment'])}) is present on-farm for immediate deployment."
            )

        influence_reasons.append(
            f"Crop growth stage '{crop_stage.capitalize()}' is {'appropriate' if evaluation_metadata['crop_stage']['passed'] else 'suboptimal'} for {action.replace('_', ' ')}."
        )

        influence_reasons.append(
            f"Farm acreage ({farm_size:.1f} acres) and {irrigation.capitalize() if irrigation else 'Rainfed'} irrigation govern the operational scale."
        )

        if weather_eval:
            influence_reasons.append(
                f"Weather ({weather_eval['condition']}, {weather_eval['temperature']}°C, {weather_eval['rainfall_mm']}mm rain): {weather_eval['reason']}"
            )

        influence_explanation = " ".join(influence_reasons)

        resource_snapshot = {
            "farm_size": farm_size,
            "budget": budget,
            "current_cash": budget,
            "machinery": equipment,
            "irrigation_method": irrigation.capitalize() if irrigation else "Rainfed",
            "soil_nutrients": {
                "nitrogen": soil_eval.get("nitrogen", "Medium"),
                "phosphorus": soil_eval.get("phosphorus", "Medium"),
                "potassium": soil_eval.get("potassium", "Medium"),
                "status": soil_eval.get("status", "Standard Levels")
            },
            "crop": crop_type.capitalize() if crop_type else "Paddy / Wheat",
            "crop_stage": crop_stage.capitalize() if crop_stage else "Vegetative",
            "influence_explanation": influence_explanation,
            "weather": weather_eval
        }
        
        # Determine alternative recommendation and explanations
        if eval_result["is_valid"]:
            alternative_data = {
                "recommendation": reqs["alt_msg"],
                "reason": "Lower capital requirement alternative relying on manual labor if mechanized equipment is committed elsewhere.",
                "estimated_cost": reqs["estimated_cost"] * 0.5
            }
            return {
                "recommendation": reqs["success_msg"],
                "explanation": "All farm constraints met successfully.",
                "constraints_considered": eval_result["details"],
                "estimated_cost": reqs["estimated_cost"],
                "confidence_score": 0.95,
                "evaluation": evaluation_metadata,
                "alternative": alternative_data,
                "resource_snapshot": resource_snapshot
            }
        else:
            failed_constraints = [
                name for name, (passed, _) in eval_result["details"].items()
                if not passed
            ]
            failed_summary = f"Bottlenecks identified in: {', '.join(failed_constraints)}"
            
            # Weather-specific guidance if weather was the blocker
            if "weather" in failed_constraints:
                weather_reason = eval_result["details"]["weather"][1]
                rec_text = f"Advisory Deferred: {weather_reason} Recommended action: {reqs['alt_msg']}"
            else:
                rec_text = reqs["alt_msg"]

            alternative_data = {
                "recommendation": reqs["success_msg"],
                "reason": f"Primary mechanized path unavailable ({failed_summary}). Resolving identified constraints will unlock this option.",
                "estimated_cost": reqs["estimated_cost"]
            }
            return {
                "recommendation": rec_text,
                "explanation": f"Primary recommendation adjusted due to constraints ({failed_summary}).",
                "constraints_considered": eval_result["details"],
                "estimated_cost": reqs["estimated_cost"] * 0.5,
                "confidence_score": 0.70,
                "evaluation": evaluation_metadata,
                "alternative": alternative_data,
                "resource_snapshot": resource_snapshot
            }
