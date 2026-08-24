from pathlib import Path
import uuid
import time
from app.ai.image_quality import analyze_image_quality
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.ai.predictor import predict
from app.database.database import get_db
from app.schemas.inspection import InspectionCreate
from app.services.inspection_service import InspectionService

router = APIRouter(
    prefix="/inspection",
    tags=["Inspection"]
)

# ======================================================
# Upload Configuration
# ======================================================

UPLOAD_DIR = Path("uploads/inspection")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png"]
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


# ======================================================
# Upload Image + AI Prediction
# ======================================================

@router.post("/upload")
async def upload_image(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    start_time = time.time()

    # -----------------------------------------
    # Validate Extension
    # -----------------------------------------

    extension = Path(file.filename).suffix.lower()

    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail="Only JPG, JPEG and PNG images are allowed."
        )

    # -----------------------------------------
    # Read Uploaded File
    # -----------------------------------------

    contents = await file.read()

    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail="Image size should not exceed 10 MB."
        )

    # -----------------------------------------
    # Save Image
    # -----------------------------------------

    filename = f"{uuid.uuid4()}{extension}"

    filepath = UPLOAD_DIR / filename

    with open(filepath, "wb") as buffer:
        buffer.write(contents)
        
    quality_report = analyze_image_quality(
    str(filepath)
    )

    # -----------------------------------------
    # Create Inspection Record
    # -----------------------------------------

    inspection = InspectionService.create_inspection(
        db=db,
        inspection=InspectionCreate(
            engineer_id=2,
            product_name=file.filename,
            image_path=str(filepath),
            status="Pending",
        ),
    )

    # -----------------------------------------
    # AI Prediction
    # -----------------------------------------

    prediction = predict(str(filepath))

    processing_time = round(
        time.time() - start_time,
        3,
    )

    # -----------------------------------------
    # Update Database
    # -----------------------------------------

    InspectionService.update_prediction(
    db=db,
    inspection_id=inspection.id,
    status=prediction["status"],
    defect_type=prediction["defect_type"],
    confidence=prediction["confidence"],
    processing_time=processing_time,
    result_image=prediction["result_image"],
    severity=prediction["severity"],
    severity_score=prediction["severity_score"],
    recommendation=prediction["recommendation"],
    )
    # -----------------------------------------
    # Convert Paths to URLs
    # -----------------------------------------

    image_url = f"http://localhost:8000/uploads/inspection/{filename}"

    result_path = Path(prediction["result_image"])

    # Example:
    # runs/detect/predict5/abc.png
    # -> http://localhost:8000/results/predict5/abc.png

    result_image_url = (
        f"http://localhost:8000/results/"
        f"{result_path.parent.name}/"
        f"{result_path.name}"
    )

    # -----------------------------------------
    # Response
    # -----------------------------------------

    return JSONResponse(
        status_code=200,
        content={
    "message": "Inspection completed successfully",

    "inspection_id": inspection.id,

    # -----------------------------
    # YOLO Prediction
    # -----------------------------

    "status": prediction["status"],
    "defect_type": prediction["defect_type"],
    "confidence": prediction["confidence"],

    # -----------------------------
    # Severity
    # -----------------------------

    "severity": prediction["severity"],
    "severity_score": prediction["severity_score"],
    "risk_level": prediction["risk_level"],
    "risk_description": prediction["risk_description"],
    "recommendation": prediction["recommendation"],

    # -----------------------------
    # Processing
    # -----------------------------

    "processing_time": processing_time,

    # -----------------------------
    # Images
    # -----------------------------

    "image_path": str(filepath),
    "result_image": prediction["result_image"],

    "image_url": image_url,
    "result_image_url": result_image_url,

    # -----------------------------
    # Image Quality Analysis
    # -----------------------------

    "image_quality": quality_report,
},
    )


# ======================================================
# Get Inspection History
# ======================================================
@router.get("/history")
def get_inspection_history(
    db: Session = Depends(get_db),
):
    inspections = InspectionService.get_all(db)

    history = []

    for inspection in inspections:

        image_name = Path(inspection.image_path).name

        image_url = (
            f"http://localhost:8000/uploads/inspection/{image_name}"
        )

        result_image_url = None

        if inspection.result_image:

            result_path = Path(inspection.result_image)

            result_image_url = (
                f"http://localhost:8000/results/"
                f"{result_path.parent.name}/"
                f"{result_path.name}"
            )

        history.append({

    "id": inspection.id,
    "product_name": inspection.product_name,

    "status": inspection.status,
    "defect_type": inspection.defect_type,

    "confidence": inspection.confidence,

    "severity": inspection.severity,
    "severity_score": inspection.severity_score,
    "recommendation": inspection.recommendation,

    "processing_time": inspection.processing_time,

    "image_url": image_url,
    "result_image_url": result_image_url,

    "created_at": inspection.created_at,

})
    return history


# ======================================================
# Get Inspection By ID
# ======================================================

@router.get("/{inspection_id}")
def get_inspection_by_id(
    inspection_id: int,
    db: Session = Depends(get_db),
):
    inspection = InspectionService.get_by_id(
        db=db,
        inspection_id=inspection_id,
    )

    if inspection is None:
        raise HTTPException(
            status_code=404,
            detail="Inspection not found",
        )

    return inspection