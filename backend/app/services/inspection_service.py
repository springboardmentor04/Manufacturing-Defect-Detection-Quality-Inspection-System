"""
VisionInspect AI - Atomic Inspection Persistence Service (Phase 7.1.2)
Persists real YOLO + Severity Engine results into PostgreSQL / SQLAlchemy tables atomically.
"""

import os
import uuid
import logging
from datetime import datetime
from typing import Dict, Any, Optional, List
from sqlalchemy.orm import Session

from app.models.roles import Role
from app.models.users import User
from app.models.products import Product
from app.models.production_lines import ProductionLine
from app.models.ai_models import AIModel
from app.models.defect_types import DefectType
from app.models.inspections import Inspection
from app.models.inspection_images import InspectionImage
from app.models.ai_predictions import AIPrediction
from app.models.bounding_boxes import BoundingBox
from app.models.defect_diagnostics import DefectDiagnostic

logger = logging.getLogger(__name__)

# Default Constants for Prerequisite Reference Lookup
DEFAULT_USER_EMAIL = "quality_engineer@factory.ai"
DEFAULT_LINE_CODE = "LINE-A1"
DEFAULT_MODEL_NAME = "YOLOv8s"
DEFAULT_MODEL_VERSION = "Phase 4.4 Architecture"


def ensure_prerequisite_reference_data(db: Session) -> Dict[str, Any]:
    """
    Ensures baseline reference data exists in the database:
    - User (Quality Engineer)
    - ProductionLine
    - AIModel (YOLOv8s Phase 4.4)
    - DefectType ("NO_DEFECT" fallback for passed inspections)
    Returns a dictionary of loaded reference objects.
    """
    # 1. Ensure Role & User
    role_qe = db.query(Role).filter(Role.role_name == "QUALITY_ENGINEER").first()
    if not role_qe:
        role_qe = Role(role_name="QUALITY_ENGINEER", description="Quality Engineer Operational Role")
        db.add(role_qe)
        db.flush()

    user = db.query(User).filter(User.email == DEFAULT_USER_EMAIL).first()
    if not user:
        user = User(
            full_name="Quality Inspector",
            email=DEFAULT_USER_EMAIL,
            password_hash="pbkdf2_sha256$hashed_default",
            role_id=role_qe.id,
            status="ACTIVE"
        )
        db.add(user)
        db.flush()

    # 2. Ensure ProductionLine
    line = db.query(ProductionLine).filter(ProductionLine.line_code == DEFAULT_LINE_CODE).first()
    if not line:
        line = ProductionLine(
            line_code=DEFAULT_LINE_CODE,
            name="Main Conveyor Line A1",
            location_building="Building 1 - Assembly Plant",
            status="OPERATIONAL",
            target_throughput_per_hour=500
        )
        db.add(line)
        db.flush()

    # 3. Ensure Deployed YOLOv8s Model Record
    ai_model = db.query(AIModel).filter(AIModel.model_version == DEFAULT_MODEL_VERSION).first()
    if not ai_model:
        ai_model = AIModel(
            model_name=DEFAULT_MODEL_NAME,
            model_version=DEFAULT_MODEL_VERSION,
            architecture="YOLOv8s (11.2M Parameters, 320x320 Input)",
            accuracy=0.4507,
            precision=0.4440,
            recall=0.4763,
            f1_score=0.4597,
            training_date=datetime.utcnow(),
            deployment_status="PRODUCTION"
        )
        db.add(ai_model)
        db.flush()

    # 4. Ensure Default "NO_DEFECT" DefectType
    no_defect_type = db.query(DefectType).filter(DefectType.code == "no_defect").first()
    if not no_defect_type:
        no_defect_type = DefectType(
            code="no_defect",
            name="No Defect (Passed)",
            default_severity="NONE",
            description="Component passed optical quality evaluation with zero defects."
        )
        db.add(no_defect_type)
        db.flush()

    return {
        "user_id": user.id,
        "production_line_id": line.id,
        "ai_model_id": ai_model.id,
        "no_defect_type_id": no_defect_type.id
    }


def get_or_create_product(db: Session, product_code: str, product_category: str) -> Product:
    """Gets or creates a Product record in database for the given product code and category."""
    if not product_code:
        raise ValueError("product_code cannot be null or empty.")

    p_code = str(product_code).strip()
    product = db.query(Product).filter(Product.product_code == p_code).first()
    if not product:
        product = Product(
            product_code=p_code,
            serial_number=f"SN-{uuid.uuid4().hex[:8].upper()}",
            batch_number=f"BATCH-{datetime.utcnow().strftime('%Y%m%d')}",
            name=f"{product_category.capitalize()} Component",
            category=product_category.lower().strip()
        )
        db.add(product)
        db.flush()
    return product


def get_or_create_defect_type(db: Session, defect_code: str) -> DefectType:
    """Gets or creates a DefectType record for the given defect class name."""
    code_clean = (defect_code or "no_defect").strip().lower()
    if code_clean == "no defect (passed)":
        code_clean = "no_defect"

    d_type = db.query(DefectType).filter(DefectType.code == code_clean).first()
    if not d_type:
        d_type = DefectType(
            code=code_clean,
            name=code_clean.replace("_", " ").title(),
            default_severity="NONE" if code_clean == "no_defect" else "MEDIUM",
            description=f"YOLO Defect Class: {code_clean}"
        )
        db.add(d_type)
        db.flush()
    return d_type


def persist_complete_inspection(
    db: Session,
    product_code: str,
    product_category: str,
    file_path: str,
    severity_eval: Dict[str, Any],
    inference_time_ms: float = 72.75,
    user_id: Optional[uuid.UUID] = None,
    production_line_id: Optional[uuid.UUID] = None
) -> Dict[str, Any]:
    """
    Atomically persists a complete AI Inspection record to database:
    - Inspection
    - InspectionImage
    - AIPrediction
    - BoundingBox (for each detection)
    - DefectDiagnostic

    Executes inside an atomic transaction. On error, rolls back completely.
    """
    if not product_code:
        raise ValueError("product_code is required for persistence.")

    try:
        # Step 1: Reference Data Lookup
        ref_data = ensure_prerequisite_reference_data(db)
        eff_user_id = user_id or ref_data["user_id"]
        eff_line_id = production_line_id or ref_data["production_line_id"]
        eff_model_id = ref_data["ai_model_id"]
        no_defect_type_id = ref_data["no_defect_type_id"]

        # Step 2: Product Lookup/Creation
        product = get_or_create_product(db, product_code, product_category)

        # Step 3: Create Inspection Record
        inspection_code = f"INSP-{uuid.uuid4().hex[:8].upper()}"
        status_str = severity_eval["inspection_status"]
        top_conf = 99.0
        if severity_eval["detections"]:
            top_conf = max(d["confidence"] for d in severity_eval["detections"]) * 100.0

        inspection = Inspection(
            inspection_code=inspection_code,
            product_id=product.id,
            production_line_id=eff_line_id,
            inspected_by_user_id=eff_user_id,
            status=status_str,
            confidence_score=round(top_conf, 2),
            inspected_at=datetime.utcnow()
        )
        db.add(inspection)
        db.flush()

        # Step 4: Create InspectionImage Record
        file_size = 0
        if file_path and os.path.exists(file_path):
            try:
                file_size = os.path.getsize(file_path)
            except Exception:
                file_size = 0

        insp_image = InspectionImage(
            inspection_id=inspection.id,
            file_path=file_path or "sample_placeholder.jpg",
            file_size_bytes=file_size,
            image_resolution="320x320",
            uploaded_at=datetime.utcnow()
        )
        db.add(insp_image)
        db.flush()

        # Step 5: Create AIPrediction Record
        top_defect_label = "No Defect (Passed)"
        if severity_eval["detections"]:
            top_det = max(severity_eval["detections"], key=lambda d: d["individual_severity_score"])
            top_defect_label = top_det["defect_class"]

        ai_pred = AIPrediction(
            inspection_image_id=insp_image.id,
            model_id=eff_model_id,
            predicted_label=top_defect_label,
            confidence_percentage=round(top_conf, 2),
            inference_time_ms=round(inference_time_ms, 2),
            executed_at=datetime.utcnow()
        )
        db.add(ai_pred)
        db.flush()

        # Step 6: Create BoundingBox Records for Each Detection
        primary_defect_type = None
        for det in severity_eval["detections"]:
            d_class = det["defect_class"]
            conf_val = det["confidence"]
            bbox = det.get("bounding_box", {})
            d_type = get_or_create_defect_type(db, d_class)
            if d_type and primary_defect_type is None:
                primary_defect_type = d_type

            bbox_record = BoundingBox(
                inspection_image_id=insp_image.id,
                defect_type_id=d_type.id,
                x_min=int(bbox.get("x_min", 0)),
                y_min=int(bbox.get("y_min", 0)),
                width=int(bbox.get("width", 0)),
                height=int(bbox.get("height", 0)),
                confidence=round(conf_val * 100.0, 2)
            )
            db.add(bbox_record)

        # Step 7: Create DefectDiagnostic Record
        overall_sev = severity_eval["overall_severity"]
        overall_score = severity_eval["overall_score"]
        reason = severity_eval["decision_reason"]

        eff_defect_type_id = primary_defect_type.id if primary_defect_type else no_defect_type_id

        diagnostic = DefectDiagnostic(
            inspection_id=inspection.id,
            defect_type_id=eff_defect_type_id,
            severity=overall_sev,
            severity_score=round(overall_score, 2),
            description=f"Automated AI defect analysis: {reason}",
            root_cause="Process line tension variation or thermal reflow stress." if status_str != "PASS" else "None",
            suggested_action="Quarantine component immediately." if status_str != "PASS" else "Approve component for distribution."
        )
        db.add(diagnostic)

        # Step 8: Commit Transaction
        db.commit()

        logger.info(f"Atomically persisted Inspection '{inspection_code}' in database (Status: {status_str}, Score: {overall_score:.2f}).")

        return {
            "inspection_id": str(inspection.id),
            "inspection_code": inspection_code,
            "product_code": product.product_code,
            "status": status_str,
            "overall_severity": overall_sev,
            "overall_score": overall_score,
            "confidence_score": round(top_conf, 2),
            "persistence_status": "SUCCESS"
        }

    except Exception as e:
        db.rollback()
        logger.error(f"Failed atomic inspection persistence: {str(e)}")
        raise e
