from fastapi import (
    APIRouter,
    Depends,
)

from app.services.production_service import (
    get_production_overview,
    get_production_monitoring,
)

from app.utils.jwt_handler import (
    require_factory_supervisor,
)


router = APIRouter(
    prefix="/production",
    tags=["Production Monitoring"],
)


# ============================================================
# PRODUCTION OVERVIEW
# FACTORY SUPERVISOR ONLY
# ============================================================

@router.get("/overview")
async def production_overview(
    current_user=Depends(
        require_factory_supervisor
    )
):

    return await get_production_overview()


# ============================================================
# PRODUCTION MONITORING
# FACTORY SUPERVISOR ONLY
# ============================================================

@router.get("/monitoring")
async def production_monitoring(
    current_user=Depends(
        require_factory_supervisor
    )
):

    return await get_production_monitoring()