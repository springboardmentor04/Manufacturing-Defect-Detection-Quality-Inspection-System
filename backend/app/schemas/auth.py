from uuid import UUID
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, ConfigDict


class UserRegister(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    role_name: str = "Admin"  # Options: Admin, Factory Supervisor, Quality Engineer


class UserLogin(BaseModel):
    email: EmailStr
    password: str
    role_name: Optional[str] = None


class UserOut(BaseModel):
    id: UUID
    full_name: str
    email: EmailStr
    role_name: str
    status: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserOut


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class LogoutRequest(BaseModel):
    refresh_token: str
