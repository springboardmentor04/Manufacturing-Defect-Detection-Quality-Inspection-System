import asyncio
import certifi
import sys
import os
from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings

async def check():
    client = AsyncIOMotorClient(settings.MONGO_URI, tlsCAFile=certifi.where())
    db = client[settings.DB_NAME]
    
    cursor = db.inspections.find({"product_name": "MVTec - screw", "batch_number": "good"})
    ratios = []
    async for doc in cursor:
        ratios.append(doc.get("anomaly_ratio"))
        
    print(f"--- Screw Anomaly Ratios ({len(ratios)} items) ---")
    if ratios:
        ratios = [r for r in ratios if r is not None]
        print(f"Min Anomaly Ratio: {min(ratios):.5f}")
        print(f"Max Anomaly Ratio: {max(ratios):.5f}")
        print(f"Mean Anomaly Ratio: {sum(ratios)/len(ratios):.5f}")
        print(f"Sorted ratios: {[round(r, 4) for r in sorted(ratios)]}")
    else:
        print("No processed screw images found.")

if __name__ == '__main__':
    asyncio.run(check())
