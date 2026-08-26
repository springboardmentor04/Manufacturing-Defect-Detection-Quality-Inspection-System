from fastapi import APIRouter, Depends, Query

from database import get_conn
from auth import get_current_user

router = APIRouter(prefix="/api/reports", tags=["reports"])


@router.get("")
def list_reports(days: int = Query(30, le=180), current_user: dict = Depends(get_current_user)):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        """SELECT
             i.created_at::date AS report_date,
             COUNT(*) AS total_inspected,
             SUM(CASE WHEN i.status = 'fail' THEN 1 ELSE 0 END) AS defects,
             SUM(CASE WHEN i.status = 'pass' THEN 1 ELSE 0 END) AS passed,
             SUM(CASE WHEN i.severity_level = 'Critical' THEN 1 ELSE 0 END) AS critical,
             SUM(CASE WHEN i.severity_level = 'High' THEN 1 ELSE 0 END) AS high,
             AVG(i.confidence_score) AS avg_confidence
           FROM inspections i
           WHERE i.created_at >= NOW() - (%s * INTERVAL '1 day')
           GROUP BY report_date ORDER BY report_date DESC""",
        (days,),
    )
    rows = cur.fetchall()
    cur.close()
    conn.close()

    reports = [
        {
            "report_date": str(r["report_date"]),
            "total_inspected": r["total_inspected"],
            "defects": r["defects"],
            "passed": r["passed"],
            "critical_defects": r["critical"],
            "high_defects": r["high"],
            "yield_percent": round((r["passed"] / r["total_inspected"]) * 100, 1) if r["total_inspected"] else 0,
            "avg_confidence": round(float(r["avg_confidence"]), 1) if r["avg_confidence"] else 0,
        }
        for r in rows
    ]
    return {"reports": reports}


@router.get("/{report_date}")
def report_detail(report_date: str, current_user: dict = Depends(get_current_user)):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        """SELECT i.id, i.defect_type, i.status, i.severity_score, i.severity_level, i.recommendation,
                  i.created_at, p.product_code, p.product_name, p.production_line, u.full_name
           FROM inspections i
           JOIN products p ON p.id = i.product_id
           JOIN users u ON u.id = i.inspected_by
           WHERE i.created_at::date = %s
           ORDER BY i.created_at DESC""",
        (report_date,),
    )
    rows = cur.fetchall()
    cur.close()
    conn.close()

    return {"date": report_date, "inspections": [dict(r) for r in rows]}
