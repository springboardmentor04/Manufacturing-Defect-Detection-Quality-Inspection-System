import cv2
import shutil
from pathlib import Path


def mask_to_bbox(mask):
    """
    Convert segmentation mask to bounding box.
    """

    _, binary = cv2.threshold(
        mask,
        127,
        255,
        cv2.THRESH_BINARY,
    )

    contours, _ = cv2.findContours(
        binary,
        cv2.RETR_EXTERNAL,
        cv2.CHAIN_APPROX_SIMPLE,
    )

    if len(contours) == 0:
        return None

    largest = max(
        contours,
        key=cv2.contourArea,
    )

    return cv2.boundingRect(largest)


def bbox_to_yolo(
    x,
    y,
    w,
    h,
    img_w,
    img_h,
):
    center_x = (x + w / 2) / img_w
    center_y = (y + h / 2) / img_h

    width = w / img_w
    height = h / img_h

    return (
        center_x,
        center_y,
        width,
        height,
    )


def save_label(
    label_path,
    class_id,
    bbox,
    img_shape,
):

    x, y, w, h = bbox

    img_h, img_w = img_shape

    cx, cy, bw, bh = bbox_to_yolo(
        x,
        y,
        w,
        h,
        img_w,
        img_h,
    )

    label_path.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    with open(label_path, "w") as f:

        f.write(
            f"{class_id} "
            f"{cx:.6f} "
            f"{cy:.6f} "
            f"{bw:.6f} "
            f"{bh:.6f}"
        )


def copy_image(
    source,
    destination,
):

    destination.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    shutil.copy2(
        source,
        destination,
    )