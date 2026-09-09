from pydantic import BaseModel, EmailStr, Field

from app.models.enums import RoleName


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    full_name: str = Field(min_length=1)
    role: RoleName


class LoginRequest(BaseModel):
    username: EmailStr
    password: str


from app.schemas.user import UserRead

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserRead
