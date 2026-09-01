import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from app.config import MONGODB_URI

async def test_review():
    client = AsyncIOMotorClient(MONGODB_URI)
    db = client["visioninspect"]

    # Insert a sample manualReview document
    review_doc = {
        "_id": "REV-PRD-0829-001-TEST",
        "batchId": "BT-4109",
        "productId": "PRD-0829-001",
        "findingId": "IR-4824-C8AF65",
        "reviewerId": "usr_qe_admin",
        "status": "reviewed",
        "decision": "Accept",
        "note": "Verified by quality engineer",
        "reviewedAt": "2026-08-29T14:44:10Z",
        "reviewVersion": 1,
        "isCurrent": True
    }
    
    await db["manualReviews"].update_one(
        {"_id": review_doc["_id"]},
        {"$set": review_doc},
        upsert=True
    )
    print("[Test Review] Successfully inserted sample document into 'manualReviews' collection in MongoDB!")

    cols = await db.list_collection_names()
    print("ALL MONGODB COLLECTIONS:", cols)
    for c in cols:
        count = await db[c].count_documents({})
        print(f"Collection '{c}': {count} documents")

    client.close()

if __name__ == "__main__":
    asyncio.run(test_review())
