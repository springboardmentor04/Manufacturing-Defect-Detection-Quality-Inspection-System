from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from app.core.config import settings
from fastapi import Response
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.all_models import User, Role
from app.schemas.all_schemas import Token, LoginRequest, UserCreate, UserResponse
from app.core.security import verify_password, get_password_hash, create_access_token
from app.api.deps import get_current_active_user
from fastapi import Depends
from app.core.config import settings

router = APIRouter()

@router.post("/login", response_model=Token)
def login(login_data: LoginRequest, db: Session = Depends(get_db)):
    # Support logging in with either username or email address
    user = db.query(User).filter(
        (User.username == login_data.username) | (User.email == login_data.username)
    ).first()
    if not user or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
        )
    access_token = create_access_token(subject=user.username)
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/register", response_model=UserResponse)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    try:
        username = user_in.username.strip()
        email = user_in.email.strip().lower()

        existing_user = db.query(User).filter(
            (User.username == username) | (User.email == email)
        ).first()
        if existing_user:
            if existing_user.username.lower() == username.lower():
                raise HTTPException(status_code=400, detail="Username already registered")
            else:
                raise HTTPException(status_code=400, detail="Email address already registered")

        norm_role = user_in.role_name.strip().upper().replace(" ", "_")
        role = db.query(Role).filter(Role.name == norm_role).first()
        if not role:
            role = Role(name=norm_role)
            db.add(role)
            db.commit()
            db.refresh(role)

        hashed_password = get_password_hash(user_in.password)
        new_user = User(
            username=username,
            email=email,
            hashed_password=hashed_password,
            role_id=role.id
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        return {
            "id": new_user.id,
            "username": new_user.username,
            "email": new_user.email,
            "is_active": new_user.is_active,
            "role": new_user.role.name if new_user.role else norm_role
        }
    except HTTPException as he:
        raise he
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

@router.get("/me", response_model=UserResponse)
def read_users_me(current_user: User = Depends(get_current_active_user)):
    role_name = getattr(getattr(current_user, "role", None), "name", None) or str(getattr(current_user, "role", "QUALITY_ENGINEER"))
    return {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "is_active": current_user.is_active,
        "role": role_name
    }


@router.post("/mock-login", response_model=Token)
def mock_login(login_data: LoginRequest):
    """Development helper: return a token for the admin mock user without DB lookup.

    Credentials: username `admin`, password `admin`.
    DO NOT enable or expose in production.
    """
    if login_data.username == "admin" and login_data.password == "admin":
        access_token = create_access_token(subject="admin")
        return {"access_token": access_token, "token_type": "bearer"}
    raise HTTPException(status_code=401, detail="Invalid mock credentials")


@router.post("/gateway-login")
def mock_gateway_login(login_data: LoginRequest, response: Response):
    """Gateway for mock/dev login. Returns a token and optionally sets an HTTP-only cookie.

    Usage: POST /api/auth/gateway-login with JSON {username, password}.
    If `MOCK_LOGIN_ENABLED` is false, this returns 404.
    """
    if not settings.MOCK_LOGIN_ENABLED:
        raise HTTPException(status_code=404, detail="Not found")

    # Accept the same dev admin credentials as /mock-login
    if login_data.username == "admin" and login_data.password == "admin":
        access_token = create_access_token(subject="admin")
        # set HTTP-only cookie for convenience in dev
        response.set_cookie(
            key="access_token",
            value=access_token,
            httponly=True,
            samesite="lax",
        )
        return {"access_token": access_token, "token_type": "bearer"}

    raise HTTPException(status_code=401, detail="Invalid mock credentials")
