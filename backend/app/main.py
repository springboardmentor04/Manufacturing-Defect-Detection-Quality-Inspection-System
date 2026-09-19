from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.config.settings import settings
import os

# Initialize FastAPI application
app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.API_VERSION,
    description="Backend API for VisionInspect AI Platform"
)

from fastapi.responses import JSONResponse
from fastapi import Request

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    print(f"Global exception caught: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal Server Error: " + str(exc)},
        headers={"Access-Control-Allow-Origin": "*"}
    )

# Configure CORS
origins = settings.parse_cors_origins(settings.CORS_ORIGINS) if hasattr(settings, "parse_cors_origins") else settings.CORS_ORIGINS
if isinstance(origins, str):
    import json
    try:
        origins = json.loads(origins)
    except Exception:
        origins = [origins]

# Ensure Render frontend and common local origins are always allowed
frontend_render_origin = "https://manufacturing-defect-detection-quality-o65m.onrender.com"
if isinstance(origins, list) and frontend_render_origin not in origins:
    origins.append(frontend_render_origin)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if origins else ["*"],
    allow_origin_regex=r"https://.*\.onrender\.com",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount uploads directory
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")



# Define health check endpoint
@app.get(f"{settings.API_V1_STR}/health", tags=["health"])
async def health_check():
    """
    Health check endpoint to verify API, MongoDB, YOLO, and CUDA status.
    """
    from app.database.connection import db
    import torch
    import sys
    import os
    sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../ai-model')))
    # pyrefly: ignore [missing-import]
    from inference.yolo_infer import YOLOInferenceEngine
    
    # Check DB
    db_status = "connected" if db.client else "disconnected"
    
    # Check CUDA
    cuda_available = torch.cuda.is_available()
    device_name = torch.cuda.get_device_name(0) if cuda_available else "CPU"
    
    # Check YOLO
    engine = YOLOInferenceEngine()
    yolo_status = "loaded" if engine._initialized else "unloaded"
    
    return {
        "api": "healthy",
        "database": db_status,
        "yolo": yolo_status,
        "cuda": cuda_available,
        "device": device_name
    }

from app.database.connection import connect_to_mongo, close_mongo_connection
from app.routes import auth, upload, dataset, inspection, analytics, notifications

# Register DB connection events
app.add_event_handler("startup", connect_to_mongo)
app.add_event_handler("shutdown", close_mongo_connection)

# Include Routers
app.include_router(
    auth.router,
    prefix=f"{settings.API_V1_STR}/auth",
    tags=["authentication"]
)
app.include_router(
    upload.router,
    prefix=f"{settings.API_V1_STR}/upload",
    tags=["upload"]
)
app.include_router(
    dataset.router,
    prefix=f"{settings.API_V1_STR}/dataset",
    tags=["dataset"]
)
app.include_router(
    inspection.router,
    prefix=f"{settings.API_V1_STR}/inspections",
    tags=["inspection"]
)
app.include_router(
    analytics.router,
    prefix=f"{settings.API_V1_STR}/analytics",
    tags=["analytics"]
)
app.include_router(
    notifications.router,
    prefix=f"{settings.API_V1_STR}/notifications",
    tags=["notifications"]
)
