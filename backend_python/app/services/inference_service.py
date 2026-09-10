import os
import cv2
import uuid
import math
import numpy as np
import torch
from pathlib import Path
from typing import Dict, Any, List

from app.config import UPLOAD_DIR
from app.services.model_loader import model_manager, DEVICE

IMAGENET_MEAN = torch.tensor([0.485, 0.456, 0.406]).view(1, 3, 1, 1).to(DEVICE)
IMAGENET_STD = torch.tensor([0.229, 0.224, 0.225]).view(1, 3, 1, 1).to(DEVICE)
IMG_SIZE = 224

# 48-Class Defect Severity Lookup Table from anamoly-detection-model-v2.ipynb
DEFECT_TYPE_SEVERITY = {
    'broken_large': 95, 'broken': 95, 'damaged_case': 95, 'missing_cable': 95, 'missing_wire': 95,
    'hole': 90, 'broken_small': 90, 'broken_teeth': 90, 'crack': 90, 'defective': 90,
    'cut': 85, 'cut_lead': 85, 'cut_inner_insulation': 85, 'cut_outer_insulation': 85,
    'metal_contamination': 85, 'cable_swap': 85, 'split_teeth': 85,
    'contamination': 80, 'liquid': 80, 'oil': 80, 'poke': 80, 'poke_insulation': 80,
    'deformed': 75, 'squeeze': 75, 'squeezed_teeth': 75, 'combined': 75,
    'bent': 70, 'bent_lead': 70, 'bent_wire': 70, 'misplaced': 70, 'manipulated_front': 70,
    'glue': 60, 'glue_strip': 60, 'flip': 60, 'pill_type': 60,
    'print': 50, 'faulty_imprint': 50, 'fold': 50, 'rough': 50,
    'scratch': 40, 'scratch_head': 40, 'scratch_neck': 40, 'gray_stroke': 40, 'fabric_interior': 40, 'fabric_border': 40,
    'color': 30, 'thread': 30, 'thread_side': 30, 'thread_top': 30
}

def get_adaptive_conf_threshold(defect_type: str) -> float:
    """
    Step 1: Size- & Type-Adaptive Confidence Thresholds.
    Delicate structural micro-defects use lower threshold (0.18) to avoid missing small flaws.
    Broad diffuse cosmetic textures use higher threshold (0.30) to prevent clean-texture false alarms.
    """
    dtype = defect_type.lower()
    if any(k in dtype for k in ['hole', 'crack', 'cut', 'scratch', 'poke', 'broken', 'split', 'bent', 'lead', 'wire', 'damage']):
        return 0.18
    elif any(k in dtype for k in ['contamination', 'fabric', 'thread', 'gray', 'color', 'rough', 'print', 'imprint', 'glue']):
        return 0.30
    return 0.22

def preprocess_image_pipeline(image_path: str):
    """
    Preprocesses inspection image according to Notebook Cell 4 pipeline:
    RGB conversion -> 224x224 resize -> GaussianBlur(3x3) -> LAB CLAHE -> ImageNet Norm.
    """
    img_bgr = cv2.imread(image_path)
    if img_bgr is None:
        raise ValueError(f"Could not load image file from {image_path}")

    orig_h, orig_w = img_bgr.shape[:2]
    img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
    resized_rgb = cv2.resize(img_rgb, (IMG_SIZE, IMG_SIZE))

    blurred = cv2.GaussianBlur(resized_rgb, (3, 3), 0)
    lab = cv2.cvtColor(blurred, cv2.COLOR_RGB2LAB)
    l_channel, a_channel, b_channel = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    l_enhanced = clahe.apply(l_channel)
    enhanced_lab = cv2.merge((l_enhanced, a_channel, b_channel))
    enhanced_rgb = cv2.cvtColor(enhanced_lab, cv2.COLOR_LAB2RGB)

    float_img = enhanced_rgb.astype(np.float32) / 255.0
    tensor_img = torch.tensor(float_img, dtype=torch.float32).permute(2, 0, 1).unsqueeze(0).to(DEVICE)
    norm_tensor = (tensor_img - IMAGENET_MEAN) / IMAGENET_STD

    return {
        "raw_bgr": img_bgr,
        "orig_rgb": img_rgb,
        "resized_rgb": resized_rgb,
        "tensor_img": tensor_img,
        "norm_tensor": norm_tensor,
        "orig_h": orig_h,
        "orig_w": orig_w
    }

def preprocess_yolo_image(img_rgb: np.ndarray) -> np.ndarray:
    """
    Bilateral filter + CLAHE preprocessing for YOLO input matching notebook Cell 5.
    """
    denoised = cv2.bilateralFilter(img_rgb, d=5, sigmaColor=50, sigmaSpace=50)
    lab = cv2.cvtColor(denoised, cv2.COLOR_RGB2LAB)
    l, a, b = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    cl = clahe.apply(l)
    return cv2.cvtColor(cv2.merge((cl, a, b)), cv2.COLOR_LAB2RGB)

def merge_overlapping_boxes(raw_defects: List[Dict[str, Any]], iou_thresh: float = 0.25, iomin_thresh: float = 0.55) -> List[Dict[str, Any]]:
    """
    Merges redundant boxes belonging to the same physical defect cluster.
    """
    if len(raw_defects) <= 1:
        return raw_defects

    sorted_defects = sorted(raw_defects, key=lambda d: d['confidence'], reverse=True)
    visited = [False] * len(sorted_defects)
    merged = []

    for i in range(len(sorted_defects)):
        if visited[i]:
            continue

        bx1, by1, bx2, by2 = sorted_defects[i]['bbox']
        area_b = max(1, (bx2 - bx1) * (by2 - by1))
        cluster = [sorted_defects[i]]
        visited[i] = True

        for j in range(i + 1, len(sorted_defects)):
            if visited[j]:
                continue

            cx1, cy1, cx2, cy2 = sorted_defects[j]['bbox']
            area_c = max(1, (cx2 - cx1) * (cy2 - cy1))

            ix1 = max(bx1, cx1)
            iy1 = max(by1, cy1)
            ix2 = min(bx2, cx2)
            iy2 = min(by2, cy2)

            if ix2 > ix1 and iy2 > iy1:
                inter_area = (ix2 - ix1) * (iy2 - iy1)
                union_area = area_b + area_c - inter_area
                iou = inter_area / (union_area + 1e-6)
                io_min = inter_area / (min(area_b, area_c) + 1e-6)

                if iou >= iou_thresh or io_min >= iomin_thresh:
                    cluster.append(sorted_defects[j])
                    visited[j] = True
                    bx1 = min(bx1, cx1)
                    by1 = min(by1, cy1)
                    bx2 = max(bx2, cx2)
                    by2 = max(by2, cy2)
                    area_b = max(1, (bx2 - bx1) * (by2 - by1))

        best = cluster[0]
        merged.append({
            'type': best['type'],
            'confidence': best['confidence'],
            'bbox': [int(bx1), int(by1), int(bx2), int(by2)]
        })

    return merged

def calculate_size_score(norm_w: float, norm_h: float, defect_type: str) -> float:
    area_ratio = norm_w * norm_h
    scaled_size = min(100.0, area_ratio * 400.0)
    dtype = defect_type.lower()
    if any(k in dtype for k in ['large', 'broken', 'damaged', 'missing', 'cut']):
        return max(60.0, scaled_size)
    elif any(k in dtype for k in ['hole', 'crack', 'contamination', 'liquid', 'oil', 'poke', 'split']):
        return max(45.0, scaled_size)
    else:
        return max(20.0, scaled_size)

def calculate_location_score(x_center: float, y_center: float) -> float:
    dist = math.sqrt((x_center - 0.5) ** 2 + (y_center - 0.5) ** 2)
    norm_dist = dist / 0.7071
    return max(20.0, min(100.0, 100.0 - (norm_dist * 80.0)))

def compute_severity_score(size_sc: float, loc_sc: float, type_sc: float, confidence: float) -> float:
    conf_score = confidence * 100.0
    return round((size_sc * 0.30) + (loc_sc * 0.25) + (type_sc * 0.25) + (conf_score * 0.20), 1)

def get_severity_level(score: float) -> str:
    if score >= 80:
        return "Critical"
    elif score >= 60:
        return "High"
    elif score >= 40:
        return "Medium"
    return "Low"

def format_defect_name(raw_name: str) -> str:
    return raw_name.replace("_", " ").title()

def run_inference_pipeline(file_path: str) -> Dict[str, Any]:
    """
    Executes live Dual-Model AI Pipeline with:
    1. Calibrated CNN ResNet-18 Defect Classification (0.55 threshold) & Grad-CAM Heatmap
    2. UNet Semantic Segmentation Mask with Noise-Floor Area Filtering
    3. YOLOv8 Multi-Defect Detection with Type-Adaptive Confidence & Consensus Gating ((CNN or UNet) and YOLO)
    """
    file_name = Path(file_path).name
    prep = preprocess_image_pipeline(file_path)
    norm_tensor = prep["norm_tensor"]
    raw_bgr = prep["raw_bgr"]
    orig_rgb = prep["orig_rgb"]
    orig_h = prep["orig_h"]
    orig_w = prep["orig_w"]

    # --- 1. ResNet-18 Defect Classification & Grad-CAM ---
    with torch.no_grad():
        outputs = model_manager.classifier(norm_tensor)
        probs = torch.softmax(outputs, dim=1)[0].cpu().numpy()

    cnn_defect_prob = float(probs[1])
    # Step 1 Calibration: CNN threshold calibrated to 0.55 to prevent clean grain noise
    cnn_is_flagged = cnn_defect_prob >= 0.55
    cnn_confidence = round((cnn_defect_prob if cnn_is_flagged else float(probs[0])) * 100, 1)

    # Grad-CAM Heatmap Generation (JET overlay)
    cam_heatmap, _ = model_manager.grad_cam.generate(norm_tensor, class_idx=1)
    cam_resized = cv2.resize(cam_heatmap, (orig_w, orig_h))
    cam_uint8 = np.uint8(255 * cam_resized)
    heatmap_colored = cv2.applyColorMap(cam_uint8, cv2.COLORMAP_JET)
    gradcam_overlay = cv2.addWeighted(raw_bgr, 0.35, heatmap_colored, 0.65, 0)
    gradcam_filename = f"gradcam_{uuid.uuid4().hex[:8]}.png"
    cv2.imwrite(str(UPLOAD_DIR / gradcam_filename), gradcam_overlay)

    # --- 2. UNet Segmentation Mask with Step 3 Noise-Floor Filter ---
    with torch.no_grad():
        seg_output = model_manager.segmenter(prep["tensor_img"])
        seg_mask = seg_output.squeeze().cpu().numpy()

    raw_binary_mask = (seg_mask > 0.45).astype(np.uint8)
    raw_pixel_count = int(raw_binary_mask.sum())

    # Step 3 Calibration: Noise-Floor Filter (ignore < 12 pixels of isolated sensor noise)
    if raw_pixel_count >= 12:
        binary_mask = raw_binary_mask
        defect_pixel_count = raw_pixel_count
        unet_has_anomaly = True
    else:
        binary_mask = np.zeros_like(raw_binary_mask)
        defect_pixel_count = 0
        unet_has_anomaly = False

    defect_area_pct = round((defect_pixel_count / (IMG_SIZE * IMG_SIZE)) * 100, 1)

    # Vivid red defect mask overlay
    seg_mask_resized = cv2.resize(binary_mask * 255, (orig_w, orig_h), interpolation=cv2.INTER_NEAREST)
    seg_overlay = raw_bgr.copy()
    seg_overlay[seg_mask_resized > 128] = [30, 30, 220]
    seg_blended = cv2.addWeighted(raw_bgr, 0.45, seg_overlay, 0.55, 0)
    seg_filename = f"seg_{uuid.uuid4().hex[:8]}.png"
    cv2.imwrite(str(UPLOAD_DIR / seg_filename), seg_blended)

    # --- 3. YOLOv8 Detection with Step 1 Adaptive Confidence & Step 2 Consensus Gating ---
    yolo_defects = []
    yolo_annotated_bgr = raw_bgr.copy()

    if model_manager.yolo_model is not None:
        yolo_prep_rgb = preprocess_yolo_image(orig_rgb)
        try:
            results = model_manager.yolo_model.predict(
                yolo_prep_rgb,
                conf=0.15,
                iou=0.35,
                agnostic_nms=True,
                verbose=False
            )[0]

            raw_candidates = []
            for box in results.boxes:
                x1, y1, x2, y2 = box.xyxy[0].cpu().numpy().astype(int)
                conf = float(box.conf[0].cpu().numpy())
                cls_id = int(box.cls[0].cpu().numpy())
                cls_name = model_manager.yolo_model.names.get(cls_id, f"defect_{cls_id}")

                # Step 1: Type-adaptive threshold check
                adaptive_thresh = get_adaptive_conf_threshold(cls_name)
                
                # Step 3: Noise floor box size check (must be at least 8x8 pixels)
                box_w = x2 - x1
                box_h = y2 - y1
                is_above_noise_floor = (box_w >= 8 and box_h >= 8)

                if conf >= adaptive_thresh and is_above_noise_floor:
                    raw_candidates.append({
                        'type': cls_name,
                        'confidence': conf,
                        'bbox': [int(x1), int(y1), int(x2), int(y2)]
                    })

            filtered_boxes = merge_overlapping_boxes(raw_candidates, iou_thresh=0.25, iomin_thresh=0.55)

            # Step 2: Consensus Gating ((CNN or Segmentation) AND YOLO)
            for d in filtered_boxes:
                x1, y1, x2, y2 = d['bbox']
                conf = d['confidence']
                dtype = d['type']

                # Consensus confirmation rules:
                # - Fast-track auto-confirm if YOLO confidence is high (>= 0.50)
                # - OR Confirmed if either CNN defect probability >= 0.45 OR UNet segmentation found anomaly pixels (>= 12)
                is_confirmed_by_consensus = (
                    conf >= 0.50 or
                    cnn_defect_prob >= 0.45 or
                    unet_has_anomaly
                )

                if not is_confirmed_by_consensus:
                    # Filtered out as clean texture noise
                    continue

                norm_w = max(0.01, (x2 - x1) / orig_w)
                norm_h = max(0.01, (y2 - y1) / orig_h)
                norm_xc = (x1 + x2) / (2.0 * orig_w)
                norm_yc = (y1 + y2) / (2.0 * orig_h)

                size_sc = calculate_size_score(norm_w, norm_h, dtype)
                loc_sc = calculate_location_score(norm_xc, norm_yc)
                type_sc = DEFECT_TYPE_SEVERITY.get(dtype.lower(), 65)
                sev_score = compute_severity_score(size_sc, loc_sc, type_sc, conf)
                sev_lvl = get_severity_level(sev_score)

                pct_bbox = {
                    "left": f"{round((x1 / orig_w) * 100, 1)}%",
                    "top": f"{round((y1 / orig_h) * 100, 1)}%",
                    "width": f"{round(((x2 - x1) / orig_w) * 100, 1)}%",
                    "height": f"{round(((y2 - y1) / orig_h) * 100, 1)}%"
                }

                yolo_defects.append({
                    "type": format_defect_name(dtype),
                    "raw_type": dtype,
                    "confidence": round(conf, 4),
                    "bbox": pct_bbox,
                    "pixel_bbox": [x1, y1, x2, y2],
                    "size_score": round(size_sc, 1),
                    "location_score": round(loc_sc, 1),
                    "type_score": round(type_sc, 1),
                    "severity_score": sev_score,
                    "severity_level": sev_lvl
                })

                # Draw bounding box & badge on annotated image
                cv2.rectangle(yolo_annotated_bgr, (x1, y1), (x2, y2), (30, 50, 220), 3)
                label_text = format_defect_name(dtype)
                font_scale = max(0.5, orig_w / 600.0)
                thickness = max(1, int(orig_w / 400.0))
                (tw, th), _ = cv2.getTextSize(label_text, cv2.FONT_HERSHEY_SIMPLEX, font_scale, thickness)

                banner_y1 = max(0, y1 - th - 8)
                banner_y2 = y1
                banner_x1 = max(0, x1)
                banner_x2 = min(orig_w, x1 + tw + 10)

                cv2.rectangle(yolo_annotated_bgr, (banner_x1, banner_y1), (banner_x2, banner_y2), (30, 50, 220), -1)
                cv2.putText(yolo_annotated_bgr, label_text, (banner_x1 + 4, banner_y2 - 4),
                            cv2.FONT_HERSHEY_SIMPLEX, font_scale, (255, 255, 255), thickness, cv2.LINE_AA)

        except Exception as e:
            print(f"[Inference Pipeline] YOLO detection warning: {e}")

    # Fallback bounding box if YOLO is quiet but strong CNN + UNet anomaly is present
    primary_bbox = None
    if yolo_defects:
        primary_bbox = yolo_defects[0]["bbox"]
    elif cnn_is_flagged and unet_has_anomaly:
        contours, _ = cv2.findContours(binary_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if contours:
            c = max(contours, key=cv2.contourArea)
            x, y, w, h = cv2.boundingRect(c)
            primary_bbox = {
                "left": f"{round((x / IMG_SIZE) * 100, 1)}%",
                "top": f"{round((y / IMG_SIZE) * 100, 1)}%",
                "width": f"{round((w / IMG_SIZE) * 100, 1)}%",
                "height": f"{round((h / IMG_SIZE) * 100, 1)}%"
            }
        else:
            primary_bbox = {"left": "35%", "top": "30%", "width": "30%", "height": "30%"}

    bbox_filename = f"bbox_{uuid.uuid4().hex[:8]}.png"
    cv2.imwrite(str(UPLOAD_DIR / bbox_filename), yolo_annotated_bgr)

    # --- 4. Quality Decision & Severity Synthesis ---
    is_defective = len(yolo_defects) > 0 or (cnn_is_flagged and unet_has_anomaly)

    if yolo_defects:
        top_defect = max(yolo_defects, key=lambda d: d["severity_score"])
        base_sev = top_defect["severity_score"]
        compounded_sev = min(100.0, base_sev + (len(yolo_defects) - 1) * 7.0) if len(yolo_defects) > 1 else base_sev
        final_level = get_severity_level(compounded_sev)
        defect_type = top_defect["type"]
        confidence = round(max(top_defect["confidence"] * 100.0, cnn_confidence), 1)
        severity_score = round(compounded_sev, 1)

        if len(yolo_defects) >= 2 and final_level in ["Low", "Medium"]:
            final_level = "High"
            decision = "Hold for review"
        elif final_level == "Critical":
            decision = "Hold for review"
        elif final_level == "High":
            decision = "Hold for review"
        elif final_level == "Medium":
            decision = "Review queued"
        else:
            decision = "Pass"

    elif cnn_is_flagged and unet_has_anomaly:
        defect_type = "Surface defect"
        confidence = cnn_confidence
        if defect_area_pct >= 8.0 or confidence >= 85.0:
            final_level = "High"
            severity_score = round(confidence * 0.9, 1)
            decision = "Hold for review"
        else:
            final_level = "Medium"
            severity_score = round(confidence * 0.6, 1)
            decision = "Review queued"
    else:
        # CLEAN PASS
        defect_type = "Not defective"
        final_level = "Low"
        severity_score = round(cnn_confidence * 0.05, 1)
        confidence = cnn_confidence
        decision = "Pass"

    area_str = f"{max(defect_area_pct, 1.2)}%" if is_defective else "0.0%"

    return {
        "defectType": defect_type,
        "severity": final_level,
        "severityScore": severity_score,
        "confidence": confidence,
        "defectArea": area_str,
        "decision": decision,
        "boundingBox": primary_bbox,
        "isFlagged": is_defective,
        "mode": "Detection + segmentation" if final_level in ["High", "Critical"] else "Detection",
        "gradcamUrl": f"/static/uploads/{gradcam_filename}",
        "segmentationUrl": f"/static/uploads/{seg_filename}",
        "bboxUrl": f"/static/uploads/{bbox_filename}",
        "defects": yolo_defects if yolo_defects else [
            {
                "type": defect_type,
                "confidence": round(confidence / 100.0, 4) if confidence > 1.0 else confidence,
                "bbox": primary_bbox,
                "size_score": round(defect_area_pct * 3.5, 1) if defect_area_pct else 0.0,
                "location_score": 73.5 if is_defective else 0.0,
                "type_score": 90.0 if is_defective else 0.0,
                "severity_score": severity_score,
                "severity_level": final_level
            }
        ]
    }
