import argparse
import csv
import json
from pathlib import Path
from typing import Any, Dict, List

import cv2


def convert_bbox_to_yolo_line(
    class_id: int,
    x_min: float,
    y_min: float,
    x_max: float,
    y_max: float,
    image_width: int,
    image_height: int,
) -> str:
    x_center = ((x_min + x_max) / 2.0) / image_width
    y_center = ((y_min + y_max) / 2.0) / image_height
    width = (x_max - x_min) / image_width
    height = (y_max - y_min) / image_height
    return f"{class_id} {x_center:.6f} {y_center:.6f} {width:.6f} {height:.6f}"


def write_label_file(output_path: Path, yolo_line: str) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8") as f:
        f.write(yolo_line + "\n")


def parse_annotation_entry(entry: Dict[str, Any]) -> Dict[str, Any]:
    if "image" not in entry or "class_id" not in entry or "bbox" not in entry:
        raise ValueError("Each annotation entry must contain 'image', 'class_id', and 'bbox'.")

    bbox = entry["bbox"]
    if not isinstance(bbox, list) or len(bbox) != 4:
        raise ValueError("'bbox' must be a list of four values: [x_min, y_min, x_max, y_max].")

    return {
        "image": entry["image"],
        "class_id": int(entry["class_id"]),
        "bbox": [float(v) for v in bbox],
    }


def load_annotations(path: Path) -> List[Dict[str, Any]]:
    if not path.exists():
        raise FileNotFoundError(f"Annotations file not found: {path}")

    if path.suffix.lower() == ".json":
        with path.open("r", encoding="utf-8") as f:
            data = json.load(f)
        if not isinstance(data, list):
            raise ValueError("JSON annotation file must contain a list of annotation objects.")
        return [parse_annotation_entry(entry) for entry in data]

    if path.suffix.lower() == ".csv":
        with path.open("r", encoding="utf-8", newline="") as f:
            reader = csv.DictReader(f)
            annotations = []
            for row in reader:
                bbox = [float(row[field]) for field in ("x_min", "y_min", "x_max", "y_max")]
                annotations.append(
                    {
                        "image": row["image"],
                        "class_id": int(row["class_id"]),
                        "bbox": bbox,
                    }
                )
            return annotations

    raise ValueError("Unsupported annotation file format. Use JSON or CSV.")


def process_single_image(
    image_path: Path,
    class_id: int,
    bbox: List[float],
    output_path: Path | None,
) -> None:
    if not image_path.exists():
        raise FileNotFoundError(f"Image not found: {image_path}")

    image = cv2.imread(str(image_path))
    if image is None:
        raise ValueError(f"Failed to read image: {image_path}")

    height, width = image.shape[:2]
    x_min, y_min, x_max, y_max = bbox

    if x_min >= x_max or y_min >= y_max:
        raise ValueError("Bounding box coordinates must satisfy x_min < x_max and y_min < y_max.")

    yolo_line = convert_bbox_to_yolo_line(class_id, x_min, y_min, x_max, y_max, width, height)

    print(f"Image: {image_path}")
    print(yolo_line)

    if output_path:
        write_label_file(output_path, yolo_line)
        print(f"Saved YOLO label file: {output_path}")


def process_batch(
    annotations: List[Dict[str, Any]],
    output_dir: Path | None,
) -> None:
    summary = []
    for entry in annotations:
        image_path = Path(entry["image"])
        class_id = entry["class_id"]
        bbox = entry["bbox"]

        if output_dir:
            output_path = output_dir / image_path.with_suffix(".txt").name
        else:
            output_path = image_path.with_suffix(".txt")

        process_single_image(image_path, class_id, bbox, output_path)
        summary.append(str(output_path))

    print(f"\nSaved {len(summary)} YOLO label files.")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Generate YOLO label lines for an image or batch of images."
    )
    parser.add_argument("--image", help="Path to the input image file")
    parser.add_argument("--class-id", type=int, help="YOLO class id for this object")
    parser.add_argument(
        "--bbox",
        nargs=4,
        type=float,
        metavar=("X_MIN", "Y_MIN", "X_MAX", "Y_MAX"),
        help="Bounding box coordinates in pixel space",
    )
    parser.add_argument(
        "--output",
        default=None,
        help="Optional path to write the single image label file.",
    )
    parser.add_argument(
        "--annotations-file",
        default=None,
        help="Path to a JSON or CSV file containing batch annotations.",
    )
    parser.add_argument(
        "--output-dir",
        default=None,
        help="Folder to write batch label files when using --annotations-file.",
    )

    args = parser.parse_args()

    if args.annotations_file:
        annotations = load_annotations(Path(args.annotations_file))
        output_dir = Path(args.output_dir) if args.output_dir else None
        if output_dir:
            output_dir.mkdir(parents=True, exist_ok=True)
        process_batch(annotations, output_dir)
        return

    if not args.image or args.class_id is None or not args.bbox:
        raise ValueError("--image, --class-id, and --bbox are required for single-image mode.")

    image_path = Path(args.image)
    output_path = Path(args.output) if args.output else None
    process_single_image(image_path, args.class_id, args.bbox, output_path)


if __name__ == "__main__":
    main()
