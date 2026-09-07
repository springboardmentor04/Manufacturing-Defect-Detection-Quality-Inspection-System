# ============================================================
# VISIONINSPECT AI
# MAIN APPLICATION
# Backend Configuration + CORS + Routers
# ============================================================

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes.user_routes import router as user_router
from app.database.database import database
from app.routes.auth_routes import router as auth_router
from app.routes.inspection_routes import router as inspection_router
from app.routes.production_routes import router as production_router


# ============================================================
# APPLICATION SETTINGS
# ============================================================

APP_ENV = os.getenv(
    "APP_ENV",
    "development"
).strip().lower()


# ============================================================
# CORS CONFIGURATION
# ============================================================
#
# Development:
#   http://localhost:5173
#
# Production:
#   Set FRONTEND_URL to your deployed frontend URL.
#
# Multiple origins can be supplied using commas:
#
# FRONTEND_URL=https://example.com,https://www.example.com
#
# ============================================================

DEFAULT_FRONTEND_URL = (
    "http://localhost:5173"
)


frontend_urls = os.getenv(
    "FRONTEND_URL",
    DEFAULT_FRONTEND_URL
)


ALLOWED_ORIGINS = [
    origin.strip().rstrip("/")
    for origin in frontend_urls.split(",")
    if origin.strip()
]


# ------------------------------------------------------------
# Safety fallback
# ------------------------------------------------------------

if not ALLOWED_ORIGINS:

    ALLOWED_ORIGINS = [
        DEFAULT_FRONTEND_URL
    ]


# ============================================================
# APPLICATION
# ============================================================

app = FastAPI(
    title="VisionInspect AI API",
    version="1.0.0"
)


# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,

    allow_origins=ALLOWED_ORIGINS,

    allow_credentials=True,

    allow_methods=[
        "GET",
        "POST",
        "PUT",
        "PATCH",
        "DELETE",
        "OPTIONS",
    ],

    allow_headers=[
        "Authorization",
        "Content-Type",
        "Accept",
    ],
)


# ============================================================
# ROUTERS
# ============================================================

app.include_router(
    production_router
)

app.include_router(
    auth_router
)

app.include_router(
    inspection_router
)

app.include_router(
    user_router
)


# ============================================================
# ROOT
# ============================================================

@app.get("/")
async def root():

    return {
        "message":
            "VisionInspect AI Backend Running Successfully"
    }


# ============================================================
# HEALTH CHECK
# ============================================================

@app.get("/health")
async def health():

    try:

        await database.command(
            "ping"
        )

        return {
            "status":
                "Connected",

            "database":
                "visioninspect_ai"
        }

    except Exception as error:

        return {
            "status":
                "Failed",

            "error":
                str(error)
        }