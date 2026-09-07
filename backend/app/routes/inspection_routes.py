# ============================================================
# VISIONINSPECT AI
# INSPECTION ROUTES
# ============================================================

import mimetypes
import os

from fastapi import (
    APIRouter,
    UploadFile,
    File,
    HTTPException,
    Depends,
)

from fastapi.responses import FileResponse

from PIL import (
    Image,
    UnidentifiedImageError,
)

from io import BytesIO

from app.database.database import database

from app.services.inspection_service import (
    get_inspection_by_id,
    upload_image,
    get_history,
    get_dashboard_stats,
    get_analytics_stats,
    get_or_generate_report,
)

from app.utils.jwt_handler import (
    get_current_user,
    require_quality_engineer,
    require_factory_supervisor,
)


# ============================================================
# ROUTER
# ============================================================

router = APIRouter(
    prefix="/inspection",
    tags=["Inspection"],
)


# ============================================================
# FOLDERS
# ============================================================

UPLOAD_FOLDER = "app/uploads"
REPORT_FOLDER = "app/reports"


# ============================================================
# UPLOAD SECURITY SETTINGS
# ============================================================

MAX_IMAGE_SIZE = 10 * 1024 * 1024

MAX_IMAGE_WIDTH = 10000
MAX_IMAGE_HEIGHT = 10000

MIN_IMAGE_WIDTH = 32
MIN_IMAGE_HEIGHT = 32


ALLOWED_EXTENSIONS = {
    "jpg",
    "jpeg",
    "png",
    "bmp",
    "webp",
}


ALLOWED_DETECTED_FORMATS = {
    "JPEG",
    "PNG",
    "BMP",
    "WEBP",
}


# ============================================================
# SUPPORTED PRODUCT CATEGORIES
# ============================================================

SUPPORTED_CATEGORIES = {
    "bottle",
    "cable",
    "capsule",
    "carpet",
    "grid",
    "hazelnut",
    "leather",
    "metal_nut",
    "pill",
    "screw",
    "tile",
    "toothbrush",
    "transistor",
    "wood",
    "zipper",
}


# ============================================================
# IMAGE VALIDATION
# ============================================================

async def validate_uploaded_image(
    file: UploadFile,
):
    """
    Validate uploaded image before AI processing.

    Checks:
        1. Filename
        2. Extension
        3. File size
        4. Actual image contents
        5. Image dimensions
        6. File pointer reset
    """

    original_filename = (
        file.filename or ""
    ).strip()

    if not original_filename:
        raise HTTPException(
            status_code=400,
            detail="Image filename is required",
        )

    if "." not in original_filename:
        raise HTTPException(
            status_code=400,
            detail=(
                "Unsupported image format. "
                "Use JPG, JPEG, PNG, BMP or WEBP."
            ),
        )

    extension = (
        original_filename
        .rsplit(".", 1)[1]
        .lower()
    )

    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=(
                "Unsupported image format. "
                "Use JPG, JPEG, PNG, BMP or WEBP."
            ),
        )

    try:
        await file.seek(0)
        file_bytes = await file.read()

    except Exception as error:
        raise HTTPException(
            status_code=400,
            detail="Unable to read uploaded image.",
        ) from error

    if not file_bytes:
        raise HTTPException(
            status_code=400,
            detail="Uploaded image is empty",
        )

    file_size = len(file_bytes)

    if file_size > MAX_IMAGE_SIZE:
        raise HTTPException(
            status_code=413,
            detail=(
                "Image file is too large. "
                "Maximum allowed size is 10 MB."
            ),
        )

    try:
        image_stream = BytesIO(file_bytes)

        with Image.open(image_stream) as image:
            image.verify()

        image_stream = BytesIO(file_bytes)

        with Image.open(image_stream) as image:
            width, height = image.size
            detected_format = (
                image.format or ""
            ).upper()

    except (
        UnidentifiedImageError,
        OSError,
        ValueError,
    ) as error:
        raise HTTPException(
            status_code=400,
            detail=(
                "The uploaded file is not "
                "a valid readable image."
            ),
        ) from error

    if detected_format not in ALLOWED_DETECTED_FORMATS:
        raise HTTPException(
            status_code=400,
            detail=(
                "Unsupported image format detected. "
                "Use JPEG, PNG, BMP or WEBP."
            ),
        )

    if (
        width < MIN_IMAGE_WIDTH
        or height < MIN_IMAGE_HEIGHT
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                "Image resolution is too small. "
                f"Minimum supported dimensions are "
                f"{MIN_IMAGE_WIDTH}x"
                f"{MIN_IMAGE_HEIGHT} pixels."
            ),
        )

    if (
        width > MAX_IMAGE_WIDTH
        or height > MAX_IMAGE_HEIGHT
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                "Image resolution is too large. "
                f"Maximum supported dimensions are "
                f"{MAX_IMAGE_WIDTH}x"
                f"{MAX_IMAGE_HEIGHT} pixels."
            ),
        )

    await file.seek(0)

    return {
        "filename": original_filename,
        "extension": extension,
        "content_type": file.content_type,
        "size_bytes": file_size,
        "width": width,
        "height": height,
        "format": detected_format,
    }


# ============================================================
# UPLOAD + INSPECT
# QUALITY ENGINEER ONLY
# ============================================================

@router.post("/upload")
async def upload(
    file: UploadFile = File(...),
    current_user=Depends(
        require_quality_engineer
    ),
):
    await validate_uploaded_image(file)

    try:
        return await upload_image(
            file=file,
            current_user=current_user,
        )

    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error),
        ) from error

    except RuntimeError as error:
        raise HTTPException(
            status_code=500,
            detail=str(error),
        ) from error


# ============================================================
# HISTORY
# ============================================================

@router.get("/history")
async def history(
    current_user=Depends(
        get_current_user
    ),
):
    return await get_history(
        current_user
    )


# ============================================================
# DASHBOARD
# ============================================================

@router.get("/dashboard")
async def dashboard(
    current_user=Depends(
        get_current_user
    ),
):
    return await get_dashboard_stats(
        current_user
    )


# ============================================================
# ANALYTICS
# FACTORY SUPERVISOR ONLY
# ============================================================

@router.get("/analytics")
async def analytics(
    current_user=Depends(
        require_factory_supervisor
    ),
):
    return await get_analytics_stats(
        current_user
    )


# ============================================================
# SECURE INSPECTION IMAGE
# ============================================================

@router.get("/image/{filename}")
async def inspection_image(
    filename: str,
    current_user=Depends(
        get_current_user
    ),
):
    """
    Securely serve an uploaded inspection image.

    Access rules:
        - Quality Engineer:
          Only their own inspection images.
        - Factory Supervisor:
          Can access inspection images.

    The uploads directory is NOT exposed publicly.
    """

    # --------------------------------------------------------
    # BASIC FILENAME SECURITY
    # --------------------------------------------------------

    if not filename:
        raise HTTPException(
            status_code=400,
            detail="Image filename is required.",
        )

    safe_filename = os.path.basename(
        filename
    )

    if safe_filename != filename:
        raise HTTPException(
            status_code=400,
            detail="Invalid image filename.",
        )

    if safe_filename in {
        ".",
        "..",
    }:
        raise HTTPException(
            status_code=400,
            detail="Invalid image filename.",
        )

    # --------------------------------------------------------
    # FILE EXTENSION SECURITY
    # --------------------------------------------------------

    extension = ""

    if "." in safe_filename:
        extension = (
            safe_filename
            .rsplit(".", 1)[1]
            .lower()
        )

    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail="Unsupported image format.",
        )

    # --------------------------------------------------------
    # FIND INSPECTION IN DATABASE
    # --------------------------------------------------------

    inspection = await database.inspections.find_one(
        {
            "filename": safe_filename
        }
    )

    if not inspection:
        raise HTTPException(
            status_code=404,
            detail="Inspection image not found.",
        )

    # --------------------------------------------------------
    # ACCESS CONTROL
    # --------------------------------------------------------

    role = str(
        current_user.get(
            "role",
            "",
        )
    ).strip().lower()

    if role in {
        "quality_engineer",
        "quality engineer",
    }:
        owner_id = inspection.get(
            "uploaded_by_user_id"
        )

        current_user_id = current_user.get(
            "id"
        )

        if (
            not owner_id
            or str(owner_id)
            != str(current_user_id)
        ):
            raise HTTPException(
                status_code=403,
                detail=(
                    "You are not authorized "
                    "to access this inspection image."
                ),
            )

    elif role in {
        "factory_supervisor",
        "factory supervisor",
    }:
        # Supervisors may access inspection images.
        pass

    else:
        raise HTTPException(
            status_code=403,
            detail="You are not authorized to access this image.",
        )

    # --------------------------------------------------------
    # RESOLVE STORED PATH
    # --------------------------------------------------------

    stored_filepath = inspection.get(
        "filepath"
    )

    if stored_filepath:
        candidate_path = os.path.abspath(
            stored_filepath
        )
    else:
        candidate_path = os.path.abspath(
            os.path.join(
                UPLOAD_FOLDER,
                safe_filename,
            )
        )

    upload_root = os.path.abspath(
        UPLOAD_FOLDER
    )

    # --------------------------------------------------------
    # PREVENT PATH TRAVERSAL
    # --------------------------------------------------------

    try:
        common_path = os.path.commonpath(
            [
                upload_root,
                candidate_path,
            ]
        )

    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="Invalid image path.",
        )

    if common_path != upload_root:
        raise HTTPException(
            status_code=400,
            detail="Invalid image path.",
        )

    # --------------------------------------------------------
    # FILE EXISTENCE
    # --------------------------------------------------------

    if not os.path.isfile(
        candidate_path
    ):
        raise HTTPException(
            status_code=404,
            detail="Inspection image file not found.",
        )

    # --------------------------------------------------------
    # MIME TYPE
    # --------------------------------------------------------

    media_type, _ = mimetypes.guess_type(
        candidate_path
    )

    if not media_type:
        media_type = "application/octet-stream"

    allowed_media_types = {
        "image/jpeg",
        "image/png",
        "image/bmp",
        "image/webp",
    }

    if media_type not in allowed_media_types:
        raise HTTPException(
            status_code=400,
            detail="Unsupported image media type.",
        )

    # --------------------------------------------------------
    # RETURN IMAGE
    # --------------------------------------------------------

    return FileResponse(
        path=candidate_path,
        media_type=media_type,
        filename=safe_filename,
    )


# ============================================================
# REPORT
# ============================================================

@router.get("/report/{filename}")
async def download_report(
    filename: str,
    current_user=Depends(
        get_current_user
    ),
):
    report_filename = (
        await get_or_generate_report(
            filename,
            current_user,
        )
    )

    if not report_filename:
        raise HTTPException(
            status_code=404,
            detail="Inspection report not found",
        )

    safe_report_filename = os.path.basename(
        report_filename
    )

    if safe_report_filename != report_filename:
        raise HTTPException(
            status_code=400,
            detail="Invalid report filename.",
        )

    filepath = os.path.abspath(
        os.path.join(
            REPORT_FOLDER,
            safe_report_filename,
        )
    )

    report_root = os.path.abspath(
        REPORT_FOLDER
    )

    try:
        common_path = os.path.commonpath(
            [
                report_root,
                filepath,
            ]
        )

    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="Invalid report path.",
        )

    if common_path != report_root:
        raise HTTPException(
            status_code=400,
            detail="Invalid report path.",
        )

    if not os.path.isfile(filepath):
        raise HTTPException(
            status_code=404,
            detail="Report file not found",
        )

    return FileResponse(
        path=filepath,
        filename=safe_report_filename,
        media_type="application/pdf",
    )


# ============================================================
# SINGLE INSPECTION
# ============================================================

@router.get("/{inspection_id}")
async def inspection_details(
    inspection_id: str,
    current_user=Depends(
        get_current_user
    ),
):
    inspection = (
        await get_inspection_by_id(
            inspection_id,
            current_user,
        )
    )

    if not inspection:
        raise HTTPException(
            status_code=404,
            detail="Inspection not found",
        )

    return inspection