# ============================================================
# VISIONINSPECT AI
# USER SERVICE
# JWT + RBAC + CLEAN API RESPONSES
# ============================================================

from bson import ObjectId
from fastapi import HTTPException, status

from app.database.database import database

from app.models.user_model import (
    UserRegister,
    UserUpdate,
)

from app.utils.hash import hash_password


# ============================================================
# ALLOWED ROLES
# ============================================================

ALLOWED_ROLES = {
    "quality_engineer",
    "factory_supervisor",
}


# ============================================================
# SENSITIVE USER FIELDS
# ============================================================
#
# These fields must NEVER be exposed through API responses.
#
# password:
#     bcrypt password hash
#
# password_reset_token:
#     hashed password reset token
#
# password_reset_token_expires_at:
#     reset-token expiration information
#
# ============================================================

SENSITIVE_USER_FIELDS = {
    "password",
    "password_reset_token",
    "password_reset_token_expires_at",
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


    normalized = str(
        role or ""
    ).strip().lower()


    return role_map.get(
        normalized
    )


# ============================================================
# VALIDATE ROLE
# ============================================================

def validate_role(
    role: str
):

    normalized_role = normalize_role(
        role
    )


    if normalized_role not in ALLOWED_ROLES:

        raise HTTPException(
            status_code=
                status.HTTP_400_BAD_REQUEST,

            detail=
                "Invalid role. "
                "Allowed roles are "
                "quality_engineer and "
                "factory_supervisor."
        )


    return normalized_role


# ============================================================
# CLEAN USER RESPONSE
# ============================================================

def clean_user_response(
    user: dict
):
    """
    Convert a MongoDB user document into a safe API response.

    Internal MongoDB/security fields are removed before the
    object reaches the API response.
    """

    if not user:

        return None


    # --------------------------------------------------------
    # COPY DOCUMENT
    # --------------------------------------------------------

    safe_user = dict(
        user
    )


    # --------------------------------------------------------
    # CONVERT MONGODB OBJECT ID
    # --------------------------------------------------------

    if "_id" in safe_user:

        safe_user["_id"] = str(
            safe_user["_id"]
        )


    # --------------------------------------------------------
    # REMOVE SENSITIVE FIELDS
    # --------------------------------------------------------

    for field in SENSITIVE_USER_FIELDS:

        safe_user.pop(
            field,
            None
        )


    return safe_user


# ============================================================
# GET ALL USERS
# ============================================================

async def get_users():

    users = []


    cursor = (
        database.users.find({})
    )


    async for user in cursor:

        # ----------------------------------------------------
        # CLEAN USER
        # ----------------------------------------------------

        safe_user = (
            clean_user_response(
                user
            )
        )


        if safe_user:

            users.append(
                safe_user
            )


    return users


# ============================================================
# GET USER BY ID
# ============================================================

async def get_user_by_id(
    user_id: str
):

    # --------------------------------------------------------
    # VALIDATE ID
    # --------------------------------------------------------

    try:

        object_id = ObjectId(
            user_id
        )

    except Exception:

        raise HTTPException(
            status_code=
                status.HTTP_400_BAD_REQUEST,

            detail=
                "Invalid user ID"
        )


    # --------------------------------------------------------
    # FIND USER
    # --------------------------------------------------------

    user = await database.users.find_one(
        {
            "_id":
                object_id
        }
    )


    if not user:

        raise HTTPException(
            status_code=
                status.HTTP_404_NOT_FOUND,

            detail=
                "User not found"
        )


    # --------------------------------------------------------
    # CLEAN RESPONSE
    # --------------------------------------------------------

    return clean_user_response(
        user
    )


# ============================================================
# CREATE USER
# ============================================================

async def create_user(
    user: UserRegister
):

    # --------------------------------------------------------
    # NORMALIZE + VALIDATE ROLE
    # --------------------------------------------------------

    role = validate_role(
        user.role
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
    # NORMALIZE NAME
    # --------------------------------------------------------

    name = (
        user.name
        .strip()
    )


    if not name:

        raise HTTPException(
            status_code=
                status.HTTP_400_BAD_REQUEST,

            detail=
                "Name is required"
        )


    # --------------------------------------------------------
    # CHECK EXISTING USER
    # --------------------------------------------------------

    existing_user = (
        await database.users.find_one(
            {
                "email":
                    email
            }
        )
    )


    if existing_user:

        raise HTTPException(
            status_code=
                status.HTTP_409_CONFLICT,

            detail=
                "Email already registered"
        )


    # --------------------------------------------------------
    # VALIDATE PASSWORD
    # --------------------------------------------------------

    if not user.password:

        raise HTTPException(
            status_code=
                status.HTTP_400_BAD_REQUEST,

            detail=
                "Password is required"
        )


    if len(
        user.password
    ) < 6:

        raise HTTPException(
            status_code=
                status.HTTP_400_BAD_REQUEST,

            detail=
                "Password must contain at least 6 characters"
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
    # INSERT
    # --------------------------------------------------------

    result = (
        await database.users.insert_one(
            new_user
        )
    )


    # --------------------------------------------------------
    # SAFE RESPONSE
    # --------------------------------------------------------

    return {

        "success":
            True,

        "message":
            "User created successfully",

        "user": {

            "id":
                str(
                    result.inserted_id
                ),

            "name":
                new_user[
                    "name"
                ],

            "email":
                new_user[
                    "email"
                ],

            "role":
                new_user[
                    "role"
                ],
        }
    }


# ============================================================
# UPDATE USER
# ============================================================

async def update_user(
    user_id: str,
    user: UserUpdate
):

    # --------------------------------------------------------
    # VALIDATE ID
    # --------------------------------------------------------

    try:

        object_id = ObjectId(
            user_id
        )

    except Exception:

        raise HTTPException(
            status_code=
                status.HTTP_400_BAD_REQUEST,

            detail=
                "Invalid user ID"
        )


    # --------------------------------------------------------
    # CHECK USER
    # --------------------------------------------------------

    existing_user = (
        await database.users.find_one(
            {
                "_id":
                    object_id
            }
        )
    )


    if not existing_user:

        raise HTTPException(
            status_code=
                status.HTTP_404_NOT_FOUND,

            detail=
                "User not found"
        )


    # --------------------------------------------------------
    # BUILD UPDATE
    # --------------------------------------------------------

    update_data = {}


    # ========================================================
    # NAME
    # ========================================================

    if user.name is not None:

        name = (
            user.name
            .strip()
        )


        if name:

            update_data[
                "name"
            ] = name


    # ========================================================
    # EMAIL
    # ========================================================

    if user.email is not None:

        email = (
            user.email
            .strip()
            .lower()
        )


        duplicate = (
            await database.users.find_one(
                {
                    "email":
                        email,

                    "_id":
                        {
                            "$ne":
                                object_id
                        }
                }
            )
        )


        if duplicate:

            raise HTTPException(
                status_code=
                    status.HTTP_409_CONFLICT,

                detail=
                    "Email already registered"
            )


        update_data[
            "email"
        ] = email


    # ========================================================
    # ROLE
    # ========================================================

    if user.role is not None:

        update_data[
            "role"
        ] = validate_role(
            user.role
        )


    # ========================================================
    # PASSWORD
    # ========================================================

    if user.password is not None:

        if len(
            user.password
        ) < 6:

            raise HTTPException(
                status_code=
                    status.HTTP_400_BAD_REQUEST,

                detail=
                    "Password must contain at least 6 characters"
            )


        update_data[
            "password"
        ] = hash_password(
            user.password
        )


        # ----------------------------------------------------
        # INVALIDATE EXISTING PASSWORD RESET TOKENS
        # ----------------------------------------------------
        #
        # If an administrator changes the password, any
        # previously issued password-reset token should no
        # longer remain usable.
        # ----------------------------------------------------

        await database.users.update_one(

            {
                "_id":
                    object_id
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


    # ========================================================
    # NOTHING TO UPDATE
    # ========================================================

    if not update_data:

        raise HTTPException(
            status_code=
                status.HTTP_400_BAD_REQUEST,

            detail=
                "No valid fields provided for update"
        )


    # ========================================================
    # UPDATE
    # ========================================================

    await database.users.update_one(

        {
            "_id":
                object_id
        },

        {
            "$set":
                update_data
        }
    )


    # ========================================================
    # RETURN UPDATED USER
    # ========================================================

    updated_user = (
        await database.users.find_one(
            {
                "_id":
                    object_id
            }
        )
    )


    # --------------------------------------------------------
    # CLEAN RESPONSE
    # --------------------------------------------------------

    safe_user = (
        clean_user_response(
            updated_user
        )
    )


    # --------------------------------------------------------
    # RESPONSE
    # --------------------------------------------------------

    return {

        "success":
            True,

        "message":
            "User updated successfully",

        "user":
            safe_user
    }


# ============================================================
# DELETE USER
# ============================================================

async def delete_user(
    user_id: str
):

    # --------------------------------------------------------
    # VALIDATE ID
    # --------------------------------------------------------

    try:

        object_id = ObjectId(
            user_id
        )

    except Exception:

        raise HTTPException(
            status_code=
                status.HTTP_400_BAD_REQUEST,

            detail=
                "Invalid user ID"
        )


    # --------------------------------------------------------
    # CHECK USER
    # --------------------------------------------------------

    existing_user = (
        await database.users.find_one(
            {
                "_id":
                    object_id
            }
        )
    )


    if not existing_user:

        raise HTTPException(
            status_code=
                status.HTTP_404_NOT_FOUND,

            detail=
                "User not found"
        )


    # --------------------------------------------------------
    # DELETE
    # --------------------------------------------------------

    await database.users.delete_one(
        {
            "_id":
                object_id
        }
    )


    # --------------------------------------------------------
    # RESPONSE
    # --------------------------------------------------------

    return {

        "success":
            True,

        "message":
            "User deleted successfully",

        "user_id":
            user_id
    }