from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime


class UserRegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(
        ..., min_length=6, max_length=72,
        description="Password must be between 6 and 72 characters"
    )
    full_name: str = Field(..., min_length=2, description="Full name of the user")
    role: Optional[str] = Field("QUALITY_ENGINEER", description="QUALITY_ENGINEER, FACTORY_SUPERVISOR, or ADMIN")


class UserLoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., max_length=72)


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    email: str
    full_name: str
    role: str


class UserResponse(BaseModel):
    id: str
    email: EmailStr
    full_name: str
    role: str
    created_at: datetime

    class Config:
        from_attributes = True