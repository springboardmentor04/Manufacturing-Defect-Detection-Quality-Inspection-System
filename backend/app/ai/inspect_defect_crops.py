import os
import math

import numpy as np
from PIL import Image, ImageDraw

from app.ai.defect_dataloader import MVTecDefectDataset


OUTPUT_DIR = os.path.join(
    "app",
    "ai",
    "crop_inspection"
)

os.makedirs(
    OUTPUT_DIR,
    exist_ok=True
)


dataset = MVTecDefectDataset(
    crop_to_mask=False
)


# One example from each category
selected = {}

for sample in dataset.samples:

    category = sample["category"]

    if category not in selected:

        selected[category] = sample


samples = list(
    selected.values()
)


thumb_w = 320
thumb_h = 320

label_h = 55

cols = 3

rows = math.ceil(
    len(samples) / cols
)


canvas = Image.new(
    "RGB",
    (
        cols * thumb_w,
        rows * (thumb_h + label_h)
    ),
    "white"
)


draw = ImageDraw.Draw(
    canvas
)


for i, sample in enumerate(samples):

    image = Image.open(
        sample["image_path"]
    ).convert("RGB")


    mask = Image.open(
        sample["mask_path"]
    ).convert("L")


    mask_array = np.array(mask)

    ys, xs = np.where(
        mask_array > 0
    )


    if len(xs) == 0:

        cropped = image

    else:

        x1 = int(xs.min())
        x2 = int(xs.max())
        y1 = int(ys.min())
        y2 = int(ys.max())


        padding = 20

        x1 = max(
            0,
            x1 - padding
        )

        y1 = max(
            0,
            y1 - padding
        )

        x2 = min(
            image.width - 1,
            x2 + padding
        )

        y2 = min(
            image.height - 1,
            y2 + padding
        )


        cropped = image.crop(
            (
                x1,
                y1,
                x2 + 1,
                y2 + 1
            )
        )


    cropped.thumbnail(
        (
            thumb_w - 20,
            thumb_h - 20
        )
    )


    x = (
        i % cols
    ) * thumb_w

    y = (
        i // cols
    ) * (thumb_h + label_h)


    paste_x = (
        x
        +
        (thumb_w - cropped.width) // 2
    )

    paste_y = (
        y
        +
        (thumb_h - cropped.height) // 2
    )


    canvas.paste(
        cropped,
        (
            paste_x,
            paste_y
        )
    )


    draw.text(
        (
            x + 10,
            y + thumb_h + 5
        ),
        f"{sample['category']} → "
        f"{sample['defect_type']}",
        fill="black"
    )


output = os.path.join(
    OUTPUT_DIR,
    "defect_crop_montage.jpg"
)


canvas.save(
    output,
    quality=95
)


print()
print("=" * 60)
print("DEFECT CROP INSPECTION")
print("=" * 60)
print(
    f"Categories inspected: {len(samples)}"
)
print(
    f"Saved to: {output}"
)
print("=" * 60)