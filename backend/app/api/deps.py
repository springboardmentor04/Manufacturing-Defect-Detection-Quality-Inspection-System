from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from pydantic import ValidationError
from app.config.settings import settings
from app.database.connection import get_database
from app.schemas.user import TokenData, UserResponse
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId

reusable_oauth2 = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/auth/login"
)

async def get_current_user(
    db: AsyncIOMotorDatabase = Depends(get_database),
    token: str = Depends(reusable_oauth2)
) -> UserResponse:
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        token_data = TokenData(email=payload.get("sub"), role=payload.get("role"))
    except (JWTError, ValidationError):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Could not validate credentials",
        )
    
    user = await db["users"].find_one({"email": token_data.email})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    return UserResponse(**user, id=str(user["_id"]))

def get_current_active_user(
    current_user: UserResponse = Depends(get_current_user),
) -> UserResponse:
    if current_user.status != "ACTIVE":
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user
