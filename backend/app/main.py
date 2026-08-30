"""
VisionInspect AI - Manufacturing Defect Detection & Quality Inspection System
Milestone 2: Image Processing & Defect Detection

This FastAPI app wires together:
  - Authentication (JWT) + Role-Based Access Control
  - Product image upload workflow
  - Image preprocessing + quality analysis reports
  - Defect detection engine (reference-profile anomaly model + predictions)
  - Inspection dashboard endpoints (list/stats)
  - Static file serving for uploaded images + generated defect heatmaps
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from app.config import settings
from app.database import create_indexes
from app.routers import auth, users, inspections, analytics

app = FastAPI(
    title="VisionInspect AI",
    description="AI-Powered Manufacturing Defect Detection & Quality Inspection Platform",
    version="0.3.0-milestone3",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(inspections.router)
app.include_router(analytics.router)


@app.on_event("startup")
async def on_startup():
    await create_indexes()


@app.get("/")
async def root():
    return {
        "service": "VisionInspect AI",
        "status": "running",
        "milestone": "Milestone 2 - Image Processing & Defect Detection",
        "docs": "/docs",
    }


@app.get("/api/health")
async def health_check():
    return {"status": "healthy"}