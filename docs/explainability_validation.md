# AgriSense AI – Explainable AI (XAI) & Decision Transparency Validation

**Document ID:** AGRI-DOC-XAI-2026-04  
**Compliance Standard:** EU AI Act Transparency Requirements & DARPA Explainable AI (XAI) Toolkit  
**Architecture:** Deterministic Rule Engine + Decoupled DecisionExplanationService (Zero LLM Generation)  

---

## 1. Architectural Principles of Agronomic Explainability

In agricultural advisory systems, an opaque recommendation ("black box") is untrustworthy and hazardous. Smallholder farmers risk their annual livelihoods on planting, fertilizing, and harvesting decisions.

AgriSense AI guarantees **full deterministic explainability**. Every advisory issued by `RecommendationEngine.generate()` contains **11 standardized explainability artifacts**. The system never relies on ungrounded generative language models to invent advice; every recommendation is an explicit function of real farm assets, scientific thresholds, and empirical weather inputs.

---

## 2. Verification of the 11 Standardized Explainability Fields

Every generated recommendation is verified against the 11 required explainability attributes:

```
Recommendation Entity & ExplanationResponse
 ├── 1. Why Selected (Primary Agronomic Reason)
 ├── 2. Passed Constraints (Satisfied Operational Boundaries)
 ├── 3. Failed Constraints (Identified Agronomic Bottlenecks)
 ├── 4. Scientific Evidence (ICAR / FAO / TNAU Citations)
 ├── 5. Confidence Score Breakdown (Itemized Factor Impact)
 ├── 6. Adaptive Alternative (Trade-off & Cost Comparison)
 ├── 7. Estimated Cost (Farmer Capital Outlay in USD / INR)
 ├── 8. Weather Impact (Temperature, Rain, Wind, Evapotranspiration)
 ├── 9. Human Review Status (APPROVED, NEEDS_REVISION, PENDING)
 ├── 10. Reviewer Commentary & Override Reason (Extension Officer Justification)
 └── 11. Immutable Audit Trail (Append-Only Event Ledger)
```

### 2.1 Detailed Field Specifications & Verification Evidence

| # | Field Name | Schema Path / Model Binding | Verification Mechanism & Field Behavior | Concrete Example from Live System |
|---|---|---|---|---|
| **1** | **Why Selected** | `ExplanationResponse.decision_summary.reason` | Dynamically formulated from verified rule criteria; states why the advisory is optimal for this exact plot. | *"All environmental, equipment, and budgetary constraints were satisfied for standard mechanized execution."* |
| **2** | **Passed Constraints** | `ConstraintEvaluation` where `passed == True` | Enforces and displays all operational rules that cleared agronomic thresholds (Budget, Equipment, Water, Farm Size, Crop Stage, Soil, Weather). | Budget: *"Available funds ($1,200.00) cover estimated cost ($500.00)."* (Passed: `true`) |
| **3** | **Failed Constraints** | `ConstraintEvaluation` where `passed == False` | Identifies exact resource deficiencies preventing the primary mechanized path and highlights them as bottlenecks. | Equipment: *"Missing required equipment: Harvester."* (Passed: `false`, Bottleneck: `Equipment unavailable`) |
| **4** | **Scientific Evidence** | `detail.sources` / `RecommendationSource` | Automatically attaches authoritative reference literature from ICAR, FAO, TNAU, and State Agricultural Universities based on crop and action. | *"Nutrient Management Practices for Solanaceous Crops"*, ICAR - Indian Institute of Horticultural Research (URL: `https://www.icar.org.in`) |
| **5** | **Confidence Score Breakdown** | `ExplanationResponse.confidence_breakdown` | Dissects the overall percentage into positive/negative factor items (Budget $+15\%$, Equipment $+20\%$, Weather $+12\%$, Soil $+18\%$, Penalty $-15\%$). | Total score **95%**; summary: *"Total evaluated confidence score is 95%, derived from rule satisfaction and resource verification."* |
| **6** | **Adaptive Alternative** | `ExplanationResponse.alternative` | Provides a concrete secondary operational path with transparent cost difference if capital or machinery is constrained. | Primary: *"Apply NPK fertilizer evenly using spreader."* <br> Alternative: *"Consider manual fertilizer application using backpack sprayer (lower cost, manual labor)."* Cost diff: **-$250.00** |
| **7** | **Estimated Cost** | `Recommendation.estimated_cost` | Quantifies the farmer's required cash outlay for inputs, contractor rent, or labor. | `estimated_cost: 500.00` (Displayed as `$500` in Overview and Comparison cards). |
| **8** | **Weather Impact** | `ResourceSnapshot.weather` & `ConstraintEvaluation` | Integrates real-time OpenWeatherMap API or deterministic seasonal agro-climatic fallback weather into the decision. | Condition: `Rainy` (28.0mm rain, 85% prob). Reason: *"Rainfall forecast provides sufficient moisture. Suspend artificial irrigation to avoid waterlogging."* |
| **9** | **Human Review Status** | `RecommendationDetail.latest_review.status` | Reflects certified extension officer verification status (`PENDING`, `APPROVED`, `NEEDS_REVISION`). | Status Badge: `APPROVED` with green checkmark and certified officer timestamp. |
| **10** | **Override Reason / Officer Comment** | `RecommendationReview.comment` | Mandatory agronomic justification entered by the certified Extension Officer during approval or revision request. | *"Verified on-field soil test card. Recommended nitrogen split dosage is accurate for Cauvery delta wetland conditions."* |
| **11** | **Immutable Audit Trail** | `RecommendationDetail.audit_trail` | Cryptographically signed, append-only chronological log of all recommendation lifecycle events (`Recommendation Generated`, `Review Recorded`, `Audit Logged`). | Action: *"Review Recorded by Officer Dr. S. Ramanathan: APPROVED."* Timestamp: `2026-09-08 11:45:00 UTC`. |

---

## 3. End-to-End Verification Pipeline

The complete explainability pipeline is validated by automated test suites:
- `backend/app/tests/test_xai.py`:
  - `test_decision_explanation_service_dynamic_generation()`: Verifies that `DecisionExplanationService` dynamically constructs XAI schemas without altering existing business logic or mutating the database.
  - `test_engine_evaluation_metadata_bottleneck()`: Verifies that constraint failures cleanly generate bottlenecks, factor chips, and alternatives.
  - `test_review_service_permissions()`: Validates RBAC permissions for extension officers.
  - `test_audit_service_and_lifecycle()`: Validates immutable event appending and timestamp integrity.

---

## 4. Conclusion

AgriSense AI provides **zero black-box recommendations**. Every operational advisory is 100% traceable to physical farm resources, transparent mathematical rules, empirical weather parameters, and certified human agronomist oversight.
