from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import auth, products, batches, inspections, analytics, models, reports
from app.database.session import engine
from app.models.all_models import Base

from fastapi.staticfiles import StaticFiles

import os
from app.core.config import settings

app = FastAPI(title="VISIONINSPECT AI", version="1.0.0")

# Ensure uploads directory exists
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

cors_origins_env = os.getenv("CORS_ORIGINS", "").strip()
if cors_origins_env == "*":
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    allowed_origins = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ]
    if cors_origins_env:
        for origin in cors_origins_env.split(","):
            cleaned = origin.strip().rstrip("/")
            if cleaned and cleaned not in allowed_origins:
                allowed_origins.append(cleaned)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_origin_regex=r"https?://.*",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(products.router, prefix="/api/products", tags=["products"])
app.include_router(batches.router, prefix="/api/batches", tags=["batches"])
app.include_router(inspections.router, prefix="/api/inspections", tags=["inspections"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["analytics"])
app.include_router(models.router, prefix="/api/models", tags=["models"])
app.include_router(reports.router, prefix="/api/reports", tags=["reports"])

@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.on_event("startup")
def create_tables_on_startup():
    """Ensure database tables exist when the app starts."""
    try:
        Base.metadata.create_all(bind=engine)
    except Exception:
        # Avoid crashing on startup; log if needed in future
        pass
