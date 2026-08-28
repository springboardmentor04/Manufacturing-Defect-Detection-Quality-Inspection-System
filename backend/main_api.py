import os
import io
import random
import csv
import uuid
from datetime import datetime
from pathlib import Path
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
import numpy as np
from ultralytics import YOLO

app = FastAPI(title="Defect Detection API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def load_inference_model(weights_path: str = "models/best.pt"):
    if os.path.exists(weights_path):
        try:
            model = YOLO(weights_path)
            return model
        except Exception as e:
            print(f"❌ Error loading YOLO model from {weights_path}: {e}")
            return None

    print(f"⚠️ YOLO weights not found at {weights_path}. Falling back to simulation mode.")
    return None


model = load_inference_model()

INSPECTIONS_DB = [
    {"id": "SCAN-8091", "source": "Optical Line A", "timestamp": "10:42:01 AM", "defects_found": 0, "max_severity": "NONE", "overall_status": "PASSED"},
    {"id": "SCAN-8092", "source": "Optical Line B", "timestamp": "10:41:45 AM", "defects_found": 2, "max_severity": "HIGH", "overall_status": "REJECTED"},
]


@app.post("/api/v1/inspection/analyze-image")
async def analyze_image(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        image = Image.open(io.BytesIO(contents)).convert("RGB")
        image_np = np.asarray(image)
        img_height, img_width = image_np.shape[:2]

        if model is None:
            scan_id = f"SCAN-{random.randint(8100, 9999)}"
            timestamp = datetime.now().strftime("%I:%M:%S %p")
            result = {
                "scanId": scan_id,
                "overall_status": "FLAGGED",
                "confidence": 0.94,
                "defects_detected": 1,
                "severity": "HIGH",
                "details": "Simulated defect detected for offline mode.",
                "timestamp": timestamp,
                "bounding_box": {"x": 20, "y": 25, "width": 40, "height": 30, "label": "Surface Scratch"},
            }
        else:
            results = model(image_np, conf=0.25)[0]
            boxes = results.boxes
            defects_detected = len(boxes)
            scan_id = f"SCAN-{random.randint(8100, 9999)}"
            timestamp = datetime.now().strftime("%I:%M:%S %p")
            if defects_detected > 0:
                boxes_sorted = sorted(boxes, key=lambda b: float(b.conf[0].item()), reverse=True)
                best_box = boxes_sorted[0]
                class_id = int(best_box.cls[0].item())
                class_name = model.names.get(class_id, f"Defect_{class_id}")
                confidence = float(best_box.conf[0].item())
                x1, y1, x2, y2 = best_box.xyxy[0].tolist()
                width = x2 - x1
                height = y2 - y1
                severity = "HIGH" if any(k in class_name.lower() for k in ["missing", "crack", "short", "joint"]) else "MEDIUM"
                bounding_box = {
                    "x": round(x1 / img_width * 100, 1),
                    "y": round(y1 / img_height * 100, 1),
                    "width": round(width / img_width * 100, 1),
                    "height": round(height / img_height * 100, 1),
                    "label": class_name,
                }
                details = f"Detected {class_name} with {round(confidence * 100, 1)}% confidence."
                overall_status = "REJECTED"
            else:
                confidence = 0.0
                severity = "NONE"
                bounding_box = None
                details = "No defects detected. Inspection passed."
                overall_status = "PASSED"

            result = {
                "scanId": scan_id,
                "overall_status": overall_status,
                "confidence": round(confidence, 3),
                "defects_detected": defects_detected,
                "severity": severity,
                "details": details,
                "timestamp": timestamp,
                "bounding_box": bounding_box,
            }

        INSPECTIONS_DB.insert(0, {
            "id": result["scanId"],
            "source": "Manual Inspection",
            "timestamp": result["timestamp"],
            "defects_found": result["defects_detected"],
            "max_severity": result["severity"],
            "overall_status": result["overall_status"],
        })

        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/v1/telemetry/reports/export-csv")
def export_csv():
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Scan ID", "Source", "Timestamp", "Defects Found", "Severity", "Status"])
    for item in INSPECTIONS_DB:
        writer.writerow([item["id"], item["source"], item["timestamp"], item["defects_found"], item["max_severity"], item["overall_status"]])
    return {"csv_data": output.getvalue()}


@app.get("/api/v1/telemetry/analytics")
def get_analytics():
    total = len(INSPECTIONS_DB)
    rejects = sum(1 for i in INSPECTIONS_DB if i["overall_status"] == "REJECTED")
    return {
        "total_scans": total,
        "defect_rate": round((rejects / total * 100), 2) if total > 0 else 0,
        "first_pass_yield": round(((total - rejects) / total * 100), 1) if total > 0 else 100,
    }


@app.get("/api/v1/telemetry/inspections")
def get_inspections():
    return INSPECTIONS_DB


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main_api:app", host="127.0.0.1", port=8000, reload=True)