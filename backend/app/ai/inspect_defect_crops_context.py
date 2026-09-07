import os
import math

from PIL import Image, ImageDraw

from app.ai.defect_dataloader import MVTecDefectDataset
from app.ai.defect_crop_utils import crop_to_defect_context


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


# Select one example from each category
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


    cropped = crop_to_defect_context(
        image,
        mask,
        context_scale=4.0,
        min_crop_ratio=0.45,
        max_crop_ratio=0.95
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
    ) * (
        thumb_h + label_h
    )


    paste_x = (
        x +
        (thumb_w - cropped.width) // 2
    )

    paste_y = (
        y +
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
        f"{sample['category']} -> "
        f"{sample['defect_type']}",
        fill="black"
    )


output = os.path.join(
    OUTPUT_DIR,
    "defect_crop_montage_context.jpg"
)


canvas.save(
    output,
    quality=95
)


print()
print("=" * 60)
print("ADAPTIVE CONTEXT CROP INSPECTION")
print("=" * 60)

print(
    f"Categories inspected: {len(samples)}"
)

print(
    f"Saved to: {output}"
)

print("=" * 60)