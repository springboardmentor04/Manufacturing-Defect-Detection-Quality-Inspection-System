import os
import json
from datetime import datetime
from models.inspection import Inspection

REPORTS_DIR = os.getenv("REPORTS_DIR", "reports")
os.makedirs(REPORTS_DIR, exist_ok=True)


def generate_inspection_pdf_report(inspection: Inspection) -> str:
    report_filename = f"report_{inspection.id}.json"
    file_path = os.path.join(REPORTS_DIR, report_filename)

    defects_data = []
    for defect in inspection.defects:
        defects_data.append({
            "id": defect.id,
            "type": defect.defect_type,
            "size_mm2": defect.size_mm2,
            "location": defect.location_type,
            "confidence": defect.confidence,
            "bounding_box": defect.bounding_box
        })

    report_payload = {
        "report_id": f"REP-{inspection.id[:8].upper()}",
        "inspection_id": inspection.id,
        "timestamp": inspection.created_at.isoformat() if inspection.created_at else datetime.utcnow().isoformat(),
        "summary": {
            "status": inspection.status.value if hasattr(inspection.status, "value") else str(inspection.status),
            "severity_score": inspection.severity_score,
            "severity_level": inspection.severity_level.value if hasattr(inspection.severity_level, "value") else str(inspection.severity_level),
            "total_defects": len(defects_data),
            "executive_summary": inspection.summary,
            "recommendation": inspection.recommendation
        },
        "defects": defects_data
    }

    with open(file_path, "w") as f:
        json.dump(report_payload, f, indent=2)

    return f"/reports/{report_filename}"