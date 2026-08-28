import os
import shutil
from pathlib import Path
from typing import Dict, List, Tuple

import cv2


def ensure_dir(path: str) -> str:
    os.makedirs(path, exist_ok=True)
    return path


def normalize_bbox(x1: float, y1: float, x2: float, y2: float, width: int, height: int) -> Tuple[float, float, float, float]:
    x_center = ((x1 + x2) / 2.0) / width
    y_center = ((y1 + y2) / 2.0) / height
    w = (x2 - x1) / width
    h = (y2 - y1) / height
    return x_center, y_center, w, h


def build_yolo_label_lines(
    detections: List[Dict],
    class_names: Dict[int, str],
    image_shape: Tuple[int, int],
) -> List[str]:
    height, width = image_shape
    lines: List[str] = []

    for det in detections:
        if "bbox" not in det or "class" not in det:
            continue

        x1, y1, x2, y2 = det["bbox"]
        class_name = det["class"]
        matched_ids = [k for k, v in class_names.items() if v == class_name]

        if not matched_ids:
            continue

        class_id = matched_ids[0]
        x_center, y_center, w, h = normalize_bbox(x1, y1, x2, y2, width, height)
        lines.append(f"{class_id} {x_center:.6f} {y_center:.6f} {w:.6f} {h:.6f}")

    return lines


def write_yolo_label_file(label_path: str, lines: List[str]) -> None:
    ensure_dir(os.path.dirname(label_path))
    with open(label_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))


def save_uploaded_image_to_dataset(
    image_src_path: str,
    dataset_dir: str,
    split: str,
    yolo_lines: List[str],
) -> Tuple[str, str]:
    image_dir = os.path.join(dataset_dir, "images", split)
    label_dir = os.path.join(dataset_dir, "labels", split)
    ensure_dir(image_dir)
    ensure_dir(label_dir)

    image_filename = os.path.basename(image_src_path)
    dataset_image_path = os.path.join(image_dir, image_filename)
    shutil.copy2(image_src_path, dataset_image_path)

    label_path = os.path.join(label_dir, os.path.splitext(image_filename)[0] + ".txt")
    write_yolo_label_file(label_path, yolo_lines)

    return dataset_image_path, label_path


def parse_label_line(line: str) -> Tuple[int, float, float, float, float]:
    parts = line.strip().split()
    if len(parts) != 5:
        raise ValueError("Label line must contain 5 values")
    class_id = int(parts[0])
    x_center, y_center, width, height = map(float, parts[1:])
    return class_id, x_center, y_center, width, height


def validate_label_file(label_path: str, class_names: Dict[int, str]) -> List[str]:
    errors: List[str] = []
    if not os.path.exists(label_path):
        return ["missing label file"]

    with open(label_path, "r", encoding="utf-8") as f:
        lines = [ln.strip() for ln in f.readlines() if ln.strip()]

    for idx, line in enumerate(lines, start=1):
        try:
            class_id, x_center, y_center, width, height = parse_label_line(line)
        except Exception as exc:
            errors.append(f"line {idx}: {exc}")
            continue

        if class_id not in class_names:
            errors.append(f"line {idx}: invalid class_id {class_id}")
        for name, value in [("x_center", x_center), ("y_center", y_center), ("width", width), ("height", height)]:
            if not 0.0 <= value <= 1.0:
                errors.append(f"line {idx}: {name} value {value} out of range [0.0,1.0]")

        if width <= 0 or height <= 0:
            errors.append(f"line {idx}: width and height must be positive")

    return errors


def validate_dataset_labels(dataset_dir: str) -> Dict[str, List[str]]:
    class_names = {
        0: "Surface Scratch",
        1: "Cracked Solder Joint",
        2: "Missing Component",
        3: "Misalignment",
        4: "Cracked Screen",
    }
    issues = {
        "missing_label_files": [],
        "orphan_label_files": [],
        "malformed_label_files": {},
    }

    for split in ["train", "val"]:
        image_dir = os.path.join(dataset_dir, "images", split)
        label_dir = os.path.join(dataset_dir, "labels", split)

        if not os.path.isdir(image_dir):
            issues["missing_label_files"].append(f"missing image folder: {image_dir}")
            continue

        if not os.path.isdir(label_dir):
            issues["missing_label_files"].append(f"missing label folder: {label_dir}")
            continue

        image_files = {os.path.splitext(fn)[0] for fn in os.listdir(image_dir) if fn.lower().endswith((".jpg", ".jpeg", ".png", ".bmp", ".gif", ".tif", ".tiff", ".webp"))}
        label_files = {os.path.splitext(fn)[0] for fn in os.listdir(label_dir) if fn.lower().endswith(".txt")}

        for image_name in sorted(image_files):
            if image_name not in label_files:
                issues["missing_label_files"].append(f"{split}/{image_name}.txt")

        for label_name in sorted(label_files):
            if label_name not in image_files:
                issues["orphan_label_files"].append(f"{split}/{label_name}.txt")

        for label_name in sorted(label_files):
            label_path = os.path.join(label_dir, f"{label_name}.txt")
            errors = validate_label_file(label_path, class_names)
            if errors:
                issues["malformed_label_files"][f"{split}/{label_name}.txt"] = errors

    return issues
