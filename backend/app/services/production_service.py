# ============================================================
# VISIONINSPECT AI
# PRODUCTION MONITORING SERVICE
# Milestone 3
# ============================================================

from datetime import datetime

from app.database.database import database


# ============================================================
# QUALITY DECISION HELPER
# Uses the SAME logic as inspection analytics
# ============================================================

def get_quality_decision(inspection):

    quality_decision = inspection.get(
        "quality_decision"
    )

    if quality_decision is not None:

        return str(
            quality_decision
        ).strip().upper()

    status = inspection.get(
        "status"
    )

    if status == "Pass":

        return "PASS"

    elif status == "Fail":

        return "FAIL"

    else:

        return "WARNING"


# ============================================================
# PRODUCTION OVERVIEW
# ============================================================

async def get_production_overview():

    total = await database.inspections.count_documents({})

    normal = await database.inspections.count_documents({
        "prediction": "Normal"
    })

    defective = await database.inspections.count_documents({
        "prediction": "Defective"
    })

    # --------------------------------------------------------
    # CALCULATE DECISIONS USING SAME LOGIC AS ANALYTICS
    # --------------------------------------------------------

    passed = 0
    failed = 0
    warnings = 0

    cursor = database.inspections.find({})

    async for inspection in cursor:

        decision = get_quality_decision(
            inspection
        )

        if decision == "PASS":

            passed += 1

        elif decision == "FAIL":

            failed += 1

        elif decision == "WARNING":

            warnings += 1

    # --------------------------------------------------------
    # RATES
    # --------------------------------------------------------

    if total > 0:

        pass_rate = round(
            (passed / total) * 100,
            2
        )

        defect_rate = round(
            (defective / total) * 100,
            2
        )

    else:

        pass_rate = 0
        defect_rate = 0

    # --------------------------------------------------------
    # QUALITY STATUS
    # --------------------------------------------------------

    if defect_rate >= 40:

        quality_status = "Attention Required"

    elif defect_rate >= 20:

        quality_status = "Needs Monitoring"

    else:

        quality_status = "Operational"

    return {

        "total_inspections": total,

        "normal_products": normal,

        "defective_products": defective,

        "passed": passed,

        "failed": failed,

        "warnings": warnings,

        "pass_rate": pass_rate,

        "defect_rate": defect_rate,

        "quality_status": quality_status

    }


# ============================================================
# PRODUCTION MONITORING
# ============================================================

async def get_production_monitoring():

    daily_data = {}

    cursor = database.inspections.find({})

    async for inspection in cursor:

        # ----------------------------------------------------
        # DATE
        # ----------------------------------------------------

        uploaded_at = inspection.get(
            "uploaded_at"
        )

        if isinstance(
            uploaded_at,
            datetime
        ):

            date_key = uploaded_at.strftime(
                "%Y-%m-%d"
            )

        elif uploaded_at:

            date_key = str(
                uploaded_at
            )[:10]

        else:

            date_key = "Unknown"

        # ----------------------------------------------------
        # CREATE DAILY RECORD
        # ----------------------------------------------------

        if date_key not in daily_data:

            daily_data[date_key] = {

                "date": date_key,

                "inspections": 0,

                "normal": 0,

                "defective": 0,

                "passed": 0,

                "failed": 0,

                "warnings": 0

            }

        record = daily_data[date_key]

        record["inspections"] += 1

        # ----------------------------------------------------
        # NORMAL / DEFECTIVE
        # ----------------------------------------------------

        prediction = str(
            inspection.get(
                "prediction",
                ""
            )
        ).strip().lower()

        if prediction == "normal":

            record["normal"] += 1

        elif prediction == "defective":

            record["defective"] += 1

        # ----------------------------------------------------
        # QUALITY DECISION
        #
        # IMPORTANT:
        # Same fallback logic as analytics.
        # ----------------------------------------------------

        decision = get_quality_decision(
            inspection
        )

        if decision == "PASS":

            record["passed"] += 1

        elif decision == "FAIL":

            record["failed"] += 1

        elif decision == "WARNING":

            record["warnings"] += 1

    # ========================================================
    # SORT BY DATE
    # ========================================================

    monitoring = [

        daily_data[date]

        for date in sorted(
            daily_data.keys()
        )

    ]

    # ========================================================
    # TOTALS
    # ========================================================

    total_inspections = sum(
        item["inspections"]
        for item in monitoring
    )

    total_passed = sum(
        item["passed"]
        for item in monitoring
    )

    total_failed = sum(
        item["failed"]
        for item in monitoring
    )

    total_warnings = sum(
        item["warnings"]
        for item in monitoring
    )

    # ========================================================
    # RESPONSE
    # ========================================================

    return {

        "total_days": len(
            monitoring
        ),

        "totals": {

            "inspections":
                total_inspections,

            "passed":
                total_passed,

            "failed":
                total_failed,

            "warnings":
                total_warnings

        },

        "monitoring":
            monitoring

    }