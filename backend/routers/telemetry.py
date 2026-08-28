import io
import csv
import random
from datetime import datetime
from fastapi import APIRouter, HTTPException, UploadFile, File

router = APIRouter(prefix="/api/v1/telemetry", tags=["Telemetry"])

INSPECTIONS_DB = [
    {"id": "SCAN-8091", "source": "Optical Line A", "timestamp": "10:42:01 AM", "defects_found": 0, "max_severity": "NONE", "severity_score": 0.0, "confidence": 0.98, "defect_types": [], "overall_status": "PASSED"},
    {"id": "SCAN-8092", "source": "Optical Line B", "timestamp": "10:41:45 AM", "defects_found": 2, "max_severity": "HIGH", "severity_score": 76.0, "confidence": 0.91, "defect_types": ["Surface Scratch"], "overall_status": "REJECTED"},
]


def record_inspection(item: dict) -> None:
    """Insert or replace a scan in the process-local telemetry stream."""
    INSPECTIONS_DB[:] = [existing for existing in INSPECTIONS_DB if existing["id"] != item["id"]]
    INSPECTIONS_DB.insert(0, item)


@router.get("/reports/export-csv")
def export_csv():
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Scan ID", "Source", "Timestamp", "Defects Found", "Severity", "Status"])
    for item in INSPECTIONS_DB:
        writer.writerow([item["id"], item["source"], item["timestamp"], item["defects_found"], item["max_severity"], item["overall_status"]])
    return {"csv_data": output.getvalue()}


@router.get("/analytics")
def get_analytics():
    total = len(INSPECTIONS_DB)
    rejected_statuses = {"REJECTED", "FAILED", "FLAGGED", "INCONCLUSIVE"}
    rejects = sum(1 for item in INSPECTIONS_DB if item["overall_status"] in rejected_statuses)
    critical = sum(1 for item in INSPECTIONS_DB if item.get("max_severity") == "CRITICAL")
    average_severity = sum(float(item.get("severity_score", 0)) for item in INSPECTIONS_DB) / total if total else 0
    return {
        "total_scans": total,
        "defect_rate": round((rejects / total * 100), 2) if total > 0 else 0,
        "first_pass_yield": round(((total - rejects) / total * 100), 1) if total > 0 else 100,
        "quality_index_score": round(max(0.0, 100.0 - average_severity), 1),
        "avg_latency_ms": 0.0,
        "critical_defects": critical,
    }


@router.get("/inspections")
def get_inspections():
    return INSPECTIONS_DB


@router.post("/inspections/scan")
def run_inspection_scan():
    is_defect = random.random() > 0.7
    scan_id = f"SCAN-{random.randint(8100, 9999)}"
    timestamp = datetime.now().strftime("%I:%M:%S %p")
    result = {
        "scanId": scan_id,
        "overall_status": "REJECTED" if is_defect else "PASSED",
        "confidence": round(random.uniform(0.88, 0.99), 3),
        "defects_detected": 1 if is_defect else 0,
        "severity": "HIGH" if is_defect else "NONE",
        "timestamp": timestamp,
    }

    record_inspection({
        "id": scan_id,
        "source": "Manual Inspection",
        "timestamp": timestamp,
        "defects_found": result["defects_detected"],
        "max_severity": result["severity"],
        "severity_score": 75.0 if is_defect else 0.0,
        "confidence": result["confidence"],
        "defect_types": ["Simulated Defect"] if is_defect else [],
        "overall_status": result["overall_status"],
    })
    return result
