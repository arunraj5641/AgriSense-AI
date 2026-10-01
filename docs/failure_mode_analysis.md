# AgriSense AI – Comprehensive Failure Mode & Edge Case Analysis

**Document ID:** AGRI-DOC-FMA-2026-01  
**Classification:** System Architecture & Agronomic Safety Protocol  
**Compliance Standard:** ISO/IEC 25010 (Software Quality Requirements) & ICAR Agronomic Advisory Safety Guidelines  

---

## 1. Overview & Architectural Safety Philosophy

The AgriSense AI Recommendation Engine is designed around a **fail-safe deterministic architecture**. In safety-critical agricultural advisories, stochastic hallucinations, silent degradations, or ungrounded machine learning inferences risk catastrophic crop failure, economic ruination for vulnerable smallholders, and legal non-compliance.

The system enforces strict boundary checking through **guardrail rules** before issuing any advisory. When anomalies or edge conditions occur, AgriSense executes explicit fallback logic, delivers actionable user-facing guidance, adjusts the confidence score predictably, and logs the incident to the immutable audit trail.

---

## 2. Detailed Failure Mode Matrix

The table below outlines the 7 core failure modes, their trigger conditions, system behavior, deterministic fallback logic, user message, and calibrated confidence score impact.

| # | Failure Mode | Trigger Condition | System Behaviour | Fallback Logic | User Message | Confidence Impact |
|---|---|---|---|---|---|---|
| **1** | **Missing Soil Report** | Farm profile has no linked laboratory soil test (N, P, K, pH, Organic Matter null). | Recommendation generation proceeds with conservative default fertility baseline. | Engine applies regional agro-climatic standard baseline (Medium N-P-K); flags soil report recommendation; avoids aggressive high-dosage chemical nitrogen recommendations. | *"Standard nutrient baseline assumed. Comprehensive soil test report recommended for precision nutrient management."* | Confidence score capped at **0.85** (standard baseline penalty of -10%). |
| **2** | **Zero / Insufficient Budget** | Available cash = $0.00 or budget is less than primary mechanized operational cost. | System prevents execution of capital-intensive mechanized paths; activates adaptive alternative path. | Generates lower-capital or zero-cash manual/organic alternative (e.g., manual backpack spraying, on-farm Jeevamrutha compost, community labor pooling). | *"Available budget is insufficient for mechanized execution. Recommended adaptive low-capital advisory path using on-farm resources."* | Confidence score drops to **0.70**; key bottleneck clearly marked as `Low Budget`. |
| **3** | **Unsupported / Unrecognized Crop** | Farmer specifies a crop outside standard regional taxonomy or unsupported target action. | System rejects arbitrary execution; logs fallback audit event; returns standardized extension directory. | Directs farmer to General Good Agricultural Practices (GAP) catalog and triggers notification to district extension officer for manual intake. | *"Target crop or action not found in calibrated knowledge base. Directing to National GAP standards and alerting extension officer for manual verification."* | Confidence score set to **0.00**; marked as `Unknown Action / Crop`. |
| **4** | **Heavy Rain / Torrential Weather** | OpenWeatherMap or AgroClimatic fallback predicts $\ge 10\text{ mm}$ rain or precipitation probability $\ge 65\%$. | Weather rule constraint fails (`passed: false`); blocks fertilizer broadcast, chemical spraying, combine harvesting, and irrigation. | Defers action until dry window ($\ge 24\text{--}48\text{ hours}$); proposes drainage maintenance, grain tarpaulin protection, or pest monitoring. | *"Advisory Deferred: Incoming heavy rainfall forecast will cause severe nutrient leaching/grain spoilage. Postpone field operations until soil dries."* | Confidence score adjusted to **0.70**; Weather constraint marked as `Adverse Weather Blocker`. |
| **5** | **No Irrigation / Rainfed Water Deficit** | Farm relies on rainfed moisture (`irrigation: null` or `Rainfed`), but target action requires high moisture during dry season. | Water constraint fails; flags severe drought vulnerability. | Recommends moisture conservation techniques (straw mulching, anti-transpirant foliar sprays, deficit irrigation, or crop insurance enrollment). | *"Irrigation setup (Rainfed) is inadequate for water-intensive operations during current dry cycle. Proposing moisture retention mulching."* | Confidence score set to **0.70**; bottleneck marked as `Insufficient Water / Irrigation`. |
| **6** | **Missing Heavy Equipment** | Farm lacks tractors, combine harvesters, or boom sprayers required for mechanized operation. | Equipment constraint fails; system identifies exact missing equipment list. | Shifts operational advisory to Custom Hiring Centre (CHC) rental booking or manual backpack application alternatives. | *"Farm lacks required equipment ({missing_machinery}). Shifting advisory to manual labor deployment or nearby CHC equipment hire."* | Confidence score set to **0.70**; decision factor displays `Equipment Unavailable`. |
| **7** | **Conflicting / Incompatible Inputs** | Contradictory farmer inputs (e.g., crop stage marked as 'Maturity' while target action is 'Seed Selection', or high-water crop under zero water). | RuleEngine detects logical conflict between growth stage and physiological operation. | Crop stage rule fails; system enforces chronological agronomic ordering; guides farmer to correct farm state. | *"Input Conflict: Crop stage mismatch. Selected action is invalid for crop stage '{crop_stage}'. Recommended valid operational window is {valid_stages}."* | Confidence score set to **0.70**; bottleneck marked as `Suboptimal Crop Stage`. |

---

## 3. Agronomic Traceability & Audit Verification

For each failure mode:
1. **Immutable Audit Record:** An audit log event is automatically appended to `recommendation_audits` capturing the exact constraint failure, input parameters, and generated fallback advice.
2. **Explainable AI (XAI) Exposure:** The failure mode is visible in the farmer and officer UI:
   - Visible in the **Constraint Evaluation Table** as a red bottleneck badge.
   - Visible in the **Key Decision Factors** as an explicit diagnostic chip (e.g., `Adverse Weather`, `Low Budget`).
   - Quantified in the **Confidence Score Breakdown** (e.g., `Alternative Required: -15%`).
3. **Extension Officer Workflow:** All recommendations generated under failure or alternative fallback modes are flagged as `PENDING REVIEW` in the Extension Officer Review Queue, allowing human-in-the-loop agronomic oversight.
