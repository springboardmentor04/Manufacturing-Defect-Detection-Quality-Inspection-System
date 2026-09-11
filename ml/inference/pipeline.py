import time
import os
import gc
from contextlib import nullcontext

os.environ["OMP_NUM_THREADS"] = "1"
os.environ["OPENBLAS_NUM_THREADS"] = "1"
os.environ["MKL_NUM_THREADS"] = "1"
os.environ["VECLIB_MAXIMUM_THREADS"] = "1"
os.environ["NUMEXPR_NUM_THREADS"] = "1"
os.environ["YOLO_VERBOSE"] = "False"
os.environ["ULTRALYTICS_AUTOINSTALL"] = "0"
os.environ["YOLO_OFFLINE"] = "True"

import cv2
import numpy as np
from ml.quality.assessment_engine import assess_defect, assess_inspection, category_label
from ml.inference.image_processing import analyse_image_quality, preprocess_image, validate_image
from ml.inference.class_resolution import describe_model_classes, resolve_detection_class, resolve_class_name

try:
    import torch
    torch.set_num_threads(1)
    if hasattr(torch, "set_num_interop_threads"):
        try:
            torch.set_num_interop_threads(1)
        except Exception:
            pass
    try:
        torch.set_grad_enabled(False)
    except Exception:
        pass
    
    # Allowlist Ultralytics classes for PyTorch 2.6+ weights_only security model
    try:
        import ultralytics.nn.tasks
        if hasattr(torch.serialization, "add_safe_globals"):
            torch.serialization.add_safe_globals([
                ultralytics.nn.tasks.DetectionModel,
                ultralytics.nn.tasks.ClassificationModel,
                ultralytics.nn.tasks.SegmentationModel,
                ultralytics.nn.tasks.PoseModel,
            ])
    except Exception:
        pass

    # Ensure torch.load supports PyTorch 2.6 default changes
    _orig_torch_load = torch.load
    def _safe_torch_load(*args, **kwargs):
        if "weights_only" not in kwargs:
            kwargs["weights_only"] = False
        return _orig_torch_load(*args, **kwargs)
    torch.load = _safe_torch_load
except Exception:
    torch = None


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
        os.path.join(project_root, "ml", "models", "defect_classifier_v2", "weights", "weights", "best.pt"),
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
        enable_classifier = os.getenv("ENABLE_CLASSIFIER_MODEL", "true").lower() in ("1", "true", "yes")
        if enable_classifier:
            self.classifier_path = resolve_classifier_path(classifier_path)
        else:
            self.classifier_path = None

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
        infer_ctx = torch.inference_mode() if torch is not None else nullcontext()
        boxes = []
        
        orig_img = cv2.imread(image_path) if os.path.isfile(image_path) else None
        h, w = (image_dims[1], image_dims[0]) if orig_img is None else orig_img.shape[:2]
        gray = cv2.cvtColor(orig_img, cv2.COLOR_BGR2GRAY) if orig_img is not None else None
        obj_mask = ((gray > 20).astype(np.uint8) * 255) if gray is not None else None
        
        clean_product = None
        if product_name:
            raw_p = product_name.strip().lower()
            for cat in [
                "bottle", "cable", "capsule", "carpet", "grid", "hazelnut",
                "leather", "metal_nut", "pill", "screw", "tile", "toothbrush",
                "transistor", "wood", "zipper"
            ]:
                if cat in raw_p.replace(" ", "_").replace("-", "_") or cat.replace("_", "") in raw_p.replace(" ", "").replace("-", ""):
                    clean_product = cat
                    break
            if not clean_product:
                clean_product = raw_p

        if self.model is not None:
            try:
                det_conf = min(self.confidence_threshold, 0.20)
                all_raw_boxes = []
                with infer_ctx:
                    res_640 = None
                    try:
                        res_640 = self.model(image_path, conf=det_conf, imgsz=640, verbose=False)[0]
                    except TypeError:
                        try:
                            res_640 = self.model(image_path, conf=det_conf, verbose=False)[0]
                        except Exception:
                            res_640 = None
                    except Exception:
                        res_640 = None

                    if res_640 is not None and getattr(res_640, "boxes", None) is not None:
                        for b in res_640.boxes:
                            all_raw_boxes.append((b.xyxy[0].tolist(), float(b.conf[0]), int(b.cls[0])))

                    try:
                        res_1024 = self.model(image_path, conf=det_conf, imgsz=1024, verbose=False)[0]
                        if res_1024 is not None and getattr(res_1024, "boxes", None) is not None:
                            for b in res_1024.boxes:
                                all_raw_boxes.append((b.xyxy[0].tolist(), float(b.conf[0]), int(b.cls[0])))
                    except Exception:
                        pass

                # Deduplicate overlapping detections across scales (NMS)
                def box_iou_local(b1, b2):
                    x1 = max(b1[0], b2[0])
                    y1 = max(b1[1], b2[1])
                    x2 = min(b1[2], b2[2])
                    y2 = min(b1[3], b2[3])
                    inter = max(0.0, x2 - x1) * max(0.0, y2 - y1)
                    a1 = (b1[2] - b1[0]) * (b1[3] - b1[1])
                    a2 = (b2[2] - b2[0]) * (b2[3] - b2[1])
                    union = a1 + a2 - inter
                    return inter / union if union > 0 else 0.0

                kept_boxes = []
                for b_item in sorted(all_raw_boxes, key=lambda x: x[1], reverse=True):
                    if not any(box_iou_local(b_item[0], k[0]) > 0.5 for k in kept_boxes):
                        kept_boxes.append(b_item)

            except Exception as model_err:
                print(f"[InferencePipeline] Warning during model inference: {model_err}")
                self.model_error = f"Model inference warning: {model_err}"
                kept_boxes = []

            cand_indices = [
                idx for idx, name in self.classifier_model.names.items()
                if name.startswith(f"{clean_product}_")
            ] if (self.classifier_model is not None and clean_product) else []

            for box_coords, conf, cls_idx in kept_boxes:
                x1, y1, x2, y2 = box_coords
                area = (x2 - x1) * (y2 - y1)
                bx1, by1, bx2, by2 = int(x1), int(y1), int(x2), int(y2)
                bw = bx2 - bx1
                bh = by2 - by1

                # Resolve initial detected class id through class mapping
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
                classifier_cond_conf = 0.0

                if self.classifier_model is not None and orig_img is not None:
                    # Build candidate crops for precise defect classification
                    margin = 0.05
                    cx1 = int(max(0, bx1 - bw * margin))
                    cy1 = int(max(0, by1 - bh * margin))
                    cx2 = int(min(w, bx2 + bw * margin))
                    cy2 = int(min(h, by2 + bh * margin))
                    
                    crops = [('base', orig_img[cy1:cy2, cx1:cx2])]
                    
                    # Localized subcrops for large bounding boxes (e.g. capsule surface defects)
                    if bw > 250 or bh > 250:
                        if clean_product == 'capsule' or (clean_product and clean_product in ("capsule", "wood", "leather", "carpet", "tile", "pill")):
                            for sub_w, sub_h in [(260, 110), (300, 140)]:
                                step_x, step_y = 40, 35
                                for gy in range(by1, max(by1 + 1, by2 - sub_h + 1), step_y):
                                    for gx in range(bx1, max(bx1 + 1, bx2 - sub_w + 1), step_x):
                                        gx2 = min(w, gx + sub_w)
                                        gy2 = min(h, gy + sub_h)
                                        if obj_mask is not None:
                                            mask_roi = obj_mask[gy:gy2, gx:gx2]
                                            if mask_roi.size > 0 and (np.count_nonzero(mask_roi) / mask_roi.size) >= 0.85:
                                                crops.append(('sub_surface', orig_img[gy:gy2, gx:gx2]))
                                        else:
                                            crops.append(('sub_surface', orig_img[gy:gy2, gx:gx2]))

                    # Connector head subcrop for structured assemblies like cable
                    if clean_product == 'cable' and bh > 300:
                        ch_y2 = by1 + int(bh * 0.75)
                        crops.append(('connector_head', orig_img[by1:ch_y2, bx1:bx2]))

                    best_class = None
                    best_raw_conf = 0.0
                    best_cond_conf = 0.0

                    for ctype, crop in crops:
                        if crop.shape[0] < 16 or crop.shape[1] < 16:
                            continue
                        with infer_ctx:
                            cls_results = self.classifier_model(crop, verbose=False)[0]
                        probs_data = cls_results.probs.data.cpu().numpy()

                        if cand_indices:
                            cand_probs = {self.classifier_model.names[i]: float(probs_data[i]) for i in cand_indices}
                            total_cand = sum(cand_probs.values())
                            norm_probs = {k: v / total_cand for k, v in cand_probs.items()} if total_cand > 0 else {}
                            top_cls = max(cand_probs, key=cand_probs.get)
                            raw_c = cand_probs[top_cls]
                            cond_c = norm_probs.get(top_cls, 0.0)

                            if raw_c > best_raw_conf:
                                best_raw_conf = raw_c
                                best_cond_conf = cond_c
                                best_class = top_cls
                        else:
                            top1_idx = cls_results.probs.top1
                            top1_conf = float(cls_results.probs.top1conf)
                            if top1_conf > best_raw_conf:
                                best_raw_conf = top1_conf
                                best_cond_conf = top1_conf
                                best_class = cls_results.names[top1_idx]

                    if best_class:
                        resolved_cls = resolve_class_name(best_class)
                        if resolved_cls:
                            defect_type = resolved_cls["defect_type"]
                            class_name = resolved_cls["class_name"]
                            product_category = resolved_cls.get("category") or product_category
                            class_id = resolved_cls.get("class_id", class_id)
                            class_mapped = True
                        else:
                            defect_type = best_class
                            class_name = best_class
                            class_mapped = False

                        classification_source = "classifier"
                        classifier_conf = best_raw_conf
                        classifier_cond_conf = best_cond_conf

                display_category = category_label(defect_type, product_category)
                if classifier_cond_conf > 0 and (classifier_cond_conf * 100) < 30.0:
                    display_category = "Classification Uncertain"

                raw_defects.append({
                    "type": defect_type,
                    "defect_category": display_category,
                    "detector_class": "defect",
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

        gc.collect()
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
