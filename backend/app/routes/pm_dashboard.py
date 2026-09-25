from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select, case
from sqlalchemy.orm import Session



from ..database import get_db
from ..dependencies import current_user
from ..models import (
    Inspection,
    Defect,
    Product,
    Decision,
    Severity,
    ReviewStatus,
    Role,
)

router = APIRouter(
    prefix="/api/dashboard",
    tags=["Product Manager Dashboard"]
)


@router.get("/pm")
def product_manager_dashboard(
    db: Session = Depends(get_db),
    user=Depends(current_user)
):
    """
    Product Manager Dashboard

    Provides business-level quality monitoring:
    - Overall KPIs
    - Quality performance
    - Defect analytics
    - Product performance
    - Production-line performance
    - Recent inspections
    - Quality alerts
    """

    # ---------------------------------------------------------
    # ROLE CHECK
    # ---------------------------------------------------------

    if user.role != Role.PRODUCT_MANAGER:
        raise HTTPException(
            status_code=403,
            detail="Product Manager role required"
        )

    # ---------------------------------------------------------
    # TOTAL PRODUCTS
    # ---------------------------------------------------------

    total_products = db.scalar(
        select(func.count(Product.id))
    ) or 0

    # ---------------------------------------------------------
    # TOTAL INSPECTIONS
    # ---------------------------------------------------------

    total_inspections = db.scalar(
        select(func.count(Inspection.id))
    ) or 0

    # ---------------------------------------------------------
    # PASSED INSPECTIONS
    # ---------------------------------------------------------

    total_passed = db.scalar(
        select(func.count(Inspection.id))
        .where(
            Inspection.decision == Decision.PASS
        )
    ) or 0

    # ---------------------------------------------------------
    # FAILED INSPECTIONS
    # ---------------------------------------------------------

    total_failed = db.scalar(
        select(func.count(Inspection.id))
        .where(
            Inspection.decision == Decision.FAIL
        )
    ) or 0

    # ---------------------------------------------------------
    # OVERALL PASS RATE
    # ---------------------------------------------------------

    if total_inspections > 0:
        pass_rate = round(
            (total_passed / total_inspections) * 100,
            2
        )
    else:
        pass_rate = 0

    # ---------------------------------------------------------
    # TOTAL DEFECTS
    # ---------------------------------------------------------

    total_defects = db.scalar(
        select(func.count(Defect.id))
    ) or 0

    # ---------------------------------------------------------
    # OVERALL DEFECT RATE
    # ---------------------------------------------------------

    if total_inspections > 0:
        defect_rate = round(
            (total_defects / total_inspections) * 100,
            2
        )
    else:
        defect_rate = 0

    # ---------------------------------------------------------
    # CRITICAL DEFECTS
    # ---------------------------------------------------------

    critical_defects = db.scalar(
        select(func.count(Defect.id))
        .where(
            Defect.severity_level == Severity.CRITICAL
        )
    ) or 0

    # ---------------------------------------------------------
    # PRODUCTS UNDER REVIEW
    # ---------------------------------------------------------

    products_under_review = db.scalar(
        select(
            func.count(
                func.distinct(Inspection.product_id)
            )
        )
        .where(
            Inspection.review_status == ReviewStatus.PENDING,
            Inspection.product_id.is_not(None)
        )
    ) or 0

    # ---------------------------------------------------------
    # AVERAGE INSPECTION TIME
    # ---------------------------------------------------------

    avg_processing_time = db.scalar(
        select(
            func.avg(
                Inspection.processing_time_ms
            )
        )
    )

    if avg_processing_time is None:
        avg_inspection_time = 0
    else:
        avg_inspection_time = round(
            float(avg_processing_time) / 1000,
            2
        )

    # ---------------------------------------------------------
    # QUALITY TREND - LAST 7 DAYS
    # ---------------------------------------------------------

    today = datetime.utcnow().date()

    quality_trend = []

    for i in range(6, -1, -1):

        current_date = today - timedelta(days=i)
        next_date = current_date + timedelta(days=1)

        day_total = db.scalar(
            select(func.count(Inspection.id))
            .where(
                Inspection.created_at >= datetime.combine(
                    current_date,
                    datetime.min.time()
                ),
                Inspection.created_at < datetime.combine(
                    next_date,
                    datetime.min.time()
                )
            )
        ) or 0

        day_passed = db.scalar(
            select(func.count(Inspection.id))
            .where(
                Inspection.created_at >= datetime.combine(
                    current_date,
                    datetime.min.time()
                ),
                Inspection.created_at < datetime.combine(
                    next_date,
                    datetime.min.time()
                ),
                Inspection.decision == Decision.PASS
            )
        ) or 0

        day_pass_rate = round(
            (day_passed / day_total) * 100,
            2
        ) if day_total else 0

        quality_trend.append({
            "date": current_date.isoformat(),
            "inspections": day_total,
            "passed": day_passed,
            "pass_rate": day_pass_rate
        })

    # ---------------------------------------------------------
    # INSPECTION VOLUME TREND - LAST 7 DAYS
    # ---------------------------------------------------------

    inspection_volume = [
        {
            "date": item["date"],
            "count": item["inspections"]
        }
        for item in quality_trend
    ]

    # ---------------------------------------------------------
    # PRODUCT-WISE PERFORMANCE
    # ---------------------------------------------------------

    product_rows = db.execute(
        select(
            Product.id,
            Product.product_code,
            Product.product_name,
            Product.product_category,
            Product.production_line,
            func.count(Inspection.id).label("inspection_count"),
            func.sum(
                case(
                    (Inspection.decision == Decision.PASS, 1),
                    else_=0
                )
            ).label("passed_count"),
            func.sum(
                case(
                    (Inspection.decision == Decision.FAIL, 1),
                    else_=0
                )
            ).label("failed_count")

        )
        .outerjoin(
            Inspection,
            Inspection.product_id == Product.id
        )
        .group_by(
            Product.id,
            Product.product_code,
            Product.product_name,
            Product.product_category,
            Product.production_line
        )
        .order_by(
            func.count(Inspection.id).desc()
        )
        .limit(20)
    ).all()

    product_performance = []

    for row in product_rows:

        inspection_count = int(
            row.inspection_count or 0
        )

        passed_count = int(
            row.passed_count or 0
        )

        failed_count = int(
            row.failed_count or 0
        )

        product_pass_rate = round(
            (passed_count / inspection_count) * 100,
            2
        ) if inspection_count else 0

        product_performance.append({
            "product_id": row.id,
            "product_code": row.product_code,
            "product_name": row.product_name,
            "category": row.product_category,
            "production_line": row.production_line,
            "inspections": inspection_count,
            "passed": passed_count,
            "failed": failed_count,
            "pass_rate": product_pass_rate
        })

    # ---------------------------------------------------------
    # PRODUCTION LINE PERFORMANCE
    # ---------------------------------------------------------

    line_rows = db.execute(
        select(
            Product.production_line,
            func.count(Inspection.id).label("inspection_count"),
            func.sum(
                case(
                    (Inspection.decision == Decision.PASS, 1),
                    else_=0
                )
            ).label("passed_count"),
            func.sum(
                case(
                    (Inspection.decision == Decision.FAIL, 1),
                    else_=0
                )
            ).label("failed_count")

        )
        .join(
            Inspection,
            Inspection.product_id == Product.id
        )
        .where(
            Product.production_line.is_not(None)
        )
        .group_by(
            Product.production_line
        )
        .order_by(
            func.count(Inspection.id).desc()
        )
    ).all()

    production_line_performance = []

    for row in line_rows:

        inspection_count = int(
            row.inspection_count or 0
        )

        passed_count = int(
            row.passed_count or 0
        )

        failed_count = int(
            row.failed_count or 0
        )

        line_pass_rate = round(
            (passed_count / inspection_count) * 100,
            2
        ) if inspection_count else 0

        production_line_performance.append({
            "production_line": row.production_line,
            "inspections": inspection_count,
            "passed": passed_count,
            "failed": failed_count,
            "pass_rate": line_pass_rate
        })

    # ---------------------------------------------------------
    # TOP DEFECT TYPES
    # ---------------------------------------------------------

    defect_type_rows = db.execute(
        select(
            Defect.defect_type,
            func.count(Defect.id).label("count")
        )
        .group_by(
            Defect.defect_type
        )
        .order_by(
            func.count(Defect.id).desc()
        )
        .limit(10)
    ).all()

    top_defect_types = []

    for row in defect_type_rows:

        top_defect_types.append({
            "defect_type": row.defect_type,
            "count": int(row.count or 0)
        })

    # ---------------------------------------------------------
    # DEFECT DISTRIBUTION BY SEVERITY
    # ---------------------------------------------------------

    severity_rows = db.execute(
        select(
            Defect.severity_level,
            func.count(Defect.id).label("count")
        )
        .group_by(
            Defect.severity_level
        )
    ).all()

    severity_distribution = []

    for row in severity_rows:

        severity_distribution.append({
            "severity": (
                row.severity_level.value
                if row.severity_level
                else "UNKNOWN"
            ),
            "count": int(row.count or 0)
        })

    # ---------------------------------------------------------
    # DEFECT TREND - LAST 7 DAYS
    # ---------------------------------------------------------

    defect_trend = []

    for i in range(6, -1, -1):

        current_date = today - timedelta(days=i)
        next_date = current_date + timedelta(days=1)

        count = db.scalar(
            select(func.count(Defect.id))
            .join(
                Inspection,
                Defect.inspection_id == Inspection.id
            )
            .where(
                Inspection.created_at >= datetime.combine(
                    current_date,
                    datetime.min.time()
                ),
                Inspection.created_at < datetime.combine(
                    next_date,
                    datetime.min.time()
                )
            )
        ) or 0

        defect_trend.append({
            "date": current_date.isoformat(),
            "defects": int(count)
        })

    # ---------------------------------------------------------
    # HIGHEST DEFECT PRODUCT
    # ---------------------------------------------------------

    highest_defect_product = db.execute(
        select(
            Product.product_code,
            Product.product_name,
            func.count(Defect.id).label("defect_count")
        )
        .join(
            Inspection,
            Inspection.product_id == Product.id
        )
        .join(
            Defect,
            Defect.inspection_id == Inspection.id
        )
        .group_by(
            Product.id,
            Product.product_code,
            Product.product_name
        )
        .order_by(
            func.count(Defect.id).desc()
        )
        .limit(1)
    ).first()

    highest_defect_product_data = None

    if highest_defect_product:

        highest_defect_product_data = {
            "product_code": highest_defect_product.product_code,
            "product_name": highest_defect_product.product_name,
            "defect_count": int(
                highest_defect_product.defect_count or 0
            )
        }

    # ---------------------------------------------------------
    # HIGHEST DEFECT PRODUCTION LINE
    # ---------------------------------------------------------

    highest_defect_line = db.execute(
        select(
            Product.production_line,
            func.count(Defect.id).label("defect_count")
        )
        .join(
            Inspection,
            Inspection.product_id == Product.id
        )
        .join(
            Defect,
            Defect.inspection_id == Inspection.id
        )
        .where(
            Product.production_line.is_not(None)
        )
        .group_by(
            Product.production_line
        )
        .order_by(
            func.count(Defect.id).desc()
        )
        .limit(1)
    ).first()

    highest_defect_line_data = None

    if highest_defect_line:

        highest_defect_line_data = {
            "production_line": highest_defect_line.production_line,
            "defect_count": int(
                highest_defect_line.defect_count or 0
            )
        }

    # ---------------------------------------------------------
    # QUALITY ALERTS
    # ---------------------------------------------------------

    alerts = []

    if critical_defects > 0:

        alerts.append({
            "type": "CRITICAL",
            "title": "Critical Defects Detected",
            "message": (
                f"{critical_defects} critical defect(s) "
                "require attention."
            )
        })

    if total_failed > 0:

        alerts.append({
            "type": "WARNING",
            "title": "Failed Inspections",
            "message": (
                f"{total_failed} inspection(s) "
                "have failed quality checks."
            )
        })

    if products_under_review > 0:

        alerts.append({
            "type": "REVIEW",
            "title": "Products Under Review",
            "message": (
                f"{products_under_review} product(s) "
                "have pending inspections."
            )
        })

    if not alerts:

        alerts.append({
            "type": "INFO",
            "title": "Quality Status",
            "message": "No major quality alerts at this time."
        })

    # ---------------------------------------------------------
    # RECENT INSPECTIONS
    # ---------------------------------------------------------

    recent = db.scalars(
        select(Inspection)
        .order_by(
            Inspection.created_at.desc()
        )
        .limit(10)
    ).all()

    recent_inspections = []

    for inspection in recent:

        product = inspection.product

        recent_inspections.append({
            "id": inspection.id,
            "inspection_uuid": inspection.inspection_uuid,

            "product_code": (
                product.product_code
                if product
                else None
            ),

            "product_name": (
                product.product_name
                if product
                else None
            ),

            "decision": (
                inspection.decision.value
                if inspection.decision
                else None
            ),

            "severity": (
                inspection.severity_level.value
                if inspection.severity_level
                else None
            ),

            "severity_score": round(
                float(inspection.severity_score or 0),
                2
            ),

            "confidence": round(
                float(
                    inspection.highest_confidence or 0
                ) * 100,
                2
            ),

            "defect_count": (
                inspection.defect_count or 0
            ),

            "processing_time": round(
                float(
                    inspection.processing_time_ms or 0
                ) / 1000,
                2
            ),

            "review_status": (
                inspection.review_status.value
                if inspection.review_status
                else None
            ),

            "created_at": (
                inspection.created_at.isoformat()
                if inspection.created_at
                else None
            )
        })

    # ---------------------------------------------------------
    # FINAL RESPONSE
    # ---------------------------------------------------------

    return {
        "kpis": {
            "total_products": total_products,
            "total_inspections": total_inspections,
            "total_passed": total_passed,
            "total_failed": total_failed,
            "pass_rate": pass_rate,
            "defect_rate": defect_rate,
            "critical_defects": critical_defects,
            "products_under_review": products_under_review,
            "avg_inspection_time": avg_inspection_time
        },

        "quality_trend": quality_trend,

        "inspection_volume": inspection_volume,

        "product_performance": product_performance,

        "production_line_performance": production_line_performance,

        "top_defect_types": top_defect_types,

        "severity_distribution": severity_distribution,

        "defect_trend": defect_trend,

        "highest_defect_product": highest_defect_product_data,

        "highest_defect_production_line": highest_defect_line_data,

        "quality_alerts": alerts,

        "recent_inspections": recent_inspections
    }