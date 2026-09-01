import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from app.config import MONGODB_URI

async def remove_test_review():
    client = AsyncIOMotorClient(MONGODB_URI)
    db = client["visioninspect"]
    
    # Delete temporary test review document
    res = await db["manualReviews"].delete_one({"_id": "REV-PRD-0829-001-TEST"})
    print(f"[Cleanup] Deleted {res.deleted_count} test document ('REV-PRD-0829-001-TEST') from 'manualReviews'.")
    
    remaining = await db["manualReviews"].find().to_list(length=100)
    print(f"[Cleanup] Active real reviews in 'manualReviews': {len(remaining)}")
    for r in remaining:
        print(f"  - _id: {r['_id']} | productId: {r['productId']} | batchId: {r['batchId']} | decision: {r['decision']}")

    client.close()

if __name__ == "__main__":
    asyncio.run(remove_test_review())
