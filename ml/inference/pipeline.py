import time
import os
import cv2
from ml.quality.assessment_engine import assess_defect, assess_inspection
from ml.inference.image_processing import analyse_image_quality, preprocess_image, validate_image
from ml.inference.class_resolution import describe_model_classes, resolve_detection_class, resolve_class_name


def resolve_model_path(explicit_path: str | None = None) -> str | None:
    """Return the first existing model path from the configured and repo defaults."""
    candidates = []
    if explicit_path:
        candidates.append(explicit_path)
    env_path = os.getenv("MODEL_PATH")
    if env_path:
        candidates.append(env_path)

    project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    candidates.extend([
        os.path.join(project_root, "models", "best.pt"),
        os.path.abspath(os.path.join(project_root, "..", "yolov8n.pt")),
        os.path.abspath(os.path.join(project_root, "..", "ml", "models", "best.pt")),
    ])

    seen = set()
    for candidate in candidates:
        normalized = os.path.abspath(os.path.expanduser(candidate))
        if normalized in seen:
            continue
        seen.add(normalized)
        if normalized and os.path.isfile(normalized):
            return normalized
    return None


def resolve_classifier_path(explicit_path: str | None = None) -> str | None:
    """Return the first existing classifier model path from configured defaults."""
    candidates = []
    if explicit_path:
        candidates.append(explicit_path)
    env_path = os.getenv("CLASSIFIER_PATH")
    if env_path:
        candidates.append(env_path)

    project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    candidates.extend([
        os.path.join(project_root, "ml", "models", "defect_classifier_v2", "weights", "best.pt"),
        os.path.join(project_root, "ml", "models", "defect_classifier", "best.pt"),
        os.path.join(project_root, "runs", "classify", "runs", "classify", "train", "weights", "best.pt"),
    ])

    for candidate in candidates:
        normalized = os.path.abspath(os.path.expanduser(candidate))
        if normalized and os.path.isfile(normalized):
            return normalized
    return None


def calculate_box_iou(box1, box2) -> float:
    x1 = max(box1[0], box2[0])
    y1 = max(box1[1], box2[1])
    x2 = min(box1[2], box2[2])
    y2 = min(box1[3], box2[3])
    inter = max(0.0, x2 - x1) * max(0.0, y2 - y1)
    area1 = max(0.0, (box1[2] - box1[0]) * (box1[3] - box1[1]))
    area2 = max(0.0, (box2[2] - box2[0]) * (box2[3] - box2[1]))
    union = area1 + area2 - inter
    return inter / union if union > 0 else 0.0


def filter_duplicate_detections(defects: list[dict], iou_threshold: float = 0.65) -> list[dict]:
    """Suppress duplicate overlapping detections keeping highest confidence."""
    if len(defects) <= 1:
        return defects
    # Sort descending by confidence
    sorted_defects = sorted(defects, key=lambda d: d.get("confidence", 0), reverse=True)
    kept = []
    for defect in sorted_defects:
        bbox = defect["bbox"]
        overlap = False
        for k in kept:
            if calculate_box_iou(bbox, k["bbox"]) > iou_threshold:
                overlap = True
                break
        if not overlap:
            kept.append(defect)
    return kept


class InferencePipeline:
    def __init__(self, model_path=None, classifier_path=None):
        resolved_path = resolve_model_path(model_path)
        self.model_path = resolved_path
        self.confidence_threshold = float(os.getenv("MODEL_CONFIDENCE_THRESHOLD", "0.25"))

        self.model = None
        self.model_error = None
        self.model_status = "UNAVAILABLE"
        self.model_mode = "fallback"
        # Real class metadata from the loaded model (never assumed).
        self.model_names = {}
        self.class_resolution_info = describe_model_classes({})
        
        self.classifier_model = None
        self.classifier_path = resolve_classifier_path(classifier_path)

        try:
            from ultralytics import YOLO
            if self.model_path and os.path.isfile(self.model_path):
                self.model = YOLO(self.model_path)
                names = getattr(self.model, "names", None)
                self.model_names = dict(names) if isinstance(names, dict) else {}
                self.class_resolution_info = describe_model_classes(self.model_names)
                self.model_status = "AVAILABLE"
                self.model_mode = "production"
                self.model_error = None
            else:
                self.model_error = "Configured model file is not available. Running a safe fallback/manual-review workflow."
            
            if self.classifier_path and os.path.isfile(self.classifier_path):
                self.classifier_model = YOLO(self.classifier_path)
        except Exception as error:
            self.model_error = f"Model could not be loaded: {error}. Using fallback/manual-review workflow."

    def inspect_image(
        self,
        image_path: str,
        processed_image_path: str | None = None,
        product_name: str | None = None,
        filename: str | None = None,
    ):
        start_time = time.time()
        image, image_info = validate_image(image_path)
        quality = analyse_image_quality(image)
        image_dims = (image_info["width"], image_info["height"])
        if processed_image_path:
            preprocess_image(image, processed_image_path)
        
        # 3. Defect Detection & Classification
        raw_defects = []
        if self.model is not None:
            results = self.model(image_path, conf=self.confidence_threshold, verbose=False)[0]
            boxes = results.boxes if results.boxes is not None else []
            
            orig_img = None
            if len(boxes) > 0 and self.classifier_model is not None:
                orig_img = cv2.imread(image_path)
                
            for box in boxes:
                conf = float(box.conf[0])
                if conf < self.confidence_threshold:
                    continue

                x1, y1, x2, y2 = box.xyxy[0].tolist()
                cls_idx = int(box.cls[0])
                area = (x2 - x1) * (y2 - y1)

                # Resolve the detected class id through the authoritative
                # dataset mapping (datasets/yolo_dataset/class_mapping.json).
                resolved = resolve_detection_class(
                    cls_idx,
                    self.model_names,
                    product_name=product_name,
                )
                
                defect_type = resolved["defect_type"]
                class_name = resolved["class_name"]
                product_category = resolved["product_category"]
                class_id = resolved["class_id"]
                class_mapped = resolved["mapped"]
                classification_source = resolved.get("classification_source", "model")
                classifier_conf = 0.0
                
                if self.classifier_model is not None and orig_img is not None:
                    h, w = orig_img.shape[:2]
                    box_w = x2 - x1
                    box_h = y2 - y1
                    margin = 0.05
                    px_margin_w = box_w * margin
                    px_margin_h = box_h * margin
                    
                    cx1 = int(max(0, x1 - px_margin_w))
                    cy1 = int(max(0, y1 - px_margin_h))
                    cx2 = int(min(w, x2 + px_margin_w))
                    cy2 = int(min(h, y2 + px_margin_h))
                    
                    if cx2 > cx1 and cy2 > cy1:
                        crop = orig_img[cy1:cy2, cx1:cx2]
                        cls_results = self.classifier_model(crop, verbose=False)[0]
                        clean_product = product_name.strip().lower() if product_name else None
                        
                        top1_idx = cls_results.probs.top1
                        top1_conf = float(cls_results.probs.top1conf)
                        predicted_class = cls_results.names[top1_idx]
                        
                        # If a specific product category is being inspected, rank candidate classes for that product
                        if clean_product and hasattr(cls_results.probs, 'data'):
                            probs_data = cls_results.probs.data.cpu().numpy()
                            candidate_indices = [
                                idx for idx, name in cls_results.names.items()
                                if name.startswith(f"{clean_product}_")
                            ]
                            if candidate_indices:
                                best_cand_idx = max(candidate_indices, key=lambda i: probs_data[i])
                                top1_idx = best_cand_idx
                                top1_conf = float(probs_data[best_cand_idx])
                                predicted_class = cls_results.names[best_cand_idx]
                        
                        resolved_cls = resolve_class_name(predicted_class)
                        if resolved_cls:
                            defect_type = resolved_cls["defect_type"]
                            class_name = resolved_cls["class_name"]
                            product_category = resolved_cls.get("category") or product_category
                            class_id = resolved_cls.get("class_id", class_id)
                            class_mapped = True
                        else:
                            defect_type = predicted_class
                            class_name = predicted_class
                            class_mapped = False
                        
                        classification_source = "classifier"
                        classifier_conf = top1_conf

                raw_defects.append({
                    "type": defect_type,
                    "confidence": conf * 100,
                    "bbox": [x1, y1, x2, y2],
                    "area": area,
                    "class_id": class_id,
                    "class_name": class_name,
                    "product_category": product_category,
                    "classification_source": classification_source,
                    "class_mapped": class_mapped,
                    "classification_confidence": (classifier_conf * 100) if classifier_conf > 0 else None,
                    "detection_confidence": conf * 100,
                })
        
        # Deduplicate overlapping detections (NMS filtering)
        filtered_defects = filter_duplicate_detections(raw_defects)

        # 4. Deterministic categorization, severity, risk, and quality decision.
        final_defects = []
        highest_severity = 0.0
        overall_level = "LOW"
        
        for d in filtered_defects:
            assessment = assess_defect(d, image_dims)
            d.update(assessment)
            
            if d["severity_score"] > highest_severity:
                highest_severity = d["severity_score"]
                overall_level = d["severity_level"]
                
            final_defects.append(d)
            
        processing_time_ms = round((time.time() - start_time) * 1000, 2)
        
        overall_assessment = assess_inspection(final_defects, image_quality_status=quality["quality_status"])
        if self.model is None:
            overall_assessment.update({
                "overall_result": "REVIEW",
                "quality_risk": "Model Unavailable",
                "recommended_action": "Automated model prediction is unavailable. Manual inspection review required.",
                "manual_review_required": True,
            })
        elif quality["quality_status"] == "POOR":
            overall_assessment.update({
                "overall_result": "REVIEW",
                "quality_risk": "Image Quality Risk",
                "recommended_action": "Poor image quality detected. Capture a clearer image before releasing the product.",
                "manual_review_required": True,
            })

        message = self.model_error
        if self.model is not None and final_defects:
            unmapped = [d for d in final_defects if not d.get("class_mapped")]
            info = self.class_resolution_info
            if unmapped and info.get("mapping_available") and info.get("mapping_class_count", 0) > info.get("model_class_count", 0):
                sample = ", ".join(sorted({d["class_name"] for d in unmapped}))
                note = (
                    f"Loaded model exposes {info.get('model_class_count')} class(es) ({sample}); "
                    f"the dataset mapping defines {info.get('mapping_class_count')} defect classes. "
                    "Detections are reported with the model's own class name until a "
                    "multi-class model is deployed."
                )
                message = f"{message} {note}" if message else note

        return {
            "status": "defective" if len(final_defects) > 0 else "normal",
            "defects": final_defects,
            "processing_time_ms": processing_time_ms,
            "model_mode": self.model_mode,
            "model_status": self.model_status,
            "model_message": message,
            "model_version": os.path.basename(self.model_path) if (self.model is not None and self.model_path) else None,
            "class_resolution": self.class_resolution_info,
            "image_info": image_info,
            "image_quality": quality,
            "processed_image_path": processed_image_path,
            "overall_severity": highest_severity,
            "overall_level": overall_level,
            "overall_decision": overall_assessment["overall_result"],
            "quality_assessment": overall_assessment,
        }


default_model_path = resolve_model_path(os.getenv("MODEL_PATH"))
pipeline = InferencePipeline(model_path=default_model_path)
