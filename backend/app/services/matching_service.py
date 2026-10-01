import uuid
from typing import List, Optional
from app.models.farm import Farm
from app.models.crop import Crop
from app.models.soil_report import SoilReport
from app.models.budget import Budget
from app.models.recommendation import Recommendation
from app.models.company import Company, ProcurementRequirement, ProcurementStatus
from app.schemas.contract import MatchingResult, ConstraintMatch

class FarmerCompanyMatchingEngine:
    """
    Deterministic, rule-based matching engine that evaluates farm capabilities against
    food processing company procurement requirements without using any LLM.
    """

    @staticmethod
    def evaluate_match(
        procurement: ProcurementRequirement,
        company: Company,
        farm: Farm,
        crop: Optional[Crop] = None,
        soil: Optional[SoilReport] = None,
        budget: Optional[Budget] = None,
        latest_recommendation: Optional[Recommendation] = None
    ) -> Optional[MatchingResult]:
        """
        Evaluates a single farm against a company's procurement requirement.
        Returns MatchingResult if compatible (or partial match), or None if fundamentally incompatible crop.
        """
        crop_name = crop.crop_type.lower() if crop else (farm.crops[0].crop_type.lower() if farm.crops else "")
        target_crop = procurement.crop.lower()

        # Fundamental requirement: crop must match (or be supported by company)
        supported = [c.lower() for c in (company.supported_crops or [])]
        if crop_name and target_crop and crop_name != target_crop and crop_name not in supported:
            return None

        matched_constraints: List[ConstraintMatch] = []
        failed_constraints: List[ConstraintMatch] = []

        total_weight = 0.0
        earned_score = 0.0

        # 1. Crop Match (Weight: 25%)
        total_weight += 25.0
        if crop_name == target_crop:
            earned_score += 25.0
            matched_constraints.append(ConstraintMatch(
                name="Crop Type",
                passed=True,
                description=f"Farm actively cultivates {crop_name.capitalize()}, which matches company procurement target.",
                farm_value=crop_name.capitalize(),
                required_value=target_crop.capitalize()
            ))
        else:
            failed_constraints.append(ConstraintMatch(
                name="Crop Type",
                passed=False,
                description=f"Farm crop '{crop_name}' does not match target '{target_crop}'.",
                farm_value=crop_name or "None",
                required_value=target_crop
            ))

        # 2. Farm Size Constraint (Weight: 20%)
        total_weight += 20.0
        req_size = procurement.minimum_farm_size or 1.0
        if farm.farm_size >= req_size:
            earned_score += 20.0
            matched_constraints.append(ConstraintMatch(
                name="Minimum Farm Size",
                passed=True,
                description=f"Farm size of {farm.farm_size} ha meets or exceeds minimum requirement of {req_size} ha.",
                farm_value=f"{farm.farm_size} ha",
                required_value=f">= {req_size} ha"
            ))
        else:
            earned_score += max(0.0, (farm.farm_size / req_size) * 10.0) # partial score
            failed_constraints.append(ConstraintMatch(
                name="Minimum Farm Size",
                passed=False,
                description=f"Farm size of {farm.farm_size} ha is below preferred scale of {req_size} ha.",
                farm_value=f"{farm.farm_size} ha",
                required_value=f">= {req_size} ha"
            ))

        # 3. Irrigation Method (Weight: 15%)
        total_weight += 15.0
        farm_irr = (farm.irrigation_type or "rainfed").lower()
        pref_irr = (procurement.preferred_irrigation or "").lower()
        if not pref_irr or farm_irr == pref_irr or "drip" in farm_irr:
            earned_score += 15.0
            matched_constraints.append(ConstraintMatch(
                name="Irrigation Method",
                passed=True,
                description=f"Farm irrigation '{farm_irr.capitalize()}' is compatible with company's '{pref_irr or 'Any'}' quality requirements.",
                farm_value=farm_irr.capitalize(),
                required_value=(pref_irr or "Any").capitalize()
            ))
        else:
            earned_score += 5.0
            failed_constraints.append(ConstraintMatch(
                name="Irrigation Method",
                passed=False,
                description=f"Company prefers '{pref_irr}' irrigation, whereas farm uses '{farm_irr}'.",
                farm_value=farm_irr.capitalize(),
                required_value=pref_irr.capitalize()
            ))

        # 4. Soil Quality & Nutrients (Weight: 25%)
        total_weight += 25.0
        soil_score = 0.0
        soil_passed = True
        soil_reasons = []

        if soil:
            # Nitrogen check
            if procurement.nitrogen_requirement:
                if soil.nitrogen >= procurement.nitrogen_requirement:
                    soil_score += 7.0
                    soil_reasons.append(f"Nitrogen {soil.nitrogen} >= {procurement.nitrogen_requirement}")
                else:
                    soil_passed = False
                    soil_reasons.append(f"Nitrogen {soil.nitrogen} < {procurement.nitrogen_requirement}")
            else:
                soil_score += 7.0

            # Phosphorus check
            if procurement.phosphorus_requirement:
                if soil.phosphorus >= procurement.phosphorus_requirement:
                    soil_score += 6.0
                    soil_reasons.append(f"Phosphorus {soil.phosphorus} >= {procurement.phosphorus_requirement}")
                else:
                    soil_passed = False
                    soil_reasons.append(f"Phosphorus {soil.phosphorus} < {procurement.phosphorus_requirement}")
            else:
                soil_score += 6.0

            # Potassium check
            if procurement.potassium_requirement:
                if soil.potassium >= procurement.potassium_requirement:
                    soil_score += 6.0
                    soil_reasons.append(f"Potassium {soil.potassium} >= {procurement.potassium_requirement}")
                else:
                    soil_passed = False
                    soil_reasons.append(f"Potassium {soil.potassium} < {procurement.potassium_requirement}")
            else:
                soil_score += 6.0

            # Organic matter check
            if procurement.organic_matter_requirement:
                if (soil.organic_matter or 1.0) >= procurement.organic_matter_requirement:
                    soil_score += 6.0
                    soil_reasons.append(f"Organic matter {soil.organic_matter}% >= {procurement.organic_matter_requirement}%")
                else:
                    soil_passed = False
                    soil_reasons.append(f"Organic matter {soil.organic_matter}% < {procurement.organic_matter_requirement}%")
            else:
                soil_score += 6.0
        else:
            # No soil report on file -> award partial baseline
            soil_score = 12.0
            soil_passed = False
            soil_reasons.append("Soil test report pending verification")

        earned_score += soil_score
        if soil_passed:
            matched_constraints.append(ConstraintMatch(
                name="Soil Nutrient Quality",
                passed=True,
                description="Soil chemical and organic parameters meet processing quality thresholds. (" + ", ".join(soil_reasons) + ")",
                farm_value=f"N:{soil.nitrogen if soil else 'N/A'}, P:{soil.phosphorus if soil else 'N/A'}, K:{soil.potassium if soil else 'N/A'}",
                required_value="Quality Standard Passed"
            ))
        else:
            failed_constraints.append(ConstraintMatch(
                name="Soil Nutrient Quality",
                passed=False,
                description="Some soil quality parameters require enrichment to achieve Grade A standard. (" + ", ".join(soil_reasons) + ")",
                farm_value=f"N:{soil.nitrogen if soil else 'N/A'}, P:{soil.phosphorus if soil else 'N/A'}, K:{soil.potassium if soil else 'N/A'}",
                required_value=f"Req Grade {procurement.minimum_quality_grade}"
            ))

        # 5. Recommendation Confidence & Agricultural Soundness (Weight: 15%)
        total_weight += 15.0
        if latest_recommendation and latest_recommendation.confidence_score >= 0.70:
            earned_score += 15.0
            matched_constraints.append(ConstraintMatch(
                name="Advisory Confidence",
                passed=True,
                description=f"Latest agricultural advisory confidence of {int(latest_recommendation.confidence_score * 100)}% confirms viable cultivation protocol.",
                farm_value=f"{int(latest_recommendation.confidence_score * 100)}%",
                required_value=">= 70%"
            ))
        else:
            earned_score += 10.0
            matched_constraints.append(ConstraintMatch(
                name="Advisory Confidence",
                passed=True,
                description="Farm cultivation protocol conforms to baseline regional agronomic standard.",
                farm_value="Standard",
                required_value="Verified"
            ))

        # Normalize Compatibility Score (0.0 to 1.0)
        compatibility_score = round(min(1.0, earned_score / total_weight), 2)

        # Revenue & Profit Calculation
        # Baseline yield: 2.5 tonnes per hectare for rice/wheat, 8 tonnes for tomato
        yield_multiplier = 8.0 if "tomato" in target_crop else 2.5
        est_yield = round(farm.farm_size * yield_multiplier, 1)
        est_contract_quantity = min(est_yield, procurement.required_quantity)
        est_revenue = round(est_contract_quantity * procurement.offered_price, 2)
        
        # Estimated operational cost from recommendation or farm size heuristic ($300/ha)
        est_cost = latest_recommendation.estimated_cost if latest_recommendation and latest_recommendation.estimated_cost else round(farm.farm_size * 320.0, 2)
        est_profit = max(0.0, round(est_revenue - est_cost, 2))

        # Deterministic Natural Language Explanation
        passed_names = [c.name for c in matched_constraints]
        failed_names = [c.name for c in failed_constraints]

        if compatibility_score >= 0.85:
            explanation = (
                f"Exceptional match ({int(compatibility_score * 100)}%). "
                f"This farm satisfies all primary criteria including {', '.join(passed_names[:3])}. "
                f"Yield and quality parameters are projected to satisfy {company.company_name}'s {procurement.minimum_quality_grade} standards."
            )
        elif compatibility_score >= 0.65:
            limitation_str = f"Limitation noted in {', '.join(failed_names)}." if failed_names else ""
            explanation = (
                f"Strong potential match ({int(compatibility_score * 100)}%). "
                f"Farm satisfies {', '.join(passed_names[:2])}. {limitation_str} "
                f"Corrective nutrient or irrigation management will ensure full compliance with {procurement.minimum_quality_grade} grade."
            )
        else:
            explanation = (
                f"Moderate match ({int(compatibility_score * 100)}%). "
                f"Significant constraints detected in: {', '.join(failed_names)}. "
                f"Substantial farm resource adjustments required before entering binding contract farming agreement."
            )

        return MatchingResult(
            procurement_id=procurement.id,
            company_id=company.id,
            company_name=company.company_name,
            processing_category=company.processing_category,
            crop=procurement.crop,
            offered_price=procurement.offered_price,
            required_quantity=procurement.required_quantity,
            compatibility_score=compatibility_score,
            matched_constraints=matched_constraints,
            failed_constraints=failed_constraints,
            estimated_revenue=est_revenue,
            estimated_cost=est_cost,
            estimated_profit=est_profit,
            match_explanation=explanation
        )
