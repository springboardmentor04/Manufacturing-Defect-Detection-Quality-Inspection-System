from fastapi import (
    APIRouter,
    Depends,
)

from app.models.user_model import (
    UserRegister,
    UserUpdate,
)

from app.services.user_service import (
    get_users,
    create_user,
    update_user,
    delete_user,
)

from app.utils.jwt_handler import (
    require_factory_supervisor,
)


router = APIRouter(
    prefix="/users",
    tags=["User Management"],
)


# ============================================================
# GET ALL USERS
# FACTORY SUPERVISOR ONLY
# ============================================================

@router.get("")
async def users(
    current_user=Depends(
        require_factory_supervisor
    )
):

    return await get_users()


# ============================================================
# CREATE USER
# FACTORY SUPERVISOR ONLY
# ============================================================

@router.post("")
async def create(
    user: UserRegister,
    current_user=Depends(
        require_factory_supervisor
    )
):

    return await create_user(
        user
    )


# ============================================================
# UPDATE USER
# FACTORY SUPERVISOR ONLY
# ============================================================

@router.put("/{user_id}")
async def update(
    user_id: str,
    user: UserUpdate,
    current_user=Depends(
        require_factory_supervisor
    ),
):

    return await update_user(
        user_id,
        user,
    )


# ============================================================
# DELETE USER
# FACTORY SUPERVISOR ONLY
# ============================================================

@router.delete("/{user_id}")
async def remove(
    user_id: str,
    current_user=Depends(
        require_factory_supervisor
    ),
):

    return await delete_user(
        user_id
    )