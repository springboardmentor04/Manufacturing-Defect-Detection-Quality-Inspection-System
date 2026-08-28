from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.models.roles import UserRole
from app.auth.dependencies import require_role
from app.auth.dependencies import get_current_user
from app.auth.dependencies import (
    get_current_user,
    require_role
)
from app.auth.security import (
    create_access_token,
    hash_password,
    verify_password
)

from app.database import get_db

from app.models.roles import UserRole
from app.models.user import User

from app.schemas.auth import (
    LoginRequest,
    LoginResponse,
    RegisterRequest,
    UserResponse
)


# Create API Router
router = APIRouter()


# ==========================================
# REGISTER API
# ==========================================

@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED
)
def register_user(
    user_data: RegisterRequest,
    db: Session = Depends(get_db)
):

    # Validate email domain
    if not user_data.email.lower().endswith("@gmail.com"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only @gmail.com email addresses are allowed"
        )

    # Validate password is alphanumeric
    if not user_data.password.isalnum():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must contain only letters and numbers (alphanumeric)"
        )

    # Check if email already exists
    existing_user = (
        db.query(User)
        .filter(User.email == user_data.email)
        .first()
    )

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email is already registered"
        )

    # Hash password
    hashed_password = hash_password(
        user_data.password
    )

    # Create new user
    new_user = User(
        full_name=user_data.full_name,
        email=user_data.email,
        password_hash=hashed_password,
       role=user_data.role.value,
        is_active=True
    )

    # Save user
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return new_user


# ==========================================
# LOGIN API
# ==========================================

@router.post(
    "/login",
    response_model=LoginResponse
)
def login_user(
    user_data: LoginRequest,
    db: Session = Depends(get_db)
):

    # Find user by email
    user = (
        db.query(User)
        .filter(User.email == user_data.email)
        .first()
    )

    # User not found
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    # Verify password
    password_is_valid = verify_password(
        user_data.password,
        user.password_hash
    )

    # Password incorrect
    if not password_is_valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    # Check account status
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )

    # Generate JWT token
    access_token = create_access_token(
        data={
            "sub": str(user.id),
            "email": user.email,
            "role": user.role
        }
    )

    # Return token and user information
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }
@router.get(
    "/me",
    response_model=UserResponse
)
def get_my_profile(
    current_user: User = Depends(get_current_user)
):
    return current_user

@router.get("/quality-test")
def quality_test(
    current_user: User = Depends(
        require_role(UserRole.QUALITY_ENGINEER.value)
    )
):
    return {
        "message": "Welcome Quality Engineer!",
        "user": current_user.email,
        "role": current_user.role
    }
@router.get("/supervisor-test")
def supervisor_test(
    current_user: User = Depends(
        require_role(UserRole.FACTORY_SUPERVISOR.value)
    )
):
    return {
        "message": "Welcome Factory Supervisor!",
        "user": current_user.email,
        "role": current_user.role
}