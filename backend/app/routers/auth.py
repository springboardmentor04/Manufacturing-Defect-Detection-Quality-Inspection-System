from fastapi import APIRouter, Depends, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.auth import (
    UserRegister, 
    UserLogin, 
    Token, 
    UserOut, 
    RefreshTokenRequest, 
    LogoutRequest
)
from app.services.auth_service import (
    register_user, 
    authenticate_user, 
    refresh_token_flow, 
    logout_token_flow
)
from app.dependencies.auth import get_current_user
from app.models.users import User

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def register(
    user_data: UserRegister,
    db: Session = Depends(get_db)
):
    """Register a new user account and return JWT token response."""
    return register_user(db, user_data)


@router.post("/login", response_model=Token)
def login(
    login_data: UserLogin,
    db: Session = Depends(get_db)
):
    """Authenticate user with JSON credentials and return JWT tokens."""
    return authenticate_user(db, login_data.email, login_data.password)


@router.post("/login/oauth", response_model=Token)
def login_oauth(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """OAuth2 compatible token login endpoint for Swagger UI."""
    return authenticate_user(db, form_data.username, form_data.password)


@router.post("/refresh", response_model=Token)
def refresh_token(
    request: RefreshTokenRequest,
    db: Session = Depends(get_db)
):
    """Exchange a valid refresh token for a new access token."""
    return refresh_token_flow(db, request.refresh_token)


@router.post("/logout")
def logout(
    request: LogoutRequest,
    db: Session = Depends(get_db)
):
    """Revoke refresh token and log user out."""
    return logout_token_flow(db, request.refresh_token)


@router.get("/me", response_model=UserOut)
def get_me(
    current_user: User = Depends(get_current_user)
):
    """Protected endpoint retrieving details of the currently authenticated user."""
    return UserOut(
        id=current_user.id,
        full_name=current_user.full_name,
        email=current_user.email,
        role_name=current_user.role.role_name if current_user.role else "ADMIN",
        status=current_user.status,
        created_at=current_user.created_at
    )
