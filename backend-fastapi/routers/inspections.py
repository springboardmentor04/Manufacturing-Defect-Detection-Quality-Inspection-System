import os
import time
import random
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form

from database import get_conn
from auth import get_current_user
from defect_engine import run_inspection

router = APIRouter(prefix="/api/inspections", tags=["inspections"])

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_TYPES = {"image/png", "image/jpeg", "image/jpg", "image/bmp", "image/webp"}
MAX_SIZE_BYTES = 20 * 1024 * 1024  # 20MB

SELECT_INSPECTION = """
  SELECT i.*, p.product_code, p.product_name, p.category, p.batch_number, p.production_line,
         p.image_path, u.full_name
  FROM inspections i
  JOIN products p ON p.id = i.product_id
  JOIN users u ON u.id = i.inspected_by
"""


def row_to_inspection(row) -> dict:
    return {
        "id": row["id"],
        "product": {
            "id": row["product_id"],
            "product_code": row["product_code"],
            "product_name": row["product_name"],
            "category": row["category"],
            "batch_number": row["batch_number"],
            "production_line": row["production_line"],
            "image_url": f"/uploads/{os.path.basename(row['image_path'])}",
        },
        "defect_type": row["defect_type"],
        "status": row["status"],
        "scores": {
            "size": row["size_score"],
            "location": row["location_score"],
            "type": row["type_score"],
            "confidence": row["confidence_score"],
        },
        "severity_score": row["severity_score"],
        "severity_level": row["severity_level"],
        "recommendation": row["recommendation"],
        "bbox": None
        if row["bbox_x"] is None
        else {"x": row["bbox_x"], "y": row["bbox_y"], "w": row["bbox_w"], "h": row["bbox_h"]},
        "inspected_by": row["full_name"],
        "created_at": row["created_at"],
    }


@router.post("/upload", status_code=201)
async def upload_product(
    image: UploadFile = File(...),
    product_code: str = Form(...),
    product_name: str = Form(...),
    category: Optional[str] = Form(None),
    batch_number: Optional[str] = Form(None),
    production_line: Optional[str] = Form(None),
    production_date: Optional[str] = Form(None),
    current_user: dict = Depends(get_current_user),
):
    if image.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail="Only PNG, JPG, JPEG, BMP and WEBP images are supported")

    contents = await image.read()
    if len(contents) > MAX_SIZE_BYTES:
        raise HTTPException(status_code=400, detail="Image exceeds the 20MB upload limit")

    ext = os.path.splitext(image.filename or "")[1] or ".jpg"
    filename = f"product_{int(time.time() * 1000)}_{random.randint(0, 999999)}{ext}"
    with open(os.path.join(UPLOAD_DIR, filename), "wb") as f:
        f.write(contents)

    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        """INSERT INTO products
           (product_code, product_name, category, batch_number, production_line, production_date, image_path, uploaded_by)
           VALUES (%s, %s, %s, %s, %s, %s, %s, %s) RETURNING id""",
        (product_code, product_name, category, batch_number, production_line, production_date, filename, current_user["id"]),
    )
    product_id = cur.fetchone()["id"]
    conn.commit()
    cur.close()
    conn.close()

    return {
        "product": {
            "id": product_id,
            "product_code": product_code,
            "product_name": product_name,
            "category": category,
            "batch_number": batch_number,
            "production_line": production_line,
            "image_url": f"/uploads/{filename}",
        }
    }


@router.post("/run/{product_id}", status_code=201)
def run_inspection_endpoint(product_id: int, current_user: dict = Depends(get_current_user)):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("SELECT * FROM products WHERE id = %s", (product_id,))
    product = cur.fetchone()
    if not product:
        cur.close()
        conn.close()
        raise HTTPException(status_code=404, detail="Product not found")

    image_path = os.path.join(UPLOAD_DIR, product["image_path"])
    result = run_inspection(image_path)
    bbox = result["bbox"]

    cur.execute(
        """INSERT INTO inspections
           (product_id, defect_type, status, size_score, location_score, type_score, confidence_score,
            severity_score, severity_level, recommendation, bbox_x, bbox_y, bbox_w, bbox_h, inspected_by)
           VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING id""",
        (
            product_id,
            result["defect_type"],
            result["status"],
            result["size_score"],
            result["location_score"],
            result["type_score"],
            result["confidence_score"],
            result["severity_score"],
            result["severity_level"],
            result["recommendation"],
            bbox["x"] if bbox else None,
            bbox["y"] if bbox else None,
            bbox["w"] if bbox else None,
            bbox["h"] if bbox else None,
            current_user["id"],
        ),
    )
    new_id = cur.fetchone()["id"]
    conn.commit()

    cur.execute(f"{SELECT_INSPECTION} WHERE i.id = %s", (new_id,))
    row = cur.fetchone()
    cur.close()
    conn.close()

    return {"inspection": row_to_inspection(row)}


@router.get("")
def list_inspections(
    limit: int = 50,
    status: Optional[str] = None,
    line: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
):
    conn = get_conn()
    cur = conn.cursor()
    sql = SELECT_INSPECTION
    clauses, params = [], []
    if status:
        clauses.append("i.status = %s")
        params.append(status)
    if line:
        clauses.append("p.production_line = %s")
        params.append(line)
    if clauses:
        sql += " WHERE " + " AND ".join(clauses)
    sql += " ORDER BY i.created_at DESC LIMIT %s"
    params.append(limit)

    cur.execute(sql, params)
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return {"inspections": [row_to_inspection(r) for r in rows]}


@router.get("/{inspection_id}")
def get_inspection(inspection_id: int, current_user: dict = Depends(get_current_user)):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(f"{SELECT_INSPECTION} WHERE i.id = %s", (inspection_id,))
    row = cur.fetchone()
    cur.close()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Inspection not found")
    return {"inspection": row_to_inspection(row)}
