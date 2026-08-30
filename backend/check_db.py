import asyncio
import certifi
import sys
import os
from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings

async def check():
    client = AsyncIOMotorClient(settings.MONGO_URI, tlsCAFile=certifi.where())
    db = client[settings.DB_NAME]
    
    # Get status counts
    pipeline = [
        {"$group": {"_id": "$status", "count": {"$sum": 1}}}
    ]
    results = await db.inspections.aggregate(pipeline).to_list(length=100)
    print("--- Status Breakdown ---")
    for r in results:
        print(f"Status: {r['_id']}, Count: {r['count']}")

    # Get sample details
    sample = await db.inspections.find_one({"status": {"$in": ["pass", "fail"]}})
    if sample:
        print("\n--- Sample Completed Inspection ---")
        print(f"ID: {sample['_id']}")
        print(f"Product: {sample['product_name']}")
        print(f"Status: {sample['status']}")
        print(f"Defect Type: {sample.get('defect_type')}")
        print(f"Confidence: {sample.get('confidence_score')}")
        print(f"Quality Score: {sample.get('quality_report', {}).get('quality_score') if sample.get('quality_report') else None}")
        print(f"Heatmap: {sample.get('heatmap_filename')}")
    else:
        print("\nNo pass/fail inspections found yet.")

if __name__ == '__main__':
    asyncio.run(check())
