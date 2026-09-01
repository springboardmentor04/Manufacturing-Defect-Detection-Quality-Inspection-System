import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from app.config import MONGODB_URI

async def clean_orphans():
    print("[Clean Database] Connecting to MongoDB...")
    client = AsyncIOMotorClient(MONGODB_URI)
    db = client["visioninspect"]

    # Delete all documents from modelRuns, findings, products, inspectionImages, inspectionBatches
    # to give a completely fresh state for new uploads!
    for col in ["modelRuns", "findings", "products", "inspectionImages", "inspectionBatches"]:
        res = await db[col].delete_many({})
        print(f"[Clean Database] Cleared {res.deleted_count} docs from '{col}'.")

    client.close()

if __name__ == "__main__":
    asyncio.run(clean_orphans())
