from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from typing import Dict, Any
from app.schemas.inspection import InspectionCreate, InspectionResponse, InspectionUpdate, InspectionListResponse, BatchInspectionCreate
from app.database.connection import get_database
from app.api.deps import get_current_active_user
from app.schemas.user import UserResponse
from datetime import datetime
import uuid
from app.services.ai_service import mock_ai_service

router = APIRouter()

async def generate_inspection_id() -> str:
    # Generates a simple ID like INS-1234
    import random
    return f"INS-{random.randint(1000, 9999)}"

@router.post("/create", response_model=InspectionResponse)
async def create_inspection(
    inspection_in: InspectionCreate,
    background_tasks: BackgroundTasks,
    db = Depends(get_database),
    current_user: UserResponse = Depends(get_current_active_user)
):
    """
    Create a new inspection record after an image is uploaded.
    """
    inspection_id = await generate_inspection_id()
    
    # Ensure ID is unique
    while await db.inspections.find_one({"inspection_id": inspection_id}):
        inspection_id = await generate_inspection_id()
        
    inspection_doc = {
        "inspection_id": inspection_id,
        "engineer_id": inspection_in.engineer_id,
        "employee_id": inspection_in.employee_id,
        "engineer_name": inspection_in.engineer_name,
        "dataset_category": inspection_in.dataset_category,
        "image_path": inspection_in.image_path,
        "original_filename": inspection_in.original_filename,
        "source": inspection_in.source,
        "status": "Pending",
        "upload_time": datetime.utcnow()
    }
    
    result = await db.inspections.insert_one(inspection_doc)
    
    created_inspection = await db.inspections.find_one({"_id": result.inserted_id})
    if not created_inspection:
        raise HTTPException(status_code=500, detail="Failed to retrieve created inspection")
        
    created_inspection["_id"] = str(created_inspection["_id"])
    
    # Trigger background AI processing
    background_tasks.add_task(mock_ai_service.process_inspection, inspection_id, db)
    
    return created_inspection

@router.get("", response_model=InspectionListResponse)
async def get_inspections(
    page: int = 1,
    limit: int = 10,
    search: str = None,
    status: str = None,
    category: str = None,
    sort: str = "newest",
    db = Depends(get_database),
    current_user: UserResponse = Depends(get_current_active_user)
):
    query = {}
    
    # Role check: Engineers only see their own
    if current_user.role not in ["ADMIN", "FACTORY_SUPERVISOR"]:
        query["engineer_id"] = current_user.id
        
    if search:
        query["$or"] = [
            {"inspection_id": {"$regex": search, "$options": "i"}},
            {"employee_id": {"$regex": search, "$options": "i"}},
            {"dataset_category": {"$regex": search, "$options": "i"}}
        ]
        
    if status:
        query["status"] = status
        
    if category:
        query["dataset_category"] = category
        
    # Sort
    sort_order = -1 if sort == "newest" else 1
    
    # Pagination
    skip = (page - 1) * limit
    
    cursor = db.inspections.find(query).sort("upload_time", sort_order).skip(skip).limit(limit)
    inspections = await cursor.to_list(length=limit)
    
    total = await db.inspections.count_documents(query)
    
    # Convert _id to string for all items
    for item in inspections:
        item["_id"] = str(item["_id"])
        
    return {
        "total": total,
        "page": page,
        "limit": limit,
        "items": inspections
    }


@router.get("/{inspection_id}", response_model=InspectionResponse)
async def get_inspection(
    inspection_id: str,
    db = Depends(get_database),
    current_user: UserResponse = Depends(get_current_active_user)
):
    """
    Get an inspection record by its string inspection_id (e.g. INS-1234).
    """
    inspection = await db.inspections.find_one({"inspection_id": inspection_id})
    if not inspection:
        raise HTTPException(status_code=404, detail="Inspection not found")
        
    # Role check
    if current_user.role not in ["ADMIN", "FACTORY_SUPERVISOR"] and inspection["engineer_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to access this inspection")
        
    inspection["_id"] = str(inspection["_id"])
    return inspection

@router.patch("/{inspection_id}", response_model=InspectionResponse)
async def update_inspection(
    inspection_id: str,
    update_data: InspectionUpdate,
    db = Depends(get_database),
    current_user: UserResponse = Depends(get_current_active_user)
):
    """
    Update inspection status.
    """
    inspection = await db.inspections.find_one({"inspection_id": inspection_id})
    if not inspection:
        raise HTTPException(status_code=404, detail="Inspection not found")
        
    # Role check
    if current_user.role not in ["ADMIN", "FACTORY_SUPERVISOR"] and inspection["engineer_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to modify this inspection")
        
    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    
    if update_dict:
        await db.inspections.update_one(
            {"inspection_id": inspection_id},
            {"$set": update_dict}
        )
        
    updated = await db.inspections.find_one({"inspection_id": inspection_id})
    updated["_id"] = str(updated["_id"])
    return updated

@router.delete("/{inspection_id}")
async def delete_inspection(
    inspection_id: str,
    db = Depends(get_database),
    current_user: UserResponse = Depends(get_current_active_user)
):
    """
    Delete inspection.
    """
    inspection = await db.inspections.find_one({"inspection_id": inspection_id})
    if not inspection:
        raise HTTPException(status_code=404, detail="Inspection not found")
        
    # Role check
    if current_user.role not in ["ADMIN", "FACTORY_SUPERVISOR"] and inspection["engineer_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this inspection")
        
    await db.inspections.delete_one({"inspection_id": inspection_id})
    
    return {"message": "Inspection deleted successfully"}

async def process_batch_inspections(inspection_ids: list[str], db):
    """
    Sequentially process multiple inspections to avoid GPU OOM.
    """
    for idx, inspection_id in enumerate(inspection_ids):
        try:
            await mock_ai_service.process_inspection(inspection_id, db)
        except Exception as e:
            # Error is handled inside process_inspection, but just in case
            print(f"Batch processing error for {inspection_id}: {e}")

@router.post("/batch-create")
async def create_batch_inspections(
    batch_in: BatchInspectionCreate,
    background_tasks: BackgroundTasks,
    db = Depends(get_database),
    current_user: UserResponse = Depends(get_current_active_user)
):
    """
    Create multiple inspection records and trigger sequential background processing.
    """
    created_inspections = []
    inspection_ids = []
    
    for image in batch_in.images:
        inspection_id = await generate_inspection_id()
        
        # Ensure ID is unique
        while await db.inspections.find_one({"inspection_id": inspection_id}):
            inspection_id = await generate_inspection_id()
            
        inspection_doc = {
            "inspection_id": inspection_id,
            "engineer_id": batch_in.engineer_id,
            "employee_id": batch_in.employee_id,
            "engineer_name": batch_in.engineer_name,
            "dataset_category": image.dataset_category or batch_in.dataset_category,
            "image_path": image.image_path,
            "original_filename": image.original_filename,
            "source": batch_in.source,
            "status": "Pending",
            "upload_time": datetime.utcnow()
        }
        
        result = await db.inspections.insert_one(inspection_doc)
        
        created_inspection = await db.inspections.find_one({"_id": result.inserted_id})
        created_inspection["_id"] = str(created_inspection["_id"])
        
        created_inspections.append(created_inspection)
        inspection_ids.append(inspection_id)
        
    # Trigger single background task for the whole batch
    background_tasks.add_task(process_batch_inspections, inspection_ids, db)
    
    return {
        "message": f"Successfully created {len(created_inspections)} inspections",
        "inspections": created_inspections
    }
