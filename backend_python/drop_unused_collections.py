import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from app.config import MONGODB_URI

async def drop_duplicates():
    client = AsyncIOMotorClient(MONGODB_URI)
    db = client["visioninspect"]
    
    # Collections to drop if they are empty duplicates
    to_drop = ["modelruns", "inspectionimages", "inspectionbatches", "qualityreports", "manualreviews", "counters"]
    
    for col_name in to_drop:
        count = await db[col_name].count_documents({})
        if count == 0:
            await db[col_name].drop()
            print(f"[Drop Collections] Dropped empty duplicate collection: '{col_name}'")
        else:
            print(f"[Drop Collections] Collection '{col_name}' has {count} docs. Skipping drop.")

    remaining = await db.list_collection_names()
    print("[Drop Collections] Remaining active collections:", remaining)
    client.close()

if __name__ == "__main__":
    asyncio.run(drop_duplicates())
