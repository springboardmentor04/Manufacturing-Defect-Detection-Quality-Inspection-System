from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database.database import get_db
from app.models.user import User
from app.schemas.user import UserResponse


router = APIRouter(
    prefix="/supervisor/users",
    tags=["Supervisor Users"],
)


@router.get(
    "/",
    response_model=list[UserResponse],
)
def get_supervisor_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Return Quality Engineers managed by the Supervisor.
    """

    # Check Supervisor access
    if current_user.role != "supervisor":
        raise HTTPException(
            status_code=403,
            detail="Supervisor access required",
        )

    # Get Quality Engineers
    users = (
        db.query(User)
        .filter(User.role == "quality_engineer")
        .order_by(User.id.asc())
        .all()
    )

    return users