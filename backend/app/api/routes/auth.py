from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user_optional, get_db
from app.core.security import create_access_token, hash_password, verify_password
from app.models.enums import RoleName
from app.models.role import Role
from app.models.user import User
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse
from app.schemas.user import UserRead, serialize_user


router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register_user(
    payload: RegisterRequest,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
) -> TokenResponse:
    if payload.role == RoleName.admin and (
        current_user is None or not current_user.is_active or current_user.role.name != RoleName.admin
    ):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin registration requires an admin user")

    if payload.role not in {RoleName.quality_engineer, RoleName.product_supervisor}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only Quality Engineer and Product Supervisor can be selected at signup")

    existing_user = db.scalar(select(User).where(User.email == payload.email))
    if existing_user is not None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email is already registered")

    role = db.scalar(select(Role).where(Role.name == payload.role))
    if role is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Requested role does not exist")

    user = User(
        email=payload.email,
        hashed_password=hash_password(payload.password),
        full_name=payload.full_name,
        role_id=role.id,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    user.role = role
    token = create_access_token(subject=str(user.id))
    return TokenResponse(access_token=token, token_type="bearer", user=serialize_user(user))


@router.post("/login", response_model=TokenResponse)
def login(
    payload: LoginRequest,
    db: Session = Depends(get_db),
) -> TokenResponse:
    user = db.scalar(select(User).where(User.email == payload.username))
    if user is None or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User account is inactive")

    token = create_access_token(subject=str(user.id))
    return TokenResponse(access_token=token, token_type="bearer", user=serialize_user(user))
