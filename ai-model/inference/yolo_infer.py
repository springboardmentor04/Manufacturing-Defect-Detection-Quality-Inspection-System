import time
import torch
import json
from pathlib import Path
from ultralytics import YOLO

import sys
import os

# Ensure the backend directory is in the Python path so we can import 'app'
project_root = Path(__file__).resolve().parents[2]
backend_path = str(project_root / "backend")
if backend_path not in sys.path:
    sys.path.append(backend_path)

# pyrefly: ignore [missing-import]
from app.config.settings import settings

class YOLOInferenceEngine:
    _instance = None

    def __new__(cls, *args, **kwargs):
        if not cls._instance:
            cls._instance = super(YOLOInferenceEngine, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return

        project_root = Path(__file__).resolve().parents[2]
        self.model_path = project_root / "ai-model" / "yolo" / "models" / "optimized_run" / "weights" / "best.pt"
        self.taxonomy_path = project_root / "ai-model" / "yolo" / "taxonomy.json"
        
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.model = YOLO(str(self.model_path))
        self.model.to(self.device)
        
        with open(self.taxonomy_path, "r") as f:
            taxonomy = json.load(f)
            self.classes = taxonomy["classes"]
            self.mapping = taxonomy.get("mapping", {})
            
        self._initialized = True
        print(f"Loaded YOLO model from {self.model_path} on {self.device} with threshold {settings.YOLO_CONF_THRESHOLD}")

    @torch.inference_mode()
    def infer(self, image_path: str, category: str):
        try:
            start_time = time.perf_counter()
            
            # Predict with fixed img size and threshold
            results = self.model.predict(
                source=image_path,
                imgsz=800,
                conf=settings.YOLO_CONF_THRESHOLD,
                device=self.device,
                verbose=False
            )
            
            processing_time_ms = (time.perf_counter() - start_time) * 1000
            
            result = results[0]
            
            prediction = "PASS"
            defect_type = "None"
            confidence = 0.0
            bounding_boxes = []
            segmentation_masks = []
            detections = []
            
            if result.boxes is not None and len(result.boxes) > 0:
                best_conf = 0.0
                best_cls_idx = 0
                has_valid_defect = False
                mismatched_defects = []
                
                all_masks = []
                if result.masks is not None:
                    all_masks = result.masks.xyn
                
                for i, box in enumerate(result.boxes):
                    cls_idx = int(box.cls)
                    defect_name = self.classes[cls_idx]
                    conf = float(box.conf)
                    
                    valid_categories = self.mapping.get(defect_name, [])
                    if valid_categories and category not in valid_categories:
                        mismatched_defects.append((defect_name, conf))
                        continue
                    
                    has_valid_defect = True
                    
                    bb = box.xyxyn[0].cpu().tolist()
                    bounding_boxes.append(bb)
                    
                    det_mask = []
                    if i < len(all_masks):
                        det_mask = all_masks[i].tolist()
                        segmentation_masks.append(det_mask)
                        
                    detections.append({
                        "defect_type": defect_name,
                        "confidence": round(conf * 100, 2),
                        "bounding_box": bb,
                        "segmentation_mask": det_mask
                    })
                    
                    if conf > best_conf:
                        best_conf = conf
                        best_cls_idx = cls_idx
                
                print(f"DEBUG YOLO: has_valid_defect={has_valid_defect}, mismatched={mismatched_defects}")
                
                if not has_valid_defect and mismatched_defects:
                    best_mismatch = max(mismatched_defects, key=lambda x: x[1])
                    if best_mismatch[1] > 0.3:
                        raise ValueError(f"Category mismatch: Detected '{best_mismatch[0]}' which does not belong to '{category}'. Please select the correct category.")
                        
                if has_valid_defect:
                    prediction = "FAIL"
                    confidence = best_conf * 100
                    defect_type = self.classes[best_cls_idx]
                
            return {
                "status": "SUCCESS",
                "category": category,
                "prediction": prediction,
                "confidence": confidence,
                "anomaly_score": 0.0,
                "processing_time_ms": processing_time_ms,
                "model_version": "YOLO11n-seg-v1.0",
                "device": self.device.upper(),
                "defect_type": defect_type,
                "severity": "Not available",
                "bounding_boxes": bounding_boxes,
                "segmentation_masks": segmentation_masks,
                "detections": detections
            }
            
        except Exception as e:
            print(f"YOLO Inference failed for {image_path}: {e}")
            return {
                "status": f"ERROR: {str(e)}",
                "category": category,
                "prediction": "ERROR",
                "confidence": 0.0,
                "anomaly_score": 0.0,
                "processing_time_ms": 0.0,
                "model_version": "YOLO11n-seg-v1.0",
                "device": self.device.upper(),
                "defect_type": "None",
                "severity": "Not available",
                "bounding_boxes": [],
                "segmentation_masks": []
            }
