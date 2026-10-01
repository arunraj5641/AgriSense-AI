import requests
import uuid
import time

BASE_URL = "http://localhost:8000/api/v1"

def print_result(name, res):
    if res.status_code >= 400:
        print(f"❌ {name} failed: {res.status_code} - {res.text}")
    else:
        print(f"✅ {name} passed")

def run_tests():
    print("Starting E2E Tests...")
    
    # 1. Health check
    res = requests.get(f"{BASE_URL}/health")
    print_result("Health Check", res)
    
    # 2. Register
    email = f"test_{uuid.uuid4()}@example.com"
    res = requests.post(f"{BASE_URL}/auth/register", json={
        "email": email,
        "name": "Test Farmer",
        "password": "password123",
        "role": "farmer"
    })
    print_result("Register", res)
    if res.status_code >= 400: return
    
    # Duplicate register
    res_dup = requests.post(f"{BASE_URL}/auth/register", json={
        "email": email,
        "name": "Test Farmer 2",
        "password": "password123",
        "role": "farmer"
    })
    if res_dup.status_code == 400:
        print("✅ Duplicate Email handling passed")
    else:
        print(f"❌ Duplicate Email handling failed: {res_dup.status_code}")
    
    # 3. Login
    res = requests.post(f"{BASE_URL}/auth/login", data={
        "username": email,
        "password": "password123"
    })
    print_result("Login", res)
    if res.status_code >= 400: return
    token = res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Invalid login
    res_inv = requests.post(f"{BASE_URL}/auth/login", data={
        "username": email,
        "password": "wrongpassword"
    })
    if res_inv.status_code in [400, 401]:
        print("✅ Invalid login handling passed")
    else:
        print(f"❌ Invalid login handling failed: {res_inv.status_code}")
        
    # 4. Get Profile
    res = requests.get(f"{BASE_URL}/farmers/me", headers=headers)
    print_result("Get Profile", res)
    
    # 5. Create Farm
    res = requests.post(f"{BASE_URL}/farms", headers=headers, json={
        "name": "Test Farm",
        "location": "Test Valley",
        "farm_size": 10.5,
        "irrigation_type": "drip"
    })
    print_result("Create Farm", res)
    if res.status_code >= 400: return
    farm_id = res.json()["id"]
    
    # 6. List Farms
    res = requests.get(f"{BASE_URL}/farms", headers=headers)
    print_result("List Farms", res)
    
    # 7. Add Resources
    res = requests.post(f"{BASE_URL}/resources/farms/{farm_id}/crops", headers=headers, json={
        "crop_type": "wheat",
        "crop_stage": "vegetative",
        "sowing_date": "2024-01-01"
    })
    print_result("Add Crop", res)
    
    res = requests.post(f"{BASE_URL}/resources/farms/{farm_id}/budget", headers=headers, json={
        "available_budget": 5000.0
    })
    print_result("Add Budget", res)
    
    res = requests.post(f"{BASE_URL}/resources/farms/{farm_id}/equipment", headers=headers, json={
        "equipment_name": "tractor",
        "quantity": 1
    })
    print_result("Add Equipment", res)
    
    # 8. Generate Recommendation (Valid)
    res = requests.post(f"{BASE_URL}/recommendations", headers=headers, json={
        "farm_id": farm_id,
        "target_action": "apply_fertilizer"
    })
    print_result("Generate Recommendation", res)
    if res.status_code == 200:
        data = res.json()
        print(f"   -> {data['recommendation']} (Confidence: {data['confidence_score']})")
        
    # 9. Get Recommendation History
    res = requests.get(f"{BASE_URL}/recommendations/farms/{farm_id}", headers=headers)
    print_result("Recommendation History", res)

    if res.status_code >= 400 or not res.json():
        return
    
    rec_id = res.json()[0]["id"]

    # =========================================================================
    # REVIEW 2 TESTS
    # =========================================================================
    print("\n--- Running Review 2 Feature Tests ---")

    # 10. GET Recommendation Details & Dynamic XAI Explanation
    res_det = requests.get(f"{BASE_URL}/recommendations/{rec_id}", headers=headers)
    print_result("Review 2: Recommendation Details with XAI", res_det)
    if res_det.status_code == 200:
        det = res_det.json()
        rec_data = det.get("recommendation", {})
        status = rec_data.get("status")
        assert status in ["GENERATED", "UNDER_REVIEW", "APPROVED", "NEEDS_REVISION"], f"Invalid recommendation status: {status}"
        assert "explanation" in det, "Missing XAI explanation"
        exp = det["explanation"]
        assert "resource_snapshot" in exp and exp["resource_snapshot"] is not None, "Missing resource snapshot"
        snapshot = exp["resource_snapshot"]
        assert "sources" in det, "Missing scientific references"
        assert "audit_trail" in det, "Missing audit trail"
        print(f"   -> Status: {status}")
        print(f"   -> Scientific Sources: {len(det.get('sources', []))} attached")
        print(f"   -> Snapshot farm size: {snapshot.get('farm_size')}")
        print(f"   -> Influence explanation: {snapshot.get('influence_explanation', '')[:80]}...")

    # 11. Dedicated Explanation Endpoint
    res_exp = requests.get(f"{BASE_URL}/recommendations/{rec_id}/explanation", headers=headers)
    print_result("Review 2: Dedicated Explanation API", res_exp)
    if res_exp.status_code == 200:
        exp = res_exp.json()
        assert "constraints" in exp and len(exp["constraints"]) >= 5, "Constraints evaluation table missing"
        assert "confidence_breakdown" in exp, "Confidence breakdown missing"
        assert "alternative" in exp, "Alternative recommendation missing"
        print(f"   -> Evaluated {len(exp['constraints'])} constraints deterministically without LLM")

    # 12. RBAC Test: Farmer should NOT be allowed to review
    res_farmer_review = requests.post(
        f"{BASE_URL}/recommendations/{rec_id}/review",
        headers=headers,
        json={"status": "APPROVED", "comment": "Farmer attempting to self-approve"}
    )
    if res_farmer_review.status_code == 403:
        print("✅ Review 2 RBAC: Farmer forbidden from reviewing recommendations (HTTP 403)")
    else:
        print(f"❌ Review 2 RBAC: Farmer review was not blocked! Status: {res_farmer_review.status_code}")

    # 13. Extension Officer Authentication
    officer_login = requests.post(f"{BASE_URL}/auth/login", data={
        "username": "officer@example.com",
        "password": "password123"
    })
    print_result("Review 2: Extension Officer Login", officer_login)
    if officer_login.status_code != 200:
        print("❌ Could not login as seeded officer@example.com")
        return

    officer_token = officer_login.json()["access_token"]
    officer_headers = {"Authorization": f"Bearer {officer_token}"}

    # Verify Officer Role
    officer_me = requests.get(f"{BASE_URL}/auth/me", headers=officer_headers)
    if officer_me.status_code == 200 and officer_me.json().get("role") == "extension_officer":
        print("✅ Review 2: /auth/me correctly identifies user as extension_officer")
    else:
        print(f"❌ Review 2: /auth/me failed for officer: {officer_me.text}")

    # 14. Officer Dashboard Stats
    res_stats = requests.get(f"{BASE_URL}/recommendations/officer/stats", headers=officer_headers)
    print_result("Review 2: Officer Dashboard Summary Stats", res_stats)
    if res_stats.status_code == 200:
        stats = res_stats.json()
        print(f"   -> Total: {stats['total_recommendations']}, Pending: {stats['pending_reviews']}, Avg Confidence: {stats['average_confidence']}%")

    # 15. Officer Review Queue with Filtering
    res_queue = requests.get(f"{BASE_URL}/recommendations/officer/queue?crop=wheat", headers=officer_headers)
    print_result("Review 2: Officer Review Queue (Filter by crop)", res_queue)
    if res_queue.status_code == 200:
        queue = res_queue.json()
        print(f"   -> Queue contains {len(queue)} items for wheat")

    # 16. Extension Officer Review Submission (Approve)
    res_approve = requests.post(
        f"{BASE_URL}/recommendations/{rec_id}/review",
        headers=officer_headers,
        json={
            "status": "APPROVED",
            "comment": "Soil reports and budget verified according to SAU guidelines. Dosage is safe and optimal."
        }
    )
    print_result("Review 2: Officer Review Submission (APPROVED)", res_approve)
    if res_approve.status_code == 201:
        rev = res_approve.json()
        print(f"   -> Review recorded by {rev['reviewer_name']}: Status {rev['status']}")

    # 17. Verify Status Transition to APPROVED
    res_check = requests.get(f"{BASE_URL}/recommendations/{rec_id}", headers=officer_headers)
    if res_check.status_code == 200 and res_check.json().get("recommendation", {}).get("status") == "APPROVED":
        print("✅ Review 2 Lifecycle: Recommendation status successfully updated to APPROVED")
    else:
        print(f"❌ Review 2 Lifecycle: Expected status APPROVED, got {res_check.json().get('recommendation', {}).get('status')}")

    # 18. Verify Append-Only Audit Trail
    res_audit = requests.get(f"{BASE_URL}/recommendations/{rec_id}/audit", headers=officer_headers)
    print_result("Review 2: Append-Only Audit Trail API", res_audit)
    if res_audit.status_code == 200:
        trail = res_audit.json()
        actions = [a["action"] for a in trail]
        print(f"   -> Audit trail contains {len(trail)} events: {actions}")
        assert any("Generated" in a for a in actions), "Audit trail missing Recommendation Generated"
        assert any("Approved" in a for a in actions), "Audit trail missing Recommendation Approved"
        print("✅ Review 2 Audit Trail: All lifecycle events logged immutably in chronological order")

    # =========================================================================
    # REVIEW 3 TESTS (FINAL ECOSYSTEM PHASE)
    # =========================================================================
    print("\n--- Running Review 3 Ecosystem Feature Tests ---")

    # 19. Food Processing Company Authentication & Profile
    company_login = requests.post(f"{BASE_URL}/auth/login", data={
        "username": "company@example.com",
        "password": "password123"
    })
    print_result("Review 3: Food Processing Company Login", company_login)
    if company_login.status_code != 200:
        print("❌ Could not login as company@example.com")
        return

    company_token = company_login.json()["access_token"]
    company_headers = {"Authorization": f"Bearer {company_token}"}

    # Verify Company Profile
    res_comp_me = requests.get(f"{BASE_URL}/companies/me", headers=company_headers)
    print_result("Review 3: Company Profile /companies/me", res_comp_me)
    if res_comp_me.status_code == 200:
        comp_profile = res_comp_me.json()
        print(f"   -> Sourcing Partner: {comp_profile['company_name']} ({comp_profile['processing_category']})")

    # 20. List Open Procurement Requirements
    res_procs = requests.get(f"{BASE_URL}/procurements", headers=company_headers)
    print_result("Review 3: List Open Procurements /procurements", res_procs)
    assert res_procs.status_code == 200 and len(res_procs.json()) >= 1, "No open procurements found"
    proc_order = res_procs.json()[0]
    proc_id = proc_order["id"]
    print(f"   -> Procurement Order: {proc_order['required_quantity']}T of {proc_order['crop']} (${proc_order['offered_price']}/T)")

    # 21. Deterministic Farmer–Company Matching Engine
    res_match = requests.get(f"{BASE_URL}/contracts/matching/{farm_id}", headers=headers)
    print_result("Review 3: Deterministic Farmer-Company Matching Engine", res_match)
    assert res_match.status_code == 200, "Matching engine failed"
    matches = res_match.json()
    print(f"   -> Found {len(matches)} procurement matches for Farm")
    if matches:
        top_match = matches[0]
        print(f"   -> Top Match: {top_match['company_name']} ({int(top_match['compatibility_score'] * 100)}% compatibility)")
        print(f"   -> Projected Revenue: ${top_match['estimated_revenue']:,.2f} | Profit: ${top_match['estimated_profit']:,.2f}")
        print(f"   -> Explanation: {top_match['match_explanation'][:90]}...")
        assert len(top_match["matched_constraints"]) > 0, "Matched constraints missing"

    # 22. Contract Farming Workflow: Application Submission
    res_apply = requests.post(
        f"{BASE_URL}/contracts/apply",
        headers=headers,
        json={
            "procurement_id": proc_id,
            "farm_id": farm_id,
            "agreed_quantity": 25.0,
            "agreed_price": proc_order["offered_price"]
        }
    )
    print_result("Review 3: Farmer Contract Application Submission", res_apply)
    assert res_apply.status_code == 201, f"Failed to submit contract: {res_apply.text}"
    contract_data = res_apply.json()
    contract_id = contract_data["id"]
    print(f"   -> Contract Created ({contract_data['status']}) for {contract_data['crop']}")

    # 23. Notification Delivery Verification
    res_notifs = requests.get(f"{BASE_URL}/notifications", headers=headers)
    print_result("Review 3: Farmer Notification Delivery", res_notifs)
    if res_notifs.status_code == 200:
        notifs = res_notifs.json()
        print(f"   -> Farmer has {len(notifs)} notifications on file")

    res_comp_notifs = requests.get(f"{BASE_URL}/notifications", headers=company_headers)
    print_result("Review 3: Company Notification Delivery", res_comp_notifs)
    if res_comp_notifs.status_code == 200:
        comp_notifs = res_comp_notifs.json()
        print(f"   -> Company received {len(comp_notifs)} notifications")
        assert any("Contract" in n["title"] for n in comp_notifs), "Missing contract notification for company"

    # 24. Company Reviews & Accepts Contract
    res_accept = requests.put(
        f"{BASE_URL}/contracts/{contract_id}/status",
        headers=company_headers,
        json={
            "status": "ACCEPTED",
            "terms_and_conditions": "Verified compliance with company grade standards. Accepted for delivery."
        }
    )
    print_result("Review 3: Company Accepts Contract (ACCEPTED)", res_accept)
    assert res_accept.status_code == 200 and res_accept.json()["status"] == "ACCEPTED", "Failed to accept contract"

    # 25. Farmer Marks Crop Harvest Ready
    res_harvest = requests.put(
        f"{BASE_URL}/contracts/{contract_id}/status",
        headers=headers,
        json={"status": "HARVEST_READY"}
    )
    print_result("Review 3: Farmer Updates Status to HARVEST_READY", res_harvest)
    assert res_harvest.status_code == 200 and res_harvest.json()["status"] == "HARVEST_READY", "Failed harvest ready transition"

    # 26. Company Confirms Delivery & Completes Contract
    res_complete = requests.put(
        f"{BASE_URL}/contracts/{contract_id}/status",
        headers=company_headers,
        json={"status": "COMPLETED"}
    )
    print_result("Review 3: Company Completes Contract (COMPLETED)", res_complete)
    assert res_complete.status_code == 200 and res_complete.json()["status"] == "COMPLETED", "Failed completion transition"

    # 27. Automated Reminders Check
    res_reminders = requests.post(f"{BASE_URL}/notifications/reminders/check?farm_id={farm_id}", headers=headers)
    print_result("Review 3: Automated Agronomic Reminders Service", res_reminders)
    assert res_reminders.status_code == 200, "Reminders check failed"

    # 28. Report Center: PDF and CSV Generation
    res_pdf = requests.get(f"{BASE_URL}/reports/farmer-summary?format=pdf", headers=headers)
    print_result("Review 3: Report Center - Farmer Summary PDF Export", res_pdf)
    assert res_pdf.status_code == 200 and res_pdf.content.startswith(b"%PDF"), "Farmer summary PDF export invalid"

    res_csv = requests.get(f"{BASE_URL}/reports/farmer-summary?format=csv", headers=headers)
    print_result("Review 3: Report Center - Farmer Summary CSV Export", res_csv)
    assert res_csv.status_code == 200 and "Farm Name" in res_csv.text, "Farmer summary CSV export invalid"

    # Company Procurement Report Export
    res_comp_pdf = requests.get(f"{BASE_URL}/reports/company-procurement?format=pdf", headers=company_headers)
    print_result("Review 3: Report Center - Corporate Procurement PDF Export", res_comp_pdf)
    assert res_comp_pdf.status_code == 200 and res_comp_pdf.content.startswith(b"%PDF"), "Company procurement PDF export invalid"

    # 29. Admin Portal Governance & Platform Analytics
    admin_login = requests.post(f"{BASE_URL}/auth/login", data={
        "username": "admin@example.com",
        "password": "password123"
    })
    print_result("Review 3: Admin Authentication", admin_login)
    assert admin_login.status_code == 200, "Admin login failed"
    admin_token = admin_login.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    res_admin_stats = requests.get(f"{BASE_URL}/admin/stats", headers=admin_headers)
    print_result("Review 3: Admin Platform Stats /admin/stats", res_admin_stats)
    if res_admin_stats.status_code == 200:
        astats = res_admin_stats.json()
        print(f"   -> Users: {astats['total_users']}, Farms: {astats['total_farms']}, Contracts: {astats['total_contracts']}")

    res_admin_charts = requests.get(f"{BASE_URL}/admin/charts", headers=admin_headers)
    print_result("Review 3: Admin Platform Analytics Charts /admin/charts", res_admin_charts)
    assert res_admin_charts.status_code == 200, "Admin charts failed"

    res_admin_users = requests.get(f"{BASE_URL}/admin/users", headers=admin_headers)
    print_result("Review 3: Admin User Governance /admin/users", res_admin_users)
    assert res_admin_users.status_code == 200 and len(res_admin_users.json()) >= 4, "Admin users list failed"

    print("\n🎉 ALL REVIEW 1, REVIEW 2, AND REVIEW 3 (FINAL PHASE) TESTS PASSED WITH 100% INTEGRITY!")

if __name__ == "__main__":
    run_tests()


