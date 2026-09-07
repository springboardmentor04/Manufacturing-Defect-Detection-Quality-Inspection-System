from fastapi import APIRouter, Depends

from app.models.user_model import (
    UserRegister,
    UserLogin,
    ForgotPassword,
    ResetPassword,
)

from app.services.auth_service import (
    register_user,
    login_user,
    forgot_password,
    reset_password,
)

from app.utils.jwt_handler import (
    get_current_user,
)


# ============================================================
# ROUTER
# ============================================================

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"],
)


# ============================================================
# REGISTER
# ============================================================

@router.post("/register")
async def register(
    user: UserRegister
):

    return await register_user(
        user
    )


# ============================================================
# LOGIN
# ============================================================

@router.post("/login")
async def login(
    user: UserLogin
):

    return await login_user(
        user
    )


# ============================================================
# CURRENT USER
# ============================================================

@router.get("/me")
async def current_user(
    current_user=Depends(
        get_current_user
    )
):

    return {

        "success":
            True,

        "user":
            current_user,
    }


# ============================================================
# FORGOT PASSWORD
# ============================================================

@router.post("/forgot-password")
async def forgot_password_route(
    data: ForgotPassword
):

    return await forgot_password(
        data
    )


# ============================================================
# RESET PASSWORD
# ============================================================

@router.post("/reset-password")
async def reset_password_route(
    data: ResetPassword
):

    return await reset_password(
        data
    )