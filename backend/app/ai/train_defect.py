"""
VISIONINSPECT AI - FINAL DEFECT CLASSIFICATION TRAINER

Custom CNN from scratch.
NO pretrained models.
NO ImageNet weights.
NO transfer learning.

Design:
    Full product image
        -> shared fine-detail CNN
        -> product category head (15)
        -> category-specific defect head

Important:
    - mixed-category batches
    - fine-detail feature maps are preserved
    - no color jitter (color can itself be a defect)
    - class-balanced sampling
    - correct per-sample oracle metric alignment
"""

import os
import json
import random
from collections import Counter

import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from PIL import Image
from torch.utils.data import Dataset, DataLoader, WeightedRandomSampler
from torchvision import transforms
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score

DATASET_ROOT = os.path.join("dataset", "mvtec_ad")
MODEL_DIR = os.path.join("app", "ai", "saved_models", "defect_models")
RESULTS_DIR = os.path.join("app", "ai", "evaluation_results", "defect_models")
os.makedirs(MODEL_DIR, exist_ok=True)
os.makedirs(RESULTS_DIR, exist_ok=True)

CATEGORIES = [
    "bottle", "cable", "capsule", "carpet", "grid",
    "hazelnut", "leather", "metal_nut", "pill", "screw",
    "tile", "toothbrush", "transistor", "wood", "zipper"
]

DEFECT_CLASSES = {
    "bottle": ["broken_large", "broken_small", "contamination"],
    "cable": ["bent_wire", "cable_swap", "combined", "cut_inner_insulation",
              "cut_outer_insulation", "missing_cable", "missing_wire", "poke_insulation"],
    "capsule": ["crack", "faulty_imprint", "poke", "scratch", "squeeze"],
    "carpet": ["color", "cut", "hole", "metal_contamination", "thread"],
    "grid": ["bent", "broken", "glue", "metal_contamination", "thread"],
    "hazelnut": ["crack", "cut", "hole", "print"],
    "leather": ["color", "cut", "fold", "glue", "poke"],
    "metal_nut": ["bent", "color", "flip", "scratch"],
    "pill": ["color", "combined", "contamination", "crack", "faulty_imprint", "pill_type", "scratch"],
    "screw": ["manipulated_front", "scratch_head", "scratch_neck", "thread_side", "thread_top"],
    "tile": ["crack", "glue_strip", "gray_stroke", "oil", "rough"],
    "toothbrush": ["defective"],
    "transistor": ["bent_lead", "cut_lead", "damaged_case", "misplaced"],
    "wood": ["color", "combined", "hole", "liquid", "scratch"],
    "zipper": ["broken_teeth", "combined", "fabric_border", "fabric_interior",
               "rough", "split_teeth", "squeezed_teeth"],
}

IMAGE_SIZE = 256
BATCH_SIZE = 16
LEARNING_RATE = 0.0003
WEIGHT_DECAY = 0.0001
EPOCHS = 30
PATIENCE = 7
VAL_RATIO = 0.20
CATEGORY_LOSS_WEIGHT = 1.0
SEED = 42

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

CATEGORY_TO_INDEX = {c: i for i, c in enumerate(CATEGORIES)}
INDEX_TO_CATEGORY = {i: c for c, i in CATEGORY_TO_INDEX.items()}

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

NUM_GLOBAL_CLASSES = len(GLOBAL_CLASS_NAMES)


def set_seed(seed=SEED):
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)


set_seed()


TRAIN_TRANSFORM = transforms.Compose([
    transforms.Resize((IMAGE_SIZE, IMAGE_SIZE)),
    transforms.RandomHorizontalFlip(p=0.5),
    transforms.RandomRotation(degrees=3),
    transforms.ToTensor(),
    transforms.Normalize(
        [0.5, 0.5, 0.5],
        [0.5, 0.5, 0.5]
    ),
])

VAL_TRANSFORM = transforms.Compose([
    transforms.Resize((IMAGE_SIZE, IMAGE_SIZE)),
    transforms.ToTensor(),
    transforms.Normalize(
        [0.5, 0.5, 0.5],
        [0.5, 0.5, 0.5]
    ),
])


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

            full_name = f"{category}::{defect}"

            for filename in sorted(os.listdir(folder)):
                image_path = os.path.join(
                    folder,
                    filename
                )

                if not os.path.isfile(image_path):
                    continue

                samples.append({
                    "image_path": image_path,
                    "category": category,
                    "category_index": CATEGORY_TO_INDEX[category],
                    "defect_type": defect,
                    "class_name": full_name,
                    "global_label": GLOBAL_CLASS_TO_INDEX[full_name],
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

        val_samples.extend(items[:val_count])
        train_samples.extend(items[val_count:])

    random.shuffle(train_samples)
    random.shuffle(val_samples)

    return train_samples, val_samples


class DefectDataset(Dataset):

    def __init__(
        self,
        samples,
        transform
    ):
        self.samples = samples
        self.transform = transform

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, index):
        sample = self.samples[index]

        image = Image.open(
            sample["image_path"]
        ).convert("RGB")

        image = self.transform(image)

        category = torch.tensor(
            sample["category_index"],
            dtype=torch.long
        )

        global_label = torch.tensor(
            sample["global_label"],
            dtype=torch.long
        )

        return (
            image,
            category,
            global_label
        )


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

                nn.MaxPool2d(2)
            )

        self.features = nn.Sequential(
            block(3, 32),       # 256 -> 128
            block(32, 64),      # 128 -> 64
            block(64, 128),     # 64 -> 32
            block(128, 256),    # 32 -> 16
        )

        # Keep spatial defect information instead of reducing
        # everything immediately to one 1x1 vector.
        self.detail_avg = nn.AdaptiveAvgPool2d((4, 4))
        self.detail_max = nn.AdaptiveMaxPool2d((4, 4))

        self.projection = nn.Sequential(
            nn.Flatten(),
            nn.Linear(
                256 * 4 * 4 * 2,
                256
            ),
            nn.ReLU(inplace=True),
            nn.Dropout(0.20)
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

        category_logits = self.category_head(
            features
        )

        return (
            features,
            category_logits
        )


def make_global_weights(train_samples):
    counts = Counter(
        sample["global_label"]
        for sample in train_samples
    )

    return {
        label: 1.0 / np.sqrt(count)
        for label, count in counts.items()
    }


def local_target(
    global_labels,
    category_name
):
    names = DEFECT_CLASSES[
        category_name
    ]

    local_map = {
        name: index
        for index, name in enumerate(names)
    }

    targets = []

    for global_label in global_labels.tolist():
        full_name = GLOBAL_INDEX_TO_CLASS[
            int(global_label)
        ]

        defect_name = full_name.split(
            "::",
            1
        )[1]

        targets.append(
            local_map[defect_name]
        )

    return torch.tensor(
        targets,
        dtype=torch.long,
        device=global_labels.device
    )


def create_category_criteria(
    train_samples
):
    criteria = {}

    for category in CATEGORIES:

        defect_names = DEFECT_CLASSES[
            category
        ]

        local_map = {
            name: index
            for index, name
            in enumerate(defect_names)
        }

        counts = np.ones(
            len(defect_names),
            dtype=np.float32
        )

        for sample in train_samples:

            if sample["category"] != category:
                continue

            local_index = local_map[
                sample["defect_type"]
            ]

            counts[local_index] += 1

        weights = (
            1.0 /
            np.sqrt(counts)
        )

        weights = (
            weights /
            max(weights.mean(), 1e-8)
        )

        weights = np.clip(
            weights,
            0.75,
            1.75
        )

        criteria[category] = nn.CrossEntropyLoss(
            weight=torch.tensor(
                weights,
                dtype=torch.float32,
                device=DEVICE
            ),
            label_smoothing=0.01
        )

    return criteria


def train_one_epoch(
    model,
    loader,
    criteria,
    optimizer
):
    model.train()

    running_loss = 0.0
    total_samples = 0

    defect_correct = 0
    category_correct = 0

    for (
        images,
        categories,
        global_labels
    ) in loader:

        images = images.to(DEVICE)
        categories = categories.to(DEVICE)
        global_labels = global_labels.to(DEVICE)

        optimizer.zero_grad()

        features, category_logits = model(
            images
        )

        category_loss = nn.functional.cross_entropy(
            category_logits,
            categories
        )

        defect_losses = []

        batch_defect_correct = 0

        # IMPORTANT:
        # The batch contains mixed categories.
        # Each category's samples are sent to its own head.
        for category_index_tensor in torch.unique(
            categories
        ):

            category_index = int(
                category_index_tensor.item()
            )

            category_name = INDEX_TO_CATEGORY[
                category_index
            ]

            category_mask = (
                categories ==
                category_index_tensor
            )

            category_features = features[
                category_mask
            ]

            category_global_labels = global_labels[
                category_mask
            ]

            local_targets = local_target(
                category_global_labels,
                category_name
            )

            defect_logits = model.defect_heads[
                category_name
            ](
                category_features
            )

            defect_loss = criteria[
                category_name
            ](
                defect_logits,
                local_targets
            )

            defect_losses.append(
                defect_loss
            )

            batch_defect_correct += int(
                (
                    defect_logits.argmax(dim=1)
                    ==
                    local_targets
                ).sum().item()
            )

        defect_loss = torch.stack(
            defect_losses
        ).mean()

        total_loss = (
            defect_loss
            +
            CATEGORY_LOSS_WEIGHT
            *
            category_loss
        )

        total_loss.backward()

        torch.nn.utils.clip_grad_norm_(
            model.parameters(),
            max_norm=5.0
        )

        optimizer.step()

        batch_size = images.size(0)

        running_loss += (
            total_loss.item()
            *
            batch_size
        )

        total_samples += batch_size

        defect_correct += (
            batch_defect_correct
        )

        category_correct += int(
            (
                category_logits.argmax(dim=1)
                ==
                categories
            ).sum().item()
        )

    return {
        "loss":
            running_loss /
            max(total_samples, 1),

        "defect_accuracy":
            defect_correct /
            max(total_samples, 1),

        "category_accuracy":
            category_correct /
            max(total_samples, 1)
    }


@torch.no_grad()
def evaluate(
    model,
    loader,
    criteria
):
    model.eval()

    exact_predictions = []
    exact_labels = []

    oracle_predictions = []
    oracle_labels = []

    category_predictions = []
    category_labels = []

    total_loss = 0.0
    total_items = 0

    for (
        images,
        categories,
        global_labels
    ) in loader:

        images = images.to(DEVICE)
        categories = categories.to(DEVICE)
        global_labels = global_labels.to(DEVICE)

        features, category_logits = model(
            images
        )

        predicted_categories = (
            category_logits.argmax(dim=1)
        )

        category_loss = nn.functional.cross_entropy(
            category_logits,
            categories
        )

        # Pre-allocate by ORIGINAL sample position.
        # This prevents category-group ordering bugs.
        oracle_global = [
            -1
            for _ in range(images.size(0))
        ]

        defect_losses = []

        for category_index_tensor in torch.unique(
            categories
        ):

            category_index = int(
                category_index_tensor.item()
            )

            category_name = INDEX_TO_CATEGORY[
                category_index
            ]

            category_mask = (
                categories ==
                category_index_tensor
            )

            positions = (
                category_mask
                .nonzero(
                    as_tuple=False
                )
                .flatten()
            )

            category_features = features[
                category_mask
            ]

            category_global_labels = global_labels[
                category_mask
            ]

            local_targets = local_target(
                category_global_labels,
                category_name
            )

            defect_logits = model.defect_heads[
                category_name
            ](
                category_features
            )

            defect_losses.append(
                criteria[category_name](
                    defect_logits,
                    local_targets
                )
            )

            predicted_local = (
                defect_logits.argmax(dim=1)
            )

            for j, position in enumerate(
                positions.tolist()
            ):

                predicted_defect = (
                    DEFECT_CLASSES[
                        category_name
                    ][
                        int(
                            predicted_local[j].item()
                        )
                    ]
                )

                oracle_global[position] = (
                    GLOBAL_CLASS_TO_INDEX[
                        f"{category_name}::{predicted_defect}"
                    ]
                )

        # End-to-end prediction
        for i in range(
            images.size(0)
        ):

            predicted_category_index = int(
                predicted_categories[i].item()
            )

            predicted_category_name = (
                INDEX_TO_CATEGORY[
                    predicted_category_index
                ]
            )

            selected_head = (
                model.defect_heads[
                    predicted_category_name
                ]
            )

            selected_logits = selected_head(
                features[i:i + 1]
            )

            predicted_local = int(
                selected_logits.argmax(
                    dim=1
                ).item()
            )

            predicted_defect = (
                DEFECT_CLASSES[
                    predicted_category_name
                ][predicted_local]
            )

            predicted_global = (
                GLOBAL_CLASS_TO_INDEX[
                    f"{predicted_category_name}::{predicted_defect}"
                ]
            )

            actual_global = int(
                global_labels[i].item()
            )

            exact_predictions.append(
                predicted_global
            )

            exact_labels.append(
                actual_global
            )

            oracle_predictions.append(
                oracle_global[i]
            )

            oracle_labels.append(
                actual_global
            )

            category_predictions.append(
                predicted_category_index
            )

            category_labels.append(
                int(categories[i].item())
            )

        if len(defect_losses) == 1:
            defect_loss = defect_losses[0]
        else:
            defect_loss = torch.stack(
                defect_losses
            ).mean()

        batch_loss = (
            defect_loss
            +
            CATEGORY_LOSS_WEIGHT
            *
            category_loss
        )

        batch_size = images.size(0)

        total_loss += (
            batch_loss.item()
            *
            batch_size
        )

        total_items += batch_size

    return {
        "loss":
            total_loss /
            max(total_items, 1),

        "exact_accuracy":
            accuracy_score(
                exact_labels,
                exact_predictions
            ),

        "exact_precision":
            precision_score(
                exact_labels,
                exact_predictions,
                average="weighted",
                zero_division=0
            ),

        "exact_recall":
            recall_score(
                exact_labels,
                exact_predictions,
                average="weighted",
                zero_division=0
            ),

        "exact_f1":
            f1_score(
                exact_labels,
                exact_predictions,
                average="weighted",
                zero_division=0
            ),

        "oracle_accuracy":
            accuracy_score(
                oracle_labels,
                oracle_predictions
            ),

        "oracle_f1":
            f1_score(
                oracle_labels,
                oracle_predictions,
                average="weighted",
                zero_division=0
            ),

        "category_accuracy":
            accuracy_score(
                category_labels,
                category_predictions
            )
    }


def save_category_models(model):

    state = model.state_dict()

    for category in CATEGORIES:

        defect_names = (
            DEFECT_CLASSES[
                category
            ]
        )

        exported = {
            "model_state_dict": {},
            "category": category,
            "class_names": defect_names,
            "num_classes": len(defect_names),
            "image_size": IMAGE_SIZE,
            "pretrained": False,
            "architecture":
                "fine_detail_custom_cnn_from_scratch"
        }

        for key, value in state.items():

            if (
                key.startswith("features.")
                or
                key.startswith("projection.")
            ):
                exported[
                    "model_state_dict"
                ][key] = (
                    value
                    .detach()
                    .cpu()
                    .clone()
                )

        head = model.defect_heads[
            category
        ]

        exported[
            "model_state_dict"
        ][
            "classifier.weight"
        ] = (
            head.weight
            .detach()
            .cpu()
            .clone()
        )

        exported[
            "model_state_dict"
        ][
            "classifier.bias"
        ] = (
            head.bias
            .detach()
            .cpu()
            .clone()
        )

        torch.save(
            exported,
            os.path.join(
                MODEL_DIR,
                f"{category}_defect_model.pth"
            )
        )


def main():

    print()
    print("=" * 70)
    print("VISIONINSPECT AI")
    print("FINAL DEFECT CLASSIFICATION")
    print("CUSTOM CNN - FROM SCRATCH")
    print("=" * 70)

    print(
        f"Device: {DEVICE}"
    )

    print(
        f"Categories: {len(CATEGORIES)}"
    )

    print(
        f"Defect classes: {NUM_GLOBAL_CLASSES}"
    )

    print(
        f"Image size: "
        f"{IMAGE_SIZE}x{IMAGE_SIZE}"
    )

    print(
        "Pretrained: NO"
    )

    print()

    samples = collect_samples()

    train_samples, val_samples = (
        split_samples(samples)
    )

    print(
        f"Total defective images: "
        f"{len(samples)}"
    )

    print(
        f"Training samples: "
        f"{len(train_samples)}"
    )

    print(
        f"Validation samples: "
        f"{len(val_samples)}"
    )

    print()
    print("Category split:")

    for category in CATEGORIES:

        train_count = sum(
            sample["category"] == category
            for sample in train_samples
        )

        val_count = sum(
            sample["category"] == category
            for sample in val_samples
        )

        print(
            f"  {category:<12}"
            f" train={train_count:3d}"
            f" val={val_count:3d}"
            f" classes={len(DEFECT_CLASSES[category])}"
        )

    train_dataset = DefectDataset(
        train_samples,
        TRAIN_TRANSFORM
    )

    val_dataset = DefectDataset(
        val_samples,
        VAL_TRANSFORM
    )

    global_weights = (
        make_global_weights(
            train_samples
        )
    )

    sampler_weights = [
        global_weights[
            sample["global_label"]
        ]
        for sample in train_samples
    ]

    sampler = WeightedRandomSampler(
        torch.tensor(
            sampler_weights,
            dtype=torch.double
        ),
        num_samples=len(train_samples),
        replacement=True
    )

    train_loader = DataLoader(
        train_dataset,
        batch_size=BATCH_SIZE,
        sampler=sampler,
        num_workers=0
    )

    val_loader = DataLoader(
        val_dataset,
        batch_size=BATCH_SIZE,
        shuffle=False,
        num_workers=0
    )

    model = FineDetailCNN().to(
        DEVICE
    )

    criteria = create_category_criteria(
        train_samples
    )

    optimizer = optim.AdamW(
        model.parameters(),
        lr=LEARNING_RATE,
        weight_decay=WEIGHT_DECAY
    )

    scheduler = (
        optim.lr_scheduler.ReduceLROnPlateau(
            optimizer,
            mode="max",
            factor=0.5,
            patience=3,
            min_lr=1e-6
        )
    )

    best_f1 = -1.0
    patience_counter = 0

    best_model_path = os.path.join(
        MODEL_DIR,
        "shared_category_aware_defect_model.pth"
    )

    for epoch in range(
        1,
        EPOCHS + 1
    ):

        train_metrics = train_one_epoch(
            model,
            train_loader,
            criteria,
            optimizer
        )

        val_metrics = evaluate(
            model,
            val_loader,
            criteria
        )

        scheduler.step(
            val_metrics["oracle_f1"]
        )

        print(
            f"Epoch {epoch:02d}/{EPOCHS} | "
            f"Train Loss {train_metrics['loss']:.4f} | "
            f"Train Defect "
            f"{train_metrics['defect_accuracy'] * 100:.2f}% | "
            f"Train Category "
            f"{train_metrics['category_accuracy'] * 100:.2f}% | "
            f"Val Exact "
            f"{val_metrics['exact_accuracy'] * 100:.2f}% | "
            f"Oracle "
            f"{val_metrics['oracle_accuracy'] * 100:.2f}% | "
            f"Category "
            f"{val_metrics['category_accuracy'] * 100:.2f}% | "
            f"Oracle F1 "
            f"{val_metrics['oracle_f1'] * 100:.2f}% | "
            f"LR "
            f"{optimizer.param_groups[0]['lr']:.7f}"
        )

        if (
            val_metrics["oracle_f1"]
            >
            best_f1
        ):

            best_f1 = (
                val_metrics["oracle_f1"]
            )

            patience_counter = 0

            torch.save(
                {
                    "model_state_dict":
                        model.state_dict(),
                    "categories":
                        CATEGORIES,
                    "defect_classes":
                        DEFECT_CLASSES,
                    "global_class_names":
                        GLOBAL_CLASS_NAMES,
                    "image_size":
                        IMAGE_SIZE,
                    "pretrained":
                        False,
                    "architecture":
                        "fine_detail_custom_cnn_from_scratch"
                },
                best_model_path
            )

            print(
                "  -> Best model saved."
            )

        else:

            patience_counter += 1

        if (
            patience_counter
            >= PATIENCE
        ):

            print(
                f"Early stopping after "
                f"{epoch} epochs."
            )

            break

    checkpoint = torch.load(
        best_model_path,
        map_location=DEVICE
    )

    model.load_state_dict(
        checkpoint["model_state_dict"]
    )

    final_metrics = evaluate(
        model,
        val_loader,
        criteria
    )

    print()
    print("=" * 70)
    print("FINAL MODEL RESULT")
    print("=" * 70)

    print(
        f"Exact Accuracy : "
        f"{final_metrics['exact_accuracy'] * 100:.2f}%"
    )

    print(
        f"Exact Precision: "
        f"{final_metrics['exact_precision'] * 100:.2f}%"
    )

    print(
        f"Exact Recall   : "
        f"{final_metrics['exact_recall'] * 100:.2f}%"
    )

    print(
        f"Exact F1       : "
        f"{final_metrics['exact_f1'] * 100:.2f}%"
    )

    print(
        f"Oracle Accuracy: "
        f"{final_metrics['oracle_accuracy'] * 100:.2f}%"
    )

    print(
        f"Oracle F1      : "
        f"{final_metrics['oracle_f1'] * 100:.2f}%"
    )

    print(
        f"Category Acc   : "
        f"{final_metrics['category_accuracy'] * 100:.2f}%"
    )

    results_path = os.path.join(
        RESULTS_DIR,
        "shared_category_aware_defect_evaluation.json"
    )

    with open(
        results_path,
        "w"
    ) as file:
        json.dump(
            final_metrics,
            file,
            indent=2
        )

    save_category_models(
        model
    )

    print()
    print("Training complete.")
    print(
        f"Shared model: "
        f"{best_model_path}"
    )
    print(
        f"Category models: "
        f"{MODEL_DIR}"
    )


if __name__ == "__main__":
    main()