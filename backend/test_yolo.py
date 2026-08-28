from pathlib import Path

from yolo_predict import detect_defects


# ============================================================
# TEST IMAGE
# ============================================================

IMAGE_PATH = (
    Path(__file__).resolve().parent.parent
    / "dataset"
    / "mvtec_ad"
    / "screw"
    / "test"
    / "scratch_head"
    / "000.png"
)


# ============================================================
# CHECK IMAGE
# ============================================================

print("=" * 60)
print("YOLOv8s DEFECT DETECTION TEST")
print("=" * 60)

print(f"\nImage: {IMAGE_PATH}")
print(f"Exists: {IMAGE_PATH.exists()}")

if not IMAGE_PATH.exists():

    print("\nERROR: Test image was not found.")

    print("\nExpected location:")
    print(IMAGE_PATH)

    raise SystemExit(1)


# ============================================================
# RUN YOLO
# ============================================================

print("\nRunning YOLOv8s detection...\n")

result = detect_defects(
    str(IMAGE_PATH),
    confidence_threshold=0.50
)


# ============================================================
# DISPLAY SUMMARY
# ============================================================

print("=" * 60)
print("YOLO DETECTION RESULT")
print("=" * 60)

print(
    f"\nNumber of defects detected : "
    f"{result['defects_detected']}"
)

print(
    f"Maximum confidence         : "
    f"{result['max_confidence']:.2f}%"
)


# ============================================================
# DISPLAY EACH DEFECT
# ============================================================

detections = result["detections"]

if not detections:

    print("\nNo defects detected.")

else:

    print("\nDetected Defects")
    print("-" * 60)

    for index, detection in enumerate(
        detections,
        start=1
    ):

        print(f"\nDefect {index}")

        print(
            f"Defect Type : "
            f"{detection['class_name']}"
        )

        print(
            f"Class ID    : "
            f"{detection['class_id']}"
        )

        print(
            f"Confidence  : "
            f"{detection['confidence']:.2f}%"
        )

        bbox = detection["bbox"]

        print(
            "Bounding Box:"
        )

        print(
            f"  X      : {bbox['x']}"
        )

        print(
            f"  Y      : {bbox['y']}"
        )

        print(
            f"  Width  : {bbox['width']}"
        )

        print(
            f"  Height : {bbox['height']}"
        )


# ============================================================
# ANNOTATED IMAGE
# ============================================================

print("\n" + "=" * 60)

print(
    "Annotated image saved at:"
)

print(
    result["result_image_path"]
)

print("=" * 60)

print("\nYOLO test completed successfully.")