import uuid
from datetime import datetime, timezone, timedelta
import hashlib
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.users import User
from app.models.roles import Role
from app.models.refresh_tokens import RefreshToken
from app.schemas.auth import UserRegister, Token, UserOut
from app.utils.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token
)

ROLE_MAP = {
    "admin": "ADMIN",
    "factory supervisor": "FACTORY_SUPERVISOR",
    "quality engineer": "QUALITY_ENGINEER",
    "ADMIN": "ADMIN",
    "FACTORY_SUPERVISOR": "FACTORY_SUPERVISOR",
    "QUALITY_ENGINEER": "QUALITY_ENGINEER"
}


def get_or_create_role(db: Session, role_name: str) -> Role:
    """Helper to ensure role exists in database."""
    normalized_name = ROLE_MAP.get(role_name.lower().strip(), role_name.upper())
    role = db.query(Role).filter(Role.role_name == normalized_name).first()
    if not role:
        role = Role(
            role_name=normalized_name,
            description=f"Operational role for {role_name}"
        )
        db.add(role)
        db.commit()
        db.refresh(role)
    return role


def register_user(db: Session, user_data: UserRegister) -> Token:
    """Register new user account with hashed password and return JWT tokens."""
    existing_user = db.query(User).filter(User.email == user_data.email.lower().strip()).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email address is already registered."
        )

    role = get_or_create_role(db, user_data.role_name)
    hashed_pwd = hash_password(user_data.password)

    new_user = User(
        full_name=user_data.full_name,
        email=user_data.email.lower().strip(),
        password_hash=hashed_pwd,
        role_id=role.id,
        status="ACTIVE"
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    access_token = create_access_token(subject=str(new_user.id), role=role.role_name)
    refresh_token = create_refresh_token(subject=str(new_user.id))

    ref_hash = hashlib.sha256(refresh_token.encode('utf-8')).hexdigest()
    db_refresh = RefreshToken(
        user_id=new_user.id,
        token_hash=ref_hash,
        expires_at=datetime.now(timezone.utc) + timedelta(days=7)
    )
    db.add(db_refresh)
    db.commit()

    user_out = UserOut(
        id=new_user.id,
        full_name=new_user.full_name,
        email=new_user.email,
        role_name=role.role_name,
        status=new_user.status,
        created_at=new_user.created_at
    )

    return Token(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        user=user_out
    )


def authenticate_user(db: Session, email: str, password: str) -> Token:
    """Authenticate user with email/password and issue JWT tokens."""
    user = db.query(User).filter(User.email == email.lower().strip()).first()
    if not user or not verify_password(password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password credentials.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if user.status != "ACTIVE":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive or suspended."
        )

    user.last_login_at = datetime.utcnow()
    db.commit()

    role_name = user.role.role_name if user.role else "ADMIN"

    access_token = create_access_token(subject=str(user.id), role=role_name)
    refresh_token = create_refresh_token(subject=str(user.id))

    ref_hash = hashlib.sha256(refresh_token.encode('utf-8')).hexdigest()
    db_refresh = RefreshToken(
        user_id=user.id,
        token_hash=ref_hash,
        expires_at=datetime.now(timezone.utc) + timedelta(days=7)
    )
    db.add(db_refresh)
    db.commit()

    user_out = UserOut(
        id=user.id,
        full_name=user.full_name,
        email=user.email,
        role_name=role_name,
        status=user.status,
        created_at=user.created_at
    )

    return Token(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        user=user_out
    )


def refresh_token_flow(db: Session, refresh_token_str: str) -> Token:
    """Exchange valid refresh token for a new access token and refresh token."""
    payload = decode_token(refresh_token_str)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token."
        )

    user_id_str = payload.get("sub")
    ref_hash = hashlib.sha256(refresh_token_str.encode('utf-8')).hexdigest()

    stored_token = db.query(RefreshToken).filter(RefreshToken.token_hash == ref_hash).first()
    if not stored_token or stored_token.is_revoked:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token has been revoked or is invalid."
        )

    user_uuid = uuid.UUID(user_id_str)
    user = db.query(User).filter(User.id == user_uuid).first()
    if not user or user.status != "ACTIVE":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User associated with token is inactive."
        )

    stored_token.is_revoked = True
    db.commit()

    role_name = user.role.role_name if user.role else "ADMIN"

    new_access_token = create_access_token(subject=str(user.id), role=role_name)
    new_refresh_token = create_refresh_token(subject=str(user.id))

    new_ref_hash = hashlib.sha256(new_refresh_token.encode('utf-8')).hexdigest()
    new_db_refresh = RefreshToken(
        user_id=user.id,
        token_hash=new_ref_hash,
        expires_at=datetime.now(timezone.utc) + timedelta(days=7)
    )
    db.add(new_db_refresh)
    db.commit()

    user_out = UserOut(
        id=user.id,
        full_name=user.full_name,
        email=user.email,
        role_name=role_name,
        status=user.status,
        created_at=user.created_at
    )

    return Token(
        access_token=new_access_token,
        refresh_token=new_refresh_token,
        token_type="bearer",
        user=user_out
    )


def logout_token_flow(db: Session, refresh_token_str: str) -> dict:
    """Revoke refresh token on logout."""
    ref_hash = hashlib.sha256(refresh_token_str.encode('utf-8')).hexdigest()
    stored_token = db.query(RefreshToken).filter(RefreshToken.token_hash == ref_hash).first()
    if stored_token:
        stored_token.is_revoked = True
        db.commit()
    return {"message": "Successfully logged out."}
