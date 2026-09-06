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

if __name__ == "__main__":
    run_tests()
