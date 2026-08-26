import os
import shutil
import random

random.seed(42)

# Original dataset
base = "dataset/metal_nut"

train_good = os.path.join(base, "train", "good")

defect_folders = [
    os.path.join(base, "test", "bent"),
    os.path.join(base, "test", "color"),
    os.path.join(base, "test", "flip"),
    os.path.join(base, "test", "scratch")
]

test_good = os.path.join(base, "test", "good")

# New dataset
new_base = "dataset/cnn_dataset"

folders = [
    "train/good",
    "train/defective",
    "val/good",
    "val/defective",
    "test/good",
    "test/defective"
]

for folder in folders:
    os.makedirs(os.path.join(new_base, folder), exist_ok=True)

# --------------------------
# GOOD IMAGES
# --------------------------

good_images = os.listdir(train_good)
random.shuffle(good_images)

train_good_imgs = good_images[:180]
val_good_imgs = good_images[180:200]
test_good_imgs = good_images[200:]

for img in train_good_imgs:
    shutil.copy(
        os.path.join(train_good, img),
        os.path.join(new_base, "train/good", img)
    )

for img in val_good_imgs:
    shutil.copy(
        os.path.join(train_good, img),
        os.path.join(new_base, "val/good", img)
    )

for img in test_good_imgs:
    shutil.copy(
        os.path.join(train_good, img),
        os.path.join(new_base, "test/good", img)
    )

# --------------------------
# DEFECTIVE IMAGES
# --------------------------

defect_images = []

for folder in defect_folders:
    for img in os.listdir(folder):
        defect_images.append(os.path.join(folder, img))

random.shuffle(defect_images)

train_def = defect_images[:70]
val_def = defect_images[70:90]
test_def = defect_images[90:]
for img in train_def:
    defect_type = os.path.basename(os.path.dirname(img))
    new_name = f"{defect_type}_{os.path.basename(img)}"
    shutil.copy(img, os.path.join(new_base, "train/defective", new_name))

for img in val_def:
    defect_type = os.path.basename(os.path.dirname(img))
    new_name = f"{defect_type}_{os.path.basename(img)}"
    shutil.copy(img, os.path.join(new_base, "val/defective", new_name))

for img in test_def:
    defect_type = os.path.basename(os.path.dirname(img))
    new_name = f"{defect_type}_{os.path.basename(img)}"
    shutil.copy(img, os.path.join(new_base, "test/defective", new_name))

print("Dataset prepared successfully!")