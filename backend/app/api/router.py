from fastapi import APIRouter

from app.api.routes.auth import router as auth_router
from app.api.routes.dashboard import router as dashboard_router
from app.api.routes.images import router as images_router
from app.api.routes.inspections import router as inspections_router
from app.api.routes.reports import router as reports_router
from app.api.routes.users import router as users_router


api_router = APIRouter()
api_router.include_router(auth_router)
api_router.include_router(users_router)
api_router.include_router(images_router)
api_router.include_router(inspections_router)
api_router.include_router(reports_router)
api_router.include_router(dashboard_router)
