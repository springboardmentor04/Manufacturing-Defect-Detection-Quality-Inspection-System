from collections import Counter

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.models.inspection import Inspection


router = APIRouter(
    prefix="/qe/reports",
    tags=["Quality Engineer Reports"]
)


# ============================================================
# GET INDIVIDUAL QE INSPECTION REPORTS
# ============================================================

@router.get("/")
def get_qe_reports(
    db: Session = Depends(get_db),
):

    inspections = (
        db.query(Inspection)
        .order_by(Inspection.created_at.desc())
        .all()
    )

    reports = []

    for inspection in inspections:

        confidence = inspection.confidence or 0

        # Convert decimal confidence to percentage
        # Example: 0.9703 -> 97.03
        if confidence <= 1:
            confidence *= 100

        reports.append({

            "id": inspection.id,

            "title": (
                f"Inspection Report #{inspection.id}"
            ),

            "product_name": (
                inspection.product_name
                or "Unknown Product"
            ),

            "defect_type": (
                inspection.defect_type
                or "No Defect"
            ),

            "status": (
                inspection.status.capitalize()
                if inspection.status
                else "Pending"
            ),

            "severity": (
                inspection.severity
                or "None"
            ),

            "severity_score": (
                inspection.severity_score
                if inspection.severity_score is not None
                else 0
            ),

            "confidence": round(
                confidence,
                2
            ),

            "recommendation": (
                inspection.recommendation
                or "N/A"
            ),

            "processing_time": (
                inspection.processing_time
                or 0
            ),

            "generated_at": (
                inspection.created_at.isoformat()
                if inspection.created_at
                else None
            ),
        })

    return reports


# ============================================================
# PRODUCTION QUALITY REPORT
# Milestone 3.4
# ============================================================

@router.get("/production")
def get_production_quality_report(
    db: Session = Depends(get_db),
):

    # --------------------------------------------------------
    # Get all inspections
    # --------------------------------------------------------

    inspections = (
        db.query(Inspection)
        .order_by(Inspection.created_at.desc())
        .all()
    )

    total_inspections = len(inspections)

    # --------------------------------------------------------
    # No inspection data
    # --------------------------------------------------------

    if total_inspections == 0:

        return {

            "report_type":
                "Production Quality Report",

            "total_inspections": 0,

            "passed": 0,

            "failed": 0,

            "pending": 0,

            "pass_rate": 0,

            "defect_rate": 0,

            "average_confidence": 0,

            "average_severity_score": 0,

            "average_processing_time": 0,

            "severity_distribution": {

                "Critical": 0,
                "High": 0,
                "Medium": 0,
                "Low": 0,
                "None": 0,

            },

            "defect_distribution": {},

            "top_defect": {

                "defect_type": "None",
                "count": 0,

            },
        }


    # ========================================================
    # PASS / FAIL / PENDING
    # ========================================================

    passed = 0
    failed = 0
    pending = 0

    for inspection in inspections:

        status = (
            str(inspection.status or "")
            .lower()
        )

        if status == "pass":

            passed += 1

        elif status == "fail":

            failed += 1

        else:

            pending += 1


    # ========================================================
    # PASS RATE
    # ========================================================

    pass_rate = round(
        (passed / total_inspections) * 100,
        2
    )


    # ========================================================
    # DEFECT RATE
    # ========================================================

    defect_rate = round(
        (failed / total_inspections) * 100,
        2
    )


    # ========================================================
    # AVERAGE CONFIDENCE
    # ========================================================

    confidence_values = []

    for inspection in inspections:

        if inspection.confidence is not None:

            confidence = float(
                inspection.confidence
            )

            # Database may store:
            # 0.97 instead of 97
            if confidence <= 1:

                confidence *= 100

            confidence_values.append(
                confidence
            )


    if confidence_values:

        average_confidence = round(
            sum(confidence_values)
            / len(confidence_values),
            2
        )

    else:

        average_confidence = 0


    # ========================================================
    # AVERAGE SEVERITY SCORE
    # ========================================================

    severity_values = []

    for inspection in inspections:

        if inspection.severity_score is not None:

            severity_values.append(
                float(
                    inspection.severity_score
                )
            )


    if severity_values:

        average_severity_score = round(
            sum(severity_values)
            / len(severity_values),
            2
        )

    else:

        average_severity_score = 0


    # ========================================================
    # AVERAGE PROCESSING TIME
    # ========================================================

    processing_values = []

    for inspection in inspections:

        if inspection.processing_time is not None:

            processing_values.append(
                float(
                    inspection.processing_time
                )
            )


    if processing_values:

        average_processing_time = round(
            sum(processing_values)
            / len(processing_values),
            3
        )

    else:

        average_processing_time = 0


    # ========================================================
    # SEVERITY DISTRIBUTION
    # ========================================================

    severity_counter = Counter()


    for inspection in inspections:

        severity = (
            inspection.severity
            or "None"
        )

        severity_counter[
            severity
        ] += 1


    severity_distribution = {

        "Critical":
            severity_counter.get(
                "Critical",
                0
            ),

        "High":
            severity_counter.get(
                "High",
                0
            ),

        "Medium":
            severity_counter.get(
                "Medium",
                0
            ),

        "Low":
            severity_counter.get(
                "Low",
                0
            ),

        "None":
            severity_counter.get(
                "None",
                0
            ),
    }


    # ========================================================
    # DEFECT DISTRIBUTION
    # ========================================================

    defect_counter = Counter()


    for inspection in inspections:

        status = (
            str(inspection.status or "")
            .lower()
        )

        # Only failed inspections
        # are considered defects

        if status == "fail":

            defect_type = (
                inspection.defect_type
                or "Unknown"
            )

            defect_counter[
                defect_type
            ] += 1


    defect_distribution = dict(
        defect_counter.most_common()
    )


    # ========================================================
    # TOP DEFECT
    # ========================================================

    if defect_counter:

        defect_name, defect_count = (
            defect_counter.most_common(1)[0]
        )

        top_defect = {

            "defect_type":
                defect_name,

            "count":
                defect_count,

        }

    else:

        top_defect = {

            "defect_type":
                "None",

            "count":
                0,

        }


    # ========================================================
    # PRODUCTION QUALITY REPORT
    # ========================================================

    return {

        "report_type":
            "Production Quality Report",

        # ----------------------------------------------------
        # Inspection Statistics
        # ----------------------------------------------------

        "total_inspections":
            total_inspections,

        "passed":
            passed,

        "failed":
            failed,

        "pending":
            pending,

        # ----------------------------------------------------
        # Quality Rates
        # ----------------------------------------------------

        "pass_rate":
            pass_rate,

        "defect_rate":
            defect_rate,

        # ----------------------------------------------------
        # AI Performance
        # ----------------------------------------------------

        "average_confidence":
            average_confidence,

        "average_severity_score":
            average_severity_score,

        "average_processing_time":
            average_processing_time,

        # ----------------------------------------------------
        # Severity Analytics
        # ----------------------------------------------------

        "severity_distribution":
            severity_distribution,

        # ----------------------------------------------------
        # Defect Analytics
        # ----------------------------------------------------

        "defect_distribution":
            defect_distribution,

        # ----------------------------------------------------
        # Top Defect
        # ----------------------------------------------------

        "top_defect":
            top_defect,
    }