from collections import Counter
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.services.inspection_service import InspectionService


# ============================================================
# VisionInspect AI
# Production Quality Reports
# Milestone 3.4
# ============================================================

router = APIRouter(
    prefix="/reports",
    tags=["Production Reports"]
)


# ============================================================
# Production Quality Report
# ============================================================

@router.get("/production")
def get_production_quality_report(
    db: Session = Depends(get_db),
):

    # --------------------------------------------------------
    # Get all inspections from database
    # --------------------------------------------------------

    inspections = InspectionService.get_all(db)

    total_inspections = len(inspections)

    # --------------------------------------------------------
    # Empty database
    # --------------------------------------------------------

    if total_inspections == 0:

        return {
            "message": "No inspection data available",
            "total_inspections": 0,
            "passed": 0,
            "failed": 0,
            "pass_rate": 0,
            "defect_rate": 0,
            "average_confidence": 0,
            "average_severity_score": 0,
            "severity_distribution": {
                "Critical": 0,
                "High": 0,
                "Medium": 0,
                "Low": 0,
                "None": 0,
            },
            "defect_distribution": {},
        }

    # --------------------------------------------------------
    # PASS / FAIL
    # --------------------------------------------------------

    passed = 0
    failed = 0

    for inspection in inspections:

        status = str(
            inspection.status or ""
        ).lower()

        if status == "pass":
            passed += 1

        elif status == "fail":
            failed += 1

    # --------------------------------------------------------
    # Pass / Defect Rate
    # --------------------------------------------------------

    pass_rate = round(
        (passed / total_inspections) * 100,
        2
    )

    defect_rate = round(
        (failed / total_inspections) * 100,
        2
    )

    # --------------------------------------------------------
    # Average Confidence
    # --------------------------------------------------------

    confidence_values = [
        inspection.confidence
        for inspection in inspections
        if inspection.confidence is not None
    ]

    if confidence_values:

        average_confidence = round(
            (
                sum(confidence_values)
                / len(confidence_values)
            ) * 100,
            2
        )

    else:

        average_confidence = 0

    # --------------------------------------------------------
    # Average Severity Score
    # --------------------------------------------------------

    severity_values = [
        inspection.severity_score
        for inspection in inspections
        if inspection.severity_score is not None
    ]

    if severity_values:

        average_severity_score = round(
            sum(severity_values)
            / len(severity_values),
            2
        )

    else:

        average_severity_score = 0

    # --------------------------------------------------------
    # Severity Distribution
    # --------------------------------------------------------

    severity_counter = Counter()

    for inspection in inspections:

        severity = inspection.severity or "None"

        severity_counter[severity] += 1

    severity_distribution = {

        "Critical":
            severity_counter.get("Critical", 0),

        "High":
            severity_counter.get("High", 0),

        "Medium":
            severity_counter.get("Medium", 0),

        "Low":
            severity_counter.get("Low", 0),

        "None":
            severity_counter.get("None", 0),
    }

    # --------------------------------------------------------
    # Defect Distribution
    # --------------------------------------------------------

    defect_counter = Counter()

    for inspection in inspections:

        status = str(
            inspection.status or ""
        ).lower()

        if status == "fail":

            defect_type = (
                inspection.defect_type
                or "Unknown"
            )

            defect_counter[defect_type] += 1

    defect_distribution = dict(
        defect_counter.most_common()
    )

    # --------------------------------------------------------
    # Most Common Defect
    # --------------------------------------------------------

    if defect_counter:

        most_common_defect = (
            defect_counter.most_common(1)[0]
        )

        top_defect = {
            "defect_type": most_common_defect[0],
            "count": most_common_defect[1],
        }

    else:

        top_defect = {
            "defect_type": "None",
            "count": 0,
        }

    # --------------------------------------------------------
    # Return Production Quality Report
    # --------------------------------------------------------

    return {

        "report_type":
            "Production Quality Report",

        "total_inspections":
            total_inspections,

        "passed":
            passed,

        "failed":
            failed,

        "pass_rate":
            pass_rate,

        "defect_rate":
            defect_rate,

        "average_confidence":
            average_confidence,

        "average_severity_score":
            average_severity_score,

        "severity_distribution":
            severity_distribution,

        "defect_distribution":
            defect_distribution,

        "top_defect":
            top_defect,
    }