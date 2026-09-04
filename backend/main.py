"""FastAPI application backed exclusively by MongoDB."""

import logging
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pymongo import ASCENDING, DESCENDING, ReturnDocument

try:
    from .auth import create_access_token, get_current_user, get_password_hash, require_roles, verify_password
    from .database import client, db
    from .yolo_inference import run_yolo_inspection
    from .models import (
        InspectionCreateRequest,
        InspectionResponse,
        ProductCreate,
        ProductUpdate,
        TokenResponse,
        UserLogin,
        UserRegister,
        UserResponse,
        UserUpdate,
        VALID_ROLES,
    )
except ImportError:  # supports `uvicorn main:app --reload` from backend/
    from auth import create_access_token, get_current_user, get_password_hash, require_roles, verify_password
    from database import client, db
    from yolo_inference import run_yolo_inspection
    from models import (
        InspectionCreateRequest, InspectionResponse, ProductCreate, ProductUpdate,
        TokenResponse, UserLogin, UserRegister, UserResponse, UserUpdate, VALID_ROLES,
    )


logger = logging.getLogger("visioninspect.api")
COMPLETE_INSPECTION_FILTER = {"inspector_id": {"$exists": True}}


@asynccontextmanager
async def lifespan(_: FastAPI):
    try:
        await db.command("ping")
        await db.users.create_index([("email", ASCENDING)], unique=True)
        await db.users.create_index([("id", ASCENDING)], unique=True)
        await db.products.create_index([("id", ASCENDING)], unique=True)
        await db.products.create_index([("product_code", ASCENDING)], unique=True)
        await db.inspections.create_index([("id", ASCENDING)], unique=True)
        await db.inspections.create_index([("timestamp", DESCENDING)])
        await db.inspections.create_index([("factory_line", ASCENDING)])
        await db.defects.create_index([("inspection_id", ASCENDING)])
        await db.uploaded_images.create_index([("inspection_id", ASCENDING)])
        await db.model_predictions.create_index([("inspection_id", ASCENDING)])
        await db.reports.create_index([("inspection_id", ASCENDING)])
        logger.info("Connected to MongoDB database '%s'.", db.name)
    except Exception:
        logger.exception("MongoDB startup verification failed.")
        raise
    yield
    client.close()


app = FastAPI(title="VisionInspect AI API", version="1.0.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def public_user(user: dict) -> dict:
    return {
        "id": user["id"],
        "email": user["email"],
        "full_name": user["full_name"],
        "role": user["role"],
        "assigned_line": user.get("assigned_line"),
    }


def inspection_response(record: dict) -> dict:
    return {
        "id": record["id"],
        "inspection_code": record["inspection_code"],
        "product_id": record["product_id"],
        "product_name": record["product_name"],
        "product_category": record["product_category"],
        "factory_line": record["factory_line"],
        "inspector_id": record["inspector_id"],
        "image_url": record["image_url"],
        "processed_image_url": record.get("processed_image_url"),
        "severity_score": record["severity_score"],
        "severity_level": record["severity_level"],
        "pass_fail": record["pass_fail"],
        "inspector_name": record["inspector_name"],
        "timestamp": record["timestamp"],
        "defects": record.get("defects", []),
        "image_width": record["image_width"],
        "image_height": record["image_height"],
        "preprocessing_used": record["preprocessing_used"],
        "model": record["model"],
        "recommendation": record["recommendation"],
        "comments": record.get("comments"),
    }


async def refresh_analytics() -> dict:
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    today_filter = {**COMPLETE_INSPECTION_FILTER, "timestamp": {"$gte": today_start}}
    total = await db.inspections.count_documents(today_filter)
    passed = await db.inspections.count_documents({**today_filter, "pass_fail": "PASS"})
    failed = total - passed
    lines = await db.inspections.distinct("factory_line", today_filter)
    inspection_ids = await db.inspections.distinct("id", today_filter)
    defect_rows = await db.defects.aggregate([
        {"$match": {"inspection_id": {"$in": inspection_ids}}},
        {"$group": {"_id": "$defect_type", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
    ]).to_list(None)
    distribution = [
        {"type": row["_id"], "count": row["count"], "share": round(row["count"] * 100 / total, 1) if total else 0}
        for row in defect_rows
    ]
    hourly_rows = await db.inspections.aggregate([
        {"$match": today_filter},
        {"$group": {
            "_id": {"$dateToString": {"format": "%H:00", "date": "$timestamp", "timezone": "UTC"}},
            "total": {"$sum": 1},
            "passed": {"$sum": {"$cond": [{"$eq": ["$pass_fail", "PASS"]}, 1, 0]}},
        }},
        {"$sort": {"_id": 1}},
    ]).to_list(None)
    summary = {
        "total_inspected_today": total,
        "passed_count": passed,
        "failed_count": failed,
        "yield_rate_percent": round(passed * 100 / total, 1) if total else 0,
        "active_factory_lines": len(lines),
        "quality_thresholds": {"critical_severity_limit": 80, "high_severity_limit": 60, "medium_severity_limit": 40, "auto_approve_pass": True},
        "defect_distribution": distribution,
        "hourly_yield_trend": [{"hour": row["_id"], "passRate": round(row["passed"] * 100 / row["total"], 1), "total": row["total"]} for row in hourly_rows],
        "updated_at": now,
    }
    await db.analytics.update_one({"key": "summary"}, {"$set": summary, "$setOnInsert": {"key": "summary"}}, upsert=True)
    return summary


@app.get("/api/health")
async def health_check():
    try:
        await db.command("ping")
    except Exception as exc:
        logger.exception("MongoDB health check failed.")
        raise HTTPException(status_code=503, detail="MongoDB is unavailable") from exc
    return {"status": "online", "database": "connected", "timestamp": datetime.now(timezone.utc)}


@app.post("/api/auth/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register_user(user_data: UserRegister):
    if user_data.role not in VALID_ROLES:
        raise HTTPException(status_code=400, detail="Invalid user role")
    email = str(user_data.email).lower()
    try:
        if await db.users.find_one({"email": email}, {"_id": 1}):
            raise HTTPException(status_code=409, detail="User already exists")
        user = {
            "id": f"u-{uuid.uuid4().hex[:12]}", "email": email,
            "password_hash": get_password_hash(user_data.password),
            "full_name": user_data.full_name.strip(), "role": user_data.role,
            "assigned_line": user_data.assigned_line or "Assembly Line A1",
            "created_at": datetime.now(timezone.utc),
        }
        await db.users.insert_one(user)
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Could not create user '%s'.", email)
        raise HTTPException(status_code=500, detail="Unable to create user") from exc
    return {"access_token": create_access_token({"sub": user["id"], "role": user["role"]}), "user": public_user(user)}


@app.post("/api/auth/login", response_model=TokenResponse)
async def login_user(login_data: UserLogin):
    email = str(login_data.email).lower()
    try:
        user = await db.users.find_one({"email": email})
    except Exception as exc:
        logger.exception("Could not look up user '%s'.", email)
        raise HTTPException(status_code=500, detail="Unable to authenticate user") from exc
    if not user or not verify_password(login_data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    await db.users.update_one({"_id": user["_id"]}, {"$set": {"last_login": datetime.now(timezone.utc)}})
    return {"access_token": create_access_token({"sub": user["id"], "role": user["role"]}), "user": public_user(user)}


@app.get("/api/auth/me", response_model=UserResponse)
async def current_user(user: dict = Depends(get_current_user)):
    return public_user(user)


@app.post("/api/inspections/upload", response_model=InspectionResponse, status_code=status.HTTP_201_CREATED)
async def run_inspection(req: InspectionCreateRequest, current_user: dict = Depends(require_roles("quality_engineer", "admin"))):
    try:
        product = await db.products.find_one({"id": req.product_id}, {"_id": 0})
        if not product:
            raise HTTPException(status_code=404, detail="Selected product not found")
        pipeline_res = run_yolo_inspection(req.image_url, req.preprocessing.model_dump())
        inspection_id = f"INSP-{uuid.uuid4().hex[:10].upper()}"
        timestamp = datetime.now(timezone.utc)
        record = {
            "id": inspection_id, "inspection_code": inspection_id,
            "product_id": product["id"], "product_name": product["product_name"], "product_category": product["category"],
            "factory_line": product["factory_line"], "image_url": req.image_url,
            "processed_image_url": req.image_url, "preprocessing_used": req.preprocessing.model_dump(),
            "severity_score": pipeline_res["severity_score"], "severity_level": pipeline_res["severity_level"],
            "pass_fail": pipeline_res["pass_fail"], "inspector_id": current_user["id"], "inspector_name": current_user["full_name"],
            "timestamp": timestamp, "defects": pipeline_res["defects"], "comments": req.comments or "",
            "image_width": pipeline_res["image_width"], "image_height": pipeline_res["image_height"],
            "model": pipeline_res["model"], "recommendation": pipeline_res["recommendation"],
        }
        await db.inspections.insert_one(record)
        await db.products.update_one({"id": product["id"]}, {"$set": {"last_inspected_at": timestamp}})
        await db.uploaded_images.insert_one({"inspection_id": inspection_id, "image_url": req.image_url, "created_at": timestamp})
        await db.model_predictions.insert_one({"inspection_id": inspection_id, "predictions": record["defects"], "created_at": timestamp})
        if record["defects"]:
            await db.defects.insert_many([{"inspection_id": inspection_id, **defect, "created_at": timestamp} for defect in record["defects"]])
        await db.reports.insert_one({"inspection_id": inspection_id, "inspection_code": inspection_id, "pass_fail": record["pass_fail"], "severity_level": record["severity_level"], "generated_at": timestamp})
        await refresh_analytics()
        return inspection_response(record)
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Could not save inspection.")
        raise HTTPException(status_code=500, detail="Unable to save inspection") from exc


@app.get("/api/inspections", response_model=list[InspectionResponse])
async def list_inspections(_: dict = Depends(get_current_user)):
    try:
        records = await db.inspections.find(COMPLETE_INSPECTION_FILTER, {"_id": 0}).sort("timestamp", DESCENDING).to_list(None)
        return [inspection_response(record) for record in records]
    except Exception as exc:
        logger.exception("Could not list inspections.")
        raise HTTPException(status_code=500, detail="Unable to load inspections") from exc


@app.get("/api/inspections/{inspection_id}", response_model=InspectionResponse)
async def get_inspection(inspection_id: str, _: dict = Depends(get_current_user)):
    record = await db.inspections.find_one({"id": inspection_id, **COMPLETE_INSPECTION_FILTER}, {"_id": 0})
    if not record:
        raise HTTPException(status_code=404, detail="Inspection not found")
    return inspection_response(record)


@app.delete("/api/inspections/{inspection_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_inspection(inspection_id: str, _: dict = Depends(require_roles("admin"))):
    try:
        result = await db.inspections.delete_one({"id": inspection_id})
        if not result.deleted_count:
            raise HTTPException(status_code=404, detail="Inspection not found")
        await db.defects.delete_many({"inspection_id": inspection_id})
        await db.uploaded_images.delete_many({"inspection_id": inspection_id})
        await db.model_predictions.delete_many({"inspection_id": inspection_id})
        await db.reports.delete_many({"inspection_id": inspection_id})
        await refresh_analytics()
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Could not delete inspection '%s'.", inspection_id)
        raise HTTPException(status_code=500, detail="Unable to delete inspection") from exc


@app.get("/api/products")
async def list_products(_: dict = Depends(get_current_user)):
    return await db.products.find({}, {"_id": 0}).sort("created_at", DESCENDING).to_list(None)


@app.get("/api/products/{product_id}")
async def get_product(product_id: str, _: dict = Depends(get_current_user)):
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


@app.post("/api/products", status_code=status.HTTP_201_CREATED)
async def create_product(product: ProductCreate, _: dict = Depends(require_roles("quality_engineer", "admin"))):
    record = {"id": f"prd-{uuid.uuid4().hex[:12]}", **product.model_dump(), "created_at": datetime.now(timezone.utc)}
    try:
        await db.products.insert_one(record)
        return {key: value for key, value in record.items() if key != "_id"}
    except Exception as exc:
        logger.exception("Could not create product.")
        raise HTTPException(status_code=409, detail="Product code already exists") from exc


@app.put("/api/products/{product_id}")
async def update_product(product_id: str, product: ProductUpdate, _: dict = Depends(require_roles("quality_engineer", "admin"))):
    changes = product.model_dump(exclude_none=True)
    if not changes:
        raise HTTPException(status_code=400, detail="No product changes provided")
    result = await db.products.find_one_and_update({"id": product_id}, {"$set": changes}, return_document=ReturnDocument.AFTER)
    if not result:
        raise HTTPException(status_code=404, detail="Product not found")
    return {key: value for key, value in result.items() if key != "_id"}


@app.delete("/api/products/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product(product_id: str, _: dict = Depends(require_roles("admin"))):
    result = await db.products.delete_one({"id": product_id})
    if not result.deleted_count:
        raise HTTPException(status_code=404, detail="Product not found")


@app.get("/api/users", response_model=list[UserResponse])
async def list_users(_: dict = Depends(require_roles("admin"))):
    try:
        users = await db.users.find({}, {"_id": 0, "password_hash": 0}).sort("created_at", DESCENDING).to_list(None)
        return [public_user(user) for user in users]
    except Exception as exc:
        logger.exception("Could not list users.")
        raise HTTPException(status_code=500, detail="Unable to load users") from exc


@app.put("/api/users/{user_id}/role", response_model=UserResponse)
async def update_user(user_id: str, update: UserUpdate, _: dict = Depends(require_roles("admin"))):
    changes = update.model_dump(exclude_none=True)
    if changes.get("role") and changes["role"] not in VALID_ROLES:
        raise HTTPException(status_code=400, detail="Invalid user role")
    if not changes:
        raise HTTPException(status_code=400, detail="No user changes provided")
    user = await db.users.find_one_and_update({"id": user_id}, {"$set": changes}, return_document=ReturnDocument.AFTER)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return public_user(user)


@app.delete("/api/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(user_id: str, _: dict = Depends(require_roles("admin"))):
    result = await db.users.delete_one({"id": user_id})
    if not result.deleted_count:
        raise HTTPException(status_code=404, detail="User not found")


@app.get("/api/analytics/summary")
async def get_analytics_summary(_: dict = Depends(require_roles("factory_supervisor", "admin"))):
    try:
        return await refresh_analytics()
    except Exception as exc:
        logger.exception("Could not calculate analytics.")
        raise HTTPException(status_code=500, detail="Unable to calculate analytics") from exc


@app.get("/api/analytics/by-line")
async def get_analytics_by_line(_: dict = Depends(require_roles("factory_supervisor", "admin"))):
    """Calculate analytics for each factory line today."""
    try:
        now = datetime.now(timezone.utc)
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        today_filter = {**COMPLETE_INSPECTION_FILTER, "timestamp": {"$gte": today_start}}
        
        # Group inspections by factory line
        line_rows = await db.inspections.aggregate([
            {"$match": today_filter},
            {"$group": {
                "_id": "$factory_line",
                "total": {"$sum": 1},
                "passed": {"$sum": {"$cond": [{"$eq": ["$pass_fail", "PASS"]}, 1, 0]}},
            }},
            {"$sort": {"_id": 1}},
        ]).to_list(None)
        
        return [
            {
                "factory_line": row["_id"],
                "total_inspections": row["total"],
                "passed": row["passed"],
                "failed": row["total"] - row["passed"],
                "pass_rate_percent": round(row["passed"] * 100 / row["total"], 1) if row["total"] else 0
            }
            for row in line_rows
        ]
    except Exception as exc:
        logger.exception("Could not calculate per-line analytics.")
        raise HTTPException(status_code=500, detail="Unable to calculate analytics") from exc
