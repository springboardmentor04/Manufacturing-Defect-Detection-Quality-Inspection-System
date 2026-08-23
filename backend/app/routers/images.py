import os
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db
from app.models import User, Image, Inspection
from app.schemas import ImageDetail
from app.auth import get_current_user

router = APIRouter(prefix="/images", tags=["images"])

ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "bmp", "tiff", "webp"}
MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB
UPLOADS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "uploads"))

os.makedirs(UPLOADS_DIR, exist_ok=True)

@router.post("/upload", response_model=List[ImageDetail], status_code=status.HTTP_201_CREATED)
async def upload_images(
    files: List[UploadFile] = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not files:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No files uploaded")

    # Determine upload_source
    upload_source = "batch" if len(files) > 1 else "manual"
    created_images = []

    for file in files:
        filename = file.filename or "unnamed.png"
        ext = filename.split(".")[-1].lower() if "." in filename else ""
        
        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid file extension '.{ext}' for file {filename}. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
            )
        
        # Read file content to validate size
        content = await file.read()
        if len(content) > MAX_FILE_SIZE_BYTES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File {filename} exceeds 10MB limit ({len(content) / (1024*1024):.2f}MB)"
            )
        
        unique_filename = f"{uuid.uuid4().hex}_{filename}"
        saved_filepath = os.path.join(UPLOADS_DIR, unique_filename)
        
        # Save file to disk
        with open(saved_filepath, "wb") as f:
            f.write(content)
            
        # Create relative path stored in DB (e.g. uploads/filename)
        relative_path = f"uploads/{unique_filename}"
        
        # Insert image record
        db_image = Image(
            uploaded_by=current_user.id,
            filename=unique_filename,
            filepath=relative_path,
            upload_source=upload_source,
            status="pending"
        )
        db.add(db_image)
        db.flush()  # populate db_image.id
        
        # Insert matching inspection record with status='queued'
        db_inspection = Inspection(
            image_id=db_image.id,
            status="queued"
        )
        db.add(db_inspection)
        db.flush()
        
        created_images.append(ImageDetail(
            id=db_image.id,
            uploaded_by=current_user.id,
            uploader_username=current_user.username,
            filename=db_image.filename,
            filepath=db_image.filepath,
            upload_source=db_image.upload_source,
            status=db_image.status,
            uploaded_at=db_image.uploaded_at,
            inspection_id=db_inspection.id,
            inspection_status=db_inspection.status,
            defect_count=0
        ))

    db.commit()
    return created_images

@router.get("", response_model=List[ImageDetail])
def list_images(
    status_filter: Optional[str] = Query(None, alias="status"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Image).join(User, Image.uploaded_by == User.id)
    
    if status_filter:
        query = query.filter(Image.status == status_filter)
        
    query = query.order_by(desc(Image.uploaded_at)).offset(offset).limit(limit)
    images = query.all()
    
    results = []
    for img in images:
        # Get latest inspection for status and defect_count
        insp = db.query(Inspection).filter(Inspection.image_id == img.id).first()
        results.append(ImageDetail(
            id=img.id,
            uploaded_by=img.uploaded_by,
            uploader_username=img.uploader.username if img.uploader else None,
            filename=img.filename,
            filepath=img.filepath,
            upload_source=img.upload_source,
            status=img.status,
            uploaded_at=img.uploaded_at,
            inspection_id=insp.id if insp else None,
            inspection_status=insp.status if insp else "queued",
            defect_count=insp.defect_count if (insp and insp.defect_count is not None) else 0
        ))
        
    return results

@router.get("/{image_id}", response_model=ImageDetail)
def get_image(
    image_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    img = db.query(Image).filter(Image.id == image_id).first()
    if not img:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Image with id {image_id} not found")
        
    insp = db.query(Inspection).filter(Inspection.image_id == img.id).first()
    return ImageDetail(
        id=img.id,
        uploaded_by=img.uploaded_by,
        uploader_username=img.uploader.username if img.uploader else None,
        filename=img.filename,
        filepath=img.filepath,
        upload_source=img.upload_source,
        status=img.status,
        uploaded_at=img.uploaded_at,
        inspection_id=insp.id if insp else None,
        inspection_status=insp.status if insp else "queued",
        defect_count=insp.defect_count if (insp and insp.defect_count is not None) else 0
    )

