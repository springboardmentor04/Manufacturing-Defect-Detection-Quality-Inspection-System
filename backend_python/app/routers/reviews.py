from datetime import datetime
from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.db import (
    get_batches_col,
    get_products_col,
    get_manual_reviews_col
)

router = APIRouter(prefix="/api/reviews", tags=["reviews"])

class ReviewSubmission(BaseModel):
    batchId: str
    productId: str
    findingId: Optional[str] = None
    reviewerId: Optional[str] = "usr_qe_admin"
    decision: str  # "Accept" | "Reject" | "Hold" | "Rework"
    note: Optional[str] = None

@router.get("/list")
async def list_manual_reviews():
    """
    Returns all manual review documents stored in MongoDB 'manualReviews' collection.
    """
    reviews_col = get_manual_reviews_col()
    cursor = reviews_col.find().sort("reviewedAt", -1)
    reviews = await cursor.to_list(length=100)
    for r in reviews:
        if isinstance(r.get("reviewedAt"), datetime):
            r["reviewedAt"] = r["reviewedAt"].isoformat() + "Z"
        if isinstance(r.get("createdAt"), datetime):
            r["createdAt"] = r["createdAt"].isoformat() + "Z"
        if isinstance(r.get("updatedAt"), datetime):
            r["updatedAt"] = r["updatedAt"].isoformat() + "Z"
    return {"success": True, "reviews": reviews}

@router.post("/submit")
async def submit_review(payload: ReviewSubmission):
    """
    Submits a human quality engineer review action for a product / finding.
    """
    now = datetime.utcnow()
    review_id = f"REV-{payload.batchId}-{payload.productId}"

    review_doc = {
        "_id": review_id,
        "batchId": payload.batchId,
        "productId": payload.productId,
        "findingId": payload.findingId,
        "reviewerId": payload.reviewerId or "usr_qe_admin",
        "status": "reviewed",
        "decision": payload.decision,
        "note": payload.note,
        "reviewedAt": now,
        "reviewVersion": 1,
        "isCurrent": True,
        "createdAt": now,
        "updatedAt": now
    }

    await get_manual_reviews_col().update_one(
        {"_id": review_id},
        {"$set": review_doc},
        upsert=True
    )

    # Update product status
    product_status = "Passed" if payload.decision in ["Pass", "Accept"] else "Failed"
    await get_products_col().update_one(
        {"_id": payload.productId},
        {"$set": {"status": product_status, "updatedAt": now}}
    )

    # Count how many products for this batch have a manualReview document
    manual_reviews_col = get_manual_reviews_col()
    reviewed_docs = await manual_reviews_col.find({"batchId": payload.batchId}).to_list(length=100)
    reviewed_product_ids = set(r["productId"] for r in reviewed_docs)

    products_cursor = get_products_col().find({"batchId": payload.batchId})
    products = await products_cursor.to_list(length=100)
    
    reviewed_count = len(reviewed_product_ids)
    all_complete = reviewed_count >= len(products) and len(products) > 0

    batch_update = {
        "reviewedCount": reviewed_count,
        "updatedAt": now
    }
    if all_complete:
        batch_update["status"] = "Complete"
        batch_update["completedAt"] = now
    else:
        batch_update["status"] = "In review"

    await get_batches_col().update_one(
        {"_id": payload.batchId},
        {"$set": batch_update}
    )

    return {
        "success": True,
        "message": f"Review action '{payload.decision}' recorded for product {payload.productId}.",
        "review": review_doc
    }
