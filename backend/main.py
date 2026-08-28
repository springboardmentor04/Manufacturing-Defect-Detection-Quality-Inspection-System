import os
import io
import uuid
from datetime import datetime
import cv2
from typing import Any, Dict, List
from fastapi import FastAPI, UploadFile, File, Request, HTTPException, Body
from fastapi.responses import Response
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from ultralytics import YOLO
from routers.auth import router as auth_router
from routers.analytics import router as analytics_router
from routers.telemetry import router as telemetry_router
from routers.telemetry import record_inspection
from routers.inspect import router as inspect_router
from services.ai_engine import ai_engine
from services import rule_engine
from utils.label_helpers import (
    build_yolo_label_lines,
    save_uploaded_image_to_dataset,
    validate_dataset_labels as validate_dataset_labels_helper,
    write_yolo_label_file,
)
from database import engine, Base
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle

# Ensure SQLAlchemy ORM models are imported before session use
from models import User, Inspection  # noqa: F401

Base.metadata.create_all(bind=engine)

# ==========================================
# 1. INITIALIZE FASTAPI APP & CORS
# ==========================================
app = FastAPI(
    title="InfoVisionAI Backend API",
    version="1.0.0",
    description="Quality Inspection & AI Defect Detection Engine"
)

# Enable CORS so frontend (e.g., React on port 3000) can communicate seamlessly
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================================
# 2. ABSOLUTE PATH CONFIGURATION & STATIC MOUNT
# ==========================================
# Resolves paths relative to this file's location to prevent path bugs
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
REPORTS_DIR = os.path.join(UPLOAD_DIR, "reports")
MODELS_DIR = os.path.join(BASE_DIR, "models")

# Automatically create required directories on disk
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(REPORTS_DIR, exist_ok=True)
os.makedirs(MODELS_DIR, exist_ok=True)

# Mount static route -> Allows browser access at http://127.0.0.1:8000/uploads/<filename>
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

DATASET_DIR = os.path.abspath(os.path.join(BASE_DIR, "..", "dataset"))

# Register routers
app.include_router(auth_router)
app.include_router(analytics_router)
app.include_router(telemetry_router)
app.include_router(inspect_router)

# ==========================================
# 3. YOLO MODEL INITIALIZATION
# ==========================================
MODEL_PATH = os.path.join(MODELS_DIR, "best.pt")
model = None

if os.path.exists(MODEL_PATH):
    print(f"🤖 Loading AI Model from {MODEL_PATH}")
    try:
        model = YOLO(MODEL_PATH)
    except Exception as e:
        print(f"❌ Error loading YOLO model: {e}")
else:
    print(f"⚠️ Warning: Model file not found at {MODEL_PATH}. Running in simulation mode.")


# ==========================================
# 4. API ENDPOINTS
# ==========================================

@app.get("/")
def root():
    return {
        "status": "online",
        "message": "InfoVisionAI API is operational"
    }

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "model_loaded": model is not None,
        "model_path": MODEL_PATH if model else "simulation_mode"
    }


@app.post("/api/v1/inspection/report-pdf")
def generate_quality_report_pdf(payload: Dict[str, Any] = Body(...)):
    """Create a downloadable PDF from a completed live inspection result."""
    scan_id = str(payload.get("scanId") or "inspection")
    assessment = payload.get("assessment") or {}
    report = payload.get("report") or {}
    detections = payload.get("detections") or []

    buffer = io.BytesIO()
    document = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=16 * mm,
        leftMargin=16 * mm,
        topMargin=16 * mm,
        bottomMargin=16 * mm,
        title=f"Production Quality Report - {scan_id}",
    )
    styles = getSampleStyleSheet()
    story = [
        Paragraph("Production Quality Inspection Report", styles["Title"]),
        Spacer(1, 6 * mm),
    ]
    summary_rows = [
        ["Report ID", report.get("report_id", "")],
        ["Scan ID", scan_id],
        ["Generated", report.get("generated_at") or payload.get("timestamp", "")],
        ["Status", payload.get("overall_status", "")],
        ["Decision", assessment.get("decision", "")],
        ["Quality Score / Grade", f"{payload.get('quality_score', 0)} / {payload.get('quality_grade', 'N/A')}"],
        ["Severity Score / Level", f"{payload.get('severity_score', 0)} / {payload.get('severity', 'UNKNOWN')}"],
        ["Model Confidence", f"{float(payload.get('confidence') or 0) * 100:.1f}%"],
        ["Defects Detected", str(payload.get("defects_detected", len(detections)))],
        ["Primary Defect", assessment.get("primary_defect", "")],
    ]
    summary_table = Table(summary_rows, colWidths=[48 * mm, 125 * mm])
    summary_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#E2E8F0")),
        ("TEXTCOLOR", (0, 0), (-1, -1), colors.HexColor("#0F172A")),
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#94A3B8")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("PADDING", (0, 0), (-1, -1), 6),
    ]))
    story.extend([summary_table, Spacer(1, 6 * mm)])

    story.append(Paragraph("Quality Assessment", styles["Heading2"]))
    story.append(Paragraph(str(assessment.get("summary") or payload.get("details") or ""), styles["BodyText"]))
    story.append(Spacer(1, 2 * mm))
    story.append(Paragraph(f"<b>Recommended action:</b> {assessment.get('recommended_action', '')}", styles["BodyText"]))
    story.append(Spacer(1, 6 * mm))

    story.append(Paragraph("Defect Classification", styles["Heading2"]))
    defect_rows = [["Defect", "Confidence", "Severity", "Score", "Area"]]
    for detection in detections:
        defect_rows.append([
            str(detection.get("class", "")),
            f"{float(detection.get('confidence') or 0) * 100:.1f}%",
            str(detection.get("severity", "")),
            str(detection.get("severity_score", "")),
            f"{detection.get('area_percent', 0)}%",
        ])
    if len(defect_rows) == 1:
        defect_rows.append(["No classified defects", "-", "-", "-", "-"])
    defect_table = Table(defect_rows, repeatRows=1, colWidths=[58 * mm, 30 * mm, 30 * mm, 25 * mm, 25 * mm])
    defect_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1D4ED8")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#94A3B8")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("PADDING", (0, 0), (-1, -1), 5),
    ]))
    story.append(defect_table)
    document.build(story)

    filename = f"{scan_id}-quality-report.pdf".replace("/", "-").replace("\\", "-")
    return Response(
        content=buffer.getvalue(),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


DEFECT_RISK_WEIGHTS = {
    "Surface Scratch": 38.0,
    "Cracked Solder Joint": 78.0,
    "Missing Component": 92.0,
    "Misalignment": 68.0,
    "Cracked Screen": 94.0,
}


def score_detection(class_name: str, confidence: float, bbox: list[float], image_shape: tuple[int, int]) -> tuple[float, str, float]:
    """Calculate a bounded severity score from defect risk, confidence, and relative area."""
    height, width = image_shape
    x1, y1, x2, y2 = bbox
    area_ratio = max(0.0, (x2 - x1) * (y2 - y1)) / max(1.0, float(width * height))
    base_risk = DEFECT_RISK_WEIGHTS.get(class_name, 55.0)
    score = min(100.0, base_risk * 0.55 + confidence * 100.0 * 0.25 + min(100.0, area_ratio * 500.0) * 0.20)
    if score >= 80:
        level = "CRITICAL"
    elif score >= 60:
        level = "HIGH"
    elif score >= 40:
        level = "MEDIUM"
    else:
        level = "LOW"
    return round(score, 1), level, round(area_ratio * 100.0, 2)

@app.post("/api/v1/inspection/analyze-image")
async def analyze_image(
    request: Request,
    file: UploadFile = File(...),
    save_to_dataset: bool = False,
    dataset_split: str = "val",
):
    # 1. Validate image MIME type
    content_type = file.content_type or ""
    if content_type and not content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Uploaded file must be a valid image format.")

    # 2. Generate unique UUID filename
    file_extension = os.path.splitext(file.filename)[1] or ".jpg"
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    
    # 3. Save directly to absolute UPLOAD_DIR
    file_save_path = os.path.join(UPLOAD_DIR, unique_filename)

    contents = await file.read()
    with open(file_save_path, "wb") as f:
        f.write(contents)

    # 4. Construct accessible web URL
    base_url = str(request.base_url).rstrip("/")
    image_url = f"{base_url}/uploads/{unique_filename}"

    detections = []
    # Object detection finding nothing is not proof that a component is good.
    # A pass requires a separate normal/pass classifier or manual verification.
    overall_status = "INCONCLUSIVE"

    # 5. Run AI Detection or Fallback Simulation
    if model is not None:
        try:
            # Cracks are thin, irregular features and are commonly assigned a
            # lower detector score than compact component defects. Keep a low
            # candidate threshold, then send every candidate for review rather
            # than treating a weak/no detection as a verified pass.
            results = model.predict(source=file_save_path, conf=0.10)
            for r in results:
                for box in r.boxes:
                    cls_id = int(box.cls[0])
                    class_name = model.names[cls_id] if hasattr(model, 'names') else f"Defect_{cls_id}"
                    confidence = float(box.conf[0])
                    coords = box.xyxy[0].tolist()

                    detections.append({
                        "class": class_name,
                        "confidence": round(confidence, 4),
                        "bbox": [round(c, 2) for c in coords],
                    })

        except Exception as e:
            print(f"Error during model inference: {e}")
    else:
        # Simulation output when best.pt model isn't present
        detections = [
            {
                "class": "Simulated_Surface_Scratch",
                "confidence": 0.94,
                "bbox": [120.0, 80.0, 240.0, 190.0],
                "severity": "LOW"
            }
        ]
        overall_status = "FLAGGED"

    # 6. Scan metadata for dashboard-compatible results
    scan_id = f"SCAN-{uuid.uuid4().hex[:8].upper()}"
    defects_detected = len(detections)
    top_confidence = max((d["confidence"] for d in detections), default=0.0)

    img = cv2.imread(file_save_path)
    image_shape = (img.shape[0], img.shape[1]) if img is not None else (1, 1)

    for detection in detections:
        score, level, area_percent = score_detection(
            detection["class"], detection["confidence"], detection["bbox"], image_shape
        )
        detection["severity_score"] = score
        detection["severity"] = level
        detection["area_percent"] = area_percent

    severity_score = max((d["severity_score"] for d in detections), default=0.0)
    severity = max(
        (d["severity"] for d in detections),
        default="UNKNOWN",
        key=lambda level: {"UNKNOWN": 0, "LOW": 1, "MEDIUM": 2, "HIGH": 3, "CRITICAL": 4}[level],
    )
    if detections:
        overall_status = "FAILED" if severity in {"HIGH", "CRITICAL"} else "FLAGGED"

    if defects_detected > 0:
        best_defect = max(detections, key=lambda d: d["confidence"])
        x_min, y_min, x_max, y_max = best_defect["bbox"]
        bounding_box = {
            "x": round(x_min / image_shape[1] * 100, 1),
            "y": round(y_min / image_shape[0] * 100, 1),
            "width": round((x_max - x_min) / image_shape[1] * 100, 1),
            "height": round((y_max - y_min) / image_shape[0] * 100, 1),
            "label": best_defect["class"],
        }
        details = (
            f"{severity.title()}-severity {best_defect['class']} detected. Immediate review required."
            if overall_status == "FAILED"
            else "Potential defect detected. Please review the image."
        )
    else:
        bounding_box = None
        details = "No defect was detected with sufficient confidence. Manual review required; this scan is not a pass."

    quality_score = round(max(0.0, 100.0 - severity_score), 1)
    quality_grade = "A" if quality_score >= 90 else "B" if quality_score >= 75 else "C" if quality_score >= 60 else "D"
    decision = "REJECT" if overall_status == "FAILED" else "REVIEW"
    primary_class = best_defect["class"] if detections else "No confirmed defect"
    recommended_action = (
        "Quarantine the component and initiate repair or replacement."
        if decision == "REJECT"
        else "Route the component to a quality engineer for manual verification."
    )
    assessment = {
        "decision": decision,
        "quality_score": quality_score,
        "quality_grade": quality_grade,
        "primary_defect": primary_class,
        "risk_level": severity,
        "summary": details,
        "recommended_action": recommended_action,
    }

    analysis_payload = {
        "scanId": scan_id,
        "filename": unique_filename,
        "image_url": image_url,
        "overall_status": overall_status,
        "confidence": round(top_confidence, 3),
        "defects_detected": defects_detected,
        "severity": severity,
        "severity_score": severity_score,
        "quality_score": quality_score,
        "quality_grade": quality_grade,
        "details": details,
        "timestamp": datetime.now().strftime("%I:%M:%S %p"),
        "bounding_box": bounding_box,
        "defect_count": defects_detected,
        "detections": detections,
        "assessment": assessment,
        "report": {
            "report_id": f"RPT-{scan_id.removeprefix('SCAN-')}",
            "generated_at": datetime.now().isoformat(timespec="seconds"),
            "inspection_method": "YOLOv8 optical defect detection",
            "model_name": os.path.basename(MODEL_PATH),
        },
    }

    record_inspection({
        "id": scan_id,
        "source": "Manual QE Upload",
        "timestamp": analysis_payload["timestamp"],
        "defects_found": defects_detected,
        "max_severity": severity,
        "severity_score": severity_score,
        "confidence": analysis_payload["confidence"],
        "defect_types": sorted({d["class"] for d in detections}),
        "overall_status": overall_status,
    })

    # 6. Write YOLO label file for the uploaded image
    txt_filename = os.path.splitext(unique_filename)[0] + ".txt"
    label_path = os.path.join(UPLOAD_DIR, txt_filename)
    yolo_labels = []
    try:
        img = cv2.imread(file_save_path)
        if img is None:
            raise ValueError("Uploaded file could not be decoded as an image")
        image_shape = (img.shape[0], img.shape[1])
        yolo_labels = build_yolo_label_lines(detections, model.names, image_shape)
        write_yolo_label_file(label_path, yolo_labels)
    except Exception as e:
        print(f"Warning: Failed to write YOLO label for uploaded image: {e}")

    saved_dataset_path = None
    saved_dataset_label_path = None
    if save_to_dataset:
        if dataset_split not in ["train", "val"]:
            raise HTTPException(
                status_code=400,
                detail="dataset_split must be 'train' or 'val'",
            )
        try:
            saved_dataset_path, saved_dataset_label_path = save_uploaded_image_to_dataset(
                image_src_path=file_save_path,
                dataset_dir=DATASET_DIR,
                split=dataset_split,
                yolo_lines=yolo_labels,
            )
        except Exception as e:
            print(f"Warning: Failed to save uploaded image to dataset: {e}")

    # 7. Response payload
    return analysis_payload


# Lightweight unauthenticated debug endpoint to run rule-based detection quickly
@app.post("/debug/inspect")
async def debug_inspect(file: UploadFile = File(...)):
    # Some clients (or cURL variants) may omit Content-Type; tolerate that and
    # attempt to decode the upload. If decoding fails, return a 400 with guidance.
    content_type = getattr(file, "content_type", None) or ""
    if content_type and not content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Uploaded file must be an image (Content-Type indicates otherwise).")

    contents = await file.read()
    try:
        result = rule_engine.detect_defects(contents)
        return result
    except ValueError as ve:
        # Known decode failure from rule engine
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal error in rule engine: {e}")
