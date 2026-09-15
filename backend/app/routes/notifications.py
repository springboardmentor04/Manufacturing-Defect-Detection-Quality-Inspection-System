from fastapi import APIRouter, Depends
from typing import Dict, Any, List
from app.database.connection import get_database
from app.api.deps import get_current_active_user
from app.schemas.user import UserResponse
import datetime

router = APIRouter()

@router.get("", response_model=List[Dict[str, Any]])
async def get_notifications(
    db = Depends(get_database),
    current_user: UserResponse = Depends(get_current_active_user)
):
    """
    Returns recent system notifications based on database activity.
    """
    notifications = []
    
    # 1. New Inspections (last 24 hours)
    recent_date = datetime.datetime.utcnow() - datetime.timedelta(hours=24)
    query = {"upload_time": {"$gte": recent_date}}
    
    if current_user.role not in ["ADMIN", "FACTORY_SUPERVISOR"]:
        query["engineer_id"] = current_user.id
        
    recent_inspections = await db.inspections.find(query).sort("upload_time", -1).limit(5).to_list(None)
    
    for ins in recent_inspections:
        if ins.get("status") == "Failed":
            notifications.append({
                "id": str(ins["_id"]) + "_fail",
                "type": "Critical Defect",
                "message": f"Critical defect found in {ins.get('dataset_category')} (Batch: {ins.get('employee_id')})",
                "time": ins.get("upload_time"),
                "read": False
            })
        elif ins.get("status") == "Completed":
            notifications.append({
                "id": str(ins["_id"]) + "_comp",
                "type": "Inspection Completed",
                "message": f"Inspection {ins.get('inspection_id')} completed successfully.",
                "time": ins.get("upload_time"),
                "read": True
            })
        else:
            notifications.append({
                "id": str(ins["_id"]) + "_new",
                "type": "New Inspection",
                "message": f"New inspection {ins.get('inspection_id')} started by {ins.get('engineer_name')}.",
                "time": ins.get("upload_time"),
                "read": False
            })
            
    # Sort notifications by time descending
    notifications.sort(key=lambda x: x["time"], reverse=True)
    
    return notifications
