import time
import uuid

from pathlib import Path

import cv2

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from sqlalchemy.orm import Session

from ..config import settings
from ..database import get_db
from ..dependencies import require_role
from ..models import (
    User,
    Role,
    Inspection,
    Defect,
    AuditLog,
    Decision,
    ReviewStatus,
    Severity,
)
from ..schemas import InspectionOut
from ..services.image_service import (
    validate_and_save,
    quality_metrics,
    quality_is_poor,
)
from ..services.yolo_service import get_yolo_service
from ..services.severity_service import score_detection
from ..services.decision_service import decide, recommendation


router = APIRouter(prefix="/api/inspection", tags=["Inspection"])


def serialize(i):
    return InspectionOut(
        id=i.id,
        inspection_uuid=i.inspection_uuid,
        decision=i.decision,
        severity_score=i.severity_score,
        severity_level=i.severity_level,
        highest_confidence=i.highest_confidence,
        average_confidence=i.average_confidence,
        defect_count=i.defect_count,
        processing_time_ms=i.processing_time_ms,
        model_version=i.model_version,
        image_quality=i.image_quality,
        recommendation=i.recommendation,
        review_status=i.review_status,
        original_image_url=f"/storage/{i.original_image_path}",
        annotated_image_url=f"/storage/{i.annotated_image_path}",
        created_at=i.created_at,
        defects=[
            {
                "class_name": d.defect_type,
                "confidence": d.confidence,
                "bbox": {
                    "x1": d.x1,
                    "y1": d.y1,
                    "x2": d.x2,
                    "y2": d.y2,
                },
                "size_score": d.size_score,
                "location_score": d.location_score,
                "defect_type_score": d.defect_type_score,
                "confidence_score": d.confidence_score,
                "severity_score": d.severity_score,
                "severity_level": d.severity_level,
            }
            for d in i.defects
        ],
    )


from sqlalchemy import select
from ..models import Product

@router.get("/samples")
def get_sample_images():
    val_dir = Path(__file__).resolve().parents[3] / "dataset" / "yolo_mvtec" / "images" / "val"
    if not val_dir.exists():
        return []
    files = list(val_dir.glob("*.png")) + list(val_dir.glob("*.jpg"))
    sample_items = []
    # Pick a curated set of defect and good samples
    defect_samples = [f for f in files if f.name.startswith("defect_")][:12]
    good_samples = [f for f in files if f.name.startswith("good_")][:6]
    for f in defect_samples + good_samples:
        is_defect = f.name.startswith("defect_")
        sample_items.append({
            "filename": f.name,
            "url": f"/samples/{f.name}",
            "type": "Defect Sample" if is_defect else "Good Sample",
            "name": f.name.replace("_", " ").replace(".png", "").replace(".jpg", "").title()
        })
    return sample_items

@router.post("/batch", response_model=list[InspectionOut], status_code=201)
def inspect_batch(
    files: list[UploadFile] = File(...),
    product_code: str | None = Form(None),
    db: Session = Depends(get_db),
    user: User = Depends(require_role(Role.QUALITY_ENGINEER)),
):
    results = []
    for f in files:
        results.append(inspect_upload(file=f, product_code=product_code, db=db, user=user))
    return results

@router.post("/upload", response_model=InspectionOut, status_code=201)

def inspect_upload(
    file: UploadFile = File(...),
    product_code: str | None = Form(None),
    db: Session = Depends(get_db),
    user: User = Depends(require_role(Role.QUALITY_ENGINEER)),
):
    product_id = None
    if product_code:
        p = db.scalar(select(Product).where(Product.product_code == product_code))
        if p:
            product_id = p.id

    started = time.perf_counter()
    uid = str(uuid.uuid4())

    rel_original = (
        f"original/{uid}"
        f"{Path(file.filename or '.jpg').suffix.lower()}"
    )

    dest = Path(settings.upload_directory) / rel_original

    image = validate_and_save(
        file,
        dest,
        settings.max_file_size,
    )

    quality = quality_metrics(image)


    # ---------------------------------------------------------
    # IMAGE QUALITY CHECK
    # ---------------------------------------------------------
    if quality_is_poor(quality):
        detections = []
        annotated = image.copy()
        final_decision = Decision.MANUAL_REVIEW

    else:
        # -----------------------------------------------------
        # YOLO INFERENCE
        # -----------------------------------------------------
        try:
            service = get_yolo_service()
            raw, annotated = service.predict(image)

        except FileNotFoundError:
            raise HTTPException(
                status_code=503,
                detail=(
                    "YOLO model is unavailable. "
                    "Configure MODEL_PATH and restart the service."
                ),
            )

        # -----------------------------------------------------
        # CONVERT ULTRALYTICS RESULTS INTO NORMAL DICTIONARIES
        # -----------------------------------------------------
        detections = []

        boxes = raw.boxes

        for i in range(len(boxes)):
            class_id = int(boxes.cls[i].item())
            confidence = float(boxes.conf[i].item())

            coordinates = boxes.xyxy[i].tolist()

            x1, y1, x2, y2 = [
                float(value)
                for value in coordinates[:4]
            ]

            detection = {
                "class_name": raw.names[class_id],
                "confidence": confidence,
                "bbox": {
                    "x1": x1,
                    "y1": y1,
                    "x2": x2,
                    "y2": y2,
                },
            }

            # -------------------------------------------------
            # SEVERITY SCORING
            # -------------------------------------------------
            scored_detection = score_detection(
                detection,
                image.shape,
            )

            detections.append(scored_detection)

        # -----------------------------------------------------
        # QUALITY DECISION
        # -----------------------------------------------------
        final_decision = decide(detections)

    # ---------------------------------------------------------
    # OVERALL SEVERITY
    # ---------------------------------------------------------
    severity_score = max(
        [
            d["severity_score"]
            for d in detections
        ],
        default=0.0,
    )

    severity_priority = [
        Severity.LOW,
        Severity.MEDIUM,
        Severity.HIGH,
        Severity.CRITICAL,
    ]

    severity_level = max(
        [
            d["severity_level"]
            for d in detections
        ],
        key=lambda x: severity_priority.index(x),
        default=Severity.LOW,
    )

    # Poor image quality requires manual review
    if (
        final_decision == Decision.MANUAL_REVIEW
        and quality_is_poor(quality)
    ):
        severity_level = Severity.MEDIUM

    # ---------------------------------------------------------
    # CONFIDENCE
    # ---------------------------------------------------------
    highest = max(
        [
            d["confidence"]
            for d in detections
        ],
        default=0.0,
    )

    avg = (
        sum(
            d["confidence"]
            for d in detections
        )
        / len(detections)
        if detections
        else 0.0
    )

    # ---------------------------------------------------------
    # SAVE ANNOTATED IMAGE
    # ---------------------------------------------------------
    rel_annotated = f"annotated/{uid}.jpg"

    annotated_path = (
        Path(settings.upload_directory)
        / rel_annotated
    )

    cv2.imwrite(
        str(annotated_path),
        annotated,
    )

    elapsed = (
        time.perf_counter() - started
    ) * 1000

    # ---------------------------------------------------------
    # CREATE INSPECTION
    # ---------------------------------------------------------
    ins = Inspection(
        user_id=user.id,
        product_id=product_id,
        original_image_path=rel_original,
        annotated_image_path=rel_annotated,

        decision=final_decision,


        severity_score=severity_score,
        severity_level=severity_level,

        highest_confidence=highest,
        average_confidence=avg,

        defect_count=len(detections),

        processing_time_ms=elapsed,

        model_version=settings.model_version,

        image_quality=quality,

        recommendation=(
            "Image quality is insufficient for reliable AI inspection. "
            "Please capture the product under better lighting."
            if quality_is_poor(quality)
            else recommendation(
                final_decision,
                severity_level,
            )
        ),
    )

    db.add(ins)
    db.flush()

    # ---------------------------------------------------------
    # SAVE DEFECTS
    # ---------------------------------------------------------
    for d in detections:
        b = d["bbox"]

        db.add(
            Defect(
                inspection_id=ins.id,

                defect_type=d["class_name"],
                confidence=d["confidence"],

                x1=b["x1"],
                y1=b["y1"],
                x2=b["x2"],
                y2=b["y2"],

                size_score=d["size_score"],
                location_score=d["location_score"],
                defect_type_score=d["defect_type_score"],
                confidence_score=d["confidence_score"],

                severity_score=d["severity_score"],
                severity_level=d["severity_level"],
            )
        )

    # ---------------------------------------------------------
    # AUDIT LOG
    # ---------------------------------------------------------
    db.add(
        AuditLog(
            user_id=user.id,
            action="RUN_INSPECTION",
            resource_type="INSPECTION",
            resource_id=str(ins.id),
        )
    )

    # ---------------------------------------------------------
    # COMMIT
    # ---------------------------------------------------------
    db.commit()
    db.refresh(ins)

    return serialize(ins)


@router.get(
    "/{inspection_id}",
    response_model=InspectionOut,
)
def get_inspection(
    inspection_id: int,
    db: Session = Depends(get_db),
    user=Depends(
        require_role(
            Role.QUALITY_ENGINEER,
            Role.PRODUCT_MANAGER,
        )
    ),
):
    ins = db.get(
        Inspection,
        inspection_id,
    )

    if not ins:
        raise HTTPException(
            status_code=404,
            detail="Inspection not found",
        )

    return serialize(ins)