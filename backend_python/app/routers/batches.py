from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from app.db import (
    get_batches_col,
    get_products_col,
    get_findings_col,
    get_images_col
)
from app.services.batch_service import create_batch_from_files

router = APIRouter(prefix="/api/batches", tags=["batches"])

@router.post("/create")
async def create_batch(
    files: List[UploadFile] = File(...),
    line: Optional[str] = Form("Line 04")
):
    """
    Creates a new inspection batch from uploaded images, runs model inference,
    creates products & findings, and stores everything in MongoDB.
    """
    if not files:
        raise HTTPException(status_code=400, detail="Please upload at least one image file.")

    try:
        result = await create_batch_from_files(files, line_name=line or "Line 04")
        return {
            "success": True,
            "message": f"Successfully created batch {result['batch']['_id']} with {len(files)} image(s).",
            "data": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("")
async def list_batches():
    """
    Returns all inspection batches for the Review Queue.
    """
    cursor = get_batches_col().find().sort("sortOrder", -1)
    batches = await cursor.to_list(length=100)
    for b in batches:
        if isinstance(b.get("capturedAt"), datetime):
            b["capturedAt"] = b["capturedAt"].strftime("%Y-%m-%dT%H:%M:%SZ")
        # Fetch associated products
        prod_cursor = get_products_col().find({"batchId": b["_id"]})
        prods = await prod_cursor.to_list(length=50)
        for p in prods:
            if isinstance(p.get("capturedAt"), datetime):
                p["capturedAt"] = p["capturedAt"].strftime("%Y-%m-%dT%H:%M:%SZ")
        b["products"] = prods

        # Fetch associated findings
        find_cursor = get_findings_col().find({"batchId": b["_id"]})
        b["findings"] = await find_cursor.to_list(length=100)

        # Fetch representative image if available
        if b["products"] and b["products"][0].get("primaryImageId"):
            img = await get_images_col().find_one({"_id": b["products"][0]["primaryImageId"]})
            if img:
                b["image"] = img["url"]
    return {"success": True, "batches": batches}

@router.get("/{batch_id}")
async def get_batch_detail(batch_id: str):
    """
    Returns full batch details with products and findings for Defect Details view.
    """
    batch = await get_batches_col().find_one({"_id": batch_id})
    if not batch:
        raise HTTPException(status_code=404, detail="Inspection batch not found.")

    prod_cursor = get_products_col().find({"batchId": batch_id})
    products = await prod_cursor.to_list(length=50)

    finding_cursor = get_findings_col().find({"batchId": batch_id})
    findings = await finding_cursor.to_list(length=100)

    img_cursor = get_images_col().find({"batchId": batch_id})
    images = await img_cursor.to_list(length=100)

    return {
        "success": True,
        "batch": batch,
        "products": products,
        "findings": findings,
        "images": images
    }

@router.get("/history/list")
async def list_history():
    """
    Returns formatted inspection history records.
    """
    cursor = get_batches_col().find().sort("capturedAt", -1)
    batches = await cursor.to_list(length=100)

    rows = []
    for b in batches:
        rows.append({
            "id": b["_id"],
            "product": b["name"],
            "line": b["line"],
            "status": "In review" if b.get("status") != "Complete" and b.get("status") != "Passed" else "Complete",
            "completed": b["capturedAt"].strftime("%Y-%m-%d %H:%M") if isinstance(b["capturedAt"], datetime) else str(b["capturedAt"]),
            "result": b.get("verdict", "Review"),
            "itemCount": b.get("itemCount", 1),
            "flags": b.get("flagCount", 0),
            "failureReason": b.get("failureReason")
        })

    return {"success": True, "history": rows}

@router.delete("/{batch_id}")
async def delete_batch(batch_id: str):
    """
    Deletes an inspection batch and its associated products, images, and findings from MongoDB.
    """
    batches_col = get_batches_col()
    res = await batches_col.delete_one({"_id": batch_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail=f"Batch {batch_id} not found.")

    await get_products_col().delete_many({"batchId": batch_id})
    await get_images_col().delete_many({"batchId": batch_id})
    await get_findings_col().delete_many({"batchId": batch_id})

    print(f"[FastAPI BatchRouter] Deleted batch {batch_id} and all related documents from MongoDB.")
    return {"success": True, "message": f"Batch {batch_id} deleted successfully."}
