from collections import Counter, defaultdict
from datetime import datetime, timedelta

from sqlalchemy.orm import joinedload
from ml.quality.assessment_engine import category_label

from app.models.all_models import Detection, Inspection, ProductionBatch


PERIOD_DAYS = {"TODAY": 1, "LAST_7_DAYS": 7, "LAST_30_DAYS": 30, "THIS_MONTH": 30}


def period_start(period: str) -> tuple[str, datetime]:
    normalized = (period or "LAST_7_DAYS").upper()
    days = PERIOD_DAYS.get(normalized, 7)
    now = datetime.utcnow()
    if normalized == "TODAY":
        return normalized, now.replace(hour=0, minute=0, second=0, microsecond=0)
    return normalized, now - timedelta(days=days - 1)


def _decision(inspection: Inspection) -> str:
    if inspection.quality_decision and inspection.quality_decision.final_decision:
        d = inspection.quality_decision.final_decision.upper()
        if d == "PASS":
            return "PASS"
        if d in {"FAIL", "REJECT", "REWORK", "REVIEW"}:
            return "FAIL"
    if not inspection.detections:
        return "PASS"
    return "FAIL"


def _severity_level(detection: Detection) -> str:
    if detection.assessment:
        return detection.assessment.severity_level.upper()
    if detection.inspection.severity_score and detection.inspection.severity_score.level:
        return detection.inspection.severity_score.level.upper()
    return "LOW"


def calculate_quality_analytics(db, period: str = "LAST_7_DAYS") -> dict:
    normalized_period, start = period_start(period)
    inspections = (
        db.query(Inspection)
        .options(
            joinedload(Inspection.detections).joinedload(Detection.assessment),
            joinedload(Inspection.quality_decision),
            joinedload(Inspection.quality_assessment),
            joinedload(Inspection.severity_score),
            joinedload(Inspection.batch).joinedload(ProductionBatch.product),
        )
        .filter(Inspection.created_at >= start)
        .order_by(Inspection.created_at.asc())
        .all()
    )

    decisions = Counter()
    defect_types = Counter()
    severity_counts = Counter({level: 0 for level in ("CRITICAL", "HIGH", "MEDIUM", "LOW")})
    confidences, severity_scores = [], []
    daily = defaultdict(lambda: {"inspection_volume": 0, "passed": 0, "failed": 0, "defects": 0, "severity_scores": []})
    high_severity_types = Counter()

    for inspection in inspections:
        decision = _decision(inspection)
        decisions[decision] += 1
        date_key = (inspection.created_at or datetime.utcnow()).strftime("%Y-%m-%d")
        entry = daily[date_key]
        entry["inspection_volume"] += 1
        if decision == "PASS":
            entry["passed"] += 1
        else:
            entry["failed"] += 1

        for detection in inspection.detections:
            defect_type = detection.defect_display_name or category_label(detection.defect_type, detection.product_category) or (detection.defect_type.capitalize() if detection.defect_type else "Defect")
            level = _severity_level(detection)
            defect_types[defect_type] += 1
            severity_counts[level] += 1
            confidences.append(float(detection.confidence or 0.0))
            score = detection.assessment.severity_score if detection.assessment else None
            if score is not None:
                severity_scores.append(float(score))
                entry["severity_scores"].append(float(score))
            elif inspection.severity_score:
                severity_scores.append(float(inspection.severity_score.total_score or 0.0))
                entry["severity_scores"].append(float(inspection.severity_score.total_score or 0.0))
            if level in {"CRITICAL", "HIGH"}:
                high_severity_types[defect_type] += 1
            entry["defects"] += 1

    total_inspections = len(inspections)
    passed = decisions["PASS"]
    failed = decisions["FAIL"]
    total_defects = sum(defect_types.values())
    divisor = total_inspections or 1

    days = PERIOD_DAYS.get(normalized_period, 7)
    first_day = start.replace(hour=0, minute=0, second=0, microsecond=0)
    trends = []
    for offset in range(days):
        date = first_day + timedelta(days=offset)
        key = date.strftime("%Y-%m-%d")
        entry = daily[key]
        volume = entry["inspection_volume"]
        trends.append({
            "date": key,
            "inspection_volume": volume,
            "passed": entry["passed"],
            "failed": entry["failed"],
            "defects": entry["defects"],
            "defect_rate": round(entry["defects"] / volume * 100, 2) if volume else 0.0,
            "pass_rate": round(entry["passed"] / volume * 100, 2) if volume else 0.0,
            "average_severity": round(sum(entry["severity_scores"]) / len(entry["severity_scores"]), 2) if entry["severity_scores"] else 0.0,
        })

    midpoint = max(len(trends) // 2, 1)
    earlier = trends[:midpoint]
    later = trends[midpoint:]
    earlier_rate = sum(item["defect_rate"] for item in earlier) / len(earlier)
    later_rate = sum(item["defect_rate"] for item in later) / len(later) if later else earlier_rate
    trend_direction = "increasing" if later_rate > earlier_rate + 1 else "decreasing" if later_rate < earlier_rate - 1 else "stable"
    major_issues = []
    if severity_counts["CRITICAL"]:
        major_issues.append(f"{severity_counts['CRITICAL']} critical defect(s) detected.")
    if high_severity_types:
        top_high, count = high_severity_types.most_common(1)[0]
        major_issues.append(f"Recurring high-severity defect: {top_high} ({count}).")
    recommendations = []
    if severity_counts["CRITICAL"]:
        recommendations.append("Contain affected production and investigate critical defects immediately.")
    if trend_direction == "increasing":
        recommendations.append("Increase sampling and review the production process because defect rate is increasing.")
    if not recommendations:
        recommendations.append("Maintain current inspection controls and continue monitoring quality trends.")

    return {
        "period": normalized_period,
        "generated_at": datetime.utcnow().isoformat(),
        "total_inspections": total_inspections,
        "passed_inspections": passed,
        "failed_inspections": failed,
        "total_defects": total_defects,
        "defects_by_category": [{"name": name, "value": value} for name, value in defect_types.most_common()],
        "defects_by_severity": [{"name": level.title(), "value": severity_counts[level]} for level in ("CRITICAL", "HIGH", "MEDIUM", "LOW")],
        "critical_defects": severity_counts["CRITICAL"],
        "high_severity_defects": severity_counts["HIGH"],
        "medium_severity_defects": severity_counts["MEDIUM"],
        "low_severity_defects": severity_counts["LOW"],
        "average_severity": round(sum(severity_scores) / len(severity_scores), 2) if severity_scores else 0.0,
        "average_confidence": round(sum(confidences) / len(confidences), 2) if confidences else 0.0,
        "pass_rate": round(passed / divisor * 100, 2) if total_inspections else 0.0,
        "fail_rate": round(failed / divisor * 100, 2) if total_inspections else 0.0,
        "defect_rate": round(total_defects / divisor * 100, 2) if total_inspections else 0.0,
        "trends": trends,
        "trend_direction": trend_direction,
        "major_quality_issues": major_issues,
        "recommended_actions": recommendations,
    }
