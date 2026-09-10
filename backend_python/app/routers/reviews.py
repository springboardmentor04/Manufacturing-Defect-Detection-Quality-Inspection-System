from datetime import datetime
from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.db import (
    get_batches_col,
    get_products_col,
    get_findings_col,
    get_manual_reviews_col
)

router = APIRouter(prefix="/api/reviews", tags=["reviews"])

class ReviewSubmission(BaseModel):
    batchId: str
    productId: str
    findingId: Optional[str] = None
    reviewerId: Optional[str] = "Quality Engineer"
    reviewerName: Optional[str] = "Quality Engineer"
    decision: str  # "Pass" | "Good" | "Accept" | "Fail" | "Defective" | "Reject" | "Hold"
    note: Optional[str] = None

@router.get("")
@router.get("/")
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
    Allows human override: Mark as Good (Pass) or Mark as Defective (Fail).
    """
    now = datetime.utcnow()
    review_id = f"REV-{payload.batchId}-{payload.productId}"

    dec = payload.decision.strip().lower()
    is_good = dec in ["pass", "good", "accept", "not defective", "ok"]
    standard_decision = "Pass" if is_good else "Fail"

    reviewer_id = payload.reviewerId or "Quality Engineer"
    reviewer_name = payload.reviewerName or reviewer_id or "Quality Engineer"

    review_doc = {
        "_id": review_id,
        "batchId": payload.batchId,
        "productId": payload.productId,
        "findingId": payload.findingId,
        "reviewerId": reviewer_id,
        "reviewerName": reviewer_name,
        "status": "reviewed",
        "decision": standard_decision,
        "rawDecision": payload.decision,
        "note": payload.note or (f"Marked as Good by {reviewer_name}" if is_good else f"Marked as Defective by {reviewer_name}"),
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

    # 1. Update Product document with QE decision
    final_prod_status = "Passed" if is_good else "Failed"
    failed_finding_count = 0 if is_good else 1
    is_flagged = not is_good

    await get_products_col().update_one(
        {"_id": payload.productId},
        {"$set": {
            "status": final_prod_status,
            "failedFindingCount": failed_finding_count,
            "isFlagged": is_flagged,
            "reviewStatus": "Reviewed",
            "reviewDecision": standard_decision,
            "reviewedAt": now,
            "updatedAt": now
        }}
    )

    # 2. Update Finding document(s) for this product
    if is_good:
        await get_findings_col().update_many(
            {"productId": payload.productId},
            {"$set": {
                "decision": "Pass",
                "defectType": "Not defective",
                "reviewStatus": "Reviewed (Marked Good)",
                "severity": "Low",
                "severityScore": 0,
                "updatedAt": now
            }}
        )
    else:
        await get_findings_col().update_many(
            {"productId": payload.productId},
            {"$set": {
                "decision": "Fail",
                "reviewStatus": "Reviewed (Confirmed Defect)",
                "updatedAt": now
            }}
        )

    # 3. Recalculate Batch statistics and overall verdict
    manual_reviews_col = get_manual_reviews_col()
    reviewed_docs = await manual_reviews_col.find({"batchId": payload.batchId}).to_list(length=100)
    reviewed_product_ids = set(r["productId"] for r in reviewed_docs)

    products_cursor = get_products_col().find({"batchId": payload.batchId})
    products = await products_cursor.to_list(length=100)
    
    reviewed_count = len(reviewed_product_ids)
    all_complete = reviewed_count >= len(products) and len(products) > 0
    failed_products_count = sum(1 for p in products if p.get("status") == "Failed" or p.get("failedFindingCount", 0) > 0)

    reviewed_names = list(dict.fromkeys([r.get("reviewerName") or r.get("reviewerId") for r in reviewed_docs if r.get("reviewerName") or r.get("reviewerId")]))
    if reviewer_name and reviewer_name not in reviewed_names:
        reviewed_names.append(reviewer_name)

    batch_update = {
        "reviewedCount": reviewed_count,
        "flagCount": failed_products_count,
        "overallSeverity": "Low" if failed_products_count == 0 else "High",
        "verdict": "Pass" if failed_products_count == 0 else "Hold",
        "status": "Complete",
        "reviewedBy": ", ".join(reviewed_names) if reviewed_names else reviewer_name,
        "reviewedById": reviewer_id,
        "completedAt": now,
        "updatedAt": now
    }

    await get_batches_col().update_one(
        {"_id": payload.batchId},
        {"$set": batch_update}
    )

    return {
        "success": True,
        "message": f"Product {payload.productId} marked as '{standard_decision}' ({final_prod_status}).",
        "review": review_doc,
        "batchSummary": {
            "flagCount": failed_products_count,
            "verdict": batch_update["verdict"],
            "status": batch_update["status"]
        }
    }
