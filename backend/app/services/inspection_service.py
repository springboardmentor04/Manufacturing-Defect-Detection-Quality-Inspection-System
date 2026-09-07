# ============================================================
# VISIONINSPECT AI
# INSPECTION SERVICE
# Backend Inspection + MongoDB + Reports + Analytics
# ============================================================

import os
import shutil

from uuid import uuid4
from datetime import datetime

from bson import ObjectId

from app.database.database import database
from app.ai.auto_predict import predict
from app.services.report_service import generate_report


# ============================================================
# FOLDERS
# ============================================================

UPLOAD_FOLDER = "app/uploads"
REPORT_FOLDER = "app/reports"

os.makedirs(
    UPLOAD_FOLDER,
    exist_ok=True
)

os.makedirs(
    REPORT_FOLDER,
    exist_ok=True
)


# ============================================================
# HELPER
# ============================================================

def get_ai_value(
    result,
    *keys,
    default=None
):

    for key in keys:

        if (
            key in result
            and result[key] is not None
        ):
            return result[key]

    return default


# ============================================================
# UPLOAD IMAGE + RUN INSPECTION
# ============================================================

async def upload_image(
    file,
    current_user=None
):

    # --------------------------------------------------------
    # VALIDATE FILE
    # --------------------------------------------------------

    original_filename = (
        file.filename
        or "uploaded_image.jpg"
    )

    if "." in original_filename:

        extension = (
            original_filename
            .rsplit(".", 1)[1]
            .lower()
        )

    else:

        extension = "jpg"

    allowed_extensions = {
        "jpg",
        "jpeg",
        "png",
        "bmp",
        "webp"
    }

    if extension not in allowed_extensions:

        raise ValueError(
            "Unsupported image format. "
            "Use JPG, JPEG, PNG, BMP or WEBP."
        )

    # --------------------------------------------------------
    # CREATE UNIQUE FILE
    # --------------------------------------------------------

    filename = (
        f"{uuid4()}.{extension}"
    )

    filepath = os.path.join(
        UPLOAD_FOLDER,
        filename
    )

    # --------------------------------------------------------
    # SAVE IMAGE
    # --------------------------------------------------------

    with open(
        filepath,
        "wb"
    ) as buffer:

        shutil.copyfileobj(
            file.file,
            buffer
        )

    # ========================================================
    # AI PREDICTION
    # ========================================================

    try:

        ai_result = predict(
            filepath
        )

    except Exception as error:

        if os.path.exists(filepath):

            os.remove(filepath)

        raise RuntimeError(
            f"AI prediction failed: {error}"
        ) from error

    # --------------------------------------------------------
    # VALIDATE AI RESULT
    # --------------------------------------------------------

    if not isinstance(
        ai_result,
        dict
    ):

        raise RuntimeError(
            "AI prediction engine "
            "returned an invalid result."
        )

    # ========================================================
    # BASIC PREDICTION
    # ========================================================

    prediction = get_ai_value(
        ai_result,
        "prediction",
        default="Unknown"
    )

    status = get_ai_value(
        ai_result,
        "status",
        default=None
    )

    confidence = get_ai_value(
        ai_result,
        "confidence",
        "defect_confidence",
        default=0
    )

    # ========================================================
    # PRODUCT CATEGORY
    # ========================================================

    product_category = get_ai_value(
        ai_result,
        "product_category",
        "category",
        "category_name",
        "object_category",
        default="Unknown"
    )

    category_confidence = get_ai_value(
        ai_result,
        "category_confidence",
        "product_category_confidence",
        "category_score",
        default=0
    )

    # ========================================================
    # DEFECT INFORMATION
    # ========================================================

    defect_category = get_ai_value(
        ai_result,
        "defect_category",
        "defect_type",
        "defect_class",
        default="None"
    )

    defect_confidence = get_ai_value(
        ai_result,
        "defect_confidence",
        "defect_class_confidence",
        "confidence",
        default=confidence
    )

    category_type = get_ai_value(
        ai_result,
        "category_type",
        default=(
            "Defective Product"
            if prediction == "Defective"
            else "Normal Product"
        )
    )

    # ========================================================
    # QUALITY ASSESSMENT
    # ========================================================

    severity = get_ai_value(
        ai_result,
        "severity",
        default="None"
    )

    severity_score = get_ai_value(
        ai_result,
        "severity_score",
        default=0
    )

    risk_level = get_ai_value(
        ai_result,
        "risk_level",
        "risk",
        default="Low"
    )

    quality_decision = get_ai_value(
        ai_result,
        "quality_decision",
        "decision",
        default=None
    )

    recommendation = get_ai_value(
        ai_result,
        "recommendation",
        "quality_recommendation",
        default=""
    )

    # ========================================================
    # QUALITY DECISION FALLBACK
    # ========================================================

    if quality_decision is None:

        if prediction == "Normal":

            quality_decision = "PASS"

        elif status == "Fail":

            quality_decision = "FAIL"

        elif status == "Pass":

            quality_decision = "PASS"

        else:

            quality_decision = "WARNING"

    # ========================================================
    # STATUS FALLBACK
    # ========================================================

    if status is None:

        if quality_decision == "FAIL":

            status = "Fail"

        elif quality_decision == "PASS":

            status = "Pass"

        else:

            status = "Warning"

    # ========================================================
    # NORMALIZE CONFIDENCE
    # ========================================================

    try:

        confidence_value = float(
            confidence
        )

        if (
            0 <= confidence_value <= 1
        ):

            confidence_value *= 100

        confidence = round(
            confidence_value,
            2
        )

    except (
        TypeError,
        ValueError
    ):

        confidence = 0

    # ========================================================
    # NORMALIZE CATEGORY CONFIDENCE
    # ========================================================

    try:

        category_confidence_value = (
            float(
                category_confidence
            )
        )

        if (
            0 <= category_confidence_value <= 1
        ):

            category_confidence_value *= 100

        category_confidence = round(
            category_confidence_value,
            2
        )

    except (
        TypeError,
        ValueError
    ):

        category_confidence = 0

    # ========================================================
    # NORMALIZE DEFECT CONFIDENCE
    # ========================================================

    try:

        defect_confidence_value = (
            float(
                defect_confidence
            )
        )

        if (
            0 <= defect_confidence_value <= 1
        ):

            defect_confidence_value *= 100

        defect_confidence = round(
            defect_confidence_value,
            2
        )

    except (
        TypeError,
        ValueError
    ):

        defect_confidence = confidence

    # ========================================================
    # NORMALIZE SEVERITY SCORE
    # ========================================================

    try:

        severity_score = round(
            float(
                severity_score
            ),
            2
        )

    except (
        TypeError,
        ValueError
    ):

        severity_score = 0

    # ========================================================
    # MONGODB INSPECTION DOCUMENT
    # ========================================================

    inspection = {

        # ----------------------------------------------------
        # IMAGE
        # ----------------------------------------------------

        "filename":
            filename,

        "original_filename":
            original_filename,

        "filepath":
            filepath,

        # ----------------------------------------------------
        # AUTHENTICATED USER
        # ----------------------------------------------------

        "uploaded_by": (
            current_user.get(
                "email"
            )
            if current_user
            else "system"
        ),

        "uploaded_by_user_id": (
            current_user.get(
                "id"
            )
            if current_user
            else None
        ),

        "uploaded_by_role": (
            current_user.get(
                "role"
            )
            if current_user
            else None
        ),

        "uploaded_at":
            datetime.utcnow(),

        # ----------------------------------------------------
        # BASIC AI
        # ----------------------------------------------------

        "prediction":
            prediction,

        "status":
            status,

        "confidence":
            confidence,

        # ----------------------------------------------------
        # PRODUCT CATEGORY
        # ----------------------------------------------------

        "product_category":
            product_category,

        "category_confidence":
            category_confidence,

        # ----------------------------------------------------
        # DEFECT
        # ----------------------------------------------------

        "defect_category":
            defect_category,

        "defect_confidence":
            defect_confidence,

        "category_type":
            category_type,

        # ----------------------------------------------------
        # QUALITY
        # ----------------------------------------------------

        "severity":
            severity,

        "severity_score":
            severity_score,

        "risk_level":
            risk_level,

        "quality_decision":
            quality_decision,

        "recommendation":
            recommendation,

        # ----------------------------------------------------
        # RAW AI RESULT
        # ----------------------------------------------------

        "ai_result":
            ai_result
    }

    # ========================================================
    # SAVE TO MONGODB
    # ========================================================

    result = (
        await database.inspections.insert_one(
            inspection
        )
    )

    inspection_id = (
        result.inserted_id
    )

    # ========================================================
    # GENERATE PDF REPORT
    # ========================================================

    report_data = (
        inspection.copy()
    )

    report_data["_id"] = str(
        inspection_id
    )

    if isinstance(
        report_data.get(
            "uploaded_at"
        ),
        datetime
    ):

        report_data[
            "uploaded_at"
        ] = (
            report_data[
                "uploaded_at"
            ]
            .strftime(
                "%d-%m-%Y %H:%M:%S"
            )
        )

    try:

        report_path = generate_report(
            report_data
        )

        report_filename = (
            os.path.basename(
                report_path
            )
        )

        await database.inspections.update_one(

            {
                "_id":
                    inspection_id
            },

            {
                "$set": {
                    "report":
                        report_filename
                }
            }
        )

    except Exception as error:

        report_filename = None

        print(
            "Warning: PDF report "
            f"generation failed: {error}"
        )

    # ========================================================
    # RESPONSE
    # ========================================================

    return {

        "success":
            True,

        "message":
            "Inspection completed successfully",

        "inspection_id":
            str(
                inspection_id
            ),

        "filename":
            filename,

        "original_filename":
            original_filename,

        "prediction":
            prediction,

        "status":
            status,

        "confidence":
            confidence,

        "product_category":
            product_category,

        "category_confidence":
            category_confidence,

        "defect_category":
            defect_category,

        "defect_confidence":
            defect_confidence,

        "category_type":
            category_type,

        "severity":
            severity,

        "severity_score":
            severity_score,

        "risk_level":
            risk_level,

        "quality_decision":
            quality_decision,

        "recommendation":
            recommendation,

        "report":
            report_filename
    }


# ============================================================
# GET INSPECTION HISTORY
# ============================================================

async def get_history(
    current_user=None
):

    inspections = []

    # --------------------------------------------------------
    # ROLE-AWARE HISTORY
    # --------------------------------------------------------

    query = {}

    if current_user:

        role = str(
            current_user.get(
                "role",
                ""
            )
        ).strip().lower()

        if role in {
            "quality_engineer",
            "quality engineer"
        }:

            query = {
                "uploaded_by_user_id":
                    current_user.get(
                        "id"
                    )
            }

    cursor = (
        database.inspections
        .find(query)
        .sort(
            "uploaded_at",
            -1
        )
    )

    async for inspection in cursor:

        inspection["_id"] = str(
            inspection["_id"]
        )

        if isinstance(
            inspection.get(
                "uploaded_at"
            ),
            datetime
        ):

            inspection[
                "uploaded_at"
            ] = (
                inspection[
                    "uploaded_at"
                ]
                .isoformat()
            )

        inspections.append(
            inspection
        )

    return inspections


# ============================================================
# DASHBOARD STATISTICS
# ============================================================

async def get_dashboard_stats(
    current_user=None
):

    query = {}

    if current_user:

        role = str(
            current_user.get(
                "role",
                ""
            )
        ).strip().lower()

        if role in {
            "quality_engineer",
            "quality engineer"
        }:

            query = {
                "uploaded_by_user_id":
                    current_user.get(
                        "id"
                    )
            }

    total = (
        await database.inspections
        .count_documents(query)
    )

    passed = (
        await database.inspections
        .count_documents(
            {
                **query,
                "$or": [
                    {
                        "status":
                            "Pass"
                    },
                    {
                        "quality_decision":
                            "PASS"
                    }
                ]
            }
        )
    )

    failed = (
        await database.inspections
        .count_documents(
            {
                **query,
                "$or": [
                    {
                        "status":
                            "Fail"
                    },
                    {
                        "quality_decision":
                            "FAIL"
                    }
                ]
            }
        )
    )

    confidence_sum = 0.0

    confidence_count = 0

    cursor = (
        database.inspections
        .find(query)
    )

    async for inspection in cursor:

        confidence = inspection.get(
            "confidence"
        )

        if confidence is None:

            continue

        try:

            confidence = float(
                confidence
            )

            if (
                0 <= confidence <= 1
            ):

                confidence *= 100

            confidence_sum += (
                confidence
            )

            confidence_count += 1

        except (
            TypeError,
            ValueError
        ):

            continue

    if confidence_count > 0:

        average_confidence = round(
            confidence_sum
            /
            confidence_count,
            2
        )

    else:

        average_confidence = 0

    if total > 0:

        pass_rate = round(
            (
                passed
                /
                total
            )
            * 100,
            2
        )

    else:

        pass_rate = 0

    defective = (
        await database.inspections
        .count_documents(
            {
                **query,
                "prediction":
                    "Defective"
            }
        )
    )

    normal = (
        await database.inspections
        .count_documents(
            {
                **query,
                "prediction":
                    "Normal"
            }
        )
    )

    return {

        "total_inspections":
            total,

        "passed":
            passed,

        "failed":
            failed,

        "normal":
            normal,

        "defective":
            defective,

        "pass_rate":
            pass_rate,

        "average_confidence":
            average_confidence
    }


# ============================================================
# ANALYTICS
# ============================================================

async def get_analytics_stats(
    current_user=None
):

    query = {}

    if current_user:

        role = str(
            current_user.get(
                "role",
                ""
            )
        ).strip().lower()

        if role in {
            "quality_engineer",
            "quality engineer"
        }:

            query = {
                "uploaded_by_user_id":
                    current_user.get(
                        "id"
                    )
            }

    # ========================================================
    # BASIC COUNTS
    # ========================================================

    total = (
        await database.inspections
        .count_documents(query)
    )

    normal = (
        await database.inspections
        .count_documents(
            {
                **query,
                "prediction":
                    "Normal"
            }
        )
    )

    defective = (
        await database.inspections
        .count_documents(
            {
                **query,
                "prediction":
                    "Defective"
            }
        )
    )

    passed = (
        await database.inspections
        .count_documents(
            {
                **query,
                "$or": [
                    {
                        "status":
                            "Pass"
                    },
                    {
                        "quality_decision":
                            "PASS"
                    }
                ]
            }
        )
    )

    failed = (
        await database.inspections
        .count_documents(
            {
                **query,
                "$or": [
                    {
                        "status":
                            "Fail"
                    },
                    {
                        "quality_decision":
                            "FAIL"
                    }
                ]
            }
        )
    )

    # ========================================================
    # DISTRIBUTIONS
    # ========================================================

    product_categories = {}

    defect_categories = {}

    category_types = {}

    severity_distribution = {}

    risk_distribution = {}

    quality_decisions = {}

    daily_trends = {}

    # ========================================================
    # READ INSPECTIONS
    # ========================================================

    cursor = (
        database.inspections
        .find(query)
    )

    async for inspection in cursor:

        # ----------------------------------------------------
        # PRODUCT CATEGORY
        # ----------------------------------------------------

        product_category = (
            inspection.get(
                "product_category",
                "Unknown"
            )
        )

        product_categories[
            product_category
        ] = (
            product_categories.get(
                product_category,
                0
            )
            + 1
        )

        # ----------------------------------------------------
        # DEFECT
        # ----------------------------------------------------

        defect_category = (
            inspection.get(
                "defect_category",
                "None"
            )
        )

        defect_categories[
            defect_category
        ] = (
            defect_categories.get(
                defect_category,
                0
            )
            + 1
        )

        # ----------------------------------------------------
        # CATEGORY TYPE
        # ----------------------------------------------------

        category_type = (
            inspection.get(
                "category_type",
                "Unknown"
            )
        )

        category_types[
            category_type
        ] = (
            category_types.get(
                category_type,
                0
            )
            + 1
        )

        # ----------------------------------------------------
        # SEVERITY
        # ----------------------------------------------------

        severity = (
            inspection.get(
                "severity",
                "None"
            )
        )

        severity_distribution[
            severity
        ] = (
            severity_distribution.get(
                severity,
                0
            )
            + 1
        )

        # ----------------------------------------------------
        # RISK
        # ----------------------------------------------------

        risk_level = (
            inspection.get(
                "risk_level",
                "Low"
            )
        )

        risk_distribution[
            risk_level
        ] = (
            risk_distribution.get(
                risk_level,
                0
            )
            + 1
        )

        # ----------------------------------------------------
        # QUALITY DECISION
        # ----------------------------------------------------

        quality_decision = (
            inspection.get(
                "quality_decision"
            )
        )

        if quality_decision is None:

            if (
                inspection.get(
                    "status"
                )
                == "Pass"
            ):

                quality_decision = (
                    "PASS"
                )

            elif (
                inspection.get(
                    "status"
                )
                == "Fail"
            ):

                quality_decision = (
                    "FAIL"
                )

            else:

                quality_decision = (
                    "WARNING"
                )

        quality_decisions[
            quality_decision
        ] = (
            quality_decisions.get(
                quality_decision,
                0
            )
            + 1
        )

        # ====================================================
        # DAILY TREND
        # ====================================================

        uploaded_at = (
            inspection.get(
                "uploaded_at"
            )
        )

        if uploaded_at:

            if isinstance(
                uploaded_at,
                datetime
            ):

                date_key = (
                    uploaded_at.strftime(
                        "%Y-%m-%d"
                    )
                )

            else:

                date_key = str(
                    uploaded_at
                )[:10]

        else:

            date_key = "Unknown"

        if (
            date_key
            not in daily_trends
        ):

            daily_trends[
                date_key
            ] = {

                "inspections":
                    0,

                "normal":
                    0,

                "defective":
                    0,

                "passed":
                    0,

                "failed":
                    0,

                "high_risk":
                    0
            }

        daily_trends[
            date_key
        ][
            "inspections"
        ] += 1

        # ----------------------------------------------------
        # NORMAL / DEFECTIVE
        # ----------------------------------------------------

        if (
            inspection.get(
                "prediction"
            )
            == "Normal"
        ):

            daily_trends[
                date_key
            ][
                "normal"
            ] += 1

        elif (
            inspection.get(
                "prediction"
            )
            == "Defective"
        ):

            daily_trends[
                date_key
            ][
                "defective"
            ] += 1

        # ----------------------------------------------------
        # PASS / FAIL
        # ----------------------------------------------------

        if (
            inspection.get(
                "status"
            )
            == "Pass"
            or
            inspection.get(
                "quality_decision"
            )
            == "PASS"
        ):

            daily_trends[
                date_key
            ][
                "passed"
            ] += 1

        elif (
            inspection.get(
                "status"
            )
            == "Fail"
            or
            inspection.get(
                "quality_decision"
            )
            == "FAIL"
        ):

            daily_trends[
                date_key
            ][
                "failed"
            ] += 1

        # ----------------------------------------------------
        # HIGH RISK
        # ----------------------------------------------------

        if str(
            inspection.get(
                "risk_level",
                ""
            )
        ).lower() in {

            "high",
            "critical"
        }:

            daily_trends[
                date_key
            ][
                "high_risk"
            ] += 1

    # ========================================================
    # SORT TRENDS
    # ========================================================

    trend_data = []

    for date in sorted(
        daily_trends.keys()
    ):

        trend_data.append({

            "date":
                date,

            **daily_trends[
                date
            ]
        })

    # ========================================================
    # RATES
    # ========================================================

    if total > 0:

        pass_rate = round(
            (
                passed
                /
                total
            )
            * 100,
            2
        )

        defect_rate = round(
            (
                defective
                /
                total
            )
            * 100,
            2
        )

        high_risk = (
            risk_distribution.get(
                "High",
                0
            )
            +
            risk_distribution.get(
                "Critical",
                0
            )
        )

        high_risk_rate = round(
            (
                high_risk
                /
                total
            )
            * 100,
            2
        )

    else:

        pass_rate = 0

        defect_rate = 0

        high_risk_rate = 0

    # ========================================================
    # RESPONSE
    # ========================================================

    return {

        "overview": {

            "total_inspections":
                total,

            "normal":
                normal,

            "defective":
                defective,

            "passed":
                passed,

            "failed":
                failed,

            "pass_rate":
                pass_rate,

            "defect_rate":
                defect_rate,

            "high_risk_rate":
                high_risk_rate
        },

        "product_categories":
            product_categories,

        "defect_categories":
            defect_categories,

        "category_types":
            category_types,

        "severity_distribution":
            severity_distribution,

        "risk_distribution":
            risk_distribution,

        "quality_decisions":
            quality_decisions,

        "trends":
            trend_data
    }


# ============================================================
# SINGLE INSPECTION
# OWNERSHIP-AWARE
# ============================================================

async def get_inspection_by_id(
    inspection_id: str,
    current_user=None
):

    try:

        object_id = ObjectId(
            inspection_id
        )

    except Exception:

        return None

    # --------------------------------------------------------
    # BUILD ACCESS QUERY
    # --------------------------------------------------------

    query = {
        "_id":
            object_id
    }

    if current_user:

        role = str(
            current_user.get(
                "role",
                ""
            )
        ).strip().lower()

        # Quality Engineer can access
        # only inspections uploaded by themselves.
        if role in {
            "quality_engineer",
            "quality engineer"
        }:

            query[
                "uploaded_by_user_id"
            ] = current_user.get(
                "id"
            )

    # --------------------------------------------------------
    # FIND INSPECTION
    # --------------------------------------------------------

    inspection = (
        await database.inspections
        .find_one(
            query
        )
    )

    if not inspection:

        return None

    inspection["_id"] = str(
        inspection["_id"]
    )

    if isinstance(
        inspection.get(
            "uploaded_at"
        ),
        datetime
    ):

        inspection[
            "uploaded_at"
        ] = (
            inspection[
                "uploaded_at"
            ]
            .isoformat()
        )

    return inspection


# ============================================================
# GET / GENERATE INSPECTION REPORT
# OWNERSHIP-AWARE
# ============================================================

# ============================================================
# GET / GENERATE INSPECTION REPORT
# OWNERSHIP-AWARE
# ============================================================

async def get_or_generate_report(
    filename: str,
    current_user=None
):
    # --------------------------------------------------------
    # BASIC FILENAME SECURITY
    # --------------------------------------------------------

    if not filename:
        return None

    safe_filename = os.path.basename(filename)

    if safe_filename != filename:
        return None

    if safe_filename in {".", ".."}:
        return None

    # --------------------------------------------------------
    # BUILD ACCESS QUERY
    # --------------------------------------------------------

    query = {
        "$or": [
            {
                "filename": safe_filename
            },
            {
                "report": safe_filename
            }
        ]
    }

    if current_user:

        role = str(
            current_user.get(
                "role",
                ""
            )
        ).strip().lower()

        # Quality Engineer can access
        # only their own reports.
        if role in {
            "quality_engineer",
            "quality engineer"
        }:

            query[
                "uploaded_by_user_id"
            ] = current_user.get(
                "id"
            )

        elif role in {
            "factory_supervisor",
            "factory supervisor"
        }:

            # Supervisors may access reports.
            pass

        else:

            return None

    # --------------------------------------------------------
    # FIND INSPECTION
    # --------------------------------------------------------

    inspection = (
        await database.inspections
        .find_one(
            query
        )
    )

    if not inspection:
        return None

    # --------------------------------------------------------
    # EXISTING REPORT
    # --------------------------------------------------------

    existing_report = (
        inspection.get(
            "report"
        )
    )

    if existing_report:

        safe_existing_report = os.path.basename(
            existing_report
        )

        if safe_existing_report != existing_report:
            return None

        report_path = os.path.abspath(
            os.path.join(
                REPORT_FOLDER,
                safe_existing_report
            )
        )

        report_root = os.path.abspath(
            REPORT_FOLDER
        )

        try:

            common_path = os.path.commonpath(
                [
                    report_root,
                    report_path
                ]
            )

        except ValueError:

            return None

        if common_path != report_root:
            return None

        if os.path.isfile(
            report_path
        ):

            return safe_existing_report

    # --------------------------------------------------------
    # PREPARE DATA FOR REPORT GENERATION
    # --------------------------------------------------------

    report_data = (
        inspection.copy()
    )

    report_data["_id"] = str(
        report_data["_id"]
    )

    if isinstance(
        report_data.get(
            "uploaded_at"
        ),
        datetime
    ):

        report_data[
            "uploaded_at"
        ] = (
            report_data[
                "uploaded_at"
            ]
            .strftime(
                "%d-%m-%Y %H:%M:%S"
            )
        )

    # --------------------------------------------------------
    # GENERATE REPORT
    # --------------------------------------------------------

    try:

        report_path = generate_report(
            report_data
        )

    except Exception as error:

        print(
            "Warning: PDF report "
            f"generation failed: {error}"
        )

        return None

    report_filename = (
        os.path.basename(
            report_path
        )
    )

    # --------------------------------------------------------
    # SAVE REPORT NAME
    # --------------------------------------------------------

    await database.inspections.update_one(

        {
            "_id":
                inspection["_id"]
        },

        {
            "$set": {
                "report":
                    report_filename
            }
        }
    )

    return report_filename