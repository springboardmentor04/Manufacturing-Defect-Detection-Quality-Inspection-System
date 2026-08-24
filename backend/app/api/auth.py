from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
)

from fastapi.security import OAuth2PasswordRequestForm

from sqlalchemy.orm import Session

from pydantic import BaseModel

from app.database.session import get_db

from app.schemas.user import (
    UserCreate,
    UserResponse,
    Token,
)

from app.services.auth_service import (
    register_user,
    authenticate_user,
)

from app.models.user import User

from app.core.dependencies import get_current_user


router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)


# ============================================================
# PROFILE UPDATE SCHEMA
# ============================================================

class ProfileUpdate(BaseModel):

    full_name: str
    email: str


# ============================================================
# REGISTER
# ============================================================

@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED
)
def register(
    user: UserCreate,
    db: Session = Depends(get_db)
):

    new_user = register_user(
        db,
        user
    )

    if not new_user:

        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )

    return new_user


# ============================================================
# LOGIN
# ============================================================

@router.post(
    "/login",
    response_model=Token
)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):

    result = authenticate_user(
        db,
        form_data.username,
        form_data.password
    )

    if not result:

        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    return {
        "access_token": result["access_token"],
        "token_type": result["token_type"],
    }


# ============================================================
# UPDATE CURRENT USER PROFILE
# ============================================================

@router.put("/profile")
def update_profile(

    profile: ProfileUpdate,

    db: Session = Depends(get_db),

    current_user: User = Depends(
        get_current_user
    ),
):

    # --------------------------------------------------------
    # Validate name
    # --------------------------------------------------------

    full_name = profile.full_name.strip()

    if not full_name:

        raise HTTPException(
            status_code=400,
            detail="Full name cannot be empty"
        )


    # --------------------------------------------------------
    # Validate email
    # --------------------------------------------------------

    email = profile.email.strip().lower()

    if not email:

        raise HTTPException(
            status_code=400,
            detail="Email cannot be empty"
        )


    # --------------------------------------------------------
    # Check duplicate email
    # --------------------------------------------------------

    existing_user = (
        db.query(User)
        .filter(
            User.email == email,
            User.id != current_user.id
        )
        .first()
    )

    if existing_user:

        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )


    # --------------------------------------------------------
    # Update current user's information
    # --------------------------------------------------------

    current_user.full_name = full_name
    current_user.email = email


    # --------------------------------------------------------
    # Save changes
    # --------------------------------------------------------

    db.commit()

    db.refresh(current_user)


    # --------------------------------------------------------
    # Return updated user
    # --------------------------------------------------------

    return {
        "id": current_user.id,

        "full_name": current_user.full_name,

        "email": current_user.email,

        "role": current_user.role,

        "created_at": current_user.created_at,
    }