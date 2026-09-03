from fastapi import APIRouter, Depends
from app.models.user import User
from app.core.security import get_current_user

router = APIRouter(prefix="/api/dataset", tags=["dataset"])

DATASETS = [
    {
        "id": "mvtec",
        "name": "MVTec Anomaly Detection Dataset",
        "description": "Industrial inspection dataset with 15 categories of objects and textures for unsupervised anomaly detection.",
        "categories": [
            "bottle", "cable", "capsule", "carpet", "grid",
            "hazelnut", "leather", "metal_nut", "pill", "screw",
            "tile", "toothbrush", "transistor", "wood", "zipper"
        ],
        "defect_types": ["good", "defective"],
        "total_images": 6612,
        "splits": ["train", "test", "ground_truth"],
        "source": "https://www.mvtec.com/company/research/datasets/mvtec-ad",
        "use_case": "Anomaly Detection",
    },
]

@router.get("/all")
def get_all_datasets(_: User = Depends(get_current_user)):
    return {"datasets": DATASETS, "total": len(DATASETS)}

@router.get("/mvtec-info")
def get_mvtec_info(_: User = Depends(get_current_user)):
    mvtec = next(d for d in DATASETS if d["id"] == "mvtec")
    return {
        "name": mvtec["name"],
        "description": mvtec["description"],
        "categories": mvtec["categories"],
        "total_categories": len(mvtec["categories"]),
        "defect_types": mvtec["defect_types"],
        "source": mvtec["source"],
    }

@router.get("/{dataset_id}")
def get_dataset_info(dataset_id: str, _: User = Depends(get_current_user)):
    dataset = next((d for d in DATASETS if d["id"] == dataset_id), None)
    if not dataset:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Dataset not found")
    return dataset
