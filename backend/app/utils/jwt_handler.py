from jose import jwt, JWTError
from datetime import datetime, timedelta, timezone
from typing import Optional
import os

from dotenv import load_dotenv

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.database.database import database


# ============================================================
# ENVIRONMENT
# ============================================================

load_dotenv()


SECRET_KEY = os.getenv("SECRET_KEY")

ALGORITHM = os.getenv(
    "ALGORITHM",
    "HS256"
)

ACCESS_TOKEN_EXPIRE_MINUTES = int(
    os.getenv(
        "ACCESS_TOKEN_EXPIRE_MINUTES",
        "480"
    )
)


if not SECRET_KEY:
    raise RuntimeError(
        "SECRET_KEY is not configured in .env"
    )


# ============================================================
# SECURITY
# ============================================================

security = HTTPBearer()


# ============================================================
# CREATE ACCESS TOKEN
# ============================================================

def create_access_token(
    data: dict,
    expires_delta: Optional[
        timedelta
    ] = None
):

    to_encode = data.copy()

    if expires_delta:

        expire = (
            datetime.now(timezone.utc)
            + expires_delta
        )

    else:

        expire = (
            datetime.now(timezone.utc)
            + timedelta(
                minutes=
                ACCESS_TOKEN_EXPIRE_MINUTES
            )
        )

    to_encode.update({
        "exp": expire
    })

    return jwt.encode(
        to_encode,
        SECRET_KEY,
        algorithm=ALGORITHM
    )


# ============================================================
# DECODE TOKEN
# ============================================================

def decode_access_token(
    token: str
):

    try:

        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[
                ALGORITHM
            ]
        )

        return payload

    except JWTError:

        return None


# ============================================================
# CURRENT AUTHENTICATED USER
# ============================================================

async def get_current_user(
    credentials:
        HTTPAuthorizationCredentials =
        Depends(security)
):

    token = credentials.credentials

    payload = decode_access_token(
        token
    )

    if not payload:

        raise HTTPException(
            status_code=
                status.HTTP_401_UNAUTHORIZED,
            detail=
                "Invalid or expired authentication token",
            headers={
                "WWW-Authenticate":
                    "Bearer"
            }
        )

    user_id = payload.get(
        "sub"
    )

    email = payload.get(
        "email"
    )

    role = payload.get(
        "role"
    )

    if not user_id or not email or not role:

        raise HTTPException(
            status_code=
                status.HTTP_401_UNAUTHORIZED,
            detail=
                "Invalid authentication token",
            headers={
                "WWW-Authenticate":
                    "Bearer"
            }
        )

    user = await database.users.find_one(
        {
            "email": email
        }
    )

    if not user:

        raise HTTPException(
            status_code=
                status.HTTP_401_UNAUTHORIZED,
            detail=
                "User account not found",
            headers={
                "WWW-Authenticate":
                    "Bearer"
            }
        )

    if str(user["_id"]) != str(user_id):

        raise HTTPException(
            status_code=
                status.HTTP_401_UNAUTHORIZED,
            detail=
                "Invalid authentication token",
            headers={
                "WWW-Authenticate":
                    "Bearer"
            }
        )

    return {
        "id":
            str(user["_id"]),

        "name":
            user.get(
                "name",
                ""
            ),

        "email":
            user.get(
                "email",
                ""
            ),

        "role":
            user.get(
                "role",
                ""
            )
    }


# ============================================================
# ROLE NORMALIZATION
# ============================================================

def normalize_role(
    role: str
):

    role_map = {

        "quality engineer":
            "quality_engineer",

        "quality_engineer":
            "quality_engineer",

        "factory supervisor":
            "factory_supervisor",

        "factory_supervisor":
            "factory_supervisor",

    }

    return role_map.get(
        str(role)
        .strip()
        .lower()
    )


# ============================================================
# ROLE CHECK
# ============================================================

def require_roles(
    *allowed_roles
):

    async def role_checker(
        current_user=Depends(
            get_current_user
        )
    ):

        user_role = normalize_role(
            current_user.get(
                "role",
                ""
            )
        )

        normalized_roles = {
            normalize_role(role)
            for role in allowed_roles
        }

        if user_role not in normalized_roles:

            raise HTTPException(
                status_code=
                    status.HTTP_403_FORBIDDEN,
                detail=
                    "Insufficient permissions"
            )

        return current_user

    return role_checker


# ============================================================
# ROLE DEPENDENCIES
# ============================================================

require_quality_engineer = require_roles(
    "quality_engineer"
)

require_factory_supervisor = require_roles(
    "factory_supervisor"
)