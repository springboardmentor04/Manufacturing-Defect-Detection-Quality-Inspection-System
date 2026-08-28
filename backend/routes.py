import time
import shutil
import uuid
import os
import hashlib

from fastapi import (
    Form,
    APIRouter,
    HTTPException,
    UploadFile,
    File,
    Depends
)

from fastapi.responses import FileResponse

from pydantic import BaseModel, EmailStr

from database import get_connection

from auth import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user
)

from predict import predict_image
from yolo_predict import detect_defects

from utils import UPLOAD_FOLDER


router = APIRouter()


# ============================================================
# MODELS
# ============================================================

class RegisterUser(BaseModel):

    first_name: str
    last_name: str
    employee_id: str
    email: EmailStr
    password: str
    phone: str
    department: str
    role: str


class LoginUser(BaseModel):

    email: EmailStr
    password: str


# ============================================================
# HEALTH
# ============================================================

@router.get("/health")
def health():

    return {
        "status": "API is working"
    }


# ============================================================
# REGISTER
# ============================================================

@router.post("/register")
def register(user: RegisterUser):

    conn = get_connection()
    cursor = conn.cursor()

    try:

        cursor.execute(
            """
            SELECT id
            FROM users
            WHERE email = %s
            """,
            (user.email,)
        )

        if cursor.fetchone():

            raise HTTPException(
                status_code=400,
                detail="Email already registered."
            )


        cursor.execute(
            """
            SELECT id
            FROM roles
            WHERE UPPER(role_name) = UPPER(%s)
            """,
            (user.role,)
        )

        role = cursor.fetchone()

        if role is None:

            raise HTTPException(
                status_code=400,
                detail="Invalid role selected."
            )


        hashed_password = hash_password(
            user.password
        )


        cursor.execute(
            """
            INSERT INTO users
            (
                first_name,
                last_name,
                employee_id,
                email,
                password_hash,
                phone,
                department,
                role_id
            )
            VALUES
            (%s,%s,%s,%s,%s,%s,%s,%s)
            """,
            (
                user.first_name,
                user.last_name,
                user.employee_id,
                user.email,
                hashed_password,
                user.phone,
                user.department,
                role["id"]
            )
        )


        conn.commit()


        return {
            "message":
                "User registered successfully."
        }


    finally:

        cursor.close()
        conn.close()


# ============================================================
# LOGIN
# ============================================================

@router.post("/login")
def login(user: LoginUser):

    conn = get_connection()
    cursor = conn.cursor()

    try:

        cursor.execute(
            """
            SELECT
                u.id,
                u.email,
                u.password_hash,
                u.role_id,
                r.role_name,
                u.first_name,
                u.last_name
            FROM users u
            JOIN roles r
                ON u.role_id = r.id
            WHERE u.email = %s
            """,
            (user.email,)
        )

        db_user = cursor.fetchone()


        if db_user is None:

            raise HTTPException(
                status_code=401,
                detail="Invalid email or password."
            )


        if not verify_password(
            user.password,
            db_user["password_hash"]
        ):

            raise HTTPException(
                status_code=401,
                detail="Invalid email or password."
            )


        token = create_access_token(
            {
                "user_id":
                    str(db_user["id"]),

                "email":
                    db_user["email"],

                "role":
                    db_user["role_name"]
            }
        )


        cursor.execute(
            """
            UPDATE users
            SET last_login = CURRENT_TIMESTAMP
            WHERE id=%s
            """,
            (db_user["id"],)
        )


        conn.commit()


        return {

            "message":
                "Login Successful",

            "access_token":
                token,

            "token_type":
                "bearer",

            "user": {

                "id":
                    str(db_user["id"]),

                "name":
                    db_user["first_name"]
                    + " "
                    + db_user["last_name"],

                "email":
                    db_user["email"],

                "role":
                    db_user["role_name"]

            }

        }


    finally:

        cursor.close()
        conn.close()


# ============================================================
# DASHBOARD
# ============================================================
# ============================================================
# QUALITY ENGINEER DASHBOARD
# ============================================================

@router.get("/dashboard")
def dashboard():

    conn = get_connection()
    cursor = conn.cursor()

    try:

        # ====================================================
        # 1. TOTAL PRODUCTS INSPECTED
        #
        # Count products that actually have an inspection.
        # This is more accurate than COUNT(*) FROM products
        # because the dashboard says "Products Inspected".
        # ====================================================

        cursor.execute("""
            SELECT
                COUNT(DISTINCT product_id) AS total_products
            FROM inspections
        """)

        row = cursor.fetchone()

        total_products = row["total_products"] or 0


        # ====================================================
        # 2. TOTAL DEFECTS DETECTED
        #
        # Use the defects table because each row represents
        # an actual detected defect.
        # ====================================================

        cursor.execute("""
            SELECT
                COUNT(*) AS defects_detected
            FROM defects
        """)

        row = cursor.fetchone()

        defects_detected = row["defects_detected"] or 0


        # ====================================================
        # 3. PASS / FAIL COUNTS
        # ====================================================

        cursor.execute("""
            SELECT

                COUNT(*) FILTER (
                    WHERE UPPER(TRIM(pass_fail)) = 'PASS'
                ) AS passed_inspections,

                COUNT(*) FILTER (
                    WHERE UPPER(TRIM(pass_fail)) = 'FAIL'
                ) AS failed_inspections,

                COUNT(*) AS total_inspections

            FROM inspections
        """)

        row = cursor.fetchone()

        passed_inspections = row["passed_inspections"] or 0

        failed_inspections = row["failed_inspections"] or 0

        total_inspections = row["total_inspections"] or 0


        # ====================================================
        # 4. QUALITY SCORE / PASS RATE
        # ====================================================

        cursor.execute("""
            SELECT
                ROUND(
                    COALESCE(
                        COUNT(*) FILTER (
                            WHERE UPPER(TRIM(pass_fail)) = 'PASS'
                        ) * 100.0
                        /
                        NULLIF(COUNT(*), 0),
                        0
                    ),
                    2
                ) AS quality_score

            FROM inspections
        """)

        row = cursor.fetchone()

        quality_score = float(
            row["quality_score"] or 0
        )


        # ====================================================
        # 5. AVERAGE AI CONFIDENCE
        #
        # IMPORTANT:
        # The actual database field is confidence_score.
        # ====================================================

        cursor.execute("""
            SELECT
                ROUND(
                    COALESCE(
                        AVG(confidence_score),
                        0
                    ),
                    2
                ) AS ai_confidence

            FROM inspections

            WHERE confidence_score IS NOT NULL
        """)

        row = cursor.fetchone()

        ai_confidence = float(
            row["ai_confidence"] or 0
        )


        # ====================================================
        # 6. DEFECT DISTRIBUTION
        #
        # Actual defect types are stored in defects.defect_type
        # ====================================================

        cursor.execute("""
            SELECT
                defect_type,
                COUNT(*) AS count

            FROM defects

            WHERE defect_type IS NOT NULL
              AND TRIM(defect_type) <> ''

            GROUP BY defect_type

            ORDER BY count DESC
        """)

        defects = cursor.fetchall()


        # ====================================================
        # 7. PRODUCTION LINE QUALITY
        #
        # production_line is stored in products.
        #
        # Normalize:
        # LINE 1
        # LINE-1
        # LINE-01
        #
        # into:
        # LINE-01
        #
        # Same for the other lines.
        # ====================================================

        cursor.execute("""
            SELECT

                CASE

                    WHEN UPPER(
                        REPLACE(
                            REPLACE(
                                TRIM(p.production_line),
                                ' ',
                                ''
                            ),
                            '-',
                            ''
                        )
                    ) = 'LINE1'
                    THEN 'LINE-01'

                    WHEN UPPER(
                        REPLACE(
                            REPLACE(
                                TRIM(p.production_line),
                                ' ',
                                ''
                            ),
                            '-',
                            ''
                        )
                    ) = 'LINE2'
                    THEN 'LINE-02'

                    WHEN UPPER(
                        REPLACE(
                            REPLACE(
                                TRIM(p.production_line),
                                ' ',
                                ''
                            ),
                            '-',
                            ''
                        )
                    ) = 'LINE3'
                    THEN 'LINE-03'

                    WHEN UPPER(
                        REPLACE(
                            REPLACE(
                                TRIM(p.production_line),
                                ' ',
                                ''
                            ),
                            '-',
                            ''
                        )
                    ) = 'LINE4'
                    THEN 'LINE-04'

                    WHEN UPPER(
                        REPLACE(
                            REPLACE(
                                TRIM(p.production_line),
                                ' ',
                                ''
                            ),
                            '-',
                            ''
                        )
                    ) = 'LINE5'
                    THEN 'LINE-05'

                    ELSE UPPER(TRIM(p.production_line))

                END AS production_line,

                COUNT(i.id) AS total_inspections,

                COUNT(*) FILTER (
                    WHERE UPPER(TRIM(i.pass_fail)) = 'PASS'
                ) AS passed,

                COUNT(*) FILTER (
                    WHERE UPPER(TRIM(i.pass_fail)) = 'FAIL'
                ) AS failed,

                ROUND(
                    COALESCE(
                        COUNT(*) FILTER (
                            WHERE UPPER(TRIM(i.pass_fail)) = 'PASS'
                        ) * 100.0
                        /
                        NULLIF(COUNT(i.id), 0),
                        0
                    ),
                    2
                ) AS pass_rate

            FROM inspections i

            JOIN products p
                ON p.id = i.product_id

            WHERE p.production_line IS NOT NULL
              AND TRIM(p.production_line) <> ''

            GROUP BY
                CASE

                    WHEN UPPER(
                        REPLACE(
                            REPLACE(
                                TRIM(p.production_line),
                                ' ',
                                ''
                            ),
                            '-',
                            ''
                        )
                    ) = 'LINE1'
                    THEN 'LINE-01'

                    WHEN UPPER(
                        REPLACE(
                            REPLACE(
                                TRIM(p.production_line),
                                ' ',
                                ''
                            ),
                            '-',
                            ''
                        )
                    ) = 'LINE2'
                    THEN 'LINE-02'

                    WHEN UPPER(
                        REPLACE(
                            REPLACE(
                                TRIM(p.production_line),
                                ' ',
                                ''
                            ),
                            '-',
                            ''
                        )
                    ) = 'LINE3'
                    THEN 'LINE-03'

                    WHEN UPPER(
                        REPLACE(
                            REPLACE(
                                TRIM(p.production_line),
                                ' ',
                                ''
                            ),
                            '-',
                            ''
                        )
                    ) = 'LINE4'
                    THEN 'LINE-04'

                    WHEN UPPER(
                        REPLACE(
                            REPLACE(
                                TRIM(p.production_line),
                                ' ',
                                ''
                            ),
                            '-',
                            ''
                        )
                    ) = 'LINE5'
                    THEN 'LINE-05'

                    ELSE UPPER(TRIM(p.production_line))

                END

            ORDER BY production_line
        """)

        production_lines = cursor.fetchall()


        # ====================================================
        # 8. RECENT INSPECTIONS
        #
        # Useful for the Quality Engineer dashboard.
        # ====================================================

        cursor.execute("""
            SELECT

                i.id,

                p.product_code,

                p.product_name,

                p.production_line,

                i.inspection_status,

                i.pass_fail,

                COALESCE(
                    i.confidence_score,
                    0
                ) AS confidence_score,

                i.inspection_date

            FROM inspections i

            JOIN products p
                ON p.id = i.product_id

            ORDER BY i.inspection_date DESC

            LIMIT 10
        """)

        recent_inspections = cursor.fetchall()


        # ====================================================
        # RETURN DASHBOARD DATA
        # ====================================================

        return {

            "total_products":
                int(total_products),

            "total_inspections":
                int(total_inspections),

            "defects_detected":
                int(defects_detected),

            "passed_inspections":
                int(passed_inspections),

            "failed_inspections":
                int(failed_inspections),

            "quality_score":
                quality_score,

            "ai_confidence":
                ai_confidence,

            "defects":
                defects,

            "production_lines":
                production_lines,

            "recent_inspections":
                recent_inspections

        }


    finally:

        cursor.close()

        conn.close()

# ============================================================
# UPLOAD PRODUCT + AI INSPECTION
# ============================================================
@router.post("/upload-product")
def upload_product(

    product_code: str = Form(...),
    product_name: str = Form(...),
    category: str = Form(...),
    batch_number: str = Form(...),
    production_line: str = Form(...),
    manufacturing_date: str = Form(...),

    file: UploadFile = File(...),

    current_user: dict =
        Depends(get_current_user)

):

    inspected_by = current_user["user_id"]

    conn = get_connection()
    cursor = conn.cursor()

    try:

        # ========================================================
        # SAVE PRODUCT
        # ========================================================

        cursor.execute(
    """
    INSERT INTO products
    (
        product_code,
        product_name,
        category,
        batch_number,
        production_line,
        manufacturing_date
    )
    VALUES
    (%s,%s,%s,%s,%s,%s)
    RETURNING id
    """,
    (
        product_code,
        product_name,
        category,
        batch_number,
        production_line,
        manufacturing_date
    )
)

        product = cursor.fetchone()

        product_id = product["id"]


        # ========================================================
        # SAVE IMAGE
        # ========================================================

        extension = (
            file.filename
            .split(".")[-1]
            .lower()
        )

        filename = f"{uuid.uuid4()}.{extension}"

        filepath = os.path.join(
            UPLOAD_FOLDER,
            filename
        )

        with open(filepath, "wb") as buffer:

            shutil.copyfileobj(
                file.file,
                buffer
            )

        image_size = os.path.getsize(filepath)

        with open(filepath, "rb") as image_file:

            image_hash = hashlib.sha256(
                image_file.read()
            ).hexdigest()


        cursor.execute(
            """
            INSERT INTO product_images
            (
                image_name,
                image_path,
                image_type,
                uploaded_at,
                image_size,
                image_hash
            )
            VALUES
            (
                %s,%s,%s,
                CURRENT_TIMESTAMP,
                %s,%s
            )
            RETURNING id
            """,
            (
                filename,
                filepath,
                extension.upper(),
                image_size,
                image_hash
            )
        )

        image = cursor.fetchone()

        image_id = image["id"]


        # ========================================================
        # AI INSPECTION
        # ========================================================

        start_time = time.time()


        # ========================================================
        # RESNET18
        # ========================================================

        resnet_prediction = predict_image(
            filepath
        )

        resnet_result = (
            resnet_prediction["prediction"]
        )

        resnet_confidence = float(
            resnet_prediction["confidence"]
        )


        if resnet_result == "DEFECT":

            resnet_defect_confidence = (
                resnet_confidence
            )

        else:

            resnet_defect_confidence = (
                100 - resnet_confidence
            )


        # ========================================================
        # YOLOv8s
        # ========================================================

        yolo_result = detect_defects(
            filepath,
            confidence_threshold=0.50
        )

        yolo_defects = (
            yolo_result["detections"]
        )

        yolo_defect_count = (
            yolo_result["defects_detected"]
        )

        yolo_max_confidence = (
            yolo_result["max_confidence"]
        )

        result_image_path = (
            yolo_result["result_image_path"]
        )


        # ========================================================
        # FINAL PASS / FAIL
        # ========================================================

        if yolo_defect_count > 0:

            pass_fail = "FAIL"

            confidence = max(
                resnet_defect_confidence,
                yolo_max_confidence
            )

        else:

            pass_fail = resnet_result

            confidence = resnet_confidence


        confidence = round(
            confidence,
            2
        )


        # ========================================================
        # INSPECTION TIME
        # ========================================================

        inspection_time = round(
            time.time() - start_time,
            2
        )

        inspection_status = "Completed"

        model_name = "ResNet18 + YOLOv8s"


        # ========================================================
        # CREATE INSPECTION
        # ========================================================

        cursor.execute(
            """
            INSERT INTO inspections
            (
                product_id,
                image_id,
                inspected_by,
                inspection_status,
                pass_fail,
                inspection_date
            )
            VALUES
            (
                %s,
                %s,
                %s,
                %s,
                %s,
                CURRENT_TIMESTAMP
            )
            RETURNING id
            """,
            (
                product_id,
                image_id,
                inspected_by,
                inspection_status,
                pass_fail
            )
        )

        inspection = cursor.fetchone()

        inspection_id = inspection["id"]


        # ========================================================
        # UPDATE INSPECTION AI VALUES
        # ========================================================

        cursor.execute(
            """
            UPDATE inspections
            SET
                confidence_score = %s,
                inspection_time = %s,
                model_name = %s,
                result_image_path = %s
            WHERE id = %s
            """,
            (
                confidence,
                inspection_time,
                model_name,
                result_image_path,
                inspection_id
            )
        )


        # ========================================================
        # SAVE INDIVIDUAL YOLO DEFECTS
        # ========================================================

        for detection in yolo_defects:

            bbox = detection["bbox"]

            defect_confidence = float(
                detection["confidence"]
            )


            # Existing defect severity classification
            severity = (
                "High"
                if defect_confidence >= 85
                else
                "Medium"
                if defect_confidence >= 70
                else
                "Low"
            )


            cursor.execute(
                """
                INSERT INTO defects
                (
                    inspection_id,
                    defect_type,
                    confidence,
                    severity,
                    bbox_x,
                    bbox_y,
                    bbox_width,
                    bbox_height
                )
                VALUES
                (
                    %s,
                    %s,
                    %s,
                    %s,
                    %s,
                    %s,
                    %s,
                    %s
                )
                """,
                (
                    inspection_id,

                    detection["class_name"],

                    detection["confidence"],

                    severity,

                    bbox["x"],

                    bbox["y"],

                    bbox["width"],

                    bbox["height"]
                )
            )


        # ========================================================
        # SEVERITY CALCULATION
        #
        # SAME LOGIC AS UploadProduct.jsx
        #
        # Size       = 30%
        # Location   = 25%
        # Type       = 25%
        # Confidence = 20%
        # ========================================================

        size_score = 0
        location_score = 0
        type_score = 0
        confidence_score = 0
        overall_severity = 0


        if yolo_defects:

            # ====================================================
            # DEFECT SIZE
            # ====================================================

            largest_area = 0

            for detection in yolo_defects:

                bbox = detection.get("bbox")

                if not bbox:
                    continue

                width = float(
                    bbox.get("width", 0)
                )

                height = float(
                    bbox.get("height", 0)
                )

                area = width * height

                if area > largest_area:

                    largest_area = area


            # ----------------------------------------------------
            # Obtain actual image dimensions
            # ----------------------------------------------------

            from PIL import Image

            with Image.open(filepath) as img:

                image_width, image_height = (
                    img.size
                )


            image_area = (
                image_width * image_height
            )


            if image_area > 0:

                area_percentage = (
                    largest_area /
                    image_area
                ) * 100

            else:

                area_percentage = 0


            size_score = min(
                100,
                area_percentage * 10
            )


            # ====================================================
            # DEFECT LOCATION
            #
            # Same center-distance calculation
            # used in UploadProduct.jsx
            # ====================================================

            location_score = 50


            first_bbox = (
                yolo_defects[0].get("bbox")
            )


            if first_bbox:

                center_x = (
                    float(first_bbox.get("x", 0))
                    +
                    float(
                        first_bbox.get(
                            "width",
                            0
                        )
                    ) / 2
                )


                center_y = (
                    float(first_bbox.get("y", 0))
                    +
                    float(
                        first_bbox.get(
                            "height",
                            0
                        )
                    ) / 2
                )


                normalized_x = (
                    center_x / image_width
                    if image_width > 0
                    else 0.5
                )


                normalized_y = (
                    center_y / image_height
                    if image_height > 0
                    else 0.5
                )


                distance_from_center = (
                    (
                        (normalized_x - 0.5) ** 2
                    )
                    +
                    (
                        (normalized_y - 0.5) ** 2
                    )
                ) ** 0.5


                maximum_distance = (
                    (0.5 ** 2) +
                    (0.5 ** 2)
                ) ** 0.5


                location_score = max(
                    0,
                    min(
                        100,
                        100 -
                        (
                            distance_from_center /
                            maximum_distance
                        ) * 100
                    )
                )


            # ====================================================
            # DEFECT TYPE
            #
            # Same categories as UploadProduct.jsx
            # ====================================================

            high_severity_types = [

                "broken",
                "broken_large",
                "broken_small",
                "broken_teeth",

                "crack",

                "cut",
                "cut_inner_insulation",
                "cut_lead",
                "cut_outer_insulation",

                "damaged_case",

                "hole",

                "missing_cable",
                "missing_wire",

                "split_teeth",

                "squeezed_teeth"

            ]


            medium_severity_types = [

                "bent",
                "bent_lead",
                "bent_wire",

                "contamination",
                "metal_contamination",

                "defective",

                "liquid",
                "oil",

                "poke",
                "poke_insulation",

                "rough",

                "squeeze",

                "thread",
                "thread_side",
                "thread_top"

            ]


            low_severity_types = [

                "scratch",
                "scratch_head",
                "scratch_neck",

                "color",
                "fabric_border",
                "fabric_interior",

                "faulty_imprint",

                "flip",
                "fold",

                "glue",
                "glue_strip",

                "gray_stroke",

                "print"

            ]


            type_score = 50


            detected_type = (
                yolo_defects[0]
                .get("class_name", "")
                .lower()
            )


            if detected_type in high_severity_types:

                type_score = 100

            elif detected_type in medium_severity_types:

                type_score = 70

            elif detected_type in low_severity_types:

                type_score = 40


            # ====================================================
            # DETECTION CONFIDENCE
            # ====================================================

            confidence_score = min(
                100,
                float(yolo_max_confidence)
            )


            # ====================================================
            # OVERALL SEVERITY
            # ====================================================

            overall_severity = (

                size_score * 0.30

                +

                location_score * 0.25

                +

                type_score * 0.25

                +

                confidence_score * 0.20

            )


        # ========================================================
        # ROUND VALUES
        # ========================================================

        size_score = round(
            size_score,
            2
        )

        location_score = round(
            location_score,
            2
        )

        type_score = round(
            type_score,
            2
        )

        confidence_score = round(
            confidence_score,
            2
        )

        overall_severity = round(
            overall_severity,
            2
        )


        # ========================================================
        # SEVERITY LEVEL
        #
        # IMPORTANT:
        # This follows the existing UploadProduct.jsx code:
        #
        # >= 75 = Critical
        # >= 50 = High
        # >= 25 = Medium
        # < 25  = Low
        # ========================================================

        if overall_severity >= 80:

            severity_level = "Critical"

        elif overall_severity >= 60:

            severity_level = "High"

        elif overall_severity >= 40:

            severity_level = "Medium"

        else:

            severity_level = "Low"


        # ========================================================
        # RECOMMENDED ACTION
        # ========================================================

        if severity_level == "Critical":

            recommended_action = (
                "Reject Product and Trigger "
                "Quality Inspection Workflow."
            )

        elif severity_level == "High":

            recommended_action = (
                "Repair or rework recommended."
            )

        elif severity_level == "Medium":

            recommended_action = (
                "Inspection review required."
            )

        else:

            recommended_action = (
                "Minor cosmetic defect. "
                "Product generally acceptable."
            )


        # ========================================================
        # INSERT INSPECTION ANALYSIS
        # ========================================================

        cursor.execute(
            """
            INSERT INTO inspection_analysis
            (
                inspection_id,
                defect_size,
                defect_location,
                defect_type,
                detection_confidence,
                severity_score,
                severity_level,
                pass_fail,
                number_of_defects,
                result_image_path,
                recommended_action
            )
            VALUES
            (
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s
            )
            """,
            (
                inspection_id,

                size_score,

                location_score,

                type_score,

                confidence_score,

                overall_severity,

                severity_level,

                pass_fail,

                yolo_defect_count,

                result_image_path,

                recommended_action
            )
        )


        # ========================================================
        # COMMIT
        # ========================================================

        conn.commit()


        # ========================================================
        # RESPONSE
        # ========================================================

        return {

            "message":
                "Inspection Completed",

            "product_id":
                product_id,

            "image_id":
                image_id,

            "inspection_id":
                inspection_id,

            "prediction":
                pass_fail,

            "confidence":
                confidence,

            "inspection_time":
                inspection_time,

            "model":
                model_name,


            # ====================================================
            # SEVERITY
            # ====================================================

            "severity": {

                "size":
                    size_score,

                "location":
                    location_score,

                "type":
                    type_score,

                "confidence":
                    confidence_score,

                "overall":
                    overall_severity,

                "level":
                    severity_level,

                "recommended_action":
                    recommended_action

            },


            # ====================================================
            # RESNET
            # ====================================================

            "resnet": {

                "prediction":
                    resnet_result,

                "confidence":
                    round(
                        resnet_confidence,
                        2
                    )

            },


            # ====================================================
            # YOLO
            # ====================================================

            "yolo": {

                "defects_detected":
                    yolo_defect_count,

                "max_confidence":
                    yolo_max_confidence,

                "detections":
                    yolo_defects,

                "result_image_path":
                    result_image_path

            }

        }


    except Exception as e:

        conn.rollback()

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


    finally:

        cursor.close()
        conn.close()


# ============================================================
# SERVE YOLO ANNOTATED IMAGE
# ============================================================

@router.get(
    "/inspection-image/{filename}"
)
def inspection_image(filename: str):

    safe_filename = os.path.basename(
        filename
    )


    filepath = os.path.join(
        UPLOAD_FOLDER,
        safe_filename
    )


    if not os.path.exists(filepath):

        raise HTTPException(
            status_code=404,
            detail="Inspection image not found."
        )


    return FileResponse(
        filepath
    )


# ============================================================
# UPLOAD IMAGE
# ============================================================

@router.post("/upload-image")
def upload_image(
    file: UploadFile = File(...)
):

    conn = get_connection()
    cursor = conn.cursor()

    try:

        extension = os.path.splitext(
            file.filename
        )[1]


        filename = (
            f"{uuid.uuid4()}"
            f"{extension}"
        )


        filepath = os.path.join(
            UPLOAD_FOLDER,
            filename
        )


        with open(
            filepath,
            "wb"
        ) as buffer:

            shutil.copyfileobj(
                file.file,
                buffer
            )


        image_size = os.path.getsize(
            filepath
        )


        cursor.execute(
            """
            INSERT INTO product_images
            (
                image_name,
                image_path,
                image_type,
                uploaded_at,
                image_size
            )
            VALUES
            (
                %s,
                %s,
                %s,
                CURRENT_TIMESTAMP,
                %s
            )
            RETURNING id
            """,
            (
                file.filename,
                filepath,
                file.content_type,
                image_size
            )
        )


        image = cursor.fetchone()

        conn.commit()


        return {

            "message":
                "Image uploaded successfully",

            "image_id":
                image["id"],

            "filename":
                file.filename

        }


    finally:

        cursor.close()
        conn.close()


# ============================================================
# INSPECTION RESULTS
# ============================================================

@router.get("/inspection-results")
def inspection_results():

    conn = get_connection()
    cursor = conn.cursor()

    try:

        cursor.execute(
            """
            SELECT
                i.id,
                p.product_code,
                p.product_name,

                -- Display PASS / FAIL
                i.pass_fail AS inspection_status,

                i.confidence_score,

                -- Use the actual processing time value
                i.inspection_time AS processing_time,

                pi.image_path,

                i.inspection_date

            FROM inspections i

            JOIN products p
                ON p.id = i.product_id

            JOIN product_images pi
                ON pi.id = i.image_id

            ORDER BY
                i.inspection_date DESC
            """
        )

        data = cursor.fetchall()

        return data

    finally:

        cursor.close()
        conn.close()

# ============================================================
# INSPECTION HISTORY
# ============================================================

@router.get("/inspection-history")
def inspection_history():

    conn = get_connection()
    cursor = conn.cursor()

    try:

        cursor.execute(
            """
            SELECT
                i.id,
                p.product_code,
                p.product_name,
                i.pass_fail,
                i.confidence_score,
                i.inspection_status,
                i.inspection_date
            FROM inspections i
            JOIN products p
                ON p.id = i.product_id
            ORDER BY
                i.inspection_date DESC
            """
        )


        history = cursor.fetchall()

        return history


    finally:

        cursor.close()
        conn.close()


# ============================================================
# DEFECT ANALYTICS
# ============================================================

@router.get("/defect-analytics")
def defect_analytics():

    conn = get_connection()
    cursor = conn.cursor()

    try:

        # =====================================================
        # SUMMARY
        # =====================================================

        cursor.execute(
            """
            SELECT
                COUNT(*) FILTER
                (
                    WHERE pass_fail = 'FAIL'
                ) AS total_defects,

                COUNT(*) AS total_inspections,

                AVG(confidence_score)
                    AS avg_confidence

            FROM inspections
            """
        )

        summary = cursor.fetchone()


        # =====================================================
        # DEFECT DISTRIBUTION
        # =====================================================

        cursor.execute(
            """
            SELECT
                defect_type,
                COUNT(*) AS count

            FROM defects

            GROUP BY defect_type

            ORDER BY count DESC
            """
        )

        defects = cursor.fetchall()


        # =====================================================
        # PRODUCTION LINE QUALITY
        # =====================================================

        cursor.execute(
            """
            SELECT
                p.production_line AS production_line,

                ROUND(
                    (
                        COUNT(*) FILTER
                        (
                            WHERE i.pass_fail = 'PASS'
                        ) * 100.0
                    )
                    /
                    NULLIF(COUNT(i.id), 0),
                    1
                ) AS pass_rate

            FROM products p

            INNER JOIN inspections i
                ON i.product_id = p.id

            WHERE
                p.production_line IS NOT NULL
                AND TRIM(p.production_line) <> ''

            GROUP BY
                p.production_line

            ORDER BY
                p.production_line
            """
        )

        production_rows = cursor.fetchall()


        # =====================================================
        # CONVERT DATABASE ROWS TO DICTIONARIES
        # =====================================================

        production = []

        for row in production_rows:

            production.append(
                {
                    "production_line":
                        row["production_line"],

                    "pass_rate":
                        float(row["pass_rate"] or 0)
                }
            )


        # =====================================================
        # RETURN
        # =====================================================

        return {

            "summary": summary,

            "defects": defects,

            "production": production

        }


    finally:

        cursor.close()
        conn.close()

# ============================================================
# SUPERVISOR DASHBOARD
# ============================================================

@router.get("/supervisor/dashboard")
def supervisor_dashboard():

    conn = get_connection()
    cursor = conn.cursor()

    try:

        cursor.execute(
            """
            SELECT COUNT(*)
            FROM products
            """
        )

        total_products = (
            cursor.fetchone()["count"]
        )


        cursor.execute(
            """
            SELECT COUNT(*)
            FROM inspections
            """
        )

        total_inspections = (
            cursor.fetchone()["count"]
        )


        cursor.execute(
            """
            SELECT COUNT(*)
            FROM inspections
            WHERE pass_fail='FAIL'
            """
        )

        total_defects = (
            cursor.fetchone()["count"]
        )


        cursor.execute(
            """
            SELECT
                ROUND(
                    COALESCE(
                        COUNT(*) FILTER
                        (
                            WHERE pass_fail='PASS'
                        )
                        * 100.0
                        /
                        NULLIF(
                            COUNT(*),
                            0
                        ),
                        0
                    ),
                    2
                ) AS quality_score

            FROM inspections
            """
        )


        quality_score = (
            cursor.fetchone()[
                "quality_score"
            ]
        )


        return {

            "total_products":
                total_products,

            "total_inspections":
                total_inspections,

            "total_defects":
                total_defects,

            "quality_score":
                quality_score

        }


    finally:

        cursor.close()
        conn.close()


# ============================================================
# PRODUCTION OVERVIEW
# ============================================================

@router.get("/production-overview")
def production_overview():

    conn = get_connection()
    cursor = conn.cursor()

    try:

        cursor.execute(
            """
            SELECT COUNT(*)
            FROM products
            """
        )

        total_products = (
            cursor.fetchone()["count"]
        )


        cursor.execute(
            """
            SELECT COUNT(*)
            FROM inspections
            WHERE pass_fail='PASS'
            """
        )

        passed = (
            cursor.fetchone()["count"]
        )


        cursor.execute(
            """
            SELECT COUNT(*)
            FROM inspections
            WHERE pass_fail='FAIL'
            """
        )

        failed = (
            cursor.fetchone()["count"]
        )


        cursor.execute(
            """
            SELECT COUNT(*)
            FROM inspections
            WHERE inspection_status='Pending'
            """
        )

        pending = (
            cursor.fetchone()["count"]
        )


        cursor.execute(
            """
            SELECT
                production_line,

                COUNT(*) AS total_products,

                COUNT(*) FILTER
                (
                    WHERE inspection_status='Completed'
                ) AS inspected,

                COUNT(*) FILTER
                (
                    WHERE inspection_status='Pending'
                ) AS pending

            FROM products

            GROUP BY production_line

            ORDER BY production_line
            """
        )


        production_lines = (
            cursor.fetchall()
        )


        cursor.execute(
            """
            SELECT
                product_code,
                product_name,
                category,
                production_line,
                inspection_status

            FROM products

            ORDER BY created_at DESC

            LIMIT 10
            """
        )


        latest = cursor.fetchall()


        return {

            "total_products":
                total_products,

            "passed":
                passed,

            "failed":
                failed,

            "pending":
                pending,

            "production_lines":
                production_lines,

            "latest":
                latest

        }


    finally:

        cursor.close()
        conn.close()


# ============================================================
# SUPERVISOR INSPECTION REPORTS
# ============================================================

@router.get(
    "/supervisor/inspection-reports"
)
def inspection_reports():

    conn = get_connection()
    cursor = conn.cursor()

    try:

        cursor.execute(
            """
            SELECT

                COUNT(*) FILTER
                (
                    WHERE inspection_status='Completed'
                ) AS completed,

                COUNT(*) FILTER
                (
                    WHERE inspection_status='Pending'
                ) AS pending

            FROM inspections
            """
        )


        summary = cursor.fetchone()


        cursor.execute(
            """
            SELECT

                COUNT(*) FILTER
                (
                    WHERE pass_fail='PASS'
                ) AS passed,

                COUNT(*) FILTER
                (
                    WHERE pass_fail='FAIL'
                ) AS defects

            FROM inspections
            """
        )


        result = cursor.fetchone()


        summary["passed"] = (
            result["passed"] or 0
        )

        summary["defects"] = (
            result["defects"] or 0
        )


        cursor.execute(
            """
            SELECT
                pass_fail,
                COUNT(*) AS value

            FROM inspections

            GROUP BY pass_fail
            """
        )


        chart = cursor.fetchall()


        if len(chart) == 0:

            chart = [
                {
                    "pass_fail":
                        "NO DATA",

                    "value":
                        1
                }
            ]


        cursor.execute(
            """
            SELECT

                i.id,

                p.product_code,

                p.product_name,

                p.production_line,

                i.inspection_status,

                i.pass_fail,

                COALESCE(
                    i.confidence_score,
                    0
                ) AS confidence_score,

                COALESCE(
                    i.inspection_time,
                    0
                ) AS inspection_time,

                i.created_at

            FROM inspections i

            JOIN products p
                ON p.id = i.product_id

            ORDER BY
                i.created_at DESC
            """
        )


        reports = cursor.fetchall()


        return {

            "summary":
                summary,

            "chart":
                chart,

            "reports":
                reports

        }


    finally:

        cursor.close()
        conn.close()


# ============================================================
# SUPERVISOR DEFECT TRENDS
# ============================================================

@router.get(
    "/supervisor/defect-trends"
)
def defect_trends():

    conn = get_connection()
    cursor = conn.cursor()

    try:

        # ----------------------------------------------------
        # Defects by actual defect type
        # ----------------------------------------------------

        cursor.execute(
            """
            SELECT

                d.defect_type,

                COUNT(*) AS value

            FROM defects d

            JOIN inspections i
                ON d.inspection_id = i.id

            WHERE i.pass_fail='FAIL'

            GROUP BY d.defect_type

            ORDER BY value DESC
            """
        )


        defect_types = (
            cursor.fetchall()
        )


        if len(defect_types) == 0:

            defect_types = [
                {
                    "defect_type":
                        "No Data",

                    "value":
                        1
                }
            ]


        # ----------------------------------------------------
        # Daily defect trend
        # ----------------------------------------------------

        cursor.execute(
            """
            SELECT

                DATE(i.created_at)
                    AS day,

                COUNT(*) AS defects

            FROM defects d

            JOIN inspections i
                ON d.inspection_id = i.id

            WHERE i.pass_fail='FAIL'

            GROUP BY
                DATE(i.created_at)

            ORDER BY day
            """
        )


        trend = cursor.fetchall()


        if len(trend) == 0:

            trend = [
                {
                    "day":
                        "No Data",

                    "defects":
                        0
                }
            ]


        # ----------------------------------------------------
        # Production line defects
        # ----------------------------------------------------

        cursor.execute(
            """
            SELECT

                p.production_line,

                COUNT(*) AS defects

            FROM defects d

            JOIN inspections i
                ON d.inspection_id = i.id

            JOIN products p
                ON i.product_id = p.id

            WHERE i.pass_fail='FAIL'

            GROUP BY
                p.production_line

            ORDER BY defects DESC
            """
        )


        production_lines = (
            cursor.fetchall()
        )


        if len(production_lines) == 0:

            production_lines = [
                {
                    "production_line":
                        "No Data",

                    "defects":
                        0
                }
            ]


        return {

            "defect_types":
                defect_types,

            "trend":
                trend,

            "production_lines":
                production_lines

        }


    finally:

        cursor.close()
        conn.close()

# ============================================================
# QUALITY REPORTS
# ============================================================
@router.get("/quality-reports")
def quality_reports():

    conn = get_connection()
    cursor = conn.cursor()

    try:

        cursor.execute(
            """
            SELECT
                ia.id AS analysis_id,
                ia.inspection_id,

                i.product_id,

                p.product_code,
                p.product_name,
                p.category,
                p.batch_number,
                p.production_line,
                p.manufacturing_date,

                ia.defect_size,
                ia.defect_location,

                COALESCE(
                    STRING_AGG(
                        DISTINCT d.defect_type,
                        ', '
                    ),
                    'No defect detected'
                ) AS defect_type,

                ia.detection_confidence,
                ia.severity_score,
                ia.severity_level,
                ia.pass_fail,
                ia.number_of_defects,
                ia.result_image_path,
                ia.recommended_action,
                ia.created_at,

                i.inspection_status,
                i.inspection_date,
                i.inspection_time,

                i.processing_time,
                i.model_name

            FROM inspection_analysis ia

            JOIN inspections i
                ON i.id = ia.inspection_id

            JOIN products p
                ON p.id = i.product_id

            LEFT JOIN defects d
                ON d.inspection_id = i.id

            GROUP BY
                ia.id,
                ia.inspection_id,

                i.product_id,

                p.product_code,
                p.product_name,
                p.category,
                p.batch_number,
                p.production_line,
                p.manufacturing_date,

                ia.defect_size,
                ia.defect_location,
                ia.detection_confidence,
                ia.severity_score,
                ia.severity_level,
                ia.pass_fail,
                ia.number_of_defects,
                ia.result_image_path,
                ia.recommended_action,
                ia.created_at,

                i.inspection_status,
                i.inspection_date,
                i.inspection_time,
                i.processing_time,
                i.model_name

            ORDER BY
                ia.created_at DESC
            """
        )

        reports = cursor.fetchall()

        return reports

    finally:

        cursor.close()
        conn.close()