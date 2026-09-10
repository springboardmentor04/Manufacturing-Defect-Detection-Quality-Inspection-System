import os
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

from datetime import datetime, timezone
from sqlalchemy import text

from app.config import settings
from app.database import engine
from app.services.defect_detection import MODEL_PATH, _model_instance
from app.routers import auth, images, inspections, reports, analytics

app = FastAPI(
    title="VisionInspect AI Backend API",
    description="Manufacturing Defect Detection & Quality Inspection Platform - Milestone 4",
    version="4.0.0"
)

# CORS setup
origins = [origin.strip() for origin in settings.CORS_ORIGINS.split(",") if origin.strip()]
if "http://localhost:3000" not in origins:
    origins.append("http://localhost:3000")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static file serving for uploads
uploads_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "uploads"))
os.makedirs(uploads_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")

# Include routers
app.include_router(auth.router)
app.include_router(images.router)
app.include_router(inspections.router)
app.include_router(reports.router)
app.include_router(analytics.router)

@app.get("/")
def root():
    return {
        "status": "online",
        "service": "VisionInspect AI API",
        "milestone": 4
    }

@app.get("/health")
def health_check():
    """
    Health check endpoint for Docker container healthchecks and deployment monitoring.
    Checks database connection and model availability.
    """
    db_status = "disconnected"
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
            db_status = "connected"
    except Exception:
        db_status = "disconnected"

    model_exists = os.path.exists(MODEL_PATH)
    model_loaded = (_model_instance is not None) or model_exists

    return {
        "status": "ok",
        "database": db_status,
        "model_loaded": model_loaded,
        "model_path": MODEL_PATH,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
