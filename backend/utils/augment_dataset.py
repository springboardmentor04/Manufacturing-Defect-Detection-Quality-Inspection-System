from pathlib import Path
from PIL import Image, ImageEnhance
import shutil


def augment_train_folder(images_dir: Path, labels_dir: Path, n_brightness=2):
    images_dir = Path(images_dir)
    labels_dir = Path(labels_dir)
    assert images_dir.exists(), f"Images dir not found: {images_dir}"
    assert labels_dir.exists(), f"Labels dir not found: {labels_dir}"

    supported_exts = {'.jpg', '.jpeg', '.png', '.webp'}

    created = 0
    for img_path in images_dir.iterdir():
        if img_path.suffix.lower() not in supported_exts:
            continue
        stem = img_path.stem
        label_path = labels_dir / f"{stem}.txt"
        if not label_path.exists():
            print(f"Skipping {img_path.name}: no label file {label_path.name}")
            continue

        img = Image.open(img_path).convert('RGB')

        # Horizontal flip
        flip_img = img.transpose(Image.FLIP_LEFT_RIGHT)
        flip_name = f"{stem}_flip.webp"
        flip_path = images_dir / flip_name
        flip_img.save(flip_path, quality=95)

        # Write flipped label: x -> 1 - x
        with open(label_path, 'r', encoding='utf8') as f:
            lines = [l.strip() for l in f.readlines() if l.strip()]

        flipped_lines = []
        for line in lines:
            parts = line.split()
            if len(parts) != 5:
                continue
            cls, x, y, w, h = parts
            try:
                x_f = 1.0 - float(x)
            except Exception:
                x_f = float(x)
            flipped_lines.append(f"{cls} {x_f:.6f} {y} {w} {h}\n")

        flip_label_path = labels_dir / f"{stem}_flip.txt"
        with open(flip_label_path, 'w', encoding='utf8') as f:
            f.writelines(flipped_lines)

        created += 1

        # Brightness variations (labels unchanged)
        factors = [0.8, 1.2][:n_brightness]
        for factor in factors:
            enh = ImageEnhance.Brightness(img)
            bimg = enh.enhance(factor)
            bname = f"{stem}_b{int(factor*100)}.webp"
            bpath = images_dir / bname
            bimg.save(bpath, quality=95)
            # copy label
            b_label = labels_dir / f"{stem}_b{int(factor*100)}.txt"
            shutil.copy(label_path, b_label)
            created += 1

    print(f"Created {created} augmented files in {images_dir}")


if __name__ == '__main__':
    base = Path(__file__).resolve().parents[2]
    images = base / 'dataset' / 'images' / 'train'
    labels = base / 'dataset' / 'labels' / 'train'
    augment_train_folder(images, labels)
