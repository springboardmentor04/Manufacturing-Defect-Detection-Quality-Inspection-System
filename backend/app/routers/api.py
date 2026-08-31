from fastapi import APIRouter
from app.routers import health, auth, admin, supervisor, quality, datasets

api_router = APIRouter()

api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(admin.router)
api_router.include_router(supervisor.router)
api_router.include_router(quality.router)
api_router.include_router(datasets.router)
