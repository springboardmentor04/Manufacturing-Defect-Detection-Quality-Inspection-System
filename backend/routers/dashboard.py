from fastapi import APIRouter

router = APIRouter(prefix="/api/v1/dashboard", tags=["Dashboard"])


@router.get("/analytics")
def get_analytics():
    return {
        "total_scans": 1240,
        "defect_rate": 3.2,
        "first_pass_yield": 96.8,
        "quality_index_score": 98.4
    }


@router.get("/confidence-distribution")
def get_confidence_distribution():
    return [
        {"range": "99-100%", "count": 850},
        {"range": "95-98%", "count": 210},
        {"range": "<90%", "count": 20}
    ]