import asyncio
import certifi
import sys
import os
from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings

async def check():
    client = AsyncIOMotorClient(settings.MONGO_URI, tlsCAFile=certifi.where())
    db = client[settings.DB_NAME]
    pipeline = [
        {"$group": {"_id": {"product": "$product_name", "batch": "$batch_number"}}},
        {"$sort": {"_id.product": 1, "_id.batch": 1}}
    ]
    cursor = db.inspections.aggregate(pipeline)
    async for doc in cursor:
        print(f"Product: {doc['_id']['product']}, Batch/Folder: {doc['_id']['batch']}")

if __name__ == '__main__':
    asyncio.run(check())
