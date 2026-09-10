import uuid
from datetime import datetime, timezone, timedelta
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from app.db import get_db

router = APIRouter(prefix="/api/announcements", tags=["announcements"])

# 2 days (48 hours) lifetime in milliseconds / timedelta
ANNOUNCEMENT_TTL = timedelta(hours=48)

class AnnouncementCreate(BaseModel):
    message: str = Field(..., min_length=1, max_length=500)
    category: Optional[str] = "General Notice"
    targetLine: Optional[str] = "All lines"
    author: Optional[str] = "Factory Supervisor"
    authorId: Optional[str] = None
    authorEmail: Optional[str] = None

class AnnouncementRead(BaseModel):
    engineerId: Optional[str] = None
    engineerName: Optional[str] = None

class AnnouncementReadAll(BaseModel):
    engineerId: Optional[str] = None
    engineerName: Optional[str] = None
    announcementIds: Optional[List[str]] = None

def get_announcements_collection():
    db = get_db()
    if db is None:
        raise HTTPException(status_code=503, detail="Database not connected")
    return db["announcements"]

def format_author_email(author_name: str, given_email: Optional[str] = None) -> str:
    if given_email and given_email.strip():
        return given_email.strip().lower()
    cleaned = author_name.strip().lower().replace(" ", ".") if author_name else "supervisor"
    return f"{cleaned}@visioninspect.ai"

@router.get("")
async def list_announcements(
    supervisorId: Optional[str] = Query(None, description="Filter by supervisor ID/Name"),
    forSupervisorOnly: Optional[bool] = Query(False, description="If true, filter strictly to supervisor's own broadcasts")
):
    """
    Returns active announcements from the last 48 hours (2 days).
    Includes authorEmail and integer readCount.
    """
    try:
        col = get_announcements_collection()
        now_utc = datetime.now(timezone.utc)
        cutoff = now_utc - ANNOUNCEMENT_TTL

        query = {"createdAt": {"$gte": cutoff}}

        if forSupervisorOnly and supervisorId:
            clean_id = supervisorId.strip()
            query["$or"] = [
                {"authorId": clean_id},
                {"authorEmail": clean_id},
                {"author": clean_id},
                {"author": {"$regex": f"^{clean_id}$", "$options": "i"}}
            ]

        cursor = col.find(query).sort("createdAt", -1)
        items = await cursor.to_list(length=100)

        # Format datetime objects and ensure read count
        for item in items:
            if isinstance(item.get("createdAt"), datetime):
                item["createdAt"] = item["createdAt"].strftime("%Y-%m-%dT%H:%M:%SZ")
            if isinstance(item.get("expiresAt"), datetime):
                item["expiresAt"] = item["expiresAt"].strftime("%Y-%m-%dT%H:%M:%SZ")
            
            # Ensure valid email and readCount
            if not item.get("authorEmail"):
                item["authorEmail"] = format_author_email(item.get("author", "Factory Supervisor"))
            item["readCount"] = item.get("readCount", 0)
            
            # Remove legacy readBy if present in memory
            item.pop("readBy", None)

        return {
            "success": True,
            "announcements": items,
            "count": len(items)
        }
    except Exception as e:
        return {"success": False, "announcements": [], "error": str(e)}

@router.post("")
async def create_announcement(payload: AnnouncementCreate):
    """
    Publishes a new announcement with author email and initialized readCount = 0.
    """
    try:
        col = get_announcements_collection()
        now_utc = datetime.now(timezone.utc)
        expires_utc = now_utc + ANNOUNCEMENT_TTL

        author_name = payload.author or "Factory Supervisor"
        author_email = format_author_email(author_name, payload.authorEmail)

        announcement_id = f"ANN-{uuid.uuid4().hex[:8].upper()}"
        doc = {
            "_id": announcement_id,
            "id": announcement_id,
            "message": payload.message.strip(),
            "category": payload.category or "General Notice",
            "targetLine": payload.targetLine or "All lines",
            "author": author_name,
            "authorId": payload.authorId or author_name,
            "authorEmail": author_email,
            "readCount": 0,
            "createdAt": now_utc,
            "expiresAt": expires_utc,
        }

        await col.insert_one(doc)

        doc["createdAt"] = now_utc.strftime("%Y-%m-%dT%H:%M:%SZ")
        doc["expiresAt"] = expires_utc.strftime("%Y-%m-%dT%H:%M:%SZ")

        return {
            "success": True,
            "message": "Announcement broadcast successfully.",
            "announcement": doc
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{announcement_id}/read")
async def mark_announcement_read(announcement_id: str, payload: AnnouncementRead = None):
    """
    Increments readCount in MongoDB when a Quality Engineer reads a notice.
    """
    try:
        col = get_announcements_collection()

        res = await col.update_one(
            {"$or": [{"_id": announcement_id}, {"id": announcement_id}]},
            {"$inc": {"readCount": 1}}
        )

        if res.matched_count == 0:
            raise HTTPException(status_code=404, detail="Announcement not found")

        updated = await col.find_one({"$or": [{"_id": announcement_id}, {"id": announcement_id}]})
        return {
            "success": True,
            "announcementId": announcement_id,
            "readCount": updated.get("readCount", 1) if updated else 1
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/read-all")
async def mark_all_announcements_read(payload: AnnouncementReadAll = None):
    """
    Bulk increments readCount for specified active announcements.
    """
    try:
        col = get_announcements_collection()

        query = {}
        if payload and payload.announcementIds and len(payload.announcementIds) > 0:
            query = {"$or": [{"_id": {"$in": payload.announcementIds}}, {"id": {"$in": payload.announcementIds}}]}

        res = await col.update_many(query, {"$inc": {"readCount": 1}})

        return {"success": True, "markedCount": res.modified_count}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{announcement_id}")
async def delete_announcement(announcement_id: str):
    """
    Deletes an announcement by ID.
    """
    try:
        col = get_announcements_collection()
        res = await col.delete_one({"_id": announcement_id})
        if res.deleted_count == 0:
            await col.delete_one({"id": announcement_id})
        return {"success": True, "message": f"Announcement {announcement_id} deleted."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
