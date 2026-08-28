import os

# Change these paths if your dataset layout is different.
root_dir = "dataset"
splits = ["train", "val"]

image_extensions = (".jpg", ".jpeg", ".png", ".bmp", ".gif", ".tif", ".tiff", ".webp")

for split in splits:
    images_dir = os.path.join(root_dir, "images", split)
    labels_dir = os.path.join(root_dir, "labels", split)
    os.makedirs(labels_dir, exist_ok=True)

    if not os.path.isdir(images_dir):
        print(f"Skipping missing folder: {images_dir}")
        continue

    for filename in os.listdir(images_dir):
        if not filename.lower().endswith(image_extensions):
            continue

        txt_name = os.path.splitext(filename)[0] + ".txt"
        txt_path = os.path.join(labels_dir, txt_name)

        if not os.path.exists(txt_path):
            open(txt_path, "w", encoding="utf-8").close()
            print(f"Created: {txt_path}")
        else:
            print(f"Already exists: {txt_path}")

print("Done.")
