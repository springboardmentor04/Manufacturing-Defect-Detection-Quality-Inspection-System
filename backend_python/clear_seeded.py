import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from app.config import MONGODB_URI

async def clear_seeded_documents():
    print("[Clean DB] Connecting to MongoDB...")
    client = AsyncIOMotorClient(MONGODB_URI)
    db = client["visioninspect"]

    seeded_batch_ids = ["BT-4108", "BT-4106", "BT-4104", "BT-4102", "BT-4100", "BT-4098"]
    
    # Delete seeded batches
    res_b = await db["inspectionBatches"].delete_many({"_id": {"$in": seeded_batch_ids}})
    print(f"[Clean DB] Deleted {res_b.deleted_count} seeded batches.")

    # Delete seeded products
    res_p = await db["products"].delete_many({"batchId": {"$in": seeded_batch_ids}})
    print(f"[Clean DB] Deleted {res_p.deleted_count} seeded products.")

    # Delete seeded images
    res_i = await db["inspectionImages"].delete_many({"batchId": {"$in": seeded_batch_ids}})
    print(f"[Clean DB] Deleted {res_i.deleted_count} seeded images.")

    # Delete seeded findings
    res_f = await db["findings"].delete_many({"batchId": {"$in": seeded_batch_ids}})
    print(f"[Clean DB] Deleted {res_f.deleted_count} seeded findings.")

    client.close()

if __name__ == "__main__":
    asyncio.run(clear_seeded_documents())
