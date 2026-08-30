"""
Authentication routes: register, login (JWT), and current-user profile.
"""
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends, status
from pymongo.errors import DuplicateKeyError
from bson import ObjectId

from app.schemas.user import UserRegister, UserLogin, Token, UserOut
from app.database import users_collection
from app.utils.security import hash_password, verify_password, create_access_token
from app.utils.dependencies import get_current_user

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


def _user_to_out(user: dict) -> UserOut:
    return UserOut(
        id=str(user["_id"]),
        full_name=user["full_name"],
        email=user["email"],
        role=user["role"],
        department=user.get("department"),
        is_active=user.get("is_active", True),
        created_at=user.get("created_at"),
    )


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
async def register(payload: UserRegister):
    existing = await users_collection.find_one({"email": payload.email})
    if existing:
        raise HTTPException(status_code=400, detail="An account with this email already exists")

    user_doc = {
        "full_name": payload.full_name,
        "email": payload.email,
        "hashed_password": hash_password(payload.password),
        "role": payload.role.value,
        "department": payload.department,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    try:
        result = await users_collection.insert_one(user_doc)
    except DuplicateKeyError:
        raise HTTPException(status_code=400, detail="An account with this email already exists")

    user_doc["_id"] = result.inserted_id
    access_token = create_access_token({"sub": str(result.inserted_id), "role": payload.role.value})

    return Token(access_token=access_token, user=_user_to_out(user_doc))


@router.post("/login", response_model=Token)
async def login(payload: UserLogin):
    user = await users_collection.find_one({"email": payload.email})
    if not user or not verify_password(payload.password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not user.get("is_active", True):
        raise HTTPException(status_code=403, detail="Account has been deactivated. Contact your supervisor.")

    access_token = create_access_token({"sub": str(user["_id"]), "role": user["role"]})
    return Token(access_token=access_token, user=_user_to_out(user))


@router.get("/me", response_model=UserOut)
async def get_me(current_user: dict = Depends(get_current_user)):
    return _user_to_out(current_user)
