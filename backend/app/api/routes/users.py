from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, get_db, require_role
from app.models.enums import RoleName
from app.models.role import Role
from app.models.user import User
from app.schemas.user import RoleUpdateRequest, UserRead, serialize_user


router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserRead)
def read_current_user(current_user: User = Depends(get_current_user)) -> UserRead:
    return serialize_user(current_user)


@router.get("/", response_model=list[UserRead])
def list_users(
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_role([RoleName.admin])),
) -> list[UserRead]:
    users = list(db.scalars(select(User).order_by(User.created_at.desc())))
    return [serialize_user(user) for user in users]


@router.patch("/{user_id}/role", response_model=UserRead)
def update_user_role(
    user_id: UUID,
    payload: RoleUpdateRequest,
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_role([RoleName.admin])),
) -> UserRead:
    user = db.scalar(select(User).where(User.id == user_id))
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    role = db.scalar(select(Role).where(Role.name == payload.role))
    if role is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Requested role does not exist")

    user.role_id = role.id
    user.role = role
    db.commit()
    db.refresh(user)
    return serialize_user(user)
