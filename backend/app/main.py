from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routers.api import api_router
from app.database import SessionLocal, engine, Base
import app.models  # Ensures all models are registered
from app.services.dataset_service import auto_populate_dataset_from_disk

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Configuration
if settings.CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# Include API Router under /api/v1
app.include_router(api_router, prefix=settings.API_V1_STR)


@app.on_event("startup")
def on_startup():
    """Auto scan dataset/ directory on startup and populate metadata in database."""
    try:
        db = SessionLocal()
        auto_populate_dataset_from_disk(db)
        db.close()
    except Exception as e:
        print(f"Startup Dataset Scanner Notice: {e}")


@app.get("/")
def root():
    return {
        "message": f"Welcome to {settings.PROJECT_NAME}",
        "docs": "/docs",
        "health_check": f"{settings.API_V1_STR}/health"
    }
