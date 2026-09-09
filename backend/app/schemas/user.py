from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr

from app.models.enums import RoleName
from app.models.user import User


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: EmailStr
    full_name: str
    role: RoleName
    is_active: bool
    created_at: datetime


class RoleUpdateRequest(BaseModel):
    role: RoleName


def serialize_user(user: User) -> UserRead:
    return UserRead(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role.name,
        is_active=user.is_active,
        created_at=user.created_at,
    )
