"""
User management routes - accessible only to Factory Supervisors,
matching the "User Management" item in their sidebar.
"""
from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId
from bson.errors import InvalidId
from typing import List

from app.database import users_collection
from app.models.user import UserRole
from app.schemas.user import UserOut, UserRoleUpdate, UserStatusUpdate
from app.utils.dependencies import require_roles, get_current_user

router = APIRouter(prefix="/api/users", tags=["User Management"])


def _user_to_out(user: dict) -> UserOut:
    return UserOut(
        id=str(user["_id"]),
        full_name=user["full_name"],
        email=user["email"],
        role=user["role"],
        department=user.get("department"),
        is_active=user.get("is_active", True),
        created_at=user.get("created_at"),
    )


@router.get("", response_model=List[UserOut])
async def list_users(current_user: dict = Depends(require_roles(UserRole.FACTORY_SUPERVISOR))):
    users = await users_collection.find().sort("created_at", -1).to_list(length=500)
    return [_user_to_out(u) for u in users]


@router.patch("/{user_id}/role", response_model=UserOut)
async def update_user_role(
    user_id: str,
    payload: UserRoleUpdate,
    current_user: dict = Depends(require_roles(UserRole.FACTORY_SUPERVISOR)),
):
    try:
        oid = ObjectId(user_id)
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid user id")

    result = await users_collection.find_one_and_update(
        {"_id": oid}, {"$set": {"role": payload.role.value}}, return_document=True
    )
    if not result:
        raise HTTPException(status_code=404, detail="User not found")
    return _user_to_out(result)


@router.patch("/{user_id}/status", response_model=UserOut)
async def update_user_status(
    user_id: str,
    payload: UserStatusUpdate,
    current_user: dict = Depends(require_roles(UserRole.FACTORY_SUPERVISOR)),
):
    try:
        oid = ObjectId(user_id)
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid user id")

    result = await users_collection.find_one_and_update(
        {"_id": oid}, {"$set": {"is_active": payload.is_active}}, return_document=True
    )
    if not result:
        raise HTTPException(status_code=404, detail="User not found")
    return _user_to_out(result)


@router.delete("/{user_id}")
async def delete_user(
    user_id: str,
    current_user: dict = Depends(require_roles(UserRole.FACTORY_SUPERVISOR)),
):
    try:
        oid = ObjectId(user_id)
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid user id")

    if str(current_user["_id"]) == user_id:
        raise HTTPException(status_code=400, detail="You cannot delete your own account")

    result = await users_collection.delete_one({"_id": oid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User deleted successfully"}
