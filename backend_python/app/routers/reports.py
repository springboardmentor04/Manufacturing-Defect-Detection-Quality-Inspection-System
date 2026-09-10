from datetime import datetime, timezone, timedelta
from typing import Optional
from fastapi import APIRouter, Query
from app.db import get_batches_col, get_findings_col, get_products_col, get_quality_reports_col

router = APIRouter(prefix="/api/reports", tags=["reports"])

IST = timezone(timedelta(hours=5, minutes=30))

def get_ist_date_window(offset_days: int = 0):
    now_ist = datetime.now(IST)
    dates = []
    for i in range(6, -1, -1):
        d = now_ist - timedelta(days=offset_days + i)
        iso_date = d.strftime("%Y-%m-%d")
        label = d.strftime("%d %b")  # e.g. "28 Aug", "31 Aug"
        dates.append({"isoDate": iso_date, "label": label, "dateObj": d})
    return dates

@router.get("")
@router.get("/")
@router.get("/list")
async def list_quality_reports():
    """
    Returns documents stored directly in MongoDB 'qualityReports' collection.
    """
    reports_col = get_quality_reports_col()
    cursor = reports_col.find().sort("createdAt", -1)
    reports = await cursor.to_list(length=100)
    return {"success": True, "reports": reports}

@router.get("/summary")
async def get_report_summary(offset: Optional[int] = Query(0, alias="offset")):
    """
    Computes live quality reports statistics and period metrics from MongoDB collections.
    Calculates exact IST date-wise batch pass rates for the 7-day window specified by offset.
    Days without MongoDB batch records strictly return 0% pass rate.
    """
    batches_col = get_batches_col()
    findings_col = get_findings_col()
    products_col = get_products_col()
    reports_col = get_quality_reports_col()

    total_batches = await batches_col.count_documents({})
    failed_batches = await batches_col.count_documents({"flagCount": {"$gt": 0}})
    passed_batches = total_batches - failed_batches

    total_products = await products_col.count_documents({})
    defected_products = await products_col.count_documents({"status": "Failed"})
    passed_products = total_products - defected_products

    batches_pass_rate = round((passed_batches / total_batches * 100), 1) if total_batches > 0 else 100.0
    products_pass_rate = round((passed_products / total_products * 100), 1) if total_products > 0 else 100.0
    reports_count = await reports_col.count_documents({})

    overall_pass_rate = batches_pass_rate

    # Fetch all inspection batches from MongoDB to calculate IST date-wise pass rates
    all_batches_cursor = batches_col.find()
    all_batches = await all_batches_cursor.to_list(length=500)

    ist_date_window = get_ist_date_window(offset_days=offset or 0)
    trend_bars = []
    trend_values = []

    for item in ist_date_window:
        target_iso = item["isoDate"]
        label = item["label"]

        # Filter MongoDB batches captured on this exact IST date
        day_batches = []
        for b in all_batches:
            cap = b.get("capturedAt") or b.get("createdAt")
            if cap:
                if isinstance(cap, str):
                    try:
                        cap_dt = datetime.fromisoformat(cap.replace("Z", "+00:00"))
                    except Exception:
                        continue
                elif isinstance(cap, datetime):
                    cap_dt = cap
                else:
                    continue

                if cap_dt.tzinfo is None:
                    cap_dt = cap_dt.replace(tzinfo=timezone.utc)
                
                b_ist = cap_dt.astimezone(IST)
                b_iso = b_ist.strftime("%Y-%m-%d")
                if b_iso == target_iso:
                    day_batches.append(b)

        if day_batches:
            total_day = len(day_batches)
            passed_day = sum(1 for b in day_batches if b.get("flagCount", 0) == 0 or b.get("verdict") == "Pass" or b.get("status") in ["Passed", "Complete"])
            pass_val = round((passed_day / total_day) * 100, 1)
        else:
            # 0% pass rate for dates without database batch records
            pass_val = 0.0

        trend_bars.append({
            "isoDate": target_iso,
            "label": label,
            "value": pass_val,
            "batchCount": len(day_batches)
        })
        trend_values.append(pass_val)

    # Dynamic Defect Mix aggregate query from MongoDB findings for ACTIVE defects only
    pipeline = [
        {"$match": {"decision": {"$in": ["Fail", "Reject", "Defective", "Hold"]}}},
        {"$group": {"_id": "$defectType", "count": {"$sum": 1}}}
    ]
    finding_counts = await findings_col.aggregate(pipeline).to_list(length=20)
    
    colors = ["#27837f", "#fcbe5a", "#ba4a31", "#799a98", "#6366f1", "#ec4899"]
    defect_mix = []
    top_defect = "None"
    max_count = 0

    total_defects_count = sum(f["count"] for f in finding_counts if f["_id"] not in ["Not defective", "None", None])

    if total_defects_count > 0:
        idx = 0
        for f in finding_counts:
            dtype = f["_id"] or "General"
            if dtype in ["Not defective", "None", None]:
                continue
            cnt = f["count"]
            if cnt > max_count:
                max_count = cnt
                top_defect = dtype
            
            pct = round((cnt / total_defects_count * 100), 1)
            defect_mix.append({
                "label": dtype,
                "value": pct,
                "count": cnt,
                "color": colors[idx % len(colors)]
            })
            idx += 1
        top_defect_pct = round((max_count / total_defects_count * 100), 1)
    else:
        defect_mix = [
            {"label": "Passed (Defect-free)", "value": 100.0, "count": total_products, "color": "#27837f"}
        ]
        top_defect = "None"
        top_defect_pct = 0.0

    return {
        "success": True,
        "metrics": {
            "totalInspections": total_batches,
            "totalBatches": total_batches,
            "defectedBatches": failed_batches,
            "batchesPassRate": batches_pass_rate,
            "totalProducts": total_products,
            "defectedProducts": defected_products,
            "productsPassRate": products_pass_rate,
            "totalDefects": total_defects_count,
            "passRate": overall_pass_rate,
            "topDefect": top_defect,
            "topDefectPct": top_defect_pct,
            "reportsStored": reports_count
        },
        "trend": trend_values,
        "trendBars": trend_bars,
        "defectMix": defect_mix,
        "summary": f"Over the selected period, {total_batches} inspection batches were evaluated. {total_defects_count} active defect(s) detected across {total_products} products. Pass rate stands at {overall_pass_rate}%."
    }
