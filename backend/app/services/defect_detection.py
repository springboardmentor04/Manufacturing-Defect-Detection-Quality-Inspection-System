"""
Defect Detection Module (Milestone 2, Week 3 & 4).

"Training" a defect detection model here means building a per-category
statistical reference profile (pixel-wise mean + standard deviation)
from known-good MVTec AD images. This is a lightweight, explainable
anomaly-detection baseline (the same family of approach as MVTec's own
published baselines) that runs anywhere without GPUs or deep-learning
frameworks:

    build_reference(category)   -> "trains" the model for a category
    predict_defect(path, name)  -> runs inference against that model

If no reference profile exists yet for a product's category (nothing
trained, or a category the dataset doesn't cover), predict_defect()
falls back to a single-image statistical heuristic so the pipeline
never breaks - it just reports lower confidence and recommends
building/expanding a reference profile.
"""
import os
import re
import uuid
from pathlib import Path
from typing import Optional

import cv2
import numpy as np

from app.config import settings
from app.services.image_processing import preprocess_image
from app.services.severity_assessment import calculate_severity

IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".bmp", ".tiff", ".webp"}


def _cache_paths(category: str):
    base = Path(settings.MODEL_CACHE_DIR)
    base.mkdir(parents=True, exist_ok=True)
    return base / f"{category}_mean.npy", base / f"{category}_std.npy"


def get_category_key(product_name: str) -> str:
    """
    Derive a reference-model category key from a product name.
    MVTec-loaded items are named "MVTec - <category>"; manual uploads
    fall back to a slugified first word (or "generic" if nothing matches
    a trained category).
    """
    match = re.match(r"^\s*MVTec\s*-\s*(.+)$", product_name or "", re.IGNORECASE)
    if match:
        return match.group(1).strip().lower().replace(" ", "_")

    slug = re.sub(r"[^a-z0-9]+", "_", (product_name or "").strip().lower()).strip("_")
    mean_path, _ = _cache_paths(slug)
    if slug and mean_path.exists():
        return slug
    return "generic"


def has_reference(category: str) -> bool:
    mean_path, std_path = _cache_paths(category)
    return mean_path.exists() and std_path.exists()


def build_reference(category: str, dataset_root: Optional[Path] = None, limit: Optional[int] = None) -> int:
    """
    Build (or rebuild) the statistical reference profile for a category
    from its "good" training/test images in the MVTec AD dataset. Returns
    the number of images used to build the profile.
    """
    dataset_root = dataset_root or Path(settings.MVTEC_DATASET_PATH)
    limit = limit or settings.REFERENCE_SAMPLE_LIMIT
    size = settings.REFERENCE_IMAGE_SIZE

    category_path = dataset_root / category
    good_images = []
    for split in ["train", "test"]:
        good_dir = category_path / split / "good"
        if good_dir.exists():
            good_images.extend(sorted(good_dir.iterdir()))
        if len(good_images) >= limit:
            break

    good_images = [p for p in good_images if p.suffix.lower() in IMAGE_EXTENSIONS][:limit]
    if not good_images:
        raise ValueError(f"No 'good' reference images found for category '{category}' under {category_path}")

    stack = []
    for img_path in good_images:
        try:
            img = preprocess_image(str(img_path), size=size)
            stack.append(img)
        except Exception:
            continue

    if not stack:
        raise ValueError(f"Could not read any reference images for category '{category}'")

    stack = np.stack(stack, axis=0)
    mean_img = stack.mean(axis=0)
    std_img = stack.std(axis=0)
    std_img = np.clip(std_img, 0.02, None)  # avoid div-by-zero on flat backgrounds

    mean_path, std_path = _cache_paths(category)
    np.save(mean_path, mean_img)
    np.save(std_path, std_img)
    return len(stack)


def _load_reference(category: str):
    mean_path, std_path = _cache_paths(category)
    return np.load(mean_path), np.load(std_path)


def _extract_regions(mask: np.ndarray, max_boxes: int = 5):
    """
    Find connected anomaly regions in the mask. Returns unscaled region
    dicts (still in analysis-resolution pixel space) that carry both the
    axis-aligned bounding box AND the true contour area, since a diagonal
    scratch has a bounding box far bigger than its actual pixel area while
    a round blob's bbox is almost entirely filled - that ratio ("extent")
    is what lets classification work regardless of defect orientation.
    """
    mask_u8 = (mask.astype(np.uint8)) * 255
    mask_u8 = cv2.morphologyEx(mask_u8, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))
    contours, _ = cv2.findContours(mask_u8, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    regions = []
    for c in sorted(contours, key=cv2.contourArea, reverse=True)[:max_boxes]:
        x, y, w, h = cv2.boundingRect(c)
        if w * h < 9:
            continue
        regions.append({"x": x, "y": y, "w": w, "h": h, "contour_area": float(cv2.contourArea(c))})
    return regions


def _scale_regions(regions: list, scale_x: float, scale_y: float):
    """Convert unscaled regions into the public bounding_boxes format (x/y/w/h only)."""
    return [
        {
            "x": int(r["x"] * scale_x),
            "y": int(r["y"] * scale_y),
            "w": max(1, int(r["w"] * scale_x)),
            "h": max(1, int(r["h"] * scale_y)),
        }
        for r in regions
    ]


def _classify_defect_type(mask_area: int, regions: list) -> Optional[str]:
    """
    Rule-based defect typing from the anomaly regions found in the mask.

    This is intentionally NOT a learned classifier - it's a transparent,
    explainable heuristic, consistent with the statistical (non-deep-
    learning) approach used for detection itself. Only called when
    status == "fail" (i.e. regions is non-empty).

        many small scattered regions        -> "pitting"
        thin region (low bbox fill)         -> "scratch"  (works for
                                                diagonal lines too, since
                                                extent - not aspect ratio -
                                                drives this)
        large, mostly-filled region         -> "contamination"
        elongated and reasonably filled     -> "crack"
        anything else                       -> "deformation"
    """
    if not regions:
        return None

    if len(regions) >= 4:
        return "pitting"

    largest = max(regions, key=lambda r: r["w"] * r["h"])
    w, h = largest["w"], largest["h"]
    bbox_area = max(1, w * h)
    long_side, short_side = max(w, h), max(1, min(w, h))
    aspect_ratio = long_side / short_side
    # extent: how much of its OWN bounding box the region actually fills.
    # A thin line - however long, however it's oriented - fills very
    # little of its bbox (a diagonal scratch's bbox is nearly the whole
    # image, but the line itself is a tiny fraction of that box), so this
    # is a much more reliable "thinness" signal than aspect ratio alone.
    extent = largest["contour_area"] / bbox_area
    # coverage: how much of the WHOLE image the actual defect pixels take
    # up - used to size "contamination" rather than bbox size, since bbox
    # size is misleading for diagonal/elongated shapes.
    coverage_ratio = largest["contour_area"] / mask_area

    if extent <= 0.35:
        return "scratch"
    if coverage_ratio >= 0.03 and extent >= 0.5:
        return "contamination"
    if aspect_ratio >= 1.8:
        return "crack"
    return "deformation"


def _save_heatmap(original_path: str, mask: np.ndarray) -> str:
    original = cv2.imread(original_path, cv2.IMREAD_COLOR)
    h, w = original.shape[:2]
    mask_resized = cv2.resize((mask.astype(np.uint8) * 255), (w, h), interpolation=cv2.INTER_NEAREST)
    heat = cv2.applyColorMap(mask_resized, cv2.COLORMAP_JET)
    overlay = cv2.addWeighted(original, 0.65, heat, 0.35, 0)

    unique_filename = f"heatmap_{uuid.uuid4().hex}.png"
    out_path = os.path.join(settings.UPLOAD_DIR, unique_filename)
    cv2.imwrite(out_path, overlay)
    return unique_filename


def predict_defect(image_path: str, product_name: str) -> dict:
    """
    Run the trained anomaly-detection model (if a reference profile
    exists for this product's category) or a single-image fallback
    heuristic, and return a prediction result ready to store on the
    inspection record.
    """
    size = settings.REFERENCE_IMAGE_SIZE
    category = get_category_key(product_name)
    test_img = preprocess_image(image_path, size=size)

    original = cv2.imread(image_path, cv2.IMREAD_COLOR)
    orig_h, orig_w = original.shape[:2]
    scale_x, scale_y = orig_w / size, orig_h / size

    if has_reference(category):
        mean_img, std_img = _load_reference(category)
        z_scores = np.abs(test_img - mean_img) / std_img
        mask = z_scores > settings.ANOMALY_Z_THRESHOLD
        anomaly_ratio = float(mask.mean())
        peak_z = float(z_scores.max())
        confidence = float(min(1.0, max(0.5, 1 - (1.0 / (1.0 + peak_z / 4)))))
        model_used = f"reference_profile:{category}"
    else:
        # Fallback: no trained reference for this category yet - fall
        # back to a single-image local-contrast outlier heuristic so the
        # pipeline still returns a usable (lower-confidence) result.
        blurred = cv2.GaussianBlur(test_img, (9, 9), 0)
        local_dev = np.abs(test_img - blurred)
        threshold = local_dev.mean() + 2.5 * local_dev.std()
        mask = local_dev > max(threshold, 0.08)
        anomaly_ratio = float(mask.mean())
        confidence = 0.55
        model_used = "fallback_heuristic:no_reference"

    regions = _extract_regions(mask)
    boxes = _scale_regions(regions, scale_x, scale_y)
    status = "fail" if anomaly_ratio > settings.ANOMALY_FAIL_RATIO else "pass"
    heatmap_filename = _save_heatmap(image_path, mask) if boxes else None
    defect_type = _classify_defect_type(mask.size, regions) if status == "fail" else None

    severity_assessment = calculate_severity(
        status=status,
        anomaly_ratio=anomaly_ratio,
        bounding_boxes=boxes,
        defect_type=defect_type,
        confidence_score=confidence,
        image_width=orig_w,
        image_height=orig_h,
    )

    return {
        "status": status,
        "confidence_score": round(confidence, 3),
        "anomaly_ratio": round(anomaly_ratio, 5),
        "bounding_boxes": boxes,
        "heatmap_filename": heatmap_filename,
        "model_used": model_used,
        "defect_type": defect_type,
        "severity_score": severity_assessment["severity_score"],
        "severity_level": severity_assessment["severity_level"],
        "quality_recommendation": severity_assessment["quality_recommendation"],
        "severity_details": severity_assessment["severity_details"],
    }