import requests

API_URL = "http://localhost:8000"

print("Registering new user...")
resp = requests.post(f"{API_URL}/auth/register", json={
    "email": "test99@example.com",
    "password": "Password123!",
    "full_name": "Test User",
    "role": "quality_engineer"
})
print(resp.status_code)
print(resp.json())

if resp.status_code == 201:
    token = resp.json().get("access_token")
    print("Token:", token)
    
    print("Testing predict...")
    headers = {"Authorization": f"Bearer {token}"}
    files = {'file': ('test.png', b'dummy content', 'image/png')}
    pred_resp = requests.post(f"{API_URL}/inspections/predict", headers=headers, files=files)
    print(pred_resp.status_code)
    print(pred_resp.json())
