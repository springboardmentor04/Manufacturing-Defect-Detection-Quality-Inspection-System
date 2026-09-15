from pydantic import BaseModel, EmailStr, Field
from datetime import datetime
from typing import Optional
from enum import Enum
from bson import ObjectId

class UserRole(str, Enum):
    QUALITY_ENGINEER = "QUALITY_ENGINEER"
    FACTORY_SUPERVISOR = "FACTORY_SUPERVISOR"
    ADMIN = "ADMIN"

class UserStatus(str, Enum):
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"

class UserBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    employee_id: str = Field(..., description="Employee ID")
    email: EmailStr
    phone: Optional[str] = None
    department: Optional[str] = None
    role: UserRole
    status: UserStatus = UserStatus.ACTIVE

class UserCreate(UserBase):
    password: str = Field(..., min_length=8)

class UserInDB(UserBase):
    id: str = Field(default_factory=lambda: str(ObjectId()), alias="_id")
    hashed_password: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    last_login: Optional[datetime] = None

    class Config:
        populate_by_name = True
        json_encoders = {
            datetime: lambda dt: dt.isoformat()
        }

class UserResponse(UserBase):
    id: str
    created_at: datetime
    updated_at: datetime
    last_login: Optional[datetime] = None

    class Config:
        populate_by_name = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None
    role: Optional[str] = None
