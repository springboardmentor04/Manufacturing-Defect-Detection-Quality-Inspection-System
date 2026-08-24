from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.users import router as users_router
from app.database.database import Base, engine
from app.models.user import User
from app.api.auth import router as auth_router
from app.api.dashboard import router as dashboard_router
from app.api.inspection import router as inspection_router
from fastapi.staticfiles import StaticFiles
from app.models.inspection import Inspection
from app.api import qe_dashboard
from app.api import qe_reports
from app.api import qe_analytics
from app.api import production_reports
from app.api import supervisor_users

# Create all database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="VisionInspect AI API",
    description="Manufacturing Defect Detection & Quality Inspection System",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(auth_router)
app.include_router(users_router)
app.include_router(dashboard_router)
app.include_router(inspection_router)
app.include_router(qe_dashboard.router)
app.include_router(qe_reports.router)
app.include_router(qe_analytics.router)
app.include_router(production_reports.router)
app.include_router(supervisor_users.router)

# Uploaded Images
app.mount(
    "/uploads",
    StaticFiles(directory="uploads"),
    name="uploads",
)

# AI Result Images
app.mount(
    "/results",
    StaticFiles(directory="runs/detect"),
    name="results",
)

@app.get("/")
def root():
    return {
        "message": "VisionInspect AI Backend is Running 🚀"
    }