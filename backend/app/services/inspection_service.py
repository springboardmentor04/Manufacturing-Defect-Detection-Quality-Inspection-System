from sqlalchemy.orm import Session

from app.models.inspection import Inspection
from app.schemas.inspection import InspectionCreate


class InspectionService:

    # ==========================================
    # Create New Inspection
    # ==========================================
    @staticmethod
    def create_inspection(
        db: Session,
        inspection: InspectionCreate,
    ):
        new_inspection = Inspection(
            engineer_id=inspection.engineer_id,
            product_name=inspection.product_name,
            image_path=inspection.image_path,
            status=inspection.status,
        )

        db.add(new_inspection)
        db.commit()
        db.refresh(new_inspection)

        return new_inspection

    # ==========================================
    # Update AI Prediction Result
    # ==========================================
    @staticmethod
    def update_prediction(
        db: Session,
        inspection_id: int,
        status: str,
        defect_type: str,
        confidence: float,
        processing_time: float,
        result_image: str,
        severity: str,
        severity_score: int,
        recommendation: str,
    ):
        inspection = (
            db.query(Inspection)
            .filter(Inspection.id == inspection_id)
            .first()
        )

        if inspection is None:
            return None

        inspection.status = status
        inspection.defect_type = defect_type
        inspection.confidence = confidence
        inspection.processing_time = processing_time
        inspection.result_image = result_image

        # ==========================================
        # AI Decision
        # ==========================================

        inspection.severity = severity
        inspection.severity_score = severity_score
        inspection.recommendation = recommendation

        db.commit()
        db.refresh(inspection)

        return inspection

    # ==========================================
    # Get All Inspections
    # ==========================================
    @staticmethod
    def get_all(db: Session):
        return (
            db.query(Inspection)
            .order_by(Inspection.created_at.desc())
            .all()
        )

    # ==========================================
    # Get Inspection By ID
    # ==========================================
    @staticmethod
    def get_by_id(
        db: Session,
        inspection_id: int,
    ):
        return (
            db.query(Inspection)
            .filter(Inspection.id == inspection_id)
            .first()
        )

    # ==========================================
    # Get Inspections By Engineer
    # ==========================================
    @staticmethod
    def get_by_engineer(
        db: Session,
        engineer_id: int,
    ):
        return (
            db.query(Inspection)
            .filter(Inspection.engineer_id == engineer_id)
            .order_by(Inspection.created_at.desc())
            .all()
        )

    # ==========================================
    # Delete Inspection
    # ==========================================
    @staticmethod
    def delete_inspection(
        db: Session,
        inspection_id: int,
    ):
        inspection = (
            db.query(Inspection)
            .filter(Inspection.id == inspection_id)
            .first()
        )

        if inspection is None:
            return False

        db.delete(inspection)
        db.commit()

        return True