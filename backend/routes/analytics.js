from fastapi import APIRouter, Depends, Query

from database import get_conn
from auth import get_current_user

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


def _user_filter(current_user: dict):
    """Returns (sql_clause, params) restricting to the current user's own
    inspections when they're a Quality Engineer. Supervisors see everything."""
    if current_user.get("role") == "quality_engineer":
        return "WHERE inspected_by = %s", [current_user["id"]]
    return "", []


@router.get("/summary")
def summary(current_user: dict = Depends(get_current_user)):
    conn = get_conn()
    cur = conn.cursor()
    where_clause, params = _user_filter(current_user)
    cur.execute(
        f"""SELECT
             COUNT(*) AS total_inspected,
             SUM(CASE WHEN status = 'fail' THEN 1 ELSE 0 END) AS defects_detected,
             SUM(CASE WHEN status = 'pass' THEN 1 ELSE 0 END) AS passed,
             AVG(confidence_score) AS avg_confidence
           FROM inspections {where_clause}""",
        params,
    )
    row = cur.fetchone()
    cur.close()
    conn.close()

    total = row["total_inspected"] or 0
    passed = row["passed"] or 0
    quality_score = round((passed / total) * 100, 1) if total > 0 else 0

    return {
        "total_products_inspected": total,
        "defects_detected": row["defects_detected"] or 0,
        "quality_score_percent": quality_score,
        "ai_confidence_percent": round(float(row["avg_confidence"]), 1) if row["avg_confidence"] else 0,
    }


@router.get("/defect-breakdown")
def defect_breakdown(current_user: dict = Depends(get_current_user)):
    conn = get_conn()
    cur = conn.cursor()
    where_clause, params = _user_filter(current_user)
    fail_clause = "status = 'fail'"
    combined_where = f"{where_clause} AND {fail_clause}" if where_clause else f"WHERE {fail_clause}"

    cur.execute(
        f"""SELECT defect_type, COUNT(*) AS count
           FROM inspections {combined_where}
           GROUP BY defect_type ORDER BY count DESC""",
        params,
    )
    rows = cur.fetchall()
    cur.execute(
        f"""SELECT severity_level, COUNT(*) AS count
           FROM inspections {combined_where}
           GROUP BY severity_level""",
        params,
    )
    severity_rows = cur.fetchall()
    cur.close()
    conn.close()

    total_defects = sum(r["count"] for r in rows)
    breakdown = [
        {
            "defect_type": r["defect_type"],
            "count": r["count"],
            "percent": round((r["count"] / total_defects) * 100, 1) if total_defects > 0 else 0,
        }
        for r in rows
    ]
    severity_breakdown = [{"severity_level": r["severity_level"], "count": r["count"]} for r in severity_rows]

    return {"breakdown": breakdown, "severity_breakdown": severity_breakdown}


@router.get("/trends")
def trends(days: int = Query(14, le=90), current_user: dict = Depends(get_current_user)):
    conn = get_conn()
    cur = conn.cursor()
    where_clause, params = _user_filter(current_user)
    date_clause = "created_at >= NOW() - (%s * INTERVAL '1 day')"
    combined_where = f"{where_clause} AND {date_clause}" if where_clause else f"WHERE {date_clause}"

    cur.execute(
        f"""SELECT
              created_at::date AS day,
              COUNT(*) AS total,
              SUM(CASE WHEN status = 'fail' THEN 1 ELSE 0 END) AS defects,
              SUM(CASE WHEN status = 'pass' THEN 1 ELSE 0 END) AS passed,
              AVG(severity_score) AS avg_severity
            FROM inspections
            {combined_where}
            GROUP BY day ORDER BY day ASC""",
        params + [days],
    )
    rows = cur.fetchall()
    cur.close()
    conn.close()

    return {
        "days": [
            {
                "date": str(r["day"]),
                "total": r["total"],
                "defects": r["defects"],
                "passed": r["passed"],
                "avg_severity": round(float(r["avg_severity"]), 1) if r["avg_severity"] else 0,
            }
            for r in rows
        ]
    }


@router.get("/production-lines")
def production_lines(current_user: dict = Depends(get_current_user)):
    conn = get_conn()
    cur = conn.cursor()
    where_clause, params = _user_filter(current_user)
    # Note: table is aliased "i" here, so the filter column needs the prefix.
    where_clause_i = where_clause.replace("inspected_by", "i.inspected_by")

    cur.execute(
        f"""SELECT
             COALESCE(p.production_line, 'Unassigned') AS production_line,
             COUNT(i.id) AS total_inspected,
             SUM(CASE WHEN i.status = 'fail' THEN 1 ELSE 0 END) AS defects,
             SUM(CASE WHEN i.status = 'pass' THEN 1 ELSE 0 END) AS passed,
             AVG(i.severity_score) AS avg_severity,
             MAX(i.created_at) AS last_inspection
           FROM inspections i
           JOIN products p ON p.id = i.product_id
           {where_clause_i}
           GROUP BY production_line
           ORDER BY total_inspected DESC""",
        params,
    )
    rows = cur.fetchall()
    cur.close()
    conn.close()

    lines = []
    for r in rows:
        avg_sev = float(r["avg_severity"]) if r["avg_severity"] else 0
        status = "Attention Needed" if avg_sev >= 60 else "Monitor" if avg_sev >= 40 else "Healthy"
        lines.append(
            {
                "production_line": r["production_line"],
                "total_inspected": r["total_inspected"],
                "defects": r["defects"],
                "passed": r["passed"],
                "yield_percent": round((r["passed"] / r["total_inspected"]) * 100, 1) if r["total_inspected"] else 0,
                "avg_severity": round(avg_sev, 1),
                "status": status,
                "last_inspection": r["last_inspection"],
            }
        )

    return {"lines": lines}
