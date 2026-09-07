import os

from PIL import Image, ImageDraw

from app.ai.dataloader import get_dataloaders


# ==========================================
# LOAD DATASET
# ==========================================

train_loader, _, _, _ = get_dataloaders()

dataset = train_loader.dataset


# ==========================================
# FIND SAMPLES
# ==========================================

normal_images = []
defective_images = []


for i in range(len(dataset)):

    image_path = dataset.images[i]
    label = dataset.labels[i]

    if label == 0 and len(normal_images) < 4:

        normal_images.append(image_path)

    elif label == 1 and len(defective_images) < 4:

        defective_images.append(image_path)

    if (
        len(normal_images) == 4
        and len(defective_images) == 4
    ):
        break


# ==========================================
# CREATE OUTPUT DIRECTORY
# ==========================================

output_dir = "debug_images"

os.makedirs(
    output_dir,
    exist_ok=True
)


# ==========================================
# SAVE NORMAL IMAGES
# ==========================================

for i, path in enumerate(normal_images):

    image = Image.open(path).convert("RGB")

    image.save(
        os.path.join(
            output_dir,
            f"normal_{i + 1}.png"
        )
    )


# ==========================================
# SAVE DEFECTIVE IMAGES
# ==========================================

for i, path in enumerate(defective_images):

    image = Image.open(path).convert("RGB")

    image.save(
        os.path.join(
            output_dir,
            f"defective_{i + 1}.png"
        )
    )


# ==========================================
# PRINT PATHS
# ==========================================

print("\nNormal images:")

for path in normal_images:
    print(path)


print("\nDefective images:")

for path in defective_images:
    print(path)


print(
    f"\nImages saved to: {output_dir}"
)