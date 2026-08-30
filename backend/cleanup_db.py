import asyncio
import certifi
import sys
import os
from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings

async def cleanup():
    client = AsyncIOMotorClient(settings.MONGO_URI, tlsCAFile=certifi.where())
    db = client[settings.DB_NAME]
    
    cursor = db.inspections.find({})
    total = 0
    deleted = 0
    
    async for doc in cursor:
        total += 1
        file_path = os.path.join("uploads", doc["image_filename"])
        if not os.path.exists(file_path):
            await db.inspections.delete_one({"_id": doc["_id"]})
            deleted += 1
            
    print(f"Total records checked: {total}")
    print(f"Successfully deleted {deleted} records with missing local image files.")
    print(f"Active records remaining: {total - deleted}")

if __name__ == '__main__':
    asyncio.run(cleanup())
