from datetime import timedelta, datetime
from typing import Any
from fastapi import APIRouter, Body, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.api.deps import get_current_user, get_database
from app.config.settings import settings
from app.schemas.user import Token, UserResponse, UserCreate, UserInDB
from app.utils.security import create_access_token, verify_password, get_password_hash

router = APIRouter()

@router.post("/register", response_model=UserResponse)
async def register_user(
    user_in: UserCreate,
    db: AsyncIOMotorDatabase = Depends(get_database)
) -> Any:
    """
    Register a new user.
    """
    user = await db["users"].find_one({"email": user_in.email})
    if user:
        raise HTTPException(
            status_code=400,
            detail="The user with this email already exists in the system.",
        )
    
    # Also check if employee_id exists
    user_by_id = await db["users"].find_one({"employee_id": user_in.employee_id})
    if user_by_id:
        raise HTTPException(
            status_code=400,
            detail="The user with this employee ID already exists.",
        )

    user_dict = user_in.model_dump()
    password = user_dict.pop("password")
    user_dict["hashed_password"] = get_password_hash(password)
    
    db_user = UserInDB(**user_dict)
    
    await db["users"].insert_one(db_user.model_dump(by_alias=True))
    
    return db_user

@router.post("/login", response_model=Token)
async def login_access_token(
    db: AsyncIOMotorDatabase = Depends(get_database),
    form_data: OAuth2PasswordRequestForm = Depends()
) -> Any:
    """
    OAuth2 compatible token login, get an access token for future requests
    """
    print(f"Login request received for {form_data.username}")
    try:
        user = await db["users"].find_one({"email": form_data.username})
        print(f"Query completed, user found: {user is not None}")
    except Exception as e:
        print(f"Database query error: {e}")
        raise e
        
    if not user:
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    if not verify_password(form_data.password, user["hashed_password"]):
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    
    # Note: user might have "is_active" from old schema or "status" from new.
    # Default to active if missing.
    is_active = user.get("status", "ACTIVE") == "ACTIVE" if "status" in user else user.get("is_active", True)
    if not is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    
    # Update last_login
    await db["users"].update_one(
        {"_id": user["_id"]},
        {"$set": {"last_login": datetime.utcnow()}}
    )
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return {
        "access_token": create_access_token(
            subject=user["email"], 
            role=user["role"],
            expires_delta=access_token_expires
        ),
        "token_type": "bearer",
    }

@router.get("/me", response_model=UserResponse)
def read_users_me(
    current_user: UserResponse = Depends(get_current_user)
) -> Any:
    """
    Get current user.
    """
    return current_user
