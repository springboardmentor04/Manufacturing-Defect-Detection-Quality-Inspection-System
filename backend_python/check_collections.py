import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from app.config import MONGODB_URI

async def list_cols():
    client = AsyncIOMotorClient(MONGODB_URI)
    db = client["visioninspect"]
    cols = await db.list_collection_names()
    print("ALL MONGODB COLLECTIONS:", cols)

    for c in cols:
        count = await db[c].count_documents({})
        print(f"Collection '{c}': {count} documents")

    client.close()

if __name__ == "__main__":
    asyncio.run(list_cols())
