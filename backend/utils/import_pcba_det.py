"""Import the academic PCBA-DET sample into this project's YOLO dataset.

Source class order follows the PCBA-DET paper/repository. Only classes with a
safe semantic equivalent are retained; unsupported defects are intentionally
ignored instead of being assigned an incorrect target class.
"""

from __future__ import annotations

import argparse
import random
import shutil
from collections import Counter
from pathlib import Path


# PCBA-DET -> InfoVisionAI
# 0 loose fan screw (ignored)
# 1 missing fan screw -> Missing Component
# 2 loose motherboard screw (ignored)
# 3 missing motherboard screw -> Missing Component
# 4 loose fan wiring (ignored)
# 5 missing fan wiring -> Missing Component
# 6 fan scratch -> Surface Scratch
# 7 motherboard scratch -> Surface Scratch
CLASS_MAP = {1: 2, 3: 2, 5: 2, 6: 0, 7: 0}


def source_label_stem(image_stem: str) -> str:
    """Account for the filename offset used by the published sample archive."""
    number = int(image_stem)
    return str(number + 10_000 if number >= 70_000 else number).zfill(len(image_stem))


def import_dataset(source: Path, destination: Path, val_fraction: float, seed: int) -> None:
    images = sorted((source / "images").glob("*.jpg"))
    if not images:
        raise FileNotFoundError(f"No JPG images found in {source / 'images'}")

    pairs: list[tuple[Path, Path, list[str]]] = []
    class_counts: Counter[int] = Counter()
    for image in images:
        label = source / "labels" / f"{source_label_stem(image.stem)}.txt"
        if not label.exists():
            raise FileNotFoundError(f"Missing source label for {image.name}: {label.name}")

        mapped_lines: list[str] = []
        for raw_line in label.read_text(encoding="utf-8").splitlines():
            fields = raw_line.split()
            if len(fields) != 5:
                raise ValueError(f"Invalid YOLO row in {label}: {raw_line!r}")
            source_class = int(fields[0])
            if source_class not in CLASS_MAP:
                continue
            values = [float(value) for value in fields[1:]]
            if any(value < 0 or value > 1 for value in values):
                raise ValueError(f"Out-of-range YOLO row in {label}: {raw_line!r}")
            target_class = CLASS_MAP[source_class]
            mapped_lines.append(" ".join([str(target_class), *fields[1:]]))
            class_counts[target_class] += 1

        # Keep only images that provide a positive example for our taxonomy.
        if mapped_lines:
            pairs.append((image, label, mapped_lines))

    rng = random.Random(seed)
    rng.shuffle(pairs)
    val_count = max(1, round(len(pairs) * val_fraction))
    validation_names = {image.name for image, _, _ in pairs[:val_count]}

    for image, _, mapped_lines in pairs:
        split = "val" if image.name in validation_names else "train"
        image_target = destination / "images" / split / f"pcba_{image.name}"
        label_target = destination / "labels" / split / f"pcba_{image.stem}.txt"
        image_target.parent.mkdir(parents=True, exist_ok=True)
        label_target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(image, image_target)
        label_target.write_text("\n".join(mapped_lines) + "\n", encoding="utf-8")

    print(f"Imported {len(pairs) - val_count} training and {val_count} validation images")
    print(f"Mapped annotations: {dict(sorted(class_counts.items()))}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--destination", type=Path, required=True)
    parser.add_argument("--val-fraction", type=float, default=0.2)
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()
    import_dataset(args.source, args.destination, args.val_fraction, args.seed)
