"""
Pydantic request/response schemas for authentication and user management.
"""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from app.models.user import UserRole


class UserRegister(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6)
    role: UserRole
    # Optional factory/plant metadata
    department: Optional[str] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: str
    full_name: str
    email: EmailStr
    role: UserRole
    department: Optional[str] = None
    is_active: bool = True
    created_at: Optional[str] = None


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class UserRoleUpdate(BaseModel):
    role: UserRole


class UserStatusUpdate(BaseModel):
    is_active: bool
