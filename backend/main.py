from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from PIL import Image
import torch
import torch.nn as nn
import torchvision.transforms as transforms
import io
import os
import json
from datetime import datetime

# PostgreSQL
from uploads.database import conn, cursor


app = FastAPI()


# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# CNN MODEL
# ============================================================

class DefectCNN(nn.Module):

    def __init__(self):
        super(DefectCNN, self).__init__()

        self.conv1 = nn.Conv2d(
            3, 16, 3, padding=1
        )

        self.relu = nn.ReLU()

        self.pool = nn.MaxPool2d(
            2, 2
        )

        self.conv2 = nn.Conv2d(
            16, 32, 3, padding=1
        )

        self.fc1 = nn.Linear(
            32 * 32 * 32,
            128
        )

        self.fc2 = nn.Linear(
            128,
            49
        )

    def forward(self, x):

        x = self.pool(
            self.relu(
                self.conv1(x)
            )
        )

        x = self.pool(
            self.relu(
                self.conv2(x)
            )
        )

        x = x.view(
            x.size(0),
            -1
        )

        x = self.relu(
            self.fc1(x)
        )

        x = self.fc2(x)

        return x


# ============================================================
# LOAD TRAINED MODEL
# ============================================================

model = DefectCNN()

backend_folder = os.path.dirname(
    os.path.abspath(__file__)
)

model_path = os.path.join(
    backend_folder,
    "visioninspect_model.pth"
)

# If model is one folder above backend
if not os.path.exists(model_path):

    model_path = os.path.join(
        backend_folder,
        "..",
        "visioninspect_model.pth"
    )

if not os.path.exists(model_path):

    raise FileNotFoundError(
        f"Trained model not found: {model_path}"
    )


model.load_state_dict(
    torch.load(
        model_path,
        map_location=torch.device("cpu")
    )
)

model.eval()
# Load label mapping
label_map_path = os.path.join(
    backend_folder,
    "label_map.json"
)

with open(label_map_path, "r") as file:
    label_map = json.load(file)

# Reverse mapping: number -> class name
class_names = {
    value: key
    for key, value in label_map.items()
}

print("Label mapping loaded:")
print(class_names)
print("===================================")
print("VisionInspect AI Backend")
print("===================================")
print("Trained model loaded successfully!")
print("Model:", model_path)


# ============================================================
# IMAGE PREPROCESSING
# ============================================================

transform = transforms.Compose([
    transforms.Resize((128, 128)),
    transforms.ToTensor()
])


# ============================================================
# IMAGE STORAGE
# ============================================================

inspection_folder = os.path.join(
    backend_folder,
    "uploads",
    "inspection_images"
)

os.makedirs(
    inspection_folder,
    exist_ok=True
)


# ============================================================
# USER MODEL
# ============================================================

class User(BaseModel):
    role: str


# ============================================================
# HOME
# ============================================================

@app.get("/")
def home():

    return {
        "message": "VisionInspect AI Backend Running"
    }


# ============================================================
# REGISTER
# ============================================================

@app.post("/register")
def register(user: User):

    return {
        "message": "Registration Successful",
        "role": user.role
    }


# ============================================================
# IMAGE INSPECTION
# ============================================================

@app.post("/inspect")
async def inspect_image(
    file: UploadFile = File(...)
):

    try:

        # ----------------------------------------------------
        # Check file
        # ----------------------------------------------------

        if not file.filename:

            raise HTTPException(
                status_code=400,
                detail="No image selected."
            )

        allowed_extensions = (
            ".jpg",
            ".jpeg",
            ".png"
        )

        if not file.filename.lower().endswith(
            allowed_extensions
        ):

            raise HTTPException(
                status_code=400,
                detail="Only JPG, JPEG and PNG images are supported."
            )


        # ----------------------------------------------------
        # Read image
        # ----------------------------------------------------

        image_bytes = await file.read()

        if not image_bytes:

            raise HTTPException(
                status_code=400,
                detail="Uploaded image is empty."
            )

        image = Image.open(
            io.BytesIO(image_bytes)
        ).convert("RGB")


        # ----------------------------------------------------
        # Preprocess
        # ----------------------------------------------------

        image_tensor = transform(image)

        image_tensor = image_tensor.unsqueeze(0)


        # ----------------------------------------------------
        # AI prediction
        # ----------------------------------------------------

        with torch.no_grad():

            outputs = model(
                image_tensor
            )

            probabilities = torch.softmax(
                outputs,
                dim=1
            )

            confidence, predicted = torch.max(
                probabilities,
                1
            )


        predicted_class = predicted.item()

        confidence_value = (
            confidence.item() * 100
        )
        # ----------------------------------------------------
        # Severity Score
        # ----------------------------------------------------

        severity_score = 0

        if predicted_class == 0:

            severity_score = 0

        else:

            if confidence_value >= 95:

                severity_score = 95

            elif confidence_value >= 90:

                severity_score = 85

            elif confidence_value >= 80:

                severity_score = 70

            elif confidence_value >= 70:

                severity_score = 55

            else:

                severity_score = 35


        if severity_score >= 80:

            severity_level = "Critical"

        elif severity_score >= 60:

            severity_level = "High"

        elif severity_score >= 40:

            severity_level = "Medium"

        else:

            severity_level = "Low"
        # ----------------------------------------------------
        # Result
        # ----------------------------------------------------

        predicted_label = class_names.get(
            predicted_class,
            "unknown"
        )

        if predicted_label == "good":

            result = "GOOD"

            prediction = "Good Product"

            defect_type = "No Defect"

            inspection_result = (
                "No defect detected. "
                "The uploaded product appears to be good."
            )

        else:

            result = "DEFECT"

            prediction = "Defective Product"

            defect_type = predicted_label

            if severity_level == "Critical":

                inspection_result = (
                    "Critical quality issue detected. "
                    "Product should be rejected."
                )

            elif severity_level == "High":

                inspection_result = (
                    "High severity defect detected. "
                    "Manual inspection recommended."
                )

            elif severity_level == "Medium":

                inspection_result = (
                    "Medium severity defect detected. "
                    "Quality review required."
                )

            else:

                inspection_result = (
                    "Minor defect detected. "
                    "Product may be accepted after review."
                )
        # ----------------------------------------------------
        # Quality Assessment
        # ----------------------------------------------------

        if result == "GOOD":

            quality_decision = "PASS"

            quality_recommendation = (
                "Product meets the quality requirements. "
                "Product is approved for production use."
            )

        elif severity_level == "Critical":

            quality_decision = "FAIL"

            quality_recommendation = (
                "Reject the product immediately and trigger "
                "the quality inspection workflow."
            )

        elif severity_level == "High":

            quality_decision = "FAIL"

            quality_recommendation = (
                "Product has a significant quality issue. "
                "Repair or rework is recommended."
            )

        elif severity_level == "Medium":

            quality_decision = "REVIEW"

            quality_recommendation = (
                "Product has a moderate quality concern. "
                "Inspection review is required."
            )

        else:

            quality_decision = "PASS"

            quality_recommendation = (
                "Minor cosmetic defect detected. "
                "Product is generally acceptable."
            )
        # ----------------------------------------------------
        # Save uploaded image
        # ------------------- ---------------------------------

        safe_filename = os.path.basename(
            file.filename
        )

        timestamp = datetime.now().strftime(
            "%Y%m%d_%H%M%S_%f"
        )

        saved_filename = (
            f"{timestamp}_{safe_filename}"
        )

        image_path = os.path.join(
            inspection_folder,
            saved_filename
        )

        with open(
            image_path,
            "wb"
        ) as image_file:

            image_file.write(
                image_bytes
            )


        # ----------------------------------------------------
        # SAVE RESULT TO POSTGRESQL
        # ----------------------------------------------------

        database_status = "Saved"

        try:

            cursor.execute(
                """
                INSERT INTO product_images
                (filename, image_path)
                VALUES (%s, %s)
                RETURNING id
                """,
                (
                    file.filename,
                    image_path
                )
            )

            image_id = cursor.fetchone()[0]


            cursor.execute(
    """
    INSERT INTO defect_detection
    (
        image_id,
        result,
        prediction,
        confidence,
        inspection_result,
        defect_type,
        severity_score,
        severity_level,
        quality_decision,
        quality_recommendation
    )
    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    """,
                (
    image_id,
    result,
    prediction,
    round(
        confidence_value,
        2
    ),
    inspection_result,
    defect_type,
    severity_score,
    severity_level,
    quality_decision,
    quality_recommendation
)
            )


            conn.commit()

            print(
                "Inspection result saved to PostgreSQL."
            )

        except Exception as database_error:

            conn.rollback()

            database_status = "Database save failed"

            print(
                "Database error:",
                database_error
            )


        # ----------------------------------------------------
        # SEND RESULT TO REACT
        # ----------------------------------------------------

        return {

            "success": True,

            "filename": file.filename,

            "result": result,

            "prediction": prediction,
            "defect_type": defect_type,

            "confidence": round(
                confidence_value,
                2
            ),
            "severity_score": severity_score,
             "severity_level": severity_level,

            "inspection_result": inspection_result,
            "quality_decision": quality_decision,

            "quality_recommendation": quality_recommendation,

            "database_status": database_status

        }


    except HTTPException:

        raise


    except Exception as e:

        print(
            "Inspection error:",
            e
        )

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


# ============================================================
# GET INSPECTION HISTORY
# Used by Quality Engineer Dashboard
# ============================================================

@app.get("/inspections")
def get_inspections():

    try:

        cursor.execute(
            """
            SELECT
                p.filename,
                d.result,
                d.prediction,
                d.confidence,
                d.inspection_result,
                d.defect_type,
                d.severity_score,
                d.severity_level,
                d.quality_decision,
                d.quality_recommendation
            FROM product_images p
            INNER JOIN defect_detection d
                ON p.id = d.image_id
            ORDER BY p.id DESC
            """
        )

        rows = cursor.fetchall()

        inspections = []

        for row in rows:
            print("ROW LENGTH:", len(row), "ROW:", row)
            

            inspections.append({


                "filename": row[0],

                "result": row[1],

                "prediction": row[2],

                "confidence": row[3],

                "inspection_result": row[4],
                "defect_type": row[5],
                "severity_score": row[6],
                "severity_level": row[7],
                "quality_decision": row[8],

                 "quality_recommendation": row[9] 
            })


        return {

            "success": True,

            "total": len(inspections),

            "inspections": inspections

        }


    except Exception as e:

        print(
            "Error fetching inspections:",
            e
        )

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )
      