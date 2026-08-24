from collections import Counter
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.models.inspection import Inspection


router = APIRouter(
    prefix="/supervisor/reports",
    tags=["Supervisor Production Reports"],
)


# ==========================================================
# Production Quality Report
# ==========================================================

@router.get("/production")
def get_production_quality_report(
    start_date: str | None = Query(
        default=None,
        description="Start date in YYYY-MM-DD format",
    ),
    end_date: str | None = Query(
        default=None,
        description="End date in YYYY-MM-DD format",
    ),
    db: Session = Depends(get_db),
):
    """
    Generate a production quality report from
    real inspection database records.

    Includes:
        - Total inspections
        - Passed
        - Failed
        - Pending
        - Pass rate
        - Defect rate
        - Average confidence
        - Average processing time
        - Defect distribution
        - Severity distribution
        - Daily production trend
    """

    # ======================================================
    # Parse Date Filters
    # ======================================================

    start_datetime = None
    end_datetime = None

    if start_date:
        try:
            start_datetime = datetime.strptime(
                start_date,
                "%Y-%m-%d",
            )
        except ValueError:
            return {
                "error": (
                    "Invalid start_date. "
                    "Use YYYY-MM-DD format."
                )
            }

    if end_date:
        try:
            end_datetime = (
                datetime.strptime(
                    end_date,
                    "%Y-%m-%d",
                )
                + timedelta(days=1)
            )
        except ValueError:
            return {
                "error": (
                    "Invalid end_date. "
                    "Use YYYY-MM-DD format."
                )
            }

    # ======================================================
    # Query Inspections
    # ======================================================

    query = db.query(Inspection)

    if start_datetime:
        query = query.filter(
            Inspection.created_at >= start_datetime
        )

    if end_datetime:
        query = query.filter(
            Inspection.created_at < end_datetime
        )

    inspections = (
        query
        .order_by(Inspection.created_at.asc())
        .all()
    )

    # ======================================================
    # Empty Report
    # ======================================================

    if not inspections:

        return {
            "report_type": "Production Quality Report",

            "period": {
                "start_date": start_date,
                "end_date": end_date,
            },

            "summary": {
                "total_inspections": 0,
                "passed": 0,
                "failed": 0,
                "pending": 0,
                "pass_rate": 0,
                "defect_rate": 0,
                "average_confidence": 0,
                "average_processing_time": 0,
            },

            "defect_distribution": {},

            "severity_distribution": {},

            "daily_trend": [],

        }

    # ======================================================
    # Basic Counters
    # ======================================================

    total_inspections = len(inspections)

    passed = 0
    failed = 0
    pending = 0

    confidence_values = []
    processing_values = []

    defect_counter = Counter()
    severity_counter = Counter()

    daily_data = {}

    # ======================================================
    # Process Inspections
    # ======================================================

    for inspection in inspections:

        status = (
            str(inspection.status or "")
            .strip()
            .lower()
        )

        # ----------------------------------------------
        # Status
        # ----------------------------------------------

        if status in {
            "pass",
            "passed",
            "complete",
            "completed",
        }:

            passed += 1

        elif status in {
            "fail",
            "failed",
        }:

            failed += 1

        else:

            pending += 1

        # ----------------------------------------------
        # Confidence
        # ----------------------------------------------

        if inspection.confidence is not None:

            confidence = float(
                inspection.confidence
            )

            # Convert 0-1 confidence to percentage
            if confidence <= 1:
                confidence *= 100

            confidence_values.append(
                confidence
            )

        # ----------------------------------------------
        # Processing Time
        # ----------------------------------------------

        if inspection.processing_time is not None:

            processing_values.append(
                float(
                    inspection.processing_time
                )
            )

        # ----------------------------------------------
        # Defect
        # ----------------------------------------------

        defect = (
            inspection.defect_type
            or "No Defect"
        )

        defect_counter[defect] += 1

        # ----------------------------------------------
        # Severity
        # ----------------------------------------------

        severity = (
            inspection.severity
            or "None"
        )

        severity_counter[severity] += 1

        # ----------------------------------------------
        # Daily Trend
        # ----------------------------------------------

        if inspection.created_at:

            day = inspection.created_at.date().isoformat()

            if day not in daily_data:

                daily_data[day] = {
                    "date": day,
                    "total": 0,
                    "passed": 0,
                    "failed": 0,
                    "pending": 0,
                }

            daily_data[day]["total"] += 1

            if status in {
                "pass",
                "passed",
                "complete",
                "completed",
            }:

                daily_data[day]["passed"] += 1

            elif status in {
                "fail",
                "failed",
            }:

                daily_data[day]["failed"] += 1

            else:

                daily_data[day]["pending"] += 1

    # ======================================================
    # Rates
    # ======================================================

    pass_rate = round(
        (passed / total_inspections) * 100,
        2,
    )

    defect_rate = round(
        (failed / total_inspections) * 100,
        2,
    )

    # ======================================================
    # Averages
    # ======================================================

    average_confidence = round(
        sum(confidence_values)
        / len(confidence_values),
        2,
    ) if confidence_values else 0

    average_processing_time = round(
        sum(processing_values)
        / len(processing_values),
        3,
    ) if processing_values else 0

    # ======================================================
    # Defect Distribution
    # ======================================================

    defect_distribution = dict(
        sorted(
            defect_counter.items(),
            key=lambda item: item[1],
            reverse=True,
        )
    )

    # ======================================================
    # Severity Distribution
    # ======================================================

    severity_distribution = dict(
        sorted(
            severity_counter.items(),
            key=lambda item: item[1],
            reverse=True,
        )
    )

    # ======================================================
    # Daily Trend
    # ======================================================

    daily_trend = list(
        daily_data.values()
    )

    # ======================================================
    # Top Defects
    # ======================================================

    top_defects = []

    for defect, count in defect_counter.most_common(10):

        percentage = round(
            (count / total_inspections) * 100,
            2,
        )

        top_defects.append({
            "defect_type": defect,
            "count": count,
            "percentage": percentage,
        })

    # ======================================================
    # Final Report
    # ======================================================

    return {

        "report_type":
            "Production Quality Report",

        "period": {

            "start_date":
                start_date,

            "end_date":
                end_date,

        },

        "summary": {

            "total_inspections":
                total_inspections,

            "passed":
                passed,

            "failed":
                failed,

            "pending":
                pending,

            "pass_rate":
                pass_rate,

            "defect_rate":
                defect_rate,

            "average_confidence":
                average_confidence,

            "average_processing_time":
                average_processing_time,

        },

        "defect_distribution":
            defect_distribution,

        "severity_distribution":
            severity_distribution,

        "top_defects":
            top_defects,

        "daily_trend":
            daily_trend,

    }