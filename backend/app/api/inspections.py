import os
import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.all_models import (
    Inspection, InspectionImage, ImageAnalysis, Detection,
    DefectAssessment, SeverityScore, QualityDecision, QualityAssessment,
    AuditLog, Product, ProductionBatch,
)
from app.schemas.all_schemas import InspectionCreate, InspectionResponse
from app.api.deps import get_current_active_user
from app.models.all_models import User
from app.core.config import settings
import sys

# Hack to import ml module
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../..')))
from ml.inference.pipeline import pipeline
from ml.inference.image_processing import ImageValidationError
from ml.quality.assessment_engine import category_label

router = APIRouter()


def _assessment_response(assessment):
    if not assessment:
        return None
    return {
        "size_score": assessment.size_score,
        "location_score": assessment.location_score,
        "type_score": assessment.type_score,
        "confidence_score": assessment.confidence_score,
        "severity_score": assessment.severity_score,
        "severity_level": assessment.severity_level,
        "quality_risk": assessment.quality_risk,
        "quality_decision": assessment.quality_decision,
        "recommended_action": assessment.recommended_action,
        "manual_review_required": assessment.manual_review_required,
    }


def _store_prediction_results(db: Session, inspection: Inspection, results: dict):
    """Persist the detector output and its deterministic quality assessment."""
    old_detection_ids = [detection.id for detection in inspection.detections]
    if old_detection_ids:
        db.query(DefectAssessment).filter(DefectAssessment.detection_id.in_(old_detection_ids)).delete(synchronize_session=False)
    db.query(Detection).filter(Detection.inspection_id == inspection.id).delete(synchronize_session=False)
    db.query(SeverityScore).filter(SeverityScore.inspection_id == inspection.id).delete(synchronize_session=False)
    db.query(QualityDecision).filter(QualityDecision.inspection_id == inspection.id).delete(synchronize_session=False)
    db.query(QualityAssessment).filter(QualityAssessment.inspection_id == inspection.id).delete(synchronize_session=False)

    stored = []
    for defect in results["defects"]:
        detection = Detection(
            inspection_id=inspection.id,
            defect_type=defect["type"],
            product_category=defect.get("product_category"),
            suggested_defect_type=defect.get("suggested_defect_type"),
            defect_present=True,
            defect_display_name=category_label(defect["type"], defect.get("product_category")),
            detection_confidence=defect.get("detection_confidence", defect["confidence"]),
            classification_confidence=defect.get("classification_confidence"),
            confidence=defect["confidence"],
            bbox_x1=defect["bbox"][0], bbox_y1=defect["bbox"][1],
            bbox_x2=defect["bbox"][2], bbox_y2=defect["bbox"][3], area=defect["area"],
        )
        db.add(detection)
        db.flush()
        assessment = DefectAssessment(detection_id=detection.id, **{
            key: defect[key] for key in (
                "size_score", "location_score", "type_score", "confidence_score",
                "severity_score", "severity_level", "quality_risk", "quality_decision",
                "recommended_action", "manual_review_required",
            )
        })
        db.add(assessment)
        stored.append(defect)

    highest = max(stored, key=lambda defect: defect["severity_score"], default=None)
    if highest:
        db.add(SeverityScore(
            inspection_id=inspection.id, size_score=highest["size_score"],
            location_score=highest["location_score"], type_score=highest["type_score"],
            confidence_score=highest["confidence_score"], total_score=highest["severity_score"],
            level=highest["severity_level"],
        ))

    overall = results["quality_assessment"]
    db.add(QualityAssessment(inspection_id=inspection.id, **overall))
    db.add(QualityDecision(
        inspection_id=inspection.id, ai_decision=overall["overall_result"],
        final_decision=overall["overall_result"],
    ))
    inspection.processing_time_ms = results["processing_time_ms"]


def _serialize_inspection(inspection: Inspection):
    raw_image = next((img for img in inspection.images if img.image_type == "raw"), None)
    processed_image = next((img for img in inspection.images if img.image_type == "processed"), None)
    image_path = raw_image.file_path if raw_image else (inspection.images[0].file_path if inspection.images else None)
    processed_image_path = processed_image.file_path if processed_image else None
    if image_path and "uploads" in image_path:
        image_path = "uploads" + image_path.split("uploads")[-1]
    if processed_image_path and "uploads" in processed_image_path:
        processed_image_path = "uploads" + processed_image_path.split("uploads")[-1]
    if image_path:
        image_path = image_path.replace("\\", "/")
    if processed_image_path:
        processed_image_path = processed_image_path.replace("\\", "/")

    bounding_boxes = [{
        "box": [d.bbox_x1, d.bbox_y1, d.bbox_x2, d.bbox_y2],
        "label": d.defect_type,
        "defect_type": d.defect_type,
        "product_category": d.product_category,
        "suggested_defect_type": d.suggested_defect_type,
        "defect_present": d.defect_present,
        "defect_display_name": d.defect_display_name,
        "detection_confidence": d.detection_confidence,
        "classification_confidence": d.classification_confidence,
        "category": category_label(d.defect_type, d.product_category),
        "conf": d.confidence,
        "area": d.area,
        "assessment": _assessment_response(d.assessment),
    } for d in inspection.detections]
    sev = inspection.severity_score
    qd = inspection.quality_decision
    qa = inspection.quality_assessment
    analysis = inspection.image_analysis
    product = inspection.batch.product if (inspection.batch and inspection.batch.product) else None
    product_dict = None if not product else {
        "id": product.id, "name": product.name, "product_code": product.product_code or "unknown",
        "description": product.description, "production_line": product.production_line or "default",
        "critical_regions": None, "created_at": product.created_at.isoformat() if product.created_at else "",
        "updated_at": product.created_at.isoformat() if product.created_at else "",
    }
    batch_dict = None if not inspection.batch else {
        "id": inspection.batch.id, "batch_number": inspection.batch.batch_number,
        "product_id": inspection.batch.product_id, "quantity": 0, "production_line": "default",
        "status": "active", "created_at": inspection.batch.created_at.isoformat() if inspection.batch.created_at else "",
    }
    primary = inspection.detections[0] if inspection.detections else None
    return {
        "id": inspection.id, "product_id": inspection.batch.product_id if inspection.batch else 0,
        "batch_id": inspection.batch_id, "image_path": image_path, "processed_image_path": processed_image_path, "ai_status": "COMPLETED",
        "defect_type": primary.defect_type if primary else None,
        "product_category": primary.product_category if (primary and primary.product_category) else (product.name if product else None),
        "confidence": primary.confidence if primary else None,
        "ai_decision": qd.ai_decision if qd else "PASS", "human_decision": qd.human_decision if qd else None,
        "final_decision": qd.final_decision if qd else "PASS", "override_reason": qd.override_reason if qd else None,
        "severity_score": sev.total_score if sev else 0.0, "severity_level": sev.level if sev else "LOW",
        "model_version": "Configured model", "model_status": analysis.model_status if analysis else "UNKNOWN",
        "model_message": analysis.model_message if analysis else None, "processing_time_ms": inspection.processing_time_ms,
        "created_at": inspection.created_at.isoformat() if inspection.created_at else "",
        "bounding_boxes": bounding_boxes,
        "detections": [{
            "defect_type": d.defect_type,
            "product_category": d.product_category,
            "suggested_defect_type": d.suggested_defect_type,
            "defect_present": d.defect_present,
            "defect_display_name": d.defect_display_name,
            "detection_confidence": d.detection_confidence,
            "classification_confidence": d.classification_confidence,
            "category": category_label(d.defect_type, d.product_category),
            "label": d.defect_type,
            "confidence": d.confidence,
            "bbox_x1": d.bbox_x1,
            "bbox_y1": d.bbox_y1,
            "bbox_x2": d.bbox_x2,
            "bbox_y2": d.bbox_y2,
            "area": d.area,
        } for d in inspection.detections],
        "severity_components": None if not sev else {
            "size": sev.size_score or 0.0, "confidence": sev.confidence_score or 0.0,
            "type": sev.type_score or 0.0, "location": sev.location_score or 0.0,
        },
        "quality_assessment": None if not qa else {
            "overall_result": qa.overall_result, "highest_severity": qa.highest_severity,
            "quality_risk": qa.quality_risk, "defect_count": qa.defect_count,
            "recommended_action": qa.recommended_action,
            "manual_review_required": qa.manual_review_required,
        },
        "image_quality": None if not analysis else {
            "width": analysis.width, "height": analysis.height, "file_size_bytes": analysis.file_size_bytes,
            "brightness": analysis.brightness, "contrast": analysis.contrast, "sharpness": analysis.sharpness,
            "status": analysis.quality_status, "warning": analysis.warning,
        },
        "product": product_dict, "batch": batch_dict,
    }

@router.get("/")
def get_all_inspections(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    from sqlalchemy.orm import joinedload
    inspections = db.query(Inspection).options(
        joinedload(Inspection.images),
        joinedload(Inspection.detections).joinedload(Detection.assessment),
        joinedload(Inspection.severity_score),
        joinedload(Inspection.quality_decision),
        joinedload(Inspection.quality_assessment),
        joinedload(Inspection.batch).joinedload(ProductionBatch.product)
    ).order_by(Inspection.created_at.desc()).offset(skip).limit(limit).all()
    return [_serialize_inspection(inspection) for inspection in inspections]

@router.post("/", response_model=InspectionResponse)
def create_inspection(batch_id: int = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    inspection = Inspection(operator_id=current_user.id, batch_id=batch_id)
    db.add(inspection)
    
    log = AuditLog(user_id=current_user.id, action="INSPECTION_CREATED", entity="Inspection", entity_id=inspection.id)
    db.add(log)
    
    db.commit()
    db.refresh(inspection)
    return _serialize_inspection(inspection)

from fastapi import Form
@router.post("/run", response_model=InspectionResponse)
async def create_and_run_inspection(
    product_id: int = Form(...),
    batch_id: int = Form(None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    role_name = getattr(getattr(current_user, "role", None), "name", None) or str(getattr(current_user, "role", "")).upper()
    if role_name in {"SUPERVISOR", "FACTORY_SUPERVISOR"}:
        raise HTTPException(status_code=403, detail="Factory Supervisor role is read-only and cannot start a new inspection.")

    product = db.query(Product).filter(Product.id == product_id).first() if product_id else None
    product_name = product.name.strip() if product else None
    if not batch_id and product_id:
        batch = db.query(ProductionBatch).filter(ProductionBatch.product_id == product_id).first()
        if not batch:
            batch = ProductionBatch(batch_number=f"BATCH-{product_id}-{uuid.uuid4().hex[:6].upper()}", product_id=product_id)
            db.add(batch)
            db.commit()
            db.refresh(batch)
        batch_id = batch.id

    # 1. Create inspection
    inspection = Inspection(operator_id=current_user.id, batch_id=batch_id)
    db.add(inspection)
    db.commit()
    db.refresh(inspection)
    
    # 2. Save Image
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in {".jpg", ".jpeg", ".png", ".webp"}:
        raise HTTPException(status_code=400, detail="Unsupported image format. Use JPG, JPEG, PNG, or WEBP.")
    filename = f"{uuid.uuid4()}{ext}"
    filepath = os.path.join(settings.UPLOAD_DIR, filename)
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="The uploaded image is empty.")
    with open(filepath, "wb") as f:
        f.write(content)
        
    img = InspectionImage(inspection_id=inspection.id, file_path=filepath, image_type="raw")
    db.add(img)
    db.commit()
    
    # 3. Run prediction
    processed_path = os.path.join(settings.UPLOAD_DIR, f"{os.path.splitext(filename)[0]}_processed.jpg")
    try:
        results = pipeline.inspect_image(filepath, processed_path, product_name=product_name, filename=file.filename)
    except ImageValidationError as error:
        os.remove(filepath)
        db.delete(img)
        db.delete(inspection)
        db.commit()
        raise HTTPException(status_code=400, detail=str(error))
    except Exception:
        try:
            results = pipeline.inspect_image(filepath, processed_path, product_name=product_name)
        except Exception as error:
            # A failed inference must not persist as a (fake) successful inspection.
            for leftover in (filepath, processed_path):
                try:
                    if leftover and os.path.isfile(leftover):
                        os.remove(leftover)
                except OSError:
                    pass
            db.delete(img)
            db.delete(inspection)
            db.commit()
            raise HTTPException(status_code=500, detail=f"AI inference failed: {error}")
    db.add(InspectionImage(inspection_id=inspection.id, file_path=processed_path, image_type="processed"))
    quality = results["image_quality"]
    db.add(ImageAnalysis(inspection_id=inspection.id, width=results["image_info"]["width"], height=results["image_info"]["height"], file_size_bytes=results["image_info"]["file_size_bytes"], brightness=quality["brightness"], contrast=quality["contrast"], sharpness=quality["sharpness"], quality_status=quality["quality_status"], warning=quality["warning"], model_status=results["model_status"], model_message=results["model_message"]))
    
    _store_prediction_results(db, inspection, results)
    
    log = AuditLog(user_id=current_user.id, action="AI_PREDICTION", entity="Inspection", entity_id=inspection.id)
    db.add(log)
    db.commit()
    db.refresh(inspection)
    
    return _serialize_inspection(inspection)

@router.post("/{inspection_id}/image")
async def upload_image(inspection_id: int, file: UploadFile = File(...), db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    inspection = db.query(Inspection).filter(Inspection.id == inspection_id).first()
    if not inspection:
        raise HTTPException(status_code=404, detail="Inspection not found")
        
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    ext = file.filename.split('.')[-1]
    if ext.lower() not in ['jpg', 'jpeg', 'png', 'webp']:
        raise HTTPException(status_code=400, detail="Invalid file type")
        
    filename = f"{uuid.uuid4()}.{ext}"
    filepath = os.path.join(settings.UPLOAD_DIR, filename)
    
    with open(filepath, "wb") as f:
        f.write(await file.read())
        
    img = InspectionImage(inspection_id=inspection_id, file_path=filepath, image_type="raw")
    db.add(img)
    db.commit()
    
    return {"message": "Image uploaded successfully", "file_path": filepath}

@router.post("/{inspection_id}/predict")
def run_prediction(inspection_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    inspection = db.query(Inspection).filter(Inspection.id == inspection_id).first()
    if not inspection:
        raise HTTPException(status_code=404, detail="Inspection not found")
        
    img = db.query(InspectionImage).filter(InspectionImage.inspection_id == inspection_id).first()
    if not img:
        raise HTTPException(status_code=400, detail="No image uploaded for this inspection")
        
    # Run pipeline
    results = pipeline.inspect_image(img.file_path)
    
    _store_prediction_results(db, inspection, results)
    
    log = AuditLog(user_id=current_user.id, action="AI_PREDICTION", entity="Inspection", entity_id=inspection.id)
    db.add(log)
    
    db.commit()
    return results

from pydantic import BaseModel

class OverrideRequest(BaseModel):
    final_decision: str
    override_reason: str

@router.get("/{inspection_id}")
def get_inspection(inspection_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    from sqlalchemy.orm import joinedload
    inspection = db.query(Inspection).options(
        joinedload(Inspection.images),
        joinedload(Inspection.detections).joinedload(Detection.assessment),
        joinedload(Inspection.severity_score),
        joinedload(Inspection.quality_decision),
        joinedload(Inspection.quality_assessment),
        joinedload(Inspection.batch)
    ).filter(Inspection.id == inspection_id).first()
    
    if not inspection:
        raise HTTPException(status_code=404, detail="Inspection not found")
        
    return _serialize_inspection(inspection)


@router.get("/{inspection_id}/quality-assessment")
def get_quality_assessment(inspection_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    inspection = db.query(Inspection).options(
        joinedload(Inspection.detections).joinedload(Detection.assessment),
        joinedload(Inspection.quality_assessment),
    ).filter(Inspection.id == inspection_id).first()
    if not inspection:
        raise HTTPException(status_code=404, detail="Inspection not found")
    return {
        "inspection_id": inspection.id,
        "quality_assessment": _serialize_inspection(inspection)["quality_assessment"],
        "defects": [{
            "defect_type": detection.defect_type,
            "product_category": detection.product_category,
            "defect_present": detection.defect_present,
            "defect_display_name": detection.defect_display_name,
            "detection_confidence": detection.detection_confidence,
            "classification_confidence": detection.classification_confidence,
            "category": category_label(detection.defect_type, detection.product_category),
            "confidence": detection.confidence,
            "bounding_box": [detection.bbox_x1, detection.bbox_y1, detection.bbox_x2, detection.bbox_y2],
            "area": detection.area,
            "assessment": _assessment_response(detection.assessment),
        } for detection in inspection.detections],
    }

@router.post("/{inspection_id}/override")
def override_decision(inspection_id: int, override_req: OverrideRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    inspection = db.query(Inspection).filter(Inspection.id == inspection_id).first()
    if not inspection:
        raise HTTPException(status_code=404, detail="Inspection not found")
        
    qd = db.query(QualityDecision).filter(QualityDecision.inspection_id == inspection_id).first()
    if not qd:
        raise HTTPException(status_code=400, detail="No quality decision found to override")
        
    decision = (override_req.final_decision or "").upper().strip()
    if decision not in {"PASS", "FAIL", "REVIEW", "REWORK"}:
        raise HTTPException(status_code=400, detail="Decision must be one of: PASS, FAIL, REVIEW, REWORK")
        
    qd.human_decision = decision
    qd.final_decision = decision
    qd.override_reason = override_req.override_reason
    qd.reviewer_id = current_user.id
    
    log = AuditLog(user_id=current_user.id, action="MANUAL_OVERRIDE", entity="Inspection", entity_id=inspection_id, metadata_json={"old_decision": qd.ai_decision, "new_decision": qd.final_decision})
    db.add(log)
    
    db.commit()
    
    # Return updated info
    return get_inspection(inspection_id, db, current_user)
