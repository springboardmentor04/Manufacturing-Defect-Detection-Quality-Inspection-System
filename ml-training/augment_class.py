import os
import cv2
import albumentations as A

DATASET = r"multiclass_defect_dataset"
IMG_DIR = os.path.join(DATASET, "images", "train")
LBL_DIR = os.path.join(DATASET, "labels", "train")
TARGET_CLASS_ID = 8  # missing_component
COPIES_PER_IMAGE = 5

transform = A.Compose([
    A.HorizontalFlip(p=0.5),
    A.VerticalFlip(p=0.3),
    A.Rotate(limit=20, p=0.7),
    A.RandomBrightnessContrast(p=0.6),
    A.HueSaturationValue(p=0.4),
    A.GaussNoise(p=0.3),
    A.Blur(blur_limit=3, p=0.2),
], bbox_params=A.BboxParams(format='yolo', label_fields=['class_labels']))

count = 0
for fname in os.listdir(LBL_DIR):
    lbl_path = os.path.join(LBL_DIR, fname)
    with open(lbl_path) as f:
        lines = [l.split() for l in f if l.strip()]
    class_ids = [int(l[0]) for l in lines]
    if TARGET_CLASS_ID not in class_ids:
        continue

    img_name = fname.rsplit('.', 1)[0]
    img_path = None
    for ext in ['.jpg', '.jpeg', '.png']:
        candidate = os.path.join(IMG_DIR, img_name + ext)
        if os.path.exists(candidate):
            img_path = candidate
            break
    if not img_path:
        continue

    image = cv2.imread(img_path)
    bboxes = [list(map(float, l[1:5])) for l in lines]
    labels = class_ids

    for i in range(COPIES_PER_IMAGE):
        try:
            augmented = transform(image=image, bboxes=bboxes, class_labels=labels)
        except Exception as e:
            print(f"Skipped {fname} copy {i}: {e}")
            continue

        new_img_name = f"{img_name}_aug{i}.jpg"
        new_lbl_name = f"{img_name}_aug{i}.txt"
        cv2.imwrite(os.path.join(IMG_DIR, new_img_name), augmented['image'])
        with open(os.path.join(LBL_DIR, new_lbl_name), 'w') as f:
            for cls, box in zip(augmented['class_labels'], augmented['bboxes']):
                f.write(f"{cls} {' '.join(f'{v:.6f}' for v in box)}\n")
        count += 1

print(f"Created {count} new augmented images/labels for class {TARGET_CLASS_ID}")