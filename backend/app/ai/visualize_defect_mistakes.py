"""
VISIONINSPECT AI - VISUAL DEFECT MISCLASSIFICATION INSPECTOR

Evaluation/visualization only.
NO TRAINING.
NO MODEL WEIGHTS ARE MODIFIED.

Creates:
1. Overall misclassification montage
2. Separate montages for:
   - capsule
   - pill
   - zipper
   - wood
   - screw
3. CSV containing every misclassified validation image

Uses the exact model architecture, validation split,
and preprocessing from the final training script.
"""

import os
import csv
import random

import torch
import torch.nn as nn
from PIL import Image, ImageDraw, ImageFont
from torch.utils.data import Dataset, DataLoader
from torchvision import transforms

# ============================================================
# PATHS
# ============================================================

DATASET_ROOT = os.path.join("dataset", "mvtec_ad")

MODEL_PATH = os.path.join(
    "app",
    "ai",
    "saved_models",
    "defect_models",
    "shared_category_aware_defect_model.pth",
)

OUTPUT_DIR = os.path.join(
    "app",
    "ai",
    "evaluation_results",
    "defect_models",
    "misclassification_montages",
)

os.makedirs(OUTPUT_DIR, exist_ok=True)

# ============================================================
# DATA / MODEL CONFIG
# ============================================================

CATEGORIES = [
    "bottle", "cable", "capsule", "carpet", "grid",
    "hazelnut", "leather", "metal_nut", "pill", "screw",
    "tile", "toothbrush", "transistor", "wood", "zipper"
]

DEFECT_CLASSES = {
    "bottle": ["broken_large", "broken_small", "contamination"],
    "cable": ["bent_wire", "cable_swap", "combined",
              "cut_inner_insulation", "cut_outer_insulation",
              "missing_cable", "missing_wire", "poke_insulation"],
    "capsule": ["crack", "faulty_imprint", "poke", "scratch", "squeeze"],
    "carpet": ["color", "cut", "hole", "metal_contamination", "thread"],
    "grid": ["bent", "broken", "glue", "metal_contamination", "thread"],
    "hazelnut": ["crack", "cut", "hole", "print"],
    "leather": ["color", "cut", "fold", "glue", "poke"],
    "metal_nut": ["bent", "color", "flip", "scratch"],
    "pill": ["color", "combined", "contamination", "crack",
             "faulty_imprint", "pill_type", "scratch"],
    "screw": ["manipulated_front", "scratch_head", "scratch_neck",
              "thread_side", "thread_top"],
    "tile": ["crack", "glue_strip", "gray_stroke", "oil", "rough"],
    "toothbrush": ["defective"],
    "transistor": ["bent_lead", "cut_lead", "damaged_case", "misplaced"],
    "wood": ["color", "combined", "hole", "liquid", "scratch"],
    "zipper": ["broken_teeth", "combined", "fabric_border",
               "fabric_interior", "rough", "split_teeth",
               "squeezed_teeth"],
}

IMAGE_SIZE = 256
VAL_RATIO = 0.20
SEED = 42
BATCH_SIZE = 16

DEVICE = torch.device(
    "cuda" if torch.cuda.is_available() else "cpu"
)

CATEGORY_TO_INDEX = {
    c: i for i, c in enumerate(CATEGORIES)
}

INDEX_TO_CATEGORY = {
    i: c for c, i in CATEGORY_TO_INDEX.items()
}

GLOBAL_CLASS_NAMES = []
GLOBAL_CLASS_TO_INDEX = {}
GLOBAL_INDEX_TO_CLASS = {}

for category in CATEGORIES:
    for defect in DEFECT_CLASSES[category]:
        name = f"{category}::{defect}"
        index = len(GLOBAL_CLASS_NAMES)
        GLOBAL_CLASS_NAMES.append(name)
        GLOBAL_CLASS_TO_INDEX[name] = index
        GLOBAL_INDEX_TO_CLASS[index] = name


# ============================================================
# EXACT VALIDATION TRANSFORM
# ============================================================

VAL_TRANSFORM = transforms.Compose([
    transforms.Resize((IMAGE_SIZE, IMAGE_SIZE)),
    transforms.ToTensor(),
    transforms.Normalize(
        [0.5, 0.5, 0.5],
        [0.5, 0.5, 0.5]
    ),
])


# ============================================================
# EXACT SPLIT LOGIC
# ============================================================

def set_seed(seed=SEED):
    random.seed(seed)
    torch.manual_seed(seed)


def collect_samples():

    samples = []

    for category in CATEGORIES:

        test_dir = os.path.join(
            DATASET_ROOT,
            category,
            "test"
        )

        if not os.path.isdir(test_dir):
            continue

        for defect in sorted(os.listdir(test_dir)):

            if defect == "good":
                continue

            folder = os.path.join(
                test_dir,
                defect
            )

            if not os.path.isdir(folder):
                continue

            class_name = f"{category}::{defect}"

            for filename in sorted(os.listdir(folder)):

                path = os.path.join(
                    folder,
                    filename
                )

                if not os.path.isfile(path):
                    continue

                samples.append({
                    "image_path": path,
                    "category": category,
                    "category_index":
                        CATEGORY_TO_INDEX[category],
                    "defect_type": defect,
                    "class_name": class_name,
                    "global_label":
                        GLOBAL_CLASS_TO_INDEX[class_name],
                })

    return samples


def split_samples(samples):

    grouped = {}

    for sample in samples:
        grouped.setdefault(
            sample["class_name"],
            []
        ).append(sample)

    train_samples = []
    val_samples = []

    for key in sorted(grouped):

        items = grouped[key].copy()

        random.shuffle(items)

        total = len(items)

        if total <= 1:
            train_samples.extend(items)
            continue

        val_count = max(
            1,
            min(
                total - 1,
                round(total * VAL_RATIO)
            )
        )

        val_samples.extend(
            items[:val_count]
        )

        train_samples.extend(
            items[val_count:]
        )

    random.shuffle(train_samples)
    random.shuffle(val_samples)

    return train_samples, val_samples


# ============================================================
# DATASET
# ============================================================

class DefectDataset(Dataset):

    def __init__(self, samples):
        self.samples = samples

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, index):

        sample = self.samples[index]

        image = Image.open(
            sample["image_path"]
        ).convert("RGB")

        tensor = VAL_TRANSFORM(image)

        return (
            tensor,
            sample["category_index"],
            sample["global_label"],
            sample["image_path"],
        )


# ============================================================
# EXACT MODEL ARCHITECTURE
# ============================================================

class FineDetailCNN(nn.Module):

    def __init__(self):

        super().__init__()

        def block(in_channels, out_channels):

            return nn.Sequential(

                nn.Conv2d(
                    in_channels,
                    out_channels,
                    3,
                    padding=1,
                    bias=False
                ),

                nn.GroupNorm(
                    8,
                    out_channels
                ),

                nn.ReLU(inplace=True),

                nn.Conv2d(
                    out_channels,
                    out_channels,
                    3,
                    padding=1,
                    bias=False
                ),

                nn.GroupNorm(
                    8,
                    out_channels
                ),

                nn.ReLU(inplace=True),

                nn.MaxPool2d(2),
            )

        self.features = nn.Sequential(
            block(3, 32),
            block(32, 64),
            block(64, 128),
            block(128, 256),
        )

        self.detail_avg = (
            nn.AdaptiveAvgPool2d((4, 4))
        )

        self.detail_max = (
            nn.AdaptiveMaxPool2d((4, 4))
        )

        self.projection = nn.Sequential(
            nn.Flatten(),
            nn.Linear(
                256 * 4 * 4 * 2,
                256
            ),
            nn.ReLU(inplace=True),
            nn.Dropout(0.20),
        )

        self.category_head = nn.Linear(
            256,
            len(CATEGORIES)
        )

        self.defect_heads = nn.ModuleDict({

            category: nn.Linear(
                256,
                len(DEFECT_CLASSES[category])
            )

            for category in CATEGORIES
        })

    def extract_features(self, x):

        x = self.features(x)

        avg_features = self.detail_avg(x)
        max_features = self.detail_max(x)

        x = torch.cat(
            [
                avg_features,
                max_features
            ],
            dim=1
        )

        return self.projection(x)

    def forward(self, x):

        features = self.extract_features(x)

        category_logits = (
            self.category_head(features)
        )

        return features, category_logits


# ============================================================
# PREDICTION
# ============================================================

@torch.no_grad()
def get_misclassifications(model, loader):

    model.eval()

    mistakes = []

    for (
        images,
        categories,
        global_labels,
        paths
    ) in loader:

        images = images.to(DEVICE)

        categories = torch.tensor(
            categories,
            device=DEVICE
        )

        global_labels = torch.tensor(
            global_labels,
            device=DEVICE
        )

        features, category_logits = (
            model(images)
        )

        for i in range(images.size(0)):

            true_category_index = int(
                categories[i].item()
            )

            true_category = (
                INDEX_TO_CATEGORY[
                    true_category_index
                ]
            )

            true_global = int(
                global_labels[i].item()
            )

            true_class = (
                GLOBAL_INDEX_TO_CLASS[
                    true_global
                ]
            )

            # ORACLE ROUTING:
            # Use the TRUE category so we can study
            # pure defect-classification mistakes.
            head = model.defect_heads[
                true_category
            ]

            logits = head(
                features[i:i + 1]
            )

            probabilities = torch.softmax(
                logits,
                dim=1
            )

            predicted_local = int(
                probabilities.argmax(
                    dim=1
                ).item()
            )

            predicted_defect = (
                DEFECT_CLASSES[
                    true_category
                ][predicted_local]
            )

            predicted_class = (
                f"{true_category}::{predicted_defect}"
            )

            if predicted_class != true_class:

                mistakes.append({

                    "path": paths[i],

                    "true_class":
                        true_class,

                    "predicted_class":
                        predicted_class,

                    "confidence":
                        float(
                            probabilities[
                                0,
                                predicted_local
                            ].item()
                        ),
                })

    return mistakes


# ============================================================
# IMAGE MONTAGE
# ============================================================

def make_montage(
    mistakes,
    output_path,
    title,
    max_images=25,
    columns=5
):

    mistakes = mistakes[:max_images]

    if not mistakes:
        print(
            f"No mistakes for {title}"
        )
        return

    thumb_w = 260
    thumb_h = 310

    rows = (
        (len(mistakes) + columns - 1)
        // columns
    )

    canvas = Image.new(
        "RGB",
        (
            columns * thumb_w,
            80 + rows * thumb_h
        ),
        "white"
    )

    draw = ImageDraw.Draw(canvas)

    try:
        font = ImageFont.truetype(
            "arial.ttf",
            16
        )
        small_font = ImageFont.truetype(
            "arial.ttf",
            13
        )
    except Exception:
        font = ImageFont.load_default()
        small_font = ImageFont.load_default()

    draw.text(
        (15, 15),
        title,
        fill="black",
        font=font
    )

    for index, item in enumerate(mistakes):

        row = index // columns
        col = index % columns

        x = col * thumb_w
        y = 80 + row * thumb_h

        try:

            image = Image.open(
                item["path"]
            ).convert("RGB")

            image.thumbnail(
                (240, 220)
            )

            image_x = (
                x
                + (thumb_w - image.width) // 2
            )

            image_y = y + 5

            canvas.paste(
                image,
                (image_x, image_y)
            )

            draw.text(
                (x + 8, y + 230),
                "TRUE: " + item["true_class"],
                fill="black",
                font=small_font
            )

            draw.text(
                (x + 8, y + 248),
                "PRED: " + item["predicted_class"],
                fill="black",
                font=small_font
            )

            draw.text(
                (x + 8, y + 266),
                f"CONF: {item['confidence'] * 100:.1f}%",
                fill="black",
                font=small_font
            )

        except Exception as exc:

            draw.text(
                (x + 8, y + 230),
                f"ERROR: {exc}",
                fill="black",
                font=small_font
            )

    canvas.save(
        output_path,
        quality=95
    )

    print(
        f"Saved: {output_path}"
    )


# ============================================================
# MAIN
# ============================================================

def main():

    print()
    print("=" * 72)
    print(
        "VISIONINSPECT AI - VISUAL MISCLASSIFICATION INSPECTOR"
    )
    print("=" * 72)

    print()
    print("NO TRAINING")
    print("NO MODEL WEIGHTS MODIFIED")

    set_seed()

    print()
    print("Loading validation split...")

    samples = collect_samples()

    _, val_samples = split_samples(
        samples
    )

    print(
        f"Validation images: {len(val_samples)}"
    )

    dataset = DefectDataset(
        val_samples
    )

    loader = DataLoader(
        dataset,
        batch_size=BATCH_SIZE,
        shuffle=False,
        num_workers=0
    )

    print("Loading model...")

    checkpoint = torch.load(
        MODEL_PATH,
        map_location=DEVICE
    )

    model = FineDetailCNN().to(
        DEVICE
    )

    model.load_state_dict(
        checkpoint["model_state_dict"]
    )

    model.eval()

    print("Running predictions...")

    mistakes = get_misclassifications(
        model,
        loader
    )

    print()
    print(
        f"Total misclassified images: "
        f"{len(mistakes)}"
    )

    # --------------------------------------------------------
    # CSV
    # --------------------------------------------------------

    csv_path = os.path.join(
        OUTPUT_DIR,
        "all_misclassified_images.csv"
    )

    with open(
        csv_path,
        "w",
        newline="",
        encoding="utf-8"
    ) as file:

        writer = csv.DictWriter(
            file,
            fieldnames=[
                "path",
                "true_class",
                "predicted_class",
                "confidence",
            ]
        )

        writer.writeheader()

        writer.writerows(
            mistakes
        )

    print(
        f"Saved: {csv_path}"
    )

    # --------------------------------------------------------
    # OVERALL
    # --------------------------------------------------------

    make_montage(
        mistakes,
        os.path.join(
            OUTPUT_DIR,
            "ALL_misclassifications.jpg"
        ),
        "ALL DEFECT MISCLASSIFICATIONS",
        max_images=50,
        columns=5
    )

    # --------------------------------------------------------
    # IMPORTANT CATEGORIES
    # --------------------------------------------------------

    target_categories = [
        "capsule",
        "pill",
        "zipper",
        "wood",
        "screw",
    ]

    for category in target_categories:

        category_mistakes = [
            item
            for item in mistakes
            if item["true_class"].startswith(
                category + "::"
            )
        ]

        # Sort by confidence, highest first.
        # High-confidence mistakes are especially useful.
        category_mistakes.sort(
            key=lambda x: x["confidence"],
            reverse=True
        )

        make_montage(
            category_mistakes,
            os.path.join(
                OUTPUT_DIR,
                f"{category}_misclassifications.jpg"
            ),
            f"{category.upper()} MISCLASSIFICATIONS",
            max_images=25,
            columns=5
        )

    # --------------------------------------------------------
    # SUMMARY
    # --------------------------------------------------------

    print()
    print("=" * 72)
    print("COMPLETE")
    print("=" * 72)

    print()
    print(
        "Open the generated JPG files in:"
    )

    print(
        OUTPUT_DIR
    )

    print()
    print(
        "Inspect these first:"
    )

    for category in target_categories:

        print(
            f"  {category}_misclassifications.jpg"
        )

    print()
    print(
        "NO TRAINING WAS PERFORMED."
    )


if __name__ == "__main__":
    main()