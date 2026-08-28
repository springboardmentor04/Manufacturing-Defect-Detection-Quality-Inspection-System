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
    user = db.query(User).filter(User.username == login_data.username).first()
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
        user = db.query(User).filter(User.username == user_in.username).first()
        if user:
            raise HTTPException(status_code=400, detail="Username already registered")

        role = db.query(Role).filter(Role.name == user_in.role_name).first()
        if not role:
            role = Role(name=user_in.role_name)
            db.add(role)
            db.commit()
            db.refresh(role)

        hashed_password = get_password_hash(user_in.password)
        new_user = User(
            username=user_in.username,
            email=user_in.email,
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
            "role": new_user.role.name
        }
    except HTTPException as he:
        raise he
    except Exception as exc:
        # Return JSON with CORS header to ensure browser receives Access-Control-Allow-Origin
        origin = "http://localhost:3000"
        return JSONResponse(status_code=500, content={"detail": str(exc)}, headers={"Access-Control-Allow-Origin": origin})

@router.get("/me", response_model=UserResponse)
def read_users_me(current_user: User = Depends(get_current_active_user)):
    return {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "is_active": current_user.is_active,
        "role": current_user.role.name
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
