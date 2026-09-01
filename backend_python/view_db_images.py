import asyncio
import json
from motor.motor_asyncio import AsyncIOMotorClient
from app.config import MONGODB_URI

async def view_images():
    client = AsyncIOMotorClient(MONGODB_URI)
    db = client["visioninspect"]
    
    images = await db["inspectionImages"].find().to_list(length=50)
    print(f"\n--- TOTAL IMAGES IN MONGO (inspectionImages): {len(images)} ---")
    
    for idx, img in enumerate(images, 1):
        print(f"\nImage #{idx}:")
        print(f"  _id (Primary Key) : {img.get('_id')}")
        print(f"  Batch ID          : {img.get('batchId')}")
        print(f"  Product ID        : {img.get('productId')}")
        print(f"  Kind              : {img.get('kind')}")
        print(f"  Original Name     : {img.get('originalName')}")
        print(f"  Access URL        : http://localhost:8000{img.get('url')}")
        print(f"  Disk File Path    : {img.get('storageKey')}")
        print(f"  File Size         : {img.get('sizeBytes')} bytes")

    client.close()

if __name__ == "__main__":
    asyncio.run(view_images())
