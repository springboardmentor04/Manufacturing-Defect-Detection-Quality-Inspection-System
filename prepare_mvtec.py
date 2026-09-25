from pathlib import Path
import random
import shutil
import cv2

DATASET_ROOT = Path(
    r"C:\Users\harini\OneDrive\Desktop\VisionInspect-AI\mvtec_Defect_detection_dataset"
)

OUTPUT_ROOT = Path(
    r"C:\Users\harini\Downloads\VisionInspectAI_source\VisionInspectAI\dataset\yolo_mvtec"
)

VAL_RATIO = 0.20
SEED = 42

random.seed(SEED)

IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".bmp"}


def is_image(path):
    return path.suffix.lower() in IMAGE_EXTENSIONS


def clean_output():
    if OUTPUT_ROOT.exists():
        shutil.rmtree(OUTPUT_ROOT)

    (OUTPUT_ROOT / "images" / "train").mkdir(parents=True)
    (OUTPUT_ROOT / "images" / "val").mkdir(parents=True)
    (OUTPUT_ROOT / "labels" / "train").mkdir(parents=True)
    (OUTPUT_ROOT / "labels" / "val").mkdir(parents=True)


def get_categories():
    return sorted(
        [
            p.name
            for p in DATASET_ROOT.iterdir()
            if p.is_dir()
        ]
    )


def get_defect_types(category_path):
    test_path = category_path / "test"

    if not test_path.exists():
        return []

    return sorted(
        [
            p.name
            for p in test_path.iterdir()
            if p.is_dir() and p.name != "good"
        ]
    )


def get_mask(category, defect_type, image_name):
    mask_dir = (
        DATASET_ROOT
        / category
        / "ground_truth"
        / defect_type
    )

    stem = Path(image_name).stem

    candidates = [
        mask_dir / f"{stem}_mask.png",
        mask_dir / f"{stem}_mask.jpg",
        mask_dir / f"{stem}.png",
    ]

    for candidate in candidates:
        if candidate.exists():
            return candidate

    return None


def mask_to_bbox(mask_path):
    mask = cv2.imread(
        str(mask_path),
        cv2.IMREAD_GRAYSCALE
    )

    if mask is None:
        return None

    _, binary = cv2.threshold(
        mask,
        1,
        255,
        cv2.THRESH_BINARY
    )

    contours, _ = cv2.findContours(
        binary,
        cv2.RETR_EXTERNAL,
        cv2.CHAIN_APPROX_SIMPLE
    )

    if not contours:
        return None

    x, y, w, h = cv2.boundingRect(
        max(contours, key=cv2.contourArea)
    )

    height, width = binary.shape

    x_center = (x + w / 2) / width
    y_center = (y + h / 2) / height
    box_width = w / width
    box_height = h / height

    return (
        x_center,
        y_center,
        box_width,
        box_height
    )


def create_class_mapping():
    classes = []

    for category in get_categories():

        category_path = DATASET_ROOT / category

        defects = get_defect_types(
            category_path
        )

        for defect in defects:
            classes.append(
                f"{category}_{defect}"
            )

    return classes


def collect_samples(class_names):
    samples = []

    class_to_id = {
        name: index
        for index, name in enumerate(class_names)
    }

    for category in get_categories():

        category_path = DATASET_ROOT / category

        test_path = category_path / "test"

        if not test_path.exists():
            continue

        for defect_type in get_defect_types(
            category_path
        ):

            image_dir = test_path / defect_type

            class_name = (
                f"{category}_{defect_type}"
            )

            class_id = class_to_id[class_name]

            for image_path in image_dir.iterdir():

                if not is_image(image_path):
                    continue

                mask_path = get_mask(
                    category,
                    defect_type,
                    image_path.name
                )

                if not mask_path:
                    print(
                        "WARNING: mask missing:",
                        image_path
                    )
                    continue

                bbox = mask_to_bbox(
                    mask_path
                )

                if not bbox:
                    print(
                        "WARNING: bbox failed:",
                        image_path
                    )
                    continue

                samples.append(
                    (
                        image_path,
                        class_id,
                        bbox
                    )
                )

    return samples


def copy_good_images():
    good_samples = []

    for category in get_categories():

        category_path = DATASET_ROOT / category

        train_good = (
            category_path
            / "train"
            / "good"
        )

        test_good = (
            category_path
            / "test"
            / "good"
        )

        for source_dir in [
            train_good,
            test_good
        ]:

            if not source_dir.exists():
                continue

            for image_path in source_dir.iterdir():

                if is_image(image_path):
                    good_samples.append(
                        image_path
                    )

    return good_samples


def make_link(source, destination):

    destination.parent.mkdir(
        parents=True,
        exist_ok=True
    )

    try:
        destination.hardlink_to(source)
    except Exception:
        shutil.copy2(
            source,
            destination
        )


def write_good_sample(
    image_path,
    split,
    index
):

    filename = (
        f"good_{index:06d}"
        + image_path.suffix.lower()
    )

    destination = (
        OUTPUT_ROOT
        / "images"
        / split
        / filename
    )

    make_link(
        image_path,
        destination
    )

    label_path = (
        OUTPUT_ROOT
        / "labels"
        / split
        / f"good_{index:06d}.txt"
    )

    label_path.write_text(
        "",
        encoding="utf-8"
    )


def write_defect_sample(
    image_path,
    class_id,
    bbox,
    split,
    index
):

    filename = (
        f"defect_{index:06d}"
        + image_path.suffix.lower()
    )

    destination = (
        OUTPUT_ROOT
        / "images"
        / split
        / filename
    )

    make_link(
        image_path,
        destination
    )

    x, y, w, h = bbox

    label_path = (
        OUTPUT_ROOT
        / "labels"
        / split
        / f"defect_{index:06d}.txt"
    )

    label_path.write_text(
        f"{class_id} "
        f"{x:.6f} "
        f"{y:.6f} "
        f"{w:.6f} "
        f"{h:.6f}\n",
        encoding="utf-8"
    )


def write_yaml(class_names):

    yaml_path = OUTPUT_ROOT / "data.yaml"

    lines = [
        f"path: {OUTPUT_ROOT.as_posix()}",
        "train: images/train",
        "val: images/val",
        "",
        f"nc: {len(class_names)}",
        "names:"
    ]

    for index, name in enumerate(class_names):
        lines.append(
            f"  {index}: {name}"
        )

    yaml_path.write_text(
        "\n".join(lines),
        encoding="utf-8"
    )


def main():

    print("\nVISIONINSPECT AI")
    print("MVTec → YOLO Dataset Preparation")
    print("=" * 50)

    if not DATASET_ROOT.exists():
        raise FileNotFoundError(
            f"Dataset not found:\n{DATASET_ROOT}"
        )

    clean_output()

    categories = get_categories()

    print(
        f"\nProduct categories found: "
        f"{len(categories)}"
    )

    for category in categories:
        print(" -", category)

    class_names = create_class_mapping()

    print(
        f"\nDefect classes found: "
        f"{len(class_names)}"
    )

    samples = collect_samples(
        class_names
    )

    good_images = copy_good_images()

    random.shuffle(samples)
    random.shuffle(good_images)

    defect_split = int(
        len(samples) * (1 - VAL_RATIO)
    )

    good_split = int(
        len(good_images) * (1 - VAL_RATIO)
    )

    defect_train = samples[:defect_split]
    defect_val = samples[defect_split:]

    good_train = good_images[:good_split]
    good_val = good_images[good_split:]

    print(
        f"\nDefect images: {len(samples)}"
    )

    print(
        f"Good images: {len(good_images)}"
    )

    print(
        f"\nTrain defect: {len(defect_train)}"
    )

    print(
        f"Val defect: {len(defect_val)}"
    )

    print(
        f"Train good: {len(good_train)}"
    )

    print(
        f"Val good: {len(good_val)}"
    )

    for index, (
        image_path,
        class_id,
        bbox
    ) in enumerate(defect_train):

        write_defect_sample(
            image_path,
            class_id,
            bbox,
            "train",
            index
        )

    for index, (
        image_path,
        class_id,
        bbox
    ) in enumerate(defect_val):

        write_defect_sample(
            image_path,
            class_id,
            bbox,
            "val",
            index
        )

    for index, image_path in enumerate(
        good_train
    ):

        write_good_sample(
            image_path,
            "train",
            index
        )

    for index, image_path in enumerate(
        good_val
    ):

        write_good_sample(
            image_path,
            "val",
            index
        )

    write_yaml(class_names)

    print("\n" + "=" * 50)
    print("DATASET PREPARATION COMPLETE")
    print("=" * 50)

    print(
        "\nYOLO dataset:"
    )

    print(
        OUTPUT_ROOT
    )

    print(
        "\nClasses:"
    )

    for index, name in enumerate(
        class_names
    ):
        print(
            f"{index}: {name}"
        )

    print(
        "\nNext step: YOLO training"
    )


if __name__ == "__main__":
    main()