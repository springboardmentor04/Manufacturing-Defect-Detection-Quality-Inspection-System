from collections import Counter, defaultdict

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.models.inspection import Inspection
from app.ai.class_mapping import CLASS_MAPPING


router = APIRouter(
    prefix="/qe/analytics",
    tags=["Quality Engineer Analytics"],
)


# ============================================================
# DEFECT NAME NORMALIZER
# ============================================================

def normalize_defect_name(defect_name):
    """
    Convert stored class names such as:

        class_36
        Class 36
        Unknown Defect (Class 36)

    into the proper VisionInspect AI
    defect name using CLASS_MAPPING.
    """

    if not defect_name:
        return "No Defect"

    text = str(defect_name).strip()

    # --------------------------------------------------------
    # Direct class_XX format
    # --------------------------------------------------------

    if text.lower().startswith("class_"):

        try:
            class_id = int(
                text.split("_")[1]
            )

            return CLASS_MAPPING.get(
                class_id,
                text
            )

        except (ValueError, IndexError):
            pass

    # --------------------------------------------------------
    # "Class XX" format
    # --------------------------------------------------------

    if text.lower().startswith("class "):

        try:
            class_id = int(
                text.split(" ")[1]
            )

            return CLASS_MAPPING.get(
                class_id,
                text
            )

        except (ValueError, IndexError):
            pass

    # --------------------------------------------------------
    # "Unknown Defect (Class XX)"
    # --------------------------------------------------------

    if "class " in text.lower():

        try:

            lower_text = text.lower()

            start = lower_text.index(
                "class "
            )

            class_text = text[
                start + len("class "):
            ]

            class_id = int(
                class_text
                .replace(")", "")
                .strip()
            )

            return CLASS_MAPPING.get(
                class_id,
                text
            )

        except (ValueError, IndexError):
            pass

    # --------------------------------------------------------
    # Already a proper defect name
    # --------------------------------------------------------

    return text


# ============================================================
# DEFECT ANALYTICS
# ============================================================

@router.get("/defects")
def get_defect_analytics(
    db: Session = Depends(get_db),
):

    inspections = (
        db.query(Inspection)
        .order_by(
            Inspection.created_at.asc()
        )
        .all()
    )

    total_inspections = len(
        inspections
    )

    # ========================================================
    # EMPTY DATABASE
    # ========================================================

    if total_inspections == 0:

        return {

            "total_inspections": 0,

            "total_defects": 0,

            "passed": 0,

            "failed": 0,

            "pending": 0,

            "pass_rate": 0,

            "defect_rate": 0,

            "defect_distribution": {},

            "severity_distribution": {
                "Critical": 0,
                "High": 0,
                "Medium": 0,
                "Low": 0,
                "None": 0,
            },

            "top_defects": [],

            "product_distribution": {},

            "daily_trend": [],
        }

    # ========================================================
    # COUNTERS
    # ========================================================

    passed = 0
    failed = 0
    pending = 0

    defect_counter = Counter()

    severity_counter = Counter()

    product_counter = Counter()

    daily_counter = defaultdict(
        lambda: {
            "total": 0,
            "passed": 0,
            "failed": 0,
        }
    )

    # ========================================================
    # PROCESS INSPECTIONS
    # ========================================================

    for inspection in inspections:

        status = (
            inspection.status
            or "pending"
        ).lower()

        # ----------------------------------------------------
        # STATUS
        # ----------------------------------------------------

        if status == "pass":

            passed += 1

        elif status == "fail":

            failed += 1

        else:

            pending += 1

        # ----------------------------------------------------
        # DEFECT
        # ----------------------------------------------------

        defect_type = normalize_defect_name(
            inspection.defect_type
        )

        if status == "fail":

            defect_counter[
                defect_type
            ] += 1

        # ----------------------------------------------------
        # SEVERITY
        # ----------------------------------------------------

        severity = (
            inspection.severity
            or "None"
        )

        severity_counter[
            severity
        ] += 1

        # ----------------------------------------------------
        # PRODUCT
        # ----------------------------------------------------

        product_name = (
            inspection.product_name
            or "Unknown Product"
        )

        product_counter[
            product_name
        ] += 1

        # ----------------------------------------------------
        # DAILY TREND
        # ----------------------------------------------------

        if inspection.created_at:

            date_key = (
                inspection.created_at
                .date()
                .isoformat()
            )

            daily_counter[
                date_key
            ]["total"] += 1

            if status == "pass":

                daily_counter[
                    date_key
                ]["passed"] += 1

            elif status == "fail":

                daily_counter[
                    date_key
                ]["failed"] += 1

    # ========================================================
    # RATES
    # ========================================================

    pass_rate = round(
        (
            passed /
            total_inspections
        ) * 100,
        2,
    )

    defect_rate = round(
        (
            failed /
            total_inspections
        ) * 100,
        2,
    )

    # ========================================================
    # TOP DEFECTS
    # ========================================================

    top_defects = []

    for defect, count in (
        defect_counter
        .most_common()
    ):

        percentage = (
            round(
                (
                    count /
                    failed
                ) * 100,
                2,
            )
            if failed > 0
            else 0
        )

        top_defects.append({

            "defect_type":
                defect,

            "count":
                count,

            "percentage":
                percentage,
        })

    # ========================================================
    # PRODUCT DISTRIBUTION
    # ========================================================

    product_distribution = {}

    for product, count in (
        product_counter.items()
    ):

        product_distribution[
            product
        ] = count

    # ========================================================
    # DAILY TREND
    # ========================================================

    daily_trend = []

    for date, values in sorted(
        daily_counter.items()
    ):

        daily_trend.append({

            "date":
                date,

            "total":
                values["total"],

            "passed":
                values["passed"],

            "failed":
                values["failed"],
        })

    # ========================================================
    # RESPONSE
    # ========================================================

    return {

        "total_inspections":
            total_inspections,

        "total_defects":
            failed,

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

        # ----------------------------------------------------
        # DEFECT DISTRIBUTION
        # ----------------------------------------------------

        "defect_distribution":
            dict(
                defect_counter
            ),

        # ----------------------------------------------------
        # SEVERITY DISTRIBUTION
        # ----------------------------------------------------

        "severity_distribution": {

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
        },

        # ----------------------------------------------------
        # TOP DEFECTS
        # ----------------------------------------------------

        "top_defects":
            top_defects,

        # ----------------------------------------------------
        # PRODUCT DISTRIBUTION
        # ----------------------------------------------------

        "product_distribution":
            product_distribution,

        # ----------------------------------------------------
        # DAILY TREND
        # ----------------------------------------------------

        "daily_trend":
            daily_trend,
    }