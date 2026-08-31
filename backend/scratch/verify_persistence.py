"""
Phase 7.1.4 Verification Script: Verifies atomic persistence of real YOLO + Severity Engine inspections.
"""

import os
import sys

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
BACKEND_ROOT = os.path.join(PROJECT_ROOT, "backend")
if BACKEND_ROOT not in sys.path:
    sys.path.insert(0, BACKEND_ROOT)

from ultralytics import YOLO
from app.database import SessionLocal, engine, Base
from app.models.inspections import Inspection
from app.models.inspection_images import InspectionImage
from app.models.ai_predictions import AIPrediction
from app.models.bounding_boxes import BoundingBox
from app.models.defect_diagnostics import DefectDiagnostic
from app.services.severity_engine import evaluate_inspection_severity
from app.services.inspection_service import persist_complete_inspection

def verify_persistence():
    print("=" * 60)
    print("PHASE 7.1.4 PERSISTENCE VERIFICATION")
    print("=" * 60)

    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # Load real test image
        test_img_path = os.path.join(PROJECT_ROOT, "dataset_yolo", "images", "test", "bottle_broken_large_000.png")
        if not os.path.exists(test_img_path):
            test_img_path = os.path.join(PROJECT_ROOT, "dataset_yolo", "images", "test", "bottle_broken_large_003.png")

        print(f"Test Image Path: {test_img_path}")

        # Run real YOLOv8s inference
        weights_path = os.path.join(PROJECT_ROOT, "runs", "detect", "yolo_phase4_4_architecture", "weights", "best.pt")
        if not os.path.exists(weights_path):
            weights_path = os.path.join(BACKEND_ROOT, "yolov8s.pt")

        model = YOLO(weights_path)
        results = model.predict(source=test_img_path, imgsz=320, conf=0.25, verbose=False)

        raw_predictions = []
        if results and len(results) > 0:
            boxes = results[0].boxes
            names = results[0].names
            for box in boxes:
                cls_id = int(box.cls[0].item())
                c_name = names.get(cls_id, f"class_{cls_id}")
                conf_val = float(box.conf[0].item())
                xywh = box.xywh[0].tolist()
                w_box = float(xywh[2])
                h_box = float(xywh[3])
                x_min = float(xywh[0] - w_box / 2.0)
                y_min = float(xywh[1] - h_box / 2.0)

                raw_predictions.append({
                    "defect_class": c_name,
                    "confidence": conf_val,
                    "defect_area": w_box * h_box,
                    "bounding_box": {
                        "x_min": int(x_min),
                        "y_min": int(y_min),
                        "width": int(w_box),
                        "height": int(h_box)
                    }
                })

        severity_eval = evaluate_inspection_severity(
            raw_predictions=raw_predictions,
            product_category="bottle"
        )

        # Execute Atomic Persistence
        persisted = persist_complete_inspection(
            db=db,
            product_code="PRD-BOTTLE-001",
            product_category="bottle",
            file_path=test_img_path,
            severity_eval=severity_eval,
            inference_time_ms=72.75
        )

        insp_id = persisted["inspection_id"]
        print(f"\nPersisted Inspection Code: {persisted['inspection_code']} (ID: {insp_id})")

        # Query Database directly to verify rows
        insp_row = db.query(Inspection).filter(Inspection.id == insp_id).first()
        img_row = db.query(InspectionImage).filter(InspectionImage.inspection_id == insp_id).first()
        pred_row = db.query(AIPrediction).filter(AIPrediction.inspection_image_id == img_row.id).first() if img_row else None
        bbox_rows = db.query(BoundingBox).filter(BoundingBox.inspection_image_id == img_row.id).all() if img_row else []
        diag_row = db.query(DefectDiagnostic).filter(DefectDiagnostic.inspection_id == insp_id).first()

        print("\nDATABASE QUERY VERIFICATION RESULTS:")
        print(f"  1. Inspection Record Exists:     {insp_row is not None} (Status: {insp_row.status if insp_row else 'N/A'})")
        print(f"  2. InspectionImage Record Exists: {img_row is not None} (Path: {img_row.file_path if img_row else 'N/A'})")
        print(f"  3. AIPrediction Record Exists:   {pred_row is not None} (Label: {pred_row.predicted_label if pred_row else 'N/A'})")
        print(f"  4. BoundingBox Records Count:    {len(bbox_rows)}")
        print(f"  5. DefectDiagnostic Exists:      {diag_row is not None}")
        print(f"  6. Diagnostic Severity Level:    {diag_row.severity if diag_row else 'N/A'}")
        print(f"  7. Diagnostic Severity Score:    {diag_row.severity_score if diag_row else 'N/A'}")

        success = (
            insp_row is not None and
            img_row is not None and
            pred_row is not None and
            diag_row is not None and
            insp_row.status == severity_eval["inspection_status"] and
            float(diag_row.severity_score) == round(severity_eval["overall_score"], 2)
        )

        print("\n" + "=" * 60)
        if success:
            print("[SUCCESS] ALL PERSISTENCE VERIFICATION CHECKS PASSED")
        else:
            print("[FAILURE] PERSISTENCE VERIFICATION FAILED")
        print("=" * 60)
        return success

    finally:
        db.close()

if __name__ == "__main__":
    verify_persistence()
