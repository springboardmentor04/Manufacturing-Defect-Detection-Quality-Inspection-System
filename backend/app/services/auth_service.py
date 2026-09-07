from fastapi import HTTPException, status

from app.database.database import database

from app.utils.hash import (
    hash_password,
    verify_password,
)

from app.utils.jwt_handler import (
    create_access_token,
    normalize_role,
)

from app.models.user_model import (
    UserRegister,
    UserLogin,
    ForgotPassword,
    ResetPassword,
)

import hashlib
import os
import secrets

from datetime import datetime, timedelta, timezone


# ============================================================
# ALLOWED ROLES
# ============================================================

ALLOWED_ROLES = {
    "quality_engineer",
    "factory_supervisor",
}


# ============================================================
# PUBLIC REGISTRATION ROLE
# ============================================================

PUBLIC_REGISTRATION_ROLE = "quality_engineer"


# ============================================================
# PASSWORD RESET SETTINGS
# ============================================================

RESET_TOKEN_EXPIRE_MINUTES = int(
    os.getenv(
        "RESET_TOKEN_EXPIRE_MINUTES",
        "15",
    )
)

APP_ENV = os.getenv(
    "APP_ENV",
    "development",
).strip().lower()


# ============================================================
# PASSWORD VALIDATION
# ============================================================

MIN_PASSWORD_LENGTH = 6


def validate_password(
    password: str
):

    if not password:

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password is required",
        )

    if len(password) < MIN_PASSWORD_LENGTH:

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Password must contain at least "
                f"{MIN_PASSWORD_LENGTH} characters"
            ),
        )


# ============================================================
# RESET TOKEN HELPERS
# ============================================================

def generate_reset_token():

    return secrets.token_urlsafe(32)


def hash_reset_token(
    token: str
):

    return hashlib.sha256(
        token.encode("utf-8")
    ).hexdigest()


# ============================================================
# LOGIN
# ============================================================

async def login_user(
    user: UserLogin
):

    requested_role = normalize_role(
        user.role
    )

    if requested_role not in ALLOWED_ROLES:

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid user role",
        )

    email = (
        user.email
        .strip()
        .lower()
    )

    existing_user = (
        await database.users.find_one(
            {
                "email": email
            }
        )
    )

    if not existing_user:

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    stored_password = existing_user.get(
        "password"
    )

    if not stored_password:

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    try:

        password_valid = verify_password(
            user.password,
            stored_password,
        )

    except Exception:

        password_valid = False

    if not password_valid:

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    stored_role = normalize_role(
        existing_user.get(
            "role",
            ""
        )
    )

    if stored_role not in ALLOWED_ROLES:

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account has an invalid role",
        )

    if stored_role != requested_role:

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Incorrect role for this account",
        )

    user_id = str(
        existing_user["_id"]
    )

    # ========================================================
    # JWT PAYLOAD
    # ========================================================

    access_token = create_access_token(
        {
            "sub": user_id,
            "email": email,
            "role": stored_role,
        }
    )

    return {

        "success": True,

        "message":
            "Login successful",

        "access_token":
            access_token,

        "token_type":
            "bearer",

        "user": {

            "id":
                user_id,

            "name":
                existing_user.get(
                    "name",
                    ""
                ),

            "email":
                email,

            "role":
                stored_role,
        },
    }


# ============================================================
# REGISTER
# ============================================================

async def register_user(
    user: UserRegister
):

    # --------------------------------------------------------
    # PUBLIC REGISTRATION
    # --------------------------------------------------------
    #
    # Public registration creates only Quality Engineer
    # accounts.
    #
    # Factory Supervisor accounts must be created through
    # the protected /users endpoint by an authorized
    # Factory Supervisor.
    # --------------------------------------------------------

    requested_role = normalize_role(
        user.role
    )

    if requested_role != PUBLIC_REGISTRATION_ROLE:

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Public registration is available only "
                "for Quality Engineer accounts. "
                "Factory Supervisor accounts must be "
                "created by an authorized Factory Supervisor."
            ),
        )

    role = PUBLIC_REGISTRATION_ROLE

    # --------------------------------------------------------
    # NORMALIZE NAME
    # --------------------------------------------------------

    name = (
        user.name
        .strip()
    )

    if not name:

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Name is required",
        )

    # --------------------------------------------------------
    # NORMALIZE EMAIL
    # --------------------------------------------------------

    email = (
        user.email
        .strip()
        .lower()
    )

    # --------------------------------------------------------
    # VALIDATE PASSWORD
    # --------------------------------------------------------

    validate_password(
        user.password
    )

    # --------------------------------------------------------
    # CHECK EXISTING USER
    # --------------------------------------------------------

    existing_user = (
        await database.users.find_one(
            {
                "email": email
            }
        )
    )

    if existing_user:

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )

    # --------------------------------------------------------
    # CREATE USER DOCUMENT
    # --------------------------------------------------------

    new_user = {

        "name":
            name,

        "email":
            email,

        "password":
            hash_password(
                user.password
            ),

        "role":
            role,
    }

    # --------------------------------------------------------
    # INSERT USER
    # --------------------------------------------------------

    result = await database.users.insert_one(
        new_user
    )

    # --------------------------------------------------------
    # RESPONSE
    # --------------------------------------------------------

    return {

        "success":
            True,

        "message":
            "Registration successful",

        "user": {

            "id":
                str(
                    result.inserted_id
                ),

            "name":
                new_user["name"],

            "email":
                new_user["email"],

            "role":
                new_user["role"],
        },
    }


# ============================================================
# FORGOT PASSWORD
# ============================================================

async def forgot_password(
    data: ForgotPassword
):

    email = (
        data.email
        .strip()
        .lower()
    )

    user = await database.users.find_one(
        {
            "email": email
        }
    )

    # --------------------------------------------------------
    # GENERIC RESPONSE
    # --------------------------------------------------------
    #
    # We do not reveal whether the email exists.
    # This prevents account enumeration.
    # --------------------------------------------------------

    generic_response = {

        "success": True,

        "message": (
            "If an account exists with this email, "
            "a password reset token has been generated."
        ),
    }


    if not user:

        return generic_response


    # --------------------------------------------------------
    # GENERATE SECURE TOKEN
    # --------------------------------------------------------

    reset_token = generate_reset_token()

    reset_token_hash = hash_reset_token(
        reset_token
    )


    # --------------------------------------------------------
    # TOKEN EXPIRATION
    # --------------------------------------------------------

    expires_at = (
        datetime.now(
            timezone.utc
        )
        +
        timedelta(
            minutes=RESET_TOKEN_EXPIRE_MINUTES
        )
    )


    # --------------------------------------------------------
    # STORE HASHED TOKEN
    # --------------------------------------------------------
    #
    # We never store the raw reset token in MongoDB.
    # Only its SHA-256 hash is stored.
    # --------------------------------------------------------

    await database.users.update_one(

        {
            "_id":
                user["_id"]
        },

        {
            "$set": {

                "password_reset_token":
                    reset_token_hash,

                "password_reset_token_expires_at":
                    expires_at,
            }
        }
    )


    # --------------------------------------------------------
    # DEVELOPMENT RESPONSE
    # --------------------------------------------------------
    #
    # During development/Postman testing, return the raw token
    # so the complete flow can be tested without an email
    # service.
    #
    # In production, the token must be delivered through a
    # proper email/SMS/reset-link service instead.
    # --------------------------------------------------------

    if APP_ENV != "production":

        generic_response[
            "reset_token"
        ] = reset_token

        generic_response[
            "expires_in_minutes"
        ] = RESET_TOKEN_EXPIRE_MINUTES


    return generic_response


# ============================================================
# RESET PASSWORD
# ============================================================

async def reset_password(
    data: ResetPassword
):

    # --------------------------------------------------------
    # VALIDATE TOKEN
    # --------------------------------------------------------

    token = (
        data.token
        .strip()
    )

    if not token:

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reset token is required",
        )


    # --------------------------------------------------------
    # VALIDATE NEW PASSWORD
    # --------------------------------------------------------

    validate_password(
        data.new_password
    )


    # --------------------------------------------------------
    # HASH SUPPLIED TOKEN
    # --------------------------------------------------------

    token_hash = hash_reset_token(
        token
    )


    # --------------------------------------------------------
    # FIND USER BY TOKEN
    # --------------------------------------------------------

    user = await database.users.find_one(

        {
            "password_reset_token":
                token_hash
        }
    )


    if not user:

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token",
        )


    # --------------------------------------------------------
    # CHECK TOKEN EXPIRATION
    # --------------------------------------------------------

    expires_at = user.get(
        "password_reset_token_expires_at"
    )


    if not expires_at:

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token",
        )


    # --------------------------------------------------------
    # NORMALIZE EXPIRATION DATETIME
    # --------------------------------------------------------

    if (
        isinstance(
            expires_at,
            datetime
        )
        and
        expires_at.tzinfo is None
    ):

        expires_at = expires_at.replace(
            tzinfo=timezone.utc
        )


    # --------------------------------------------------------
    # EXPIRED TOKEN
    # --------------------------------------------------------

    if (
        not isinstance(
            expires_at,
            datetime
        )
        or
        expires_at <= datetime.now(
            timezone.utc
        )
    ):

        # Remove expired token.

        await database.users.update_one(

            {
                "_id":
                    user["_id"]
            },

            {
                "$unset": {

                    "password_reset_token":
                        "",

                    "password_reset_token_expires_at":
                        "",
                }
            }
        )


        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token",
        )


    # --------------------------------------------------------
    # HASH NEW PASSWORD
    # --------------------------------------------------------

    new_hashed_password = hash_password(
        data.new_password
    )


    # --------------------------------------------------------
    # UPDATE PASSWORD
    # --------------------------------------------------------
    #
    # IMPORTANT:
    # The reset token is deleted immediately after successful
    # use, making the token single-use.
    # --------------------------------------------------------

    await database.users.update_one(

        {
            "_id":
                user["_id"]
        },

        {
            "$set": {

                "password":
                    new_hashed_password,
            },

            "$unset": {

                "password_reset_token":
                    "",

                "password_reset_token_expires_at":
                    "",
            }
        }
    )


    # --------------------------------------------------------
    # RESPONSE
    # --------------------------------------------------------

    return {

        "success":
            True,

        "message":
            "Password reset successfully",
    }