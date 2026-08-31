import sys
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app.main import app as fastapi_app
from app.database import Base, get_db
import app.models  # Ensures all models are registered
from app.models.roles import Role
from app.models.users import User
from app.utils.security import hash_password, create_access_token

# Setup test database (SQLite in-memory with StaticPool)
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, 
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create tables in shared in-memory database
Base.metadata.create_all(bind=engine)


def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()


fastapi_app.dependency_overrides[get_db] = override_get_db

# Seed roles & test users
db = TestingSessionLocal()
role_admin = Role(role_name="ADMIN", description="Admin Role")
role_sup = Role(role_name="FACTORY_SUPERVISOR", description="Supervisor Role")
role_qe = Role(role_name="QUALITY_ENGINEER", description="Quality Engineer Role")
db.add_all([role_admin, role_sup, role_qe])
db.commit()

user_admin = User(
    full_name="Admin Test",
    email="admin@test.com",
    password_hash=hash_password("password123"),
    role_id=role_admin.id,
    status="ACTIVE"
)
user_sup = User(
    full_name="Supervisor Test",
    email="sup@test.com",
    password_hash=hash_password("password123"),
    role_id=role_sup.id,
    status="ACTIVE"
)
user_qe = User(
    full_name="QE Test",
    email="qe@test.com",
    password_hash=hash_password("password123"),
    role_id=role_qe.id,
    status="ACTIVE"
)
db.add_all([user_admin, user_sup, user_qe])
db.commit()

# Create JWT Access Tokens
token_admin = create_access_token(subject=str(user_admin.id), role="ADMIN")
token_sup = create_access_token(subject=str(user_sup.id), role="FACTORY_SUPERVISOR")
token_qe = create_access_token(subject=str(user_qe.id), role="QUALITY_ENGINEER")

client = TestClient(fastapi_app)

print("\n--- RUNNING RBAC VERIFICATION TESTS ---\n")

# 1. Test Unauthenticated Access (HTTP 401)
res_unauth = client.get("/api/v1/admin/dashboard")
assert res_unauth.status_code == 401, f"Expected 401, got {res_unauth.status_code}"
assert res_unauth.json()["detail"] == "Authentication required."
print("[PASS] 1. Unauthenticated Request correctly rejected with 401 Unauthorized")

# 2. Test Admin Access to Admin Endpoint (HTTP 200)
res_admin_admin = client.get("/api/v1/admin/dashboard", headers={"Authorization": f"Bearer {token_admin}"})
assert res_admin_admin.status_code == 200, f"Expected 200, got {res_admin_admin.status_code}"
print("[PASS] 2. Admin correctly granted access to /admin/dashboard (200 OK)")

# 3. Test Supervisor Attempting Admin Endpoint (HTTP 403)
res_sup_admin = client.get("/api/v1/admin/dashboard", headers={"Authorization": f"Bearer {token_sup}"})
assert res_sup_admin.status_code == 403, f"Expected 403, got {res_sup_admin.status_code}"
assert res_sup_admin.json()["detail"] == "You do not have permission to access this resource."
print("[PASS] 3. Supervisor correctly denied access to Admin endpoint (403 Forbidden)")

# 4. Test Quality Engineer Attempting Admin Endpoint (HTTP 403)
res_qe_admin = client.get("/api/v1/admin/dashboard", headers={"Authorization": f"Bearer {token_qe}"})
assert res_qe_admin.status_code == 403, f"Expected 403, got {res_qe_admin.status_code}"
assert res_qe_admin.json()["detail"] == "You do not have permission to access this resource."
print("[PASS] 4. Quality Engineer correctly denied access to Admin endpoint (403 Forbidden)")

# 5. Test Supervisor Access to Supervisor Endpoint (HTTP 200)
res_sup_sup = client.get("/api/v1/supervisor/overview", headers={"Authorization": f"Bearer {token_sup}"})
assert res_sup_sup.status_code == 200, f"Expected 200, got {res_sup_sup.status_code}"
print("[PASS] 5. Supervisor correctly granted access to /supervisor/overview (200 OK)")

# 6. Test Quality Engineer Access to Quality Endpoint (HTTP 200)
res_qe_qe = client.get("/api/v1/quality/history", headers={"Authorization": f"Bearer {token_qe}"})
assert res_qe_qe.status_code == 200, f"Expected 200, got {res_qe_qe.status_code}"
print("[PASS] 6. Quality Engineer correctly granted access to /quality/history (200 OK)")

# 7. Test Admin Access to Quality Endpoint (HTTP 200 - Admin master access)
res_admin_qe = client.get("/api/v1/quality/history", headers={"Authorization": f"Bearer {token_admin}"})
assert res_admin_qe.status_code == 200, f"Expected 200, got {res_admin_qe.status_code}"
print("[PASS] 7. Admin correctly granted master access to Quality endpoint (200 OK)")

print("\nALL RBAC VERIFICATION TESTS PASSED SUCCESSFULLY!\n")
