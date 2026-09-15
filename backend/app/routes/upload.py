import os
import uuid
from fastapi import APIRouter, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
from app.config.settings import settings

router = APIRouter()

# Ensure uploads directory exists
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png"}

def get_file_extension(filename: str) -> str:
    return filename.split(".")[-1].lower() if "." in filename else ""

@router.post("/image")
async def upload_image(file: UploadFile = File(...)):
    if not file:
        raise HTTPException(status_code=400, detail="No file uploaded")
    
    ext = get_file_extension(file.filename)
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Unsupported file format")
        
    # Generate unique filename
    unique_filename = f"{uuid.uuid4()}.{ext}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)
    
    # Save file
    try:
        content = await file.read()
        
        # Check size (max 10MB)
        if len(content) > 10 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="File too large. Max 10MB allowed.")
            
        with open(file_path, "wb") as f:
            f.write(content)
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
        
    # Return path relative to server root
    return JSONResponse({
        "image_id": str(uuid.uuid4()), # Generate a generic ID for frontend use
        "filename": unique_filename,
        "url": f"/uploads/{unique_filename}",
        "message": "File uploaded successfully"
    })

@router.post("/batch-image")
async def upload_batch_images(files: list[UploadFile] = File(...)):
    if not files:
        raise HTTPException(status_code=400, detail="No files uploaded")
    
    uploaded_files = []
    
    for file in files:
        ext = get_file_extension(file.filename)
        if ext not in ALLOWED_EXTENSIONS:
            continue # Skip invalid formats
            
        unique_filename = f"{uuid.uuid4()}.{ext}"
        file_path = os.path.join(UPLOAD_DIR, unique_filename)
        
        try:
            content = await file.read()
            if len(content) > 10 * 1024 * 1024:
                continue # Skip large files
                
            with open(file_path, "wb") as f:
                f.write(content)
                
            uploaded_files.append({
                "filename": unique_filename,
                "url": f"/uploads/{unique_filename}"
            })
        except Exception:
            continue
            
    if not uploaded_files:
        raise HTTPException(status_code=400, detail="No valid files were successfully uploaded")
        
    return JSONResponse({
        "message": f"Successfully uploaded {len(uploaded_files)} files",
        "files": uploaded_files
    })
