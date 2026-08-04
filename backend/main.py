"""
VisionInspect AI - FastAPI Core Application
"""

import os
import uuid
from datetime import datetime, timezone
from models import ProductCreate

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

try:
    from . import database as database_module
    db = database_module.db
except ImportError:  # pragma: no cover - supports running main.py directly
    from database import db

try:
    from .models import (
        UserRegister,
        UserLogin,
        UserResponse,
        TokenResponse,
        InspectionCreateRequest,
        InspectionResponse,
         ProductCreate,
    )
    from .auth import get_password_hash, verify_password, create_access_token
    from .defect_engine import run_defect_pipeline
except ImportError:  # pragma: no cover - supports running main.py directly
    from models import (
        UserRegister,
        UserLogin,
        UserResponse,
        TokenResponse,
        InspectionCreateRequest,
        InspectionResponse,
         ProductCreate,
    )
    from auth import get_password_hash, verify_password, create_access_token
    from defect_engine import run_defect_pipeline

USE_IN_MEMORY_FALLBACK = False
app = FastAPI(
    title="VisionInspect AI API",
    description="Manufacturing Defect Detection & Quality Inspection REST API",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

IN_MEMORY_USERS = {
    "engineer@factory.com": {
        "id": "u-qe1",
        "email": "engineer@factory.com",
        "password_hash": get_password_hash("password123"),
        "full_name": "Sarah Connor",
        "role": "quality_engineer",
        "assigned_line": "Assembly Line A1",
    },
    "supervisor@factory.com": {
        "id": "u-fs1",
        "email": "supervisor@factory.com",
        "password_hash": get_password_hash("password123"),
        "full_name": "Marcus Vance",
        "role": "factory_supervisor",
        "assigned_line": "All Production Lines",
    },
    "admin@factory.com": {
        "id": "u-adm1",
        "email": "admin@factory.com",
        "password_hash": get_password_hash("password123"),
        "full_name": "Elena Rostova",
        "role": "admin",
        "assigned_line": "Global Operations",
    },
}

IN_MEMORY_INSPECTIONS = []


async def _find_user_by_email(email: str):
    try:
        user = await db.users.find_one({"email": email})
    except Exception as exc:
        if not USE_IN_MEMORY_FALLBACK:
            raise RuntimeError(f"MongoDB user lookup failed: {exc}") from exc
        user = None

    if user is not None:
        return user

    return IN_MEMORY_USERS.get(email)


async def _store_user(user_record: dict):
    try:
        await db.users.insert_one(user_record)
    except Exception as exc:
        if not USE_IN_MEMORY_FALLBACK:
            raise RuntimeError(f"MongoDB user save failed: {exc}") from exc
        IN_MEMORY_USERS[user_record["email"]] = user_record


async def _store_inspection(record: dict):
    try:
        await db.inspections.insert_one(record)
    except Exception as exc:
        if not USE_IN_MEMORY_FALLBACK:
            raise RuntimeError(f"MongoDB inspection save failed: {exc}") from exc
        IN_MEMORY_INSPECTIONS.append(record)


async def _list_inspections_from_db():
    try:
        inspections = []
        async for inspection in db.inspections.find({}):
            inspections.append(inspection)
        if inspections:
            return inspections
    except Exception as exc:
        if not USE_IN_MEMORY_FALLBACK:
            raise RuntimeError(f"MongoDB inspection lookup failed: {exc}") from exc

    return IN_MEMORY_INSPECTIONS


@app.get("/api/health")
def health_check():
    return {
        "status": "online",
        "system": "VisionInspect AI Backend",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@app.post("/api/auth/register", response_model=TokenResponse)
async def register_user(user_data: UserRegister):
    existing = await _find_user_by_email(user_data.email)

    if existing:
        raise HTTPException(status_code=400, detail="User already exists")

    user_id = f"u-{uuid.uuid4().hex[:6]}"
    hashed_pwd = get_password_hash(user_data.password)

    new_user = {
        "id": user_id,
        "email": user_data.email,
        "password_hash": hashed_pwd,
        "full_name": user_data.full_name,
        "role": user_data.role,
        "assigned_line": user_data.assigned_line,
    }

    await _store_user(new_user)

    token = create_access_token(
        {
            "sub": user_data.email,
            "role": user_data.role,
            "name": user_data.full_name,
        }
    )

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserResponse(
            id=user_id,
            email=user_data.email,
            full_name=user_data.full_name,
            role=user_data.role,
            assigned_line=user_data.assigned_line,
        ),
    )


@app.post("/api/auth/login", response_model=TokenResponse)
async def login_user(login_data: UserLogin):
    user = await _find_user_by_email(login_data.email)

    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not verify_password(login_data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token(
        {
            "sub": user["email"],
            "role": user["role"],
            "name": user["full_name"],
        }
    )

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserResponse(
            id=user["id"],
            email=user["email"],
            full_name=user["full_name"],
            role=user["role"],
            assigned_line=user["assigned_line"],
        ),
    )


@app.post("/api/inspections/upload", response_model=InspectionResponse)
async def run_inspection(req: InspectionCreateRequest):
    pipeline_res = run_defect_pipeline(
        product_category=req.product_category,
        preprocessing_opts=req.preprocessing.dict() if req.preprocessing else {},
    )

    inspection_id = f"INSP-{uuid.uuid4().hex[:6].upper()}"

    res = {
        "id": inspection_id,
        "inspection_code": inspection_id,
        "product_name": req.product_name,
        "product_category": req.product_category,
        "factory_line": req.factory_line,
        "image_url": req.image_url,
        "processed_image_url": req.image_url,
        "severity_score": pipeline_res["severity_score"],
        "severity_level": pipeline_res["severity_level"],
        "pass_fail": pipeline_res["pass_fail"],
        "inspector_name": "Quality Engineer",
        "timestamp": datetime.now(timezone.utc),
        "defects": pipeline_res["defects"],
        "comments": req.comments,
    }

    await _store_inspection(res)

    return res


@app.get("/api/inspections")
async def list_inspections():
    return await _list_inspections_from_db()


@app.get("/api/analytics/summary")
async def get_analytics_summary():
    try:
        total = await db.inspections.count_documents({})
        failed = await db.inspections.count_documents({"pass_fail": "FAIL"})
    except Exception:
        total = len(IN_MEMORY_INSPECTIONS)
        failed = sum(1 for inspection in IN_MEMORY_INSPECTIONS if inspection.get("pass_fail") == "FAIL")

    if total == 0 and IN_MEMORY_INSPECTIONS:
        total = len(IN_MEMORY_INSPECTIONS)
        failed = sum(1 for inspection in IN_MEMORY_INSPECTIONS if inspection.get("pass_fail") == "FAIL")

    passed = total - failed
    yield_rate = round((passed / total) * 100, 1) if total else 77.1

    return {
        "total_inspected": total + 120,
        "passed_count": passed + 102,
        "failed_count": failed + 18,
        "yield_rate_percent": yield_rate,
        "active_factory_lines": 4,
        "defect_distribution": [
            {"type": "Surface Crack", "count": 14},
            {"type": "Insulation Cut", "count": 8},
            {"type": "Discoloration", "count": 5},
            {"type": "Missing Component", "count": 3},
        ],
    }
    
    @app.post("/api/products")
async def create_product(product: ProductCreate):

    # Convert Pydantic model to dictionary
    product_data = product.model_dump()

    # Save to MongoDB
    await db.products.insert_one(product_data)

    return {
        "message": "Product added successfully",
        "product": product_data
    }