from fastapi import (
    APIRouter,
    UploadFile,
    File,
    HTTPException,
    Depends
)
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from pathlib import Path
import shutil
import uuid
from io import BytesIO
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from datetime import datetime, timedelta

from app.database import get_db
from app.models.user import User
from app.models.inspection import Inspection
from app.auth.dependencies import get_current_user
from app.inspections.preprocessing import preprocess_image
from app.ml.yolo_predictor import predict_defect
from app.inspections.severity import calculate_severity

# ============================================================
# ROUTER
# ============================================================

router = APIRouter(
    prefix="/inspections",
    tags=["Inspections"]
)

# ============================================================
# UPLOAD DIRECTORY
# ============================================================

UPLOAD_DIR = Path("uploads/inspections")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# ============================================================
# UPLOAD + AI INSPECTION
# ============================================================

@router.post("/upload")
async def upload_inspection_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "QUALITY_ENGINEER":
        raise HTTPException(status_code=403, detail="Only Quality Engineers can upload inspection images")

    allowed_types = ["image/jpeg", "image/jpg", "image/png"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Only JPG, JPEG and PNG images are allowed")

    file_extension = Path(file.filename or "").suffix.lower()
    if not file_extension:
        file_extension = ".jpg"

    unique_filename = f"{uuid.uuid4()}{file_extension}"
    file_path = UPLOAD_DIR / unique_filename

    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save image: {str(e)}")

    try:
        processed_image_path = preprocess_image(str(file_path))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Image preprocessing failed: {str(e)}")

    good_probability = None
    defect_probability = None
    boxes = []
    anomaly_score = 0.0
    cv_flags = []
    detection_source = "none"

    try:
        prediction_result = predict_defect(processed_image_path)
        prediction        = prediction_result["prediction"]
        confidence        = prediction_result["confidence"]
        good_probability  = prediction_result.get("good_probability", None)
        defect_probability = prediction_result.get("defect_probability", None)
        boxes             = prediction_result.get("boxes", [])
        anomaly_score     = prediction_result.get("anomaly_score", 0.0)
        cv_flags          = prediction_result.get("cv_flags", [])
        detection_source  = prediction_result.get("detection_source", "none")
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=f"AI model not available: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI prediction failed: {str(e)}")

    severity_data = {}
    if prediction == "DEFECT":
        inspection_result = "FAIL"
        severity_data = calculate_severity(confidence or 0.0, boxes)
    else:
        inspection_result = "PASS"

    inspection = Inspection(
        user_id=current_user.id,
        image_path=str(processed_image_path),
        status="COMPLETED",
        preprocessing_status="COMPLETED",
        prediction=prediction,
        confidence=confidence,
        inspection_result=inspection_result,
        defect_type=severity_data.get("defect_type"),
        defect_size_score=severity_data.get("defect_size_score"),
        defect_location_score=severity_data.get("defect_location_score"),
        severity_score=severity_data.get("severity_score"),
        severity_level=severity_data.get("severity_level"),
        recommended_action=severity_data.get("recommended_action")
    )

    try:
        db.add(inspection)
        db.commit()
        db.refresh(inspection)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to save inspection: {str(e)}")

    return {
        "message": "AI inspection completed successfully",
        "inspection_id": inspection.id,
        "uploaded_by": current_user.email,
        "user_id": current_user.id,
        "original_file_path": str(file_path),
        "processed_file_path": str(processed_image_path),
        "prediction": prediction,
        "confidence": confidence,
        "good_probability": good_probability,
        "defect_probability": defect_probability,
        "boxes": boxes,
        "inspection_result": inspection_result,
        "status": inspection.status,
        "preprocessing_status": inspection.preprocessing_status,
        "defect_type": inspection.defect_type,
        "defect_size_score": inspection.defect_size_score,
        "defect_location_score": inspection.defect_location_score,
        "severity_score": inspection.severity_score,
        "severity_level": inspection.severity_level,
        "recommended_action": inspection.recommended_action,
        "anomaly_score": anomaly_score,
        "cv_flags": cv_flags,
        "detection_source": detection_source
    }

# ============================================================
# GET INSPECTION HISTORY
# ============================================================

@router.get("/")
def get_inspection_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    inspections = (
        db.query(Inspection)
        .filter(Inspection.user_id == current_user.id)
        .order_by(Inspection.created_at.desc())
        .all()
    )
    return inspections

# ============================================================
# SUPERVISOR INSPECTION OVERVIEW
# ============================================================

@router.get("/supervisor/overview")
def supervisor_overview(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "FACTORY_SUPERVISOR":
        raise HTTPException(status_code=403, detail="Only Factory Supervisors can access this dashboard")

    inspections = db.query(Inspection).order_by(Inspection.created_at.desc()).all()
    total_inspections = len(inspections)
    total_defects = sum(1 for i in inspections if i.prediction == "DEFECT")
    total_good = sum(1 for i in inspections if i.prediction == "GOOD")
    defect_rate = round((total_defects / total_inspections) * 100, 2) if total_inspections > 0 else 0
    average_confidence = round(sum(i.confidence or 0 for i in inspections) / total_inspections, 2) if total_inspections > 0 else 0

    return {
        "total_inspections": total_inspections,
        "total_defects": total_defects,
        "total_good": total_good,
        "defect_rate": defect_rate,
        "average_confidence": average_confidence,
        "recent_inspections": [
            {
                "id": i.id,
                "prediction": i.prediction,
                "confidence": i.confidence,
                "inspection_result": i.inspection_result,
                "status": i.status,
                "preprocessing_status": i.preprocessing_status,
                "created_at": i.created_at
            }
            for i in inspections[:10]
        ]
    }

# ============================================================
# SUPERVISOR ANALYTICS DASHBOARD
# ============================================================

@router.get("/supervisor/analytics")
def supervisor_analytics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "FACTORY_SUPERVISOR":
        raise HTTPException(status_code=403, detail="Only Factory Supervisors can access this dashboard")

    inspections = db.query(Inspection).all()
    
    # Defect Types Distribution
    defect_types = {}
    severity_levels = {"Critical": 0, "High": 0, "Medium": 0, "Low": 0}
    
    for i in inspections:
        if i.prediction == "DEFECT":
            # Defect Types
            dtype = i.defect_type or "Unknown"
            defect_types[dtype] = defect_types.get(dtype, 0) + 1
            
            # Severity Levels
            slevel = i.severity_level or "Unknown"
            if slevel in severity_levels:
                severity_levels[slevel] += 1
            elif slevel != "Unknown":
                severity_levels[slevel] = 1

    # Trend Data (Last 7 days)
    trend_data = []
    today = datetime.utcnow().date()
    
    for days_ago in range(6, -1, -1):
        target_date = today - timedelta(days=days_ago)
        daily_inspections = [i for i in inspections if i.created_at and i.created_at.date() == target_date]
        
        total_daily = len(daily_inspections)
        defects_daily = sum(1 for i in daily_inspections if i.prediction == "DEFECT")
        
        trend_data.append({
            "date": target_date.strftime("%Y-%m-%d"),
            "day": target_date.strftime("%a"),
            "total": total_daily,
            "defects": defects_daily
        })

    return {
        "defect_types_distribution": [{"name": k, "value": v} for k, v in defect_types.items()],
        "severity_distribution": [{"name": k, "value": v} for k, v in severity_levels.items()],
        "trend_data": trend_data
    }

# ============================================================
# DOWNLOAD INSPECTION PDF REPORT
# ============================================================

@router.get("/{inspection_id}/report")
def download_inspection_report(
    inspection_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    inspection = db.query(Inspection).filter(Inspection.id == inspection_id).first()
    if not inspection:
        raise HTTPException(status_code=404, detail="Inspection not found")

    if current_user.role == "QUALITY_ENGINEER" and inspection.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only access your own inspection reports")

    buffer = BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4

    y = height - 50
    pdf.setFont("Helvetica-Bold", 20)
    pdf.drawString(50, y, "VisionInspectAI")

    y -= 25
    pdf.setFont("Helvetica", 11)
    pdf.drawString(50, y, "AI Visual Inspection Report")

    y -= 25
    pdf.line(50, y, width - 50, y)

    y -= 35
    pdf.setFont("Helvetica-Bold", 13)
    pdf.drawString(50, y, "Inspection Details")

    y -= 30
    report_data = [
        ("Inspection ID", inspection.id),
        ("Prediction", inspection.prediction),
        ("AI Confidence", f"{inspection.confidence}%"),
        ("Inspection Result", inspection.inspection_result),
        ("Severity Level", f"{inspection.severity_level} ({inspection.severity_score})" if inspection.severity_level else "N/A"),
        ("Defect Type", inspection.defect_type if inspection.defect_type else "N/A"),
        ("Recommended Action", inspection.recommended_action if inspection.recommended_action else "N/A"),
        ("Status", inspection.status),
        ("Preprocessing", inspection.preprocessing_status),
        ("Image Path", inspection.image_path),
        ("Uploaded By", current_user.email),
        ("Created At", str(inspection.created_at))
    ]

    for label, value in report_data:
        pdf.setFont("Helvetica-Bold", 10)
        pdf.drawString(50, y, f"{label}:")
        pdf.setFont("Helvetica", 10)
        value_text = str(value)
        if len(value_text) > 70:
            value_text = value_text[:67] + "..."
        pdf.drawString(170, y, value_text)
        y -= 23

    y -= 20
    pdf.setFont("Helvetica-Bold", 13)
    pdf.drawString(50, y, "AI Inspection Summary")

    y -= 25
    pdf.setFont("Helvetica", 10)

    if inspection.prediction == "DEFECT":
        summary = "The AI model detected a potential manufacturing defect in the inspected image."
    else:
        summary = "The AI model classified the inspected image as a good-quality product."

    words = summary.split()
    line = ""
    for word in words:
        test_line = line + word + " "
        if len(test_line) > 85:
            pdf.drawString(50, y, line)
            y -= 18
            line = word + " "
        else:
            line = test_line
    if line:
        pdf.drawString(50, y, line)

    y -= 40
    pdf.setFont("Helvetica-Bold", 12)
    pdf.drawString(50, y, "Final Result:")
    pdf.setFont("Helvetica-Bold", 12)
    pdf.drawString(150, y, str(inspection.inspection_result))

    pdf.setFont("Helvetica-Oblique", 8)
    pdf.drawString(50, 30, "Generated by VisionInspectAI AI Visual Inspection System")

    pdf.showPage()
    pdf.save()

    buffer.seek(0)
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=inspection_{inspection.id}_report.pdf"
        }
    )

# ============================================================
# DOWNLOAD SUPERVISOR PRODUCTION QUALITY REPORT
# ============================================================

@router.get("/supervisor/report/download")
def download_supervisor_report(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "FACTORY_SUPERVISOR":
        raise HTTPException(status_code=403, detail="Only Factory Supervisors can download this report")

    inspections = db.query(Inspection).all()
    total_inspections = len(inspections)
    total_defects = sum(1 for i in inspections if i.prediction == "DEFECT")
    total_good = sum(1 for i in inspections if i.prediction == "GOOD")
    defect_rate = round((total_defects / total_inspections) * 100, 2) if total_inspections > 0 else 0

    buffer = BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4

    y = height - 50
    pdf.setFont("Helvetica-Bold", 20)
    pdf.drawString(50, y, "VisionInspectAI")

    y -= 25
    pdf.setFont("Helvetica", 11)
    pdf.drawString(50, y, "Production Quality Report")

    y -= 25
    pdf.line(50, y, width - 50, y)

    y -= 35
    pdf.setFont("Helvetica-Bold", 13)
    pdf.drawString(50, y, "Factory Overview")

    y -= 30
    report_data = [
        ("Total Inspections", total_inspections),
        ("Good Products", total_good),
        ("Defects Detected", total_defects),
        ("Defect Rate", f"{defect_rate}%"),
        ("Generated By", current_user.email),
        ("Date", str(datetime.utcnow().date()))
    ]

    for label, value in report_data:
        pdf.setFont("Helvetica-Bold", 10)
        pdf.drawString(50, y, f"{label}:")
        pdf.setFont("Helvetica", 10)
        pdf.drawString(170, y, str(value))
        y -= 23

    y -= 20
    pdf.setFont("Helvetica-Bold", 13)
    pdf.drawString(50, y, "Recent Defects")
    y -= 25

    defects = [i for i in inspections if i.prediction == "DEFECT"]
    defects.sort(key=lambda x: x.created_at, reverse=True)
    
    pdf.setFont("Helvetica-Bold", 9)
    pdf.drawString(50, y, "ID")
    pdf.drawString(100, y, "Defect Type")
    pdf.drawString(250, y, "Severity")
    pdf.drawString(320, y, "Score")
    pdf.drawString(370, y, "Date")
    y -= 20

    pdf.setFont("Helvetica", 9)
    for d in defects[:15]:
        pdf.drawString(50, y, str(d.id))
        pdf.drawString(100, y, str(d.defect_type)[:25])
        pdf.drawString(250, y, str(d.severity_level))
        pdf.drawString(320, y, str(d.severity_score))
        pdf.drawString(370, y, str(d.created_at.date()))
        y -= 15
        if y < 50:
            pdf.showPage()
            y = height - 50
            pdf.setFont("Helvetica", 9)

    pdf.showPage()
    pdf.save()

    buffer.seek(0)
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": "attachment; filename=production_quality_report.pdf"
        }
    )