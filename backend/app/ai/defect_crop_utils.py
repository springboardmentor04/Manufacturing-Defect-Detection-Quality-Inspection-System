"""
VisionInspect AI - Adaptive Contextual Defect Cropping

No pretrained model is used here.
The defect mask identifies the defect, but the crop keeps
surrounding product context.
"""

from PIL import Image


def crop_to_defect_context(
    image,
    mask,
    context_scale=4.0,
    min_crop_ratio=0.45,
    max_crop_ratio=0.95,
):
    image = image.convert("RGB")
    mask = mask.convert("L")

    bbox = mask.getbbox()

    # If no defect is found, use the original image
    if bbox is None:
        return image

    x1, y1, x2, y2 = bbox

    defect_w = max(1, x2 - x1)
    defect_h = max(1, y2 - y1)

    # Expand around the defect
    crop_w = defect_w * context_scale
    crop_h = defect_h * context_scale

    # Prevent tiny defects from creating tiny crops
    crop_w = max(
        crop_w,
        image.width * min_crop_ratio
    )

    crop_h = max(
        crop_h,
        image.height * min_crop_ratio
    )

    # Prevent crop from becoming the entire image
    crop_w = min(
        crop_w,
        image.width * max_crop_ratio
    )

    crop_h = min(
        crop_h,
        image.height * max_crop_ratio
    )

    center_x = (x1 + x2) / 2.0
    center_y = (y1 + y2) / 2.0

    left = int(
        round(center_x - crop_w / 2)
    )

    top = int(
        round(center_y - crop_h / 2)
    )

    right = int(
        round(center_x + crop_w / 2)
    )

    bottom = int(
        round(center_y + crop_h / 2)
    )

    # Keep crop inside image boundaries
    if left < 0:
        right -= left
        left = 0

    if top < 0:
        bottom -= top
        top = 0

    if right > image.width:
        left -= right - image.width
        right = image.width

    if bottom > image.height:
        top -= bottom - image.height
        bottom = image.height

    left = max(0, left)
    top = max(0, top)

    right = min(
        image.width,
        right
    )

    bottom = min(
        image.height,
        bottom
    )

    return image.crop(
        (
            left,
            top,
            right,
            bottom
        )
    )