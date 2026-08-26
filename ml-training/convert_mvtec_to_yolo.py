from pathlib import Path
import shutil
import cv2

SRC = Path(r"C:\datasets\mvtec_ad\metal_nut")
DST = Path(r"C:\YOLO_DATASET\metal_nut_mvtec")

# YOLO class
# 0 = defect
CLASS_ID = 0

IMG_EXTS = {".png", ".jpg", ".jpeg", ".bmp", ".webp"}


def convert_mask_to_yolo(mask_path, image_path, label_path):
    image = cv2.imread(str(image_path))
    mask = cv2.imread(str(mask_path), cv2.IMREAD_GRAYSCALE)

    if image is None:
        raise ValueError(f"Cannot read image: {image_path}")

    if mask is None:
        raise ValueError(f"Cannot read mask: {mask_path}")

    h, w = image.shape[:2]

    # Convert mask to binary
    _, binary = cv2.threshold(mask, 127, 255, cv2.THRESH_BINARY)

    # Find connected defect regions
    contours, _ = cv2.findContours(
        binary,
        cv2.RETR_EXTERNAL,
        cv2.CHAIN_APPROX_SIMPLE
    )

    labels = []

    for contour in contours:
        x, y, bw, bh = cv2.boundingRect(contour)

        if bw <= 0 or bh <= 0:
            continue

        # YOLO normalized center coordinates
        x_center = (x + bw / 2) / w
        y_center = (y + bh / 2) / h

        width = bw / w
        height = bh / h

        labels.append(
            f"{CLASS_ID} "
            f"{x_center:.6f} "
            f"{y_center:.6f} "
            f"{width:.6f} "
            f"{height:.6f}"
        )

    if not labels:
        raise ValueError(f"No defect found in mask: {mask_path}")

    label_path.write_text("\n".join(labels), encoding="utf-8")


def copy_good_images():
    """
    MVTec train/good images have no defects.

    We keep them as background/negative images.
    Their YOLO label files are empty.
    """

    train_src = SRC / "train" / "good"
    train_dst = DST / "images" / "train"
    label_dst = DST / "labels" / "train"

    for image_path in sorted(train_src.iterdir()):
        if image_path.suffix.lower() not in IMG_EXTS:
            continue

        shutil.copy2(image_path, train_dst / image_path.name)

        # Empty label = no defect
        (label_dst / f"{image_path.stem}.txt").write_text(
            "",
            encoding="utf-8"
        )


def copy_test_images_and_convert_masks():
    """
    Use MVTec test images for YOLO validation.

    good -> empty label
    defective -> mask converted to bounding boxes
    """

    test_src = SRC / "test"
    gt_src = SRC / "ground_truth"

    image_dst = DST / "images" / "val"
    label_dst = DST / "labels" / "val"

    defect_classes = ["bent", "color", "flip", "scratch"]

    # Good validation images
    good_dir = test_src / "good"

    for image_path in sorted(good_dir.iterdir()):
        if image_path.suffix.lower() not in IMG_EXTS:
            continue

        shutil.copy2(image_path, image_dst / image_path.name)

        # No defect
        (label_dst / f"{image_path.stem}.txt").write_text(
            "",
            encoding="utf-8"
        )

    # Defective validation images
    for defect_class in defect_classes:

        image_dir = test_src / defect_class
        mask_dir = gt_src / defect_class

        for image_path in sorted(image_dir.iterdir()):

            if image_path.suffix.lower() not in IMG_EXTS:
                continue

            # MVTec masks normally have _mask suffix
            mask_path = mask_dir / f"{image_path.stem}_mask.png"

            if not mask_path.exists():
                raise FileNotFoundError(
                    f"Missing mask for {image_path.name}: {mask_path}"
                )

            shutil.copy2(
                image_path,
                image_dst / image_path.name
            )

            label_path = label_dst / f"{image_path.stem}.txt"

            convert_mask_to_yolo(
                mask_path,
                image_path,
                label_path
            )


def verify_dataset():

    print("\n===== DATASET VERIFICATION =====")

    errors = []

    for split in ["train", "val"]:

        image_dir = DST / "images" / split
        label_dir = DST / "labels" / split

        images = [
            p for p in image_dir.iterdir()
            if p.suffix.lower() in IMG_EXTS
        ]

        labels = list(label_dir.glob("*.txt"))

        image_stems = {p.stem for p in images}
        label_stems = {p.stem for p in labels}

        missing_labels = image_stems - label_stems
        orphan_labels = label_stems - image_stems

        if missing_labels:
            for name in sorted(missing_labels):
                errors.append(
                    f"{split}: missing label for {name}"
                )

        if orphan_labels:
            for name in sorted(orphan_labels):
                errors.append(
                    f"{split}: label without image: {name}"
                )

        # Validate label contents
        for label_path in labels:

            lines = [
                line.strip()
                for line in label_path.read_text(
                    encoding="utf-8"
                ).splitlines()
                if line.strip()
            ]

            for line_no, line in enumerate(lines, start=1):

                parts = line.split()

                if len(parts) != 5:
                    errors.append(
                        f"{split}/{label_path.name}: "
                        f"invalid number of values on line {line_no}"
                    )
                    continue

                try:
                    cls = int(parts[0])
                    values = [float(x) for x in parts[1:]]
                except ValueError:
                    errors.append(
                        f"{split}/{label_path.name}: "
                        f"non-numeric label"
                    )
                    continue

                if cls != CLASS_ID:
                    errors.append(
                        f"{split}/{label_path.name}: "
                        f"unexpected class {cls}"
                    )

                for value in values:
                    if not 0.0 <= value <= 1.0:
                        errors.append(
                            f"{split}/{label_path.name}: "
                            f"value outside [0,1]: {value}"
                        )

        print(f"\n{split.upper()}")
        print(f"Images : {len(images)}")
        print(f"Labels : {len(labels)}")
        print(f"Missing labels : {len(missing_labels)}")
        print(f"Orphan labels  : {len(orphan_labels)}")

    print("\n===== RESULT =====")

    if errors:
        print(f"FAILED: {len(errors)} errors found")

        for error in errors[:50]:
            print("ERROR:", error)

        if len(errors) > 50:
            print(f"... and {len(errors) - 50} more")

        raise SystemExit(1)

    print("SUCCESS: Every image has a matching label.")
    print("SUCCESS: YOLO labels are valid.")
    print("SUCCESS: Dataset is ready for training.")


if __name__ == "__main__":

    print("Source:")
    print(SRC)

    print("\nDestination:")
    print(DST)

    if not SRC.exists():
        raise FileNotFoundError(
            f"MVTec dataset not found: {SRC}"
        )

    copy_good_images()
    copy_test_images_and_convert_masks()
    verify_dataset()