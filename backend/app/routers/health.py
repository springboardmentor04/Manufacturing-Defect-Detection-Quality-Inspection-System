from fastapi import APIRouter
from app.config import settings
from app.schemas.health import HealthCheck

router = APIRouter(prefix="/health", tags=["Health Check"])


@router.get("", response_model=HealthCheck)
def check_health():
    return HealthCheck(
        status="healthy",
        project_name=settings.PROJECT_NAME,
        version="1.0.0",
        database="connected"
    )
