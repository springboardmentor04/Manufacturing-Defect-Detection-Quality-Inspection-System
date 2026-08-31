import uuid
from typing import List, Union
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.config import settings
from app.database import get_db
from app.models.users import User
from app.utils.security import decode_token

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/auth/login/oauth",
    auto_error=False
)


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    """
    Authenticate request via Bearer JWT.
    Returns HTTP 401 Unauthorized with standardized error if token is missing/invalid.
    """
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id_str: str = payload.get("sub")
    if not user_id_str:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        user_uuid = uuid.UUID(user_id_str)
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = db.query(User).filter(User.id == user_uuid).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if user.status != "ACTIVE":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to access this resource."
        )

    return user


class RequireRole:
    """
    Reusable FastAPI dependency factory for Role-Based Access Control (RBAC).
    Normalizes role names and returns HTTP 403 Forbidden if user lacks permitted role.
    """
    def __init__(self, allowed_roles: Union[List[str], str]):
        if isinstance(allowed_roles, str):
            allowed_roles = [allowed_roles]
        self.allowed_roles = [self.normalize_role(r) for r in allowed_roles]

    @staticmethod
    def normalize_role(role_name: str) -> str:
        r = role_name.lower().strip()
        if "admin" in r:
            return "ADMIN"
        elif "supervisor" in r:
            return "FACTORY_SUPERVISOR"
        elif "quality" in r or "engineer" in r:
            return "QUALITY_ENGINEER"
        return r.upper()

    def __call__(self, current_user: User = Depends(get_current_user)) -> User:
        user_role = current_user.role.role_name.upper() if current_user.role else ""
        normalized_user_role = self.normalize_role(user_role)

        # Admin has master system access
        if normalized_user_role == "ADMIN":
            return current_user

        # User holds explicit permitted role
        if normalized_user_role in self.allowed_roles:
            return current_user

        # Insufficient permissions
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to access this resource."
        )


# Pre-configured Role Dependencies
require_admin = RequireRole(["ADMIN"])
require_supervisor = RequireRole(["FACTORY_SUPERVISOR"])
require_quality_engineer = RequireRole(["QUALITY_ENGINEER"])
