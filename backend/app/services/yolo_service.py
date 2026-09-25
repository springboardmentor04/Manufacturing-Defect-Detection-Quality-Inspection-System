from pathlib import Path
from ultralytics import YOLO

from ..config import settings


IMAGE_EXTENSIONS = {
    ".jpg",
    ".jpeg",
    ".png",
    ".webp"
}


class YOLOService:
    def __init__(self):
        project_root = Path(__file__).resolve().parents[3]
        model_path = project_root / settings.model_path

        if not model_path.exists():
            raise FileNotFoundError(
                f"YOLO model not found at {model_path}"
            )

        self.model = YOLO(str(model_path))

    def predict(self, image_path):
        results = self.model.predict(
            source=image_path,
            conf=0.25,
            verbose=False
        )

        raw = results[0]
        annotated = raw.plot()

        return raw, annotated


yolo_service = None


def get_yolo_service():
    global yolo_service

    if yolo_service is None:
        yolo_service = YOLOService()

    return yolo_service