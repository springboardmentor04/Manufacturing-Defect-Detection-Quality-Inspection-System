from __future__ import annotations

from collections.abc import Callable, Generator
from typing import Optional
from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.core.config import get_settings
from app.db.session import get_session
from app.models.enums import RoleName
from app.models.user import User


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)


def get_db() -> Generator[Session, None, None]:
    yield from get_session()


def get_current_user_optional(token: Optional[str] = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> Optional[User]:
    if not token:
        return None
    settings = get_settings()
    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
        subject = payload.get("sub")
        if subject is None:
            raise credentials_error
        user_id = UUID(subject)
    except (JWTError, ValueError):
        raise credentials_error from None

    user = db.scalar(select(User).options(joinedload(User.role)).where(User.id == user_id))
    if user is None:
        return None
    return user


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    user = get_current_user_optional(token=token, db=db)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User account is inactive")
    return user


def require_role(allowed_roles: list[RoleName]) -> Callable:
    def dependency(current_user: User = Depends(get_current_user)) -> User:
        role_name = current_user.role.name
        if role_name not in allowed_roles and (
            role_name == RoleName.factory_supervisor and RoleName.product_supervisor in allowed_roles
        ):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
        if role_name in allowed_roles:
            return current_user
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")

    return dependency
