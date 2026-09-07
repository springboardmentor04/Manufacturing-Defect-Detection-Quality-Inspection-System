"""
VISIONINSPECT AI - DEFECT MODEL DIAGNOSTICS

Evaluation only.
NO TRAINING.
NO MODEL WEIGHTS ARE MODIFIED.
"""

import os
import json
import random
from collections import Counter

import numpy as np
import torch
import torch.nn as nn
from PIL import Image
from torch.utils.data import Dataset, DataLoader
from torchvision import transforms
from sklearn.metrics import (
    accuracy_score,
    precision_recall_fscore_support,
    confusion_matrix,
)

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

RESULTS_DIR = os.path.join(
    "app",
    "ai",
    "evaluation_results",
    "defect_models",
)

os.makedirs(RESULTS_DIR, exist_ok=True)


# ============================================================
# CATEGORIES
# ============================================================

CATEGORIES = [
    "bottle",
    "cable",
    "capsule",
    "carpet",
    "grid",
    "hazelnut",
    "leather",
    "metal_nut",
    "pill",
    "screw",
    "tile",
    "toothbrush",
    "transistor",
    "wood",
    "zipper",
]


# ============================================================
# DEFECT CLASSES
# ============================================================

DEFECT_CLASSES = {
    "bottle": [
        "broken_large",
        "broken_small",
        "contamination",
    ],

    "cable": [
        "bent_wire",
        "cable_swap",
        "combined",
        "cut_inner_insulation",
        "cut_outer_insulation",
        "missing_cable",
        "missing_wire",
        "poke_insulation",
    ],

    "capsule": [
        "crack",
        "faulty_imprint",
        "poke",
        "scratch",
        "squeeze",
    ],

    "carpet": [
        "color",
        "cut",
        "hole",
        "metal_contamination",
        "thread",
    ],

    "grid": [
        "bent",
        "broken",
        "glue",
        "metal_contamination",
        "thread",
    ],

    "hazelnut": [
        "crack",
        "cut",
        "hole",
        "print",
    ],

    "leather": [
        "color",
        "cut",
        "fold",
        "glue",
        "poke",
    ],

    "metal_nut": [
        "bent",
        "color",
        "flip",
        "scratch",
    ],

    "pill": [
        "color",
        "combined",
        "contamination",
        "crack",
        "faulty_imprint",
        "pill_type",
        "scratch",
    ],

    "screw": [
        "manipulated_front",
        "scratch_head",
        "scratch_neck",
        "thread_side",
        "thread_top",
    ],

    "tile": [
        "crack",
        "glue_strip",
        "gray_stroke",
        "oil",
        "rough",
    ],

    "toothbrush": [
        "defective",
    ],

    "transistor": [
        "bent_lead",
        "cut_lead",
        "damaged_case",
        "misplaced",
    ],

    "wood": [
        "color",
        "combined",
        "hole",
        "liquid",
        "scratch",
    ],

    "zipper": [
        "broken_teeth",
        "combined",
        "fabric_border",
        "fabric_interior",
        "rough",
        "split_teeth",
        "squeezed_teeth",
    ],
}


# ============================================================
# CONFIG
# ============================================================

IMAGE_SIZE = 256
BATCH_SIZE = 16
VAL_RATIO = 0.20
SEED = 42

DEVICE = torch.device(
    "cuda" if torch.cuda.is_available() else "cpu"
)

CATEGORY_TO_INDEX = {
    category: index
    for index, category in enumerate(CATEGORIES)
}

INDEX_TO_CATEGORY = {
    index: category
    for category, index in CATEGORY_TO_INDEX.items()
}


# ============================================================
# GLOBAL CLASS MAPPING
# ============================================================

GLOBAL_CLASS_NAMES = []
GLOBAL_CLASS_TO_INDEX = {}
GLOBAL_INDEX_TO_CLASS = {}

for category in CATEGORIES:

    for defect in DEFECT_CLASSES[category]:

        full_name = f"{category}::{defect}"

        index = len(GLOBAL_CLASS_NAMES)

        GLOBAL_CLASS_NAMES.append(full_name)

        GLOBAL_CLASS_TO_INDEX[full_name] = index

        GLOBAL_INDEX_TO_CLASS[index] = full_name


# ============================================================
# SEED
# ============================================================

def set_seed(seed=SEED):

    random.seed(seed)

    np.random.seed(seed)

    torch.manual_seed(seed)

    if torch.cuda.is_available():

        torch.cuda.manual_seed_all(seed)


set_seed()


# ============================================================
# VALIDATION TRANSFORM
# EXACT SAME AS TRAINING
# ============================================================

VAL_TRANSFORM = transforms.Compose([

    transforms.Resize(
        (IMAGE_SIZE, IMAGE_SIZE)
    ),

    transforms.ToTensor(),

    transforms.Normalize(
        [0.5, 0.5, 0.5],
        [0.5, 0.5, 0.5]
    ),
])


# ============================================================
# COLLECT DATA
# ============================================================

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

        for defect in sorted(
            os.listdir(test_dir)
        ):

            if defect == "good":

                continue

            folder = os.path.join(
                test_dir,
                defect
            )

            if not os.path.isdir(folder):

                continue

            full_name = (
                f"{category}::{defect}"
            )

            for filename in sorted(
                os.listdir(folder)
            ):

                image_path = os.path.join(
                    folder,
                    filename
                )

                if not os.path.isfile(
                    image_path
                ):

                    continue

                samples.append({

                    "image_path": image_path,

                    "category": category,

                    "category_index":
                        CATEGORY_TO_INDEX[category],

                    "defect_type": defect,

                    "class_name": full_name,

                    "global_label":
                        GLOBAL_CLASS_TO_INDEX[
                            full_name
                        ],
                })

    return samples


# ============================================================
# EXACT SAME SPLIT AS TRAINING
# ============================================================

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

        image = VAL_TRANSFORM(image)

        return (
            image,

            torch.tensor(
                sample["category_index"],
                dtype=torch.long
            ),

            torch.tensor(
                sample["global_label"],
                dtype=torch.long
            ),

            sample["image_path"],
        )


# ============================================================
# EXACT SAME MODEL ARCHITECTURE
# ============================================================

class FineDetailCNN(nn.Module):

    def __init__(self):

        super().__init__()

        def block(
            in_channels,
            out_channels
        ):

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

                nn.ReLU(
                    inplace=True
                ),

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

                nn.ReLU(
                    inplace=True
                ),

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

            nn.ReLU(
                inplace=True
            ),

            nn.Dropout(0.20),
        )

        self.category_head = nn.Linear(
            256,
            len(CATEGORIES)
        )

        self.defect_heads = nn.ModuleDict({

            category: nn.Linear(
                256,
                len(
                    DEFECT_CLASSES[
                        category
                    ]
                )
            )

            for category in CATEGORIES
        })

    def extract_features(self, x):

        x = self.features(x)

        avg_features = (
            self.detail_avg(x)
        )

        max_features = (
            self.detail_max(x)
        )

        x = torch.cat(
            [
                avg_features,
                max_features
            ],
            dim=1
        )

        return self.projection(x)

    def forward(self, x):

        features = (
            self.extract_features(x)
        )

        category_logits = (
            self.category_head(features)
        )

        return (
            features,
            category_logits
        )


# ============================================================
# DIAGNOSTIC EVALUATION
# ============================================================

@torch.no_grad()
def run_diagnostics(
    model,
    loader
):

    model.eval()

    rows = []

    for (
        images,
        categories,
        global_labels,
        paths
    ) in loader:

        images = images.to(DEVICE)

        categories = categories.to(
            DEVICE
        )

        global_labels = global_labels.to(
            DEVICE
        )

        features, category_logits = (
            model(images)
        )

        predicted_categories = (
            category_logits.argmax(dim=1)
        )

        for i in range(
            images.size(0)
        ):

            true_category_idx = int(
                categories[i].item()
            )

            true_category = (
                INDEX_TO_CATEGORY[
                    true_category_idx
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

            true_defect = (
                true_class.split(
                    "::",
                    1
                )[1]
            )

            # ------------------------------------------------
            # ORACLE
            # Uses TRUE category.
            # ------------------------------------------------

            oracle_head = (
                model.defect_heads[
                    true_category
                ]
            )

            oracle_logits = oracle_head(
                features[i:i + 1]
            )

            oracle_local = int(
                oracle_logits.argmax(
                    dim=1
                ).item()
            )

            oracle_defect = (
                DEFECT_CLASSES[
                    true_category
                ][oracle_local]
            )

            oracle_global = (
                GLOBAL_CLASS_TO_INDEX[
                    f"{true_category}::{oracle_defect}"
                ]
            )

            # ------------------------------------------------
            # EXACT
            # Uses PREDICTED category.
            # ------------------------------------------------

            predicted_category_idx = int(
                predicted_categories[i].item()
            )

            predicted_category = (
                INDEX_TO_CATEGORY[
                    predicted_category_idx
                ]
            )

            exact_head = (
                model.defect_heads[
                    predicted_category
                ]
            )

            exact_logits = exact_head(
                features[i:i + 1]
            )

            exact_local = int(
                exact_logits.argmax(
                    dim=1
                ).item()
            )

            exact_defect = (
                DEFECT_CLASSES[
                    predicted_category
                ][exact_local]
            )

            exact_global = (
                GLOBAL_CLASS_TO_INDEX[
                    f"{predicted_category}::{exact_defect}"
                ]
            )

            rows.append({

                "path": paths[i],

                "true_class":
                    true_class,

                "true_category":
                    true_category,

                "true_defect":
                    true_defect,

                "pred_category":
                    predicted_category,

                "exact_class":
                    GLOBAL_INDEX_TO_CLASS[
                        exact_global
                    ],

                "exact_correct":
                    exact_global ==
                    true_global,

                "oracle_class":
                    GLOBAL_INDEX_TO_CLASS[
                        oracle_global
                    ],

                "oracle_correct":
                    oracle_global ==
                    true_global,
            })

    return rows


# ============================================================
# MAIN
# ============================================================

def main():

    print()
    print("=" * 72)
    print(
        "VISIONINSPECT AI - DEFECT MODEL DIAGNOSTICS"
    )
    print("=" * 72)

    print()
    print("EVALUATION ONLY")
    print("NO TRAINING")
    print("NO MODEL WEIGHTS MODIFIED")

    print()
    print(f"Device: {DEVICE}")
    print(
        f"Model: {MODEL_PATH}"
    )

    # --------------------------------------------------------
    # DATA
    # --------------------------------------------------------

    samples = collect_samples()

    train_samples, val_samples = (
        split_samples(samples)
    )

    print()
    print(
        f"Total defective images : "
        f"{len(samples)}"
    )

    print(
        f"Training split         : "
        f"{len(train_samples)}"
    )

    print(
        f"Validation split       : "
        f"{len(val_samples)}"
    )

    # --------------------------------------------------------
    # VALIDATION LOADER
    # --------------------------------------------------------

    dataset = DefectDataset(
        val_samples
    )

    loader = DataLoader(
        dataset,
        batch_size=BATCH_SIZE,
        shuffle=False,
        num_workers=0
    )

    # --------------------------------------------------------
    # LOAD MODEL
    # --------------------------------------------------------

    checkpoint = torch.load(
        MODEL_PATH,
        map_location=DEVICE
    )

    model = FineDetailCNN().to(
        DEVICE
    )

    model.load_state_dict(
        checkpoint[
            "model_state_dict"
        ]
    )

    model.eval()

    # --------------------------------------------------------
    # RUN
    # --------------------------------------------------------

    rows = run_diagnostics(
        model,
        loader
    )

    true = [
        GLOBAL_CLASS_TO_INDEX[
            row["true_class"]
        ]
        for row in rows
    ]

    exact = [
        GLOBAL_CLASS_TO_INDEX[
            row["exact_class"]
        ]
        for row in rows
    ]

    oracle = [
        GLOBAL_CLASS_TO_INDEX[
            row["oracle_class"]
        ]
        for row in rows
    ]

    labels = list(
        range(
            len(GLOBAL_CLASS_NAMES)
        )
    )

    # ========================================================
    # OVERALL
    # ========================================================

    exact_accuracy = (
        accuracy_score(
            true,
            exact
        )
    )

    oracle_accuracy = (
        accuracy_score(
            true,
            oracle
        )
    )

    print()
    print("-" * 72)
    print("OVERALL")
    print("-" * 72)

    print(
        f"Exact accuracy  : "
        f"{exact_accuracy * 100:.2f}%"
    )

    print(
        f"Oracle accuracy : "
        f"{oracle_accuracy * 100:.2f}%"
    )

    # ========================================================
    # PER CLASS
    # ========================================================

    precision, recall, f1, support = (
        precision_recall_fscore_support(
            true,
            oracle,
            labels=labels,
            zero_division=0
        )
    )

    class_report = []

    for index, name in enumerate(
        GLOBAL_CLASS_NAMES
    ):

        category, defect = (
            name.split(
                "::",
                1
            )
        )

        class_report.append({

            "class": name,

            "category": category,

            "defect": defect,

            "support":
                int(support[index]),

            "precision":
                float(
                    precision[index]
                ),

            "recall":
                float(
                    recall[index]
                ),

            "f1":
                float(
                    f1[index]
                ),
        })

    class_report.sort(
        key=lambda x: x["f1"]
    )

    print()
    print("-" * 72)
    print(
        "WORST DEFECT CLASSES "
        "- ORACLE ROUTING"
    )
    print("-" * 72)

    print(
        f"{'Class':35s}"
        f"{'N':>5s}"
        f"{'P':>8s}"
        f"{'R':>8s}"
        f"{'F1':>8s}"
    )

    for item in class_report[:20]:

        print(
            f"{item['class'][:35]:35s}"
            f"{item['support']:5d}"
            f"{item['precision'] * 100:7.1f}%"
            f"{item['recall'] * 100:7.1f}%"
            f"{item['f1'] * 100:7.1f}%"
        )

    # ========================================================
    # CATEGORY STATISTICS
    # ========================================================

    category_stats = {}

    for category in CATEGORIES:

        category_rows = [
            row
            for row in rows
            if row["true_category"] == category
        ]

        correct = sum(
            row["oracle_correct"]
            for row in category_rows
        )

        total = len(
            category_rows
        )

        category_stats[category] = {

            "correct":
                correct,

            "total":
                total,

            "accuracy":
                (
                    correct / total
                    if total
                    else 0.0
                ),
        }

    print()
    print("-" * 72)
    print(
        "PER-CATEGORY DEFECT ACCURACY "
        "- ORACLE ROUTING"
    )
    print("-" * 72)

    for category, stats in sorted(
        category_stats.items(),
        key=lambda x: x[1]["accuracy"]
    ):

        print(
            f"{category:15s}"
            f"{stats['correct']:3d}/"
            f"{stats['total']:3d}"
            f"  "
            f"({stats['accuracy'] * 100:6.2f}%)"
        )

    # ========================================================
    # CONFUSION PAIRS
    # ========================================================

    confusion_counts = Counter()

    for row in rows:

        if (
            row["true_class"]
            != row["oracle_class"]
        ):

            confusion_counts[
                (
                    row["true_class"],
                    row["oracle_class"]
                )
            ] += 1

    print()
    print("-" * 72)
    print(
        "TOP CONFUSION PAIRS "
        "- ORACLE ROUTING"
    )
    print("-" * 72)

    if confusion_counts:

        for (
            pair,
            count
        ) in confusion_counts.most_common(30):

            true_name, predicted_name = pair

            print(
                f"{count:3d}  "
                f"{true_name}"
                f"  ->  "
                f"{predicted_name}"
            )

    else:

        print(
            "No confusion pairs."
        )

    # ========================================================
    # CONFUSION MATRIX
    # ========================================================

    cm = confusion_matrix(
        true,
        oracle,
        labels=labels
    )

    cm_path = os.path.join(
        RESULTS_DIR,
        "defect_oracle_confusion_matrix.npy"
    )

    np.save(
        cm_path,
        cm
    )

    # ========================================================
    # JSON
    # ========================================================

    category_accuracy = (
        sum(
            row["true_category"]
            == row["pred_category"]
            for row in rows
        )
        /
        max(
            len(rows),
            1
        )
    )

    output = {

        "model_path":
            MODEL_PATH,

        "evaluation_type":
            "validation_split_only",

        "pretrained":
            False,

        "total_samples":
            len(samples),

        "validation_samples":
            len(val_samples),

        "exact_accuracy":
            float(
                exact_accuracy
            ),

        "oracle_accuracy":
            float(
                oracle_accuracy
            ),

        "category_accuracy":
            float(
                category_accuracy
            ),

        "per_class":
            class_report,

        "per_category":
            category_stats,

        "top_confusions": [

            {
                "true":
                    true_name,

                "predicted":
                    predicted_name,

                "count":
                    int(count),
            }

            for (
                (true_name, predicted_name),
                count
            )
            in confusion_counts.most_common(50)
        ],

        "validation_rows":
            rows,
    }

    json_path = os.path.join(
        RESULTS_DIR,
        "defect_class_diagnostic_report.json"
    )

    with open(
        json_path,
        "w",
        encoding="utf-8"
    ) as file:

        json.dump(
            output,
            file,
            indent=2
        )

    # ========================================================
    # CSV
    # ========================================================

    csv_path = os.path.join(
        RESULTS_DIR,
        "defect_class_diagnostic_report.csv"
    )

    with open(
        csv_path,
        "w",
        encoding="utf-8"
    ) as file:

        file.write(
            "class,category,defect,"
            "support,precision,recall,f1\n"
        )

        for item in class_report:

            file.write(
                f"{item['class']},"
                f"{item['category']},"
                f"{item['defect']},"
                f"{item['support']},"
                f"{item['precision']:.6f},"
                f"{item['recall']:.6f},"
                f"{item['f1']:.6f}\n"
            )

    # ========================================================
    # DONE
    # ========================================================

    print()
    print("-" * 72)
    print("FILES SAVED")
    print("-" * 72)

    print(json_path)

    print(csv_path)

    print(cm_path)

    print()
    print(
        "Diagnostics complete."
    )

    print(
        "NO TRAINING WAS PERFORMED."
    )


if __name__ == "__main__":

    main()