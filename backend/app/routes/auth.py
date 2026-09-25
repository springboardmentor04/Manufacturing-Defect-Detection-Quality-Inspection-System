from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select

from ..database import get_db
from ..models import User, AuditLog
from ..schemas import RegisterRequest, LoginRequest, TokenOut, UserOut
from ..auth import hash_password, verify_password, create_access_token
from ..dependencies import current_user


router = APIRouter(
    prefix="/api/auth",
    tags=["Authentication"]
)


@router.post("/register", response_model=TokenOut, status_code=201)
def register(
    payload: RegisterRequest,
    db: Session = Depends(get_db)
):
    try:
        email = payload.email.lower()

        existing_user = db.scalar(
            select(User).where(User.email == email)
        )

        if existing_user:
            raise HTTPException(
                status_code=409,
                detail="An account with this email already exists."
            )

        user = User(
            full_name=payload.full_name.strip(),
            email=email,
            password_hash=hash_password(payload.password),
            role=payload.role
        )

        db.add(user)
        db.flush()

        db.add(
            AuditLog(
                user_id=user.id,
                action="REGISTER",
                resource_type="USER",
                resource_id=str(user.id)
            )
        )

        db.commit()
        db.refresh(user)

        return TokenOut(
            access_token=create_access_token(str(user.id)),
            user=user
        )

    except HTTPException:
        raise

    except Exception as e:
        db.rollback()
        print("REGISTER ERROR:", repr(e))

        raise HTTPException(
            status_code=500,
            detail=f"Register failed: {str(e)}"
        )


@router.post("/login", response_model=TokenOut)
def login(
    payload: LoginRequest,
    db: Session = Depends(get_db)
):
    user = db.scalar(
        select(User).where(
            User.email == payload.email.lower()
        )
    )

    if not user or not verify_password(
        payload.password,
        user.password_hash
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password."
        )

    db.add(
        AuditLog(
            user_id=user.id,
            action="LOGIN",
            resource_type="USER",
            resource_id=str(user.id)
        )
    )

    db.commit()

    return TokenOut(
        access_token=create_access_token(str(user.id)),
        user=user
    )


@router.get("/me", response_model=UserOut)
def me(
    user=Depends(current_user)
):
    return user