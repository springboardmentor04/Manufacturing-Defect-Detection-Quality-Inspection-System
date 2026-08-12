from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from PIL import Image
import torch
import torch.nn as nn
import torchvision.transforms as transforms
import io
import os
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
            2
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
        # Result
        # ----------------------------------------------------

        if predicted_class == 0:

            result = "GOOD"

            prediction = "Good Product"

            inspection_result = (
                "No defect detected. "
                "The uploaded product appears to be good."
            )

        else:

            result = "DEFECT"

            prediction = "Defective Product"

            inspection_result = (
                "Potential defect detected. "
                "The uploaded product requires inspection."
            )


        # ----------------------------------------------------
        # Save uploaded image
        # ----------------------------------------------------

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
                    inspection_result
                )
                VALUES (%s, %s, %s, %s, %s)
                """,
                (
                    image_id,
                    result,
                    prediction,
                    round(confidence_value, 2),
                    inspection_result
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

            "confidence": round(
                confidence_value,
                2
            ),

            "inspection_result": inspection_result,

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
                d.inspection_result
            FROM product_images p
            INNER JOIN defect_detection d
                ON p.id = d.image_id
            ORDER BY p.id DESC
            """
        )

        rows = cursor.fetchall()

        inspections = []

        for row in rows:

            inspections.append({

                "filename": row[0],

                "result": row[1],

                "prediction": row[2],

                "confidence": row[3],

                "inspection_result": row[4]

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