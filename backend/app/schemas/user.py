from uuid import UUID
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, ConfigDict


class RoleBase(BaseModel):
    role_name: str
    description: Optional[str] = None


class RoleResponse(RoleBase):
    id: UUID
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class UserBase(BaseModel):
    full_name: str
    email: EmailStr
    status: str = "ACTIVE"


class UserCreate(UserBase):
    password: str
    role_name: str = "Admin"


class UserResponse(UserBase):
    id: UUID
    role_id: UUID
    role: Optional[RoleResponse] = None
    last_login_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse
