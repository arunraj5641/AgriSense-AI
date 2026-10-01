import uuid
from typing import Any
from app.models.recommendation import Recommendation
from app.schemas.recommendation_xai import (
    ConstraintEvaluation,
    DecisionSummary,
    ConfidenceItem,
    ConfidenceBreakdown,
    AlternativeRecommendation,
    ExplanationResponse,
    ResourceSnapshot,
    SoilNutrientsSnapshot,
)

class DecisionExplanationService:
    @staticmethod
    def generate_explanation(recommendation: Recommendation) -> ExplanationResponse:
        """
        Dynamically generates structured XAI explanation consuming evaluation_metadata
        and existing constraints_considered. Never re-runs business rules or makes decisions.
        """
        eval_meta: dict[str, Any] = recommendation.evaluation_metadata or {}
        evaluation: dict[str, Any] = eval_meta.get("evaluation", {})
        alt_meta: dict[str, Any] = eval_meta.get("alternative", {})
        constraints_considered: dict[str, Any] = recommendation.constraints_considered or {}

        # 1. Constraint Evaluation Table
        constraints_list: list[ConstraintEvaluation] = []
        bottlenecks: list[str] = []
        chips: list[str] = []

        # --- Budget ---
        b_eval = evaluation.get("budget")
        if b_eval:
            passed = b_eval.get("passed", True)
            avail = b_eval.get("available", 0.0)
            req = b_eval.get("required", 0.0)
            explanation = (
                f"Available funds (${avail:,.2f}) cover estimated cost (${req:,.2f})."
                if passed
                else f"Available budget (${avail:,.2f}) is insufficient for required cost (${req:,.2f})."
            )
            constraints_list.append(ConstraintEvaluation(
                name="Budget",
                passed=passed,
                details=b_eval,
                explanation=explanation
            ))
            if not passed:
                bottlenecks.append("Low Budget")
                chips.append("Low Budget")
            else:
                chips.append("Adequate Budget")
        elif "budget" in constraints_considered:
            passed, reason = constraints_considered["budget"]
            constraints_list.append(ConstraintEvaluation(
                name="Budget",
                passed=passed,
                details={"reason": reason},
                explanation=reason
            ))
            if not passed:
                bottlenecks.append("Budget limitation")
                chips.append("Low Budget")
            else:
                chips.append("Adequate Budget")

        # --- Equipment ---
        eq_eval = evaluation.get("equipment")
        if eq_eval:
            passed = eq_eval.get("passed", True)
            missing = eq_eval.get("missing", [])
            owned = eq_eval.get("owned", [])
            explanation = (
                f"All required equipment is available on the farm."
                if passed
                else f"Missing required equipment: {', '.join(m.capitalize() for m in missing)}."
            )
            constraints_list.append(ConstraintEvaluation(
                name="Equipment",
                passed=passed,
                details=eq_eval,
                explanation=explanation
            ))
            if not passed:
                bottlenecks.append(f"Equipment unavailable ({', '.join(missing)})")
                chips.append("Equipment Unavailable")
                chips.append("Manual Labour Available")
            else:
                chips.append("Mechanized Equipment Available")
        elif "equipment" in constraints_considered:
            passed, reason = constraints_considered["equipment"]
            constraints_list.append(ConstraintEvaluation(
                name="Equipment",
                passed=passed,
                details={"reason": reason},
                explanation=reason
            ))
            if not passed:
                bottlenecks.append("Equipment unavailable")
                chips.append("Equipment Unavailable")
            else:
                chips.append("Equipment Available")

        # --- Crop Stage ---
        cs_eval = evaluation.get("crop_stage")
        if cs_eval:
            passed = cs_eval.get("passed", True)
            stage = cs_eval.get("stage", "Unknown")
            explanation = (
                f"Crop stage ({stage}) matches recommended application window."
                if passed
                else f"Current crop stage ({stage}) is outside the optimal operational window."
            )
            constraints_list.append(ConstraintEvaluation(
                name="Crop Stage",
                passed=passed,
                details=cs_eval,
                explanation=explanation
            ))
            chips.append(f"{stage} Stage")
            if not passed:
                bottlenecks.append(f"Suboptimal crop stage ({stage})")
        elif "crop_stage" in constraints_considered:
            passed, reason = constraints_considered["crop_stage"]
            constraints_list.append(ConstraintEvaluation(
                name="Crop Stage",
                passed=passed,
                details={"reason": reason},
                explanation=reason
            ))
            if not passed:
                bottlenecks.append("Crop stage mismatch")

        # --- Farm Size ---
        fs_eval = evaluation.get("farm_size")
        if fs_eval:
            passed = fs_eval.get("passed", True)
            size = fs_eval.get("size", 0.0)
            explanation = (
                f"Farm size ({size:.1f} acres) meets minimum operating threshold."
                if passed
                else f"Farm size ({size:.1f} acres) is below economic threshold."
            )
            constraints_list.append(ConstraintEvaluation(
                name="Farm Size",
                passed=passed,
                details=fs_eval,
                explanation=explanation
            ))
            chips.append("Smallholder Plot" if size < 5 else "Commercial Scale")
            if not passed:
                bottlenecks.append("Farm size below threshold")
        elif "farm_size" in constraints_considered:
            passed, reason = constraints_considered["farm_size"]
            constraints_list.append(ConstraintEvaluation(
                name="Farm Size",
                passed=passed,
                details={"reason": reason},
                explanation=reason
            ))

        # --- Water & Irrigation ---
        w_eval = evaluation.get("water")
        if w_eval:
            passed = w_eval.get("passed", True)
            irrigation = w_eval.get("irrigation", "Rainfed")
            explanation = (
                f"Irrigation method ({irrigation}) meets crop moisture requirements."
                if passed
                else f"Irrigation setup ({irrigation}) is inadequate for water-intensive operations."
            )
            constraints_list.append(ConstraintEvaluation(
                name="Water & Irrigation",
                passed=passed,
                details=w_eval,
                explanation=explanation
            ))
            chips.append(f"{irrigation} Irrigation")
            if not passed:
                bottlenecks.append("Insufficient water / irrigation")
        elif "water" in constraints_considered:
            passed, reason = constraints_considered["water"]
            constraints_list.append(ConstraintEvaluation(
                name="Water & Irrigation",
                passed=passed,
                details={"reason": reason},
                explanation=reason
            ))

        # --- Weather Constraints ---
        weath_eval = evaluation.get("weather")
        if weath_eval:
            w_passed = weath_eval.get("passed", True)
            w_cond = weath_eval.get("condition", "Clear")
            w_temp = weath_eval.get("temperature", 28.0)
            w_rain = weath_eval.get("rainfall_mm", 0.0)
            w_reason = weath_eval.get("reason", f"Condition: {w_cond}")
            constraints_list.append(ConstraintEvaluation(
                name="Weather",
                passed=w_passed,
                details=weath_eval,
                explanation=w_reason
            ))
            chips.append(f"{w_cond} Weather ({w_temp}°C)")
            if not w_passed:
                bottlenecks.append(f"Adverse weather ({w_cond})")
        elif "weather" in constraints_considered:
            passed, reason = constraints_considered["weather"]
            constraints_list.append(ConstraintEvaluation(
                name="Weather",
                passed=passed,
                details={"reason": reason},
                explanation=reason
            ))
            if not passed:
                bottlenecks.append("Adverse weather condition")
            chips.append("Weather Evaluated")

        # --- Soil Nutrients ---
        s_eval = evaluation.get("soil")
        if s_eval:
            status = s_eval.get("status", "Standard Levels")
            n = s_eval.get("nitrogen", "Medium")
            p = s_eval.get("phosphorus", "Medium")
            k = s_eval.get("potassium", "Medium")
            is_deficient = "Deficient" in status or n == "Low" or p == "Low" or k == "Low"
            explanation = f"Soil test profile: Nitrogen {n}, Phosphorus {p}, Potassium {k}. Status: {status}."
            constraints_list.append(ConstraintEvaluation(
                name="Soil Nutrients",
                passed=not is_deficient,
                details=s_eval,
                explanation=explanation
            ))
            if is_deficient:
                chips.append(status)
                bottlenecks.append(f"Soil {status}")
            else:
                chips.append("Optimal Soil Nutrients")
        else:
            constraints_list.append(ConstraintEvaluation(
                name="Soil Nutrients",
                passed=True,
                details={"status": "Standard Baseline"},
                explanation="Standard nutrient baseline assumed. Comprehensive soil test report recommended."
            ))
            chips.append("Standard Soil Nutrients")

        # 2. Decision Summary
        primary_rec = recommendation.recommendation
        all_passed = all(c.passed for c in constraints_list)
        if all_passed:
            reason = "All environmental, equipment, and budgetary constraints were satisfied for standard execution."
            key_bottleneck = None
        else:
            reason = f"Primary recommendation adapted due to identified constraints: {', '.join(bottlenecks) if bottlenecks else 'Resource limitations'}."
            key_bottleneck = bottlenecks[0] if bottlenecks else "Resource Limitation"

        decision_summary = DecisionSummary(
            recommendation=primary_rec,
            reason=reason,
            key_bottleneck=key_bottleneck
        )

        # 3. Alternative Recommendation
        alternative: AlternativeRecommendation | None = None
        if alt_meta and alt_meta.get("recommendation"):
            cost_diff = (
                recommendation.estimated_cost - alt_meta.get("estimated_cost", 0.0)
                if recommendation.estimated_cost is not None and alt_meta.get("estimated_cost") is not None
                else None
            )
            alternative = AlternativeRecommendation(
                primary_recommendation=primary_rec,
                alternative_recommendation=alt_meta["recommendation"],
                reason=alt_meta.get("reason", "Alternative option based on resource trade-offs."),
                estimated_cost_difference=cost_diff
            )
        elif not all_passed:
            alternative = AlternativeRecommendation(
                primary_recommendation="Mechanized standard application",
                alternative_recommendation=primary_rec,
                reason="Budget or machinery constraint prevented standard mechanized application.",
                estimated_cost_difference=recommendation.estimated_cost * 0.5 if recommendation.estimated_cost else 0.0
            )

        # 4. Confidence Breakdown
        conf_score = recommendation.confidence_score
        conf_percent = int(round(conf_score * 100))
        items: list[ConfidenceItem] = []

        # Budget item
        b_passed = any(c.passed for c in constraints_list if c.name == "Budget")
        items.append(ConfidenceItem(factor="Budget", passed=b_passed, impact="+15%" if b_passed else "+0%"))

        # Equipment item
        eq_passed = any(c.passed for c in constraints_list if c.name == "Equipment")
        items.append(ConfidenceItem(factor="Equipment", passed=eq_passed, impact="+20%" if eq_passed else "+0%"))

        # Crop stage item
        cs_passed = any(c.passed for c in constraints_list if c.name == "Crop Stage")
        items.append(ConfidenceItem(factor="Crop Stage", passed=cs_passed, impact="+18%" if cs_passed else "+0%"))

        # Soil item
        s_passed = any(c.passed for c in constraints_list if c.name == "Soil Nutrients")
        items.append(ConfidenceItem(factor="Soil Nutrients", passed=s_passed, impact="+18%" if s_passed else "+10%"))

        # Water item
        w_passed = any(c.passed for c in constraints_list if c.name == "Water & Irrigation")
        items.append(ConfidenceItem(factor="Water & Irrigation", passed=w_passed, impact="+15%" if w_passed else "+0%"))

        # Weather item
        weath_c = next((c for c in constraints_list if c.name == "Weather"), None)
        if weath_c:
            items.append(ConfidenceItem(factor="Weather Feasibility", passed=weath_c.passed, impact="+12%" if weath_c.passed else "-15%"))

        # Penalty / Alternative factor
        if not all_passed:
            items.append(ConfidenceItem(factor="Alternative Required", passed=False, impact="-15%"))
        else:
            items.append(ConfidenceItem(factor="Direct Rule Match", passed=True, impact="+9%"))

        summary = f"Total evaluated confidence score is {conf_percent}%, derived from rule satisfaction and resource verification."
        confidence_breakdown = ConfidenceBreakdown(
            overall_score=conf_score,
            overall_percentage=conf_percent,
            items=items,
            summary=summary
        )

        # 5. Resource Snapshot & Influence (Feature 2)
        raw_snap = eval_meta.get("resource_snapshot")
        if raw_snap:
            soil_raw = raw_snap.get("soil_nutrients", {})
            resource_snapshot = ResourceSnapshot(
                farm_size=raw_snap.get("farm_size", 0.0),
                budget=raw_snap.get("budget", 0.0),
                current_cash=raw_snap.get("current_cash", 0.0),
                machinery=raw_snap.get("machinery", []),
                irrigation_method=raw_snap.get("irrigation_method", "Rainfed"),
                soil_nutrients=SoilNutrientsSnapshot(
                    nitrogen=soil_raw.get("nitrogen", "Medium"),
                    phosphorus=soil_raw.get("phosphorus", "Medium"),
                    potassium=soil_raw.get("potassium", "Medium"),
                    status=soil_raw.get("status", "Standard Levels")
                ),
                crop=raw_snap.get("crop", "General Crop"),
                crop_stage=raw_snap.get("crop_stage", "Vegetative"),
                influence_explanation=raw_snap.get("influence_explanation", "Resources evaluated against standard agronomic operational rules."),
                weather=raw_snap.get("weather")
            )
        else:
            b_val = evaluation.get("budget", {}).get("available", 0.0)
            eq_val = evaluation.get("equipment", {}).get("owned", [])
            w_val = evaluation.get("water", {}).get("irrigation", "Rainfed")
            cs_val = evaluation.get("crop_stage", {}).get("stage", "Vegetative")
            fs_val = evaluation.get("farm_size", {}).get("size", 0.0)
            s_val = evaluation.get("soil", {})
            weath_val = evaluation.get("weather")
            resource_snapshot = ResourceSnapshot(
                farm_size=fs_val,
                budget=b_val,
                current_cash=b_val,
                machinery=eq_val,
                irrigation_method=w_val,
                soil_nutrients=SoilNutrientsSnapshot(
                    nitrogen=s_val.get("nitrogen", "Medium"),
                    phosphorus=s_val.get("phosphorus", "Medium"),
                    potassium=s_val.get("potassium", "Medium"),
                    status=s_val.get("status", "Standard Levels")
                ),
                crop="Paddy / Wheat",
                crop_stage=cs_val,
                influence_explanation=f"Farm resources evaluated: Available budget (${b_val:,.2f}), {len(eq_val)} pieces of equipment, {fs_val} acres under {w_val} irrigation at {cs_val} stage.",
                weather=weath_val
            )

        return ExplanationResponse(
            recommendation_id=recommendation.id,
            decision_summary=decision_summary,
            constraints=constraints_list,
            decision_factors=list(dict.fromkeys(chips)),  # unique chips
            alternative=alternative,
            confidence_breakdown=confidence_breakdown,
            resource_snapshot=resource_snapshot
        )

