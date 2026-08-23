from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, Role
from app.schemas import UserRegister, UserLogin, UserResponse, TokenResponse
from app.auth import hash_password, verify_password, create_access_token

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(user_data: UserRegister, db: Session = Depends(get_db)):
    # Check if username or email already exists
    existing_user = db.query(User).filter(
        (User.username == user_data.username) | (User.email == user_data.email)
    ).first()
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username or email already registered"
        )
    
    # Fetch role by role_name
    role = db.query(Role).filter(Role.role_name == user_data.role_name).first()
    if not role:
        # If role does not exist yet in DB, check if it's one of allowed default roles and insert
        allowed_roles = ["admin", "quality_engineer", "factory_supervisor"]
        if user_data.role_name in allowed_roles:
            role = Role(role_name=user_data.role_name)
            db.add(role)
            db.commit()
            db.refresh(role)
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid role_name. Must be one of: {allowed_roles}"
            )

    hashed_pw = hash_password(user_data.password)
    new_user = User(
        username=user_data.username,
        email=user_data.email,
        password_hash=hashed_pw,
        role_id=role.id
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return UserResponse(
        id=new_user.id,
        username=new_user.username,
        email=new_user.email,
        role_name=role.role_name
    )

@router.post("/login", response_model=TokenResponse)
def login(login_data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == login_data.username).first()
    if not user or not verify_password(login_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password"
        )
    
    role_name = user.role.role_name if user.role else "quality_engineer"
    
    token_payload = {
        "sub": str(user.id),
        "username": user.username,
        "role_name": role_name
    }
    
    access_token = create_access_token(data=token_payload)
    
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse(
            id=user.id,
            username=user.username,
            email=user.email,
            role_name=role_name
        )
    )
