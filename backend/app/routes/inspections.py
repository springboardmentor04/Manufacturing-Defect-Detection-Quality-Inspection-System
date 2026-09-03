import os
import uuid
import shutil
from typing import NamedTuple
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks
from pydantic import BaseModel
from sqlalchemy.orm import Session
from PIL import Image as PILImage
from werkzeug.utils import secure_filename
from app.database import get_db
from app.models.user import User
from app.models.inspection import InspectionImage, InspectionStatus
from app.schemas.inspection import InspectionImageOut, InspectionListResponse, InspectionStatsResponse
from app.core.security import get_current_user
from app.core.config import settings

router = APIRouter(prefix="/api/inspections", tags=["inspections"])

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/bmp", "image/tiff"}

class ImageInfo(NamedTuple):
    filename: str
    file_path: str
    file_size: int
    width: int
    height: int

def validate_and_save_image(file: UploadFile) -> ImageInfo:
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail="Unsupported image format. Use JPEG, PNG, BMP, or TIFF.")

    content = file.file.read()
    size_mb = len(content) / (1024 * 1024)
    if size_mb > settings.MAX_IMAGE_SIZE_MB:
        raise HTTPException(status_code=400, detail=f"Image exceeds {settings.MAX_IMAGE_SIZE_MB}MB limit.")

    safe_name = secure_filename(file.filename or "upload")
    ext = os.path.splitext(safe_name)[1].lower() or ".jpg"
    unique_name = f"{uuid.uuid4().hex}{ext}"
    save_path = os.path.join(settings.UPLOAD_DIR, unique_name)

    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    with open(save_path, "wb") as f:
        f.write(content)

    with PILImage.open(save_path) as img:
        width, height = img.size

    return ImageInfo(filename=unique_name, file_path=save_path, file_size=len(content), width=width, height=height)

@router.get("/category-stats")
def get_category_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from sqlalchemy import func
    query = db.query(InspectionImage.product_category, func.count(InspectionImage.id).label('count'))
    if current_user.role == "quality_engineer":
        query = query.filter(InspectionImage.uploaded_by == current_user.id)
    results = query.group_by(InspectionImage.product_category).order_by(func.count(InspectionImage.id).desc()).all()
    return [
        {"name": row.product_category or "Uncategorized", "count": row.count}
        for row in results
    ]

@router.get("/stats", response_model=InspectionStatsResponse)
def get_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(InspectionImage)
    if current_user.role == "quality_engineer":
        query = query.filter(InspectionImage.uploaded_by == current_user.id)
    total = query.count()
    pending = query.filter(InspectionImage.status == InspectionStatus.pending).count()
    processing = query.filter(InspectionImage.status == InspectionStatus.processing).count()
    completed = query.filter(InspectionImage.status == InspectionStatus.completed).count()
    failed = query.filter(InspectionImage.status == InspectionStatus.failed).count()
    
    pass_count = query.filter(InspectionImage.decision == "Pass").count()
    fail_count = query.filter(InspectionImage.decision == "Fail").count()
    review_count = query.filter(InspectionImage.decision == "Manual Review").count()
    
    completed_count = query.filter(InspectionImage.status == InspectionStatus.completed).count()
    defect_detected_count = query.filter(InspectionImage.defect_detected == True).count()
    defect_rate = (defect_detected_count / completed_count * 100.0) if completed_count > 0 else 0.0
    
    return InspectionStatsResponse(
        total=total, 
        pending=pending, 
        processing=processing, 
        completed=completed, 
        failed=failed,
        pass_count=pass_count,
        fail_count=fail_count,
        review_count=review_count,
        defect_rate=round(defect_rate, 2)
    )

@router.get("/trend-stats")
def get_trend_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    import datetime
    from sqlalchemy import func, Date, case
    
    # Generate the last 7 dates
    today = datetime.datetime.now(datetime.timezone.utc).date()
    dates = [today - datetime.timedelta(days=i) for i in range(6, -1, -1)]
    seven_days_ago = datetime.datetime.combine(dates[0], datetime.time.min, tzinfo=datetime.timezone.utc)
    
    query = db.query(
        func.cast(InspectionImage.created_at, Date).label('date'),
        func.count(InspectionImage.id).label('total'),
        func.sum(case((InspectionImage.defect_detected == True, 1), else_=0)).label('defective'),
        func.sum(case((InspectionImage.decision == 'Pass', 1), else_=0)).label('passed'),
        func.sum(case((InspectionImage.decision == 'Fail', 1), else_=0)).label('failed'),
    ).filter(InspectionImage.created_at >= seven_days_ago)
    
    if current_user.role == "quality_engineer":
        query = query.filter(InspectionImage.uploaded_by == current_user.id)
        
    results = query.group_by(func.cast(InspectionImage.created_at, Date)).all()
    results_by_date = {str(row.date): row for row in results}
    
    trend = []
    for d in dates:
        date_str = str(d)
        if date_str in results_by_date:
            row = results_by_date[date_str]
            total = row.total
            defective = int(row.defective or 0)
            passed = int(row.passed or 0)
            failed = int(row.failed or 0)
        else:
            total = 0
            defective = 0
            passed = 0
            failed = 0
            
        defect_rate = round((defective / total) * 100.0, 1) if total > 0 else 0.0
        trend.append({
            "date": d.strftime("%b %d"),
            "total": total,
            "defective": defective,
            "passed": passed,
            "failed": failed,
            "defect_rate": defect_rate
        })
        
    return trend

@router.post("/upload", response_model=InspectionImageOut, status_code=201)
def upload_image(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    product_category: str = Form(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    info = validate_and_save_image(file)
    record = InspectionImage(
        filename=info.filename,
        original_filename=file.filename,
        file_path=info.file_path,
        file_size=info.file_size,
        image_width=info.width,
        image_height=info.height,
        product_category=product_category,
        uploaded_by=current_user.id,
        status=InspectionStatus.pending,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    
    from app.database import SessionLocal
    background_tasks.add_task(process_and_inspect_image, record.id, SessionLocal)
    
    return record

@router.get("/", response_model=InspectionListResponse)
def list_inspections(
    skip: int = 0,
    limit: int = 20,
    status: str = None,
    category: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(InspectionImage)
    if current_user.role == "quality_engineer":
        query = query.filter(InspectionImage.uploaded_by == current_user.id)
    if status:
        query = query.filter(InspectionImage.status == status)
    if category:
        query = query.filter(InspectionImage.product_category == category)
    total = query.count()
    images = query.order_by(InspectionImage.created_at.desc()).offset(skip).limit(limit).all()
    return InspectionListResponse(total=total, images=images)

@router.get("/{image_id}", response_model=InspectionImageOut)
def get_inspection(
    image_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    record = db.query(InspectionImage).filter(InspectionImage.id == image_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Inspection not found")
    if current_user.role == "quality_engineer" and record.uploaded_by != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    return record

class InspectParams(BaseModel):
    blur_kernel: int = 5
    clahe_clip: float = 2.0
    confidence_threshold: float = 0.50

@router.post("/{image_id}/inspect", response_model=InspectionImageOut)
def run_manual_inspection(
    image_id: int,
    params: InspectParams,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    record = db.query(InspectionImage).filter(InspectionImage.id == image_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Inspection not found")
    if current_user.role == "quality_engineer" and record.uploaded_by != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
        
    record.status = InspectionStatus.pending
    db.commit()
    
    from app.database import SessionLocal
    background_tasks.add_task(
        process_and_inspect_image, 
        record.id, 
        SessionLocal, 
        params.blur_kernel, 
        params.clahe_clip,
        params.confidence_threshold
    )
    return record

@router.post("/simulate-camera", response_model=InspectionImageOut, status_code=201)
def simulate_camera(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    src_path = get_random_dataset_image()
    if not src_path:
        raise HTTPException(status_code=404, detail="No dataset images found to simulate camera feed.")
    
    original_filename = os.path.basename(src_path)
    ext = os.path.splitext(original_filename)[1].lower() or ".jpg"
    unique_filename = f"camera_{uuid.uuid4().hex}{ext}"
    dest_path = os.path.join(settings.UPLOAD_DIR, unique_filename)
    
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    shutil.copy(src_path, dest_path)
    
    file_size = os.path.getsize(dest_path)
    with PILImage.open(dest_path) as img:
        width, height = img.size
        
    # Infer product category
    product_category = None
    from app.routes.dataset import DATASETS
    mvtec = next(d for d in DATASETS if d["id"] == "mvtec")
    for cat in mvtec["categories"]:
        if cat in src_path.lower():
            product_category = cat
            break
            
    if not product_category:
        product_category = "bottle"
        
    record = InspectionImage(
        filename=unique_filename,
        original_filename=f"Camera_Feed_{original_filename}",
        file_path=dest_path,
        file_size=file_size,
        image_width=width,
        image_height=height,
        product_category=product_category,
        uploaded_by=current_user.id,
        status=InspectionStatus.pending,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    
    from app.database import SessionLocal
    background_tasks.add_task(process_and_inspect_image, record.id, SessionLocal)
    return record

def get_random_dataset_image():
    import random
    import glob
    search_dirs = [
        "MVTec AD"
    ]
    all_images = []
    for s_dir in search_dirs:
        dir_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), s_dir)
        if os.path.exists(dir_path):
            for ext in ('/**/*.jpg', '/**/*.png', '/**/*.jpeg', '/**/*.bmp'):
                all_images.extend(glob.glob(dir_path + ext, recursive=True))
    if not all_images:
        return None
    return random.choice(all_images)

def process_and_inspect_image(image_id: int, db_session_maker, blur_kernel: int = 5, clahe_clip: float = 2.0, confidence_threshold: float = 0.50):
    from sqlalchemy.orm import Session
    from app.utils.inference import preprocess_image, run_defect_detection, calculate_severity_and_decision
    
    db: Session = db_session_maker()
    try:
        record = db.query(InspectionImage).filter(InspectionImage.id == image_id).first()
        if not record:
            return
        
        # Update status
        record.status = InspectionStatus.processing
        db.commit()
        
        base_dir = settings.UPLOAD_DIR
        preprocessed_filename = f"preprocessed_{record.filename}"
        annotated_filename = f"annotated_{record.filename}"
        
        preprocessed_path = os.path.join(base_dir, preprocessed_filename)
        annotated_path = os.path.join(base_dir, annotated_filename)
        
        # Preprocessing
        prep_info = preprocess_image(
            image_path=record.file_path,
            save_path=preprocessed_path,
            blur_kernel=blur_kernel,
            clahe_clip=clahe_clip
        )
        
        # Defect Detection
        detections = run_defect_detection(
            image_path=preprocessed_path,
            annotated_save_path=annotated_path,
            confidence_threshold=confidence_threshold
        )
        
        # Severity & Decision
        result = calculate_severity_and_decision(
            detections=detections,
            image_width=record.image_width or 640,
            image_height=record.image_height or 640,
            category=record.product_category
        )
        
        record.status = InspectionStatus.completed
        record.defect_detected = result["defect_detected"]
        record.defect_count = result["defect_count"]
        record.defects_details = result["defects_details"]
        record.severity_score = result["severity_score"]
        record.severity_level = result["severity_level"]
        record.decision = result["decision"]
        record.preprocessed_filename = preprocessed_filename
        record.annotated_filename = annotated_filename
        # Add confidence threshold to preprocessing details saved in DB
        preprocessing_metadata = prep_info.copy() if prep_info else {}
        preprocessing_metadata["confidence_threshold"] = confidence_threshold
        record.preprocessing_details = preprocessing_metadata
        
        db.commit()
    except Exception as e:
        db.rollback()
        try:
            record = db.query(InspectionImage).filter(InspectionImage.id == image_id).first()
            if record:
                record.status = InspectionStatus.failed
                db.commit()
        except:
            pass
        print(f"Error inspecting image {image_id}: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()
