import os
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import auth, images, inspections

app = FastAPI(
    title="VisionInspect AI Backend API",
    description="Manufacturing Defect Detection & Quality Inspection Platform - Milestone 1",
    version="1.0.0"
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

@app.get("/")
def root():
    return {
        "status": "online",
        "service": "VisionInspect AI API",
        "milestone": 1
    }
