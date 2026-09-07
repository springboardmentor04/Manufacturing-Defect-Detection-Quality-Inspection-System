"""
VISIONINSPECT AI
DEFECT CLASSIFICATION V3

Goal:
- Strong defect-focused representation
- Category-aware heads
- Focal loss
- Balanced sampling
- Full image + deterministic multi-scale crops
- No ImageNet
- No pretrained weights
- No transfer learning
"""

import os
import json
import random
from collections import Counter

import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
import torch.optim as optim

from PIL import Image
from torch.utils.data import Dataset, DataLoader, WeightedRandomSampler
from torchvision import transforms

from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    confusion_matrix,
    classification_report,
)


# ============================================================
# CONFIG
# ============================================================

DEVICE = torch.device(
    "cuda" if torch.cuda.is_available() else "cpu"
)

DATASET_ROOT = os.path.join(
    "dataset",
    "mvtec_ad"
)

MODEL_DIR = os.path.join(
    "app",
    "ai",
    "saved_models",
    "defect_models"
)

RESULTS_DIR = os.path.join(
    "app",
    "ai",
    "evaluation_results",
    "defect_models"
)

os.makedirs(
    MODEL_DIR,
    exist_ok=True
)

os.makedirs(
    RESULTS_DIR,
    exist_ok=True
)

IMAGE_SIZE = 256

BATCH_SIZE = 8

EPOCHS = 35

LEARNING_RATE = 0.00015

WEIGHT_DECAY = 0.0005

PATIENCE = 8

FOCAL_GAMMA = 2.0

SEED = 42


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


CATEGORY_TO_INDEX = {
    name: i
    for i, name in enumerate(CATEGORIES)
}

INDEX_TO_CATEGORY = {
    i: name
    for name, i in CATEGORY_TO_INDEX.items()
}


# ============================================================
# GLOBAL CLASS MAP
# ============================================================

GLOBAL_CLASS_NAMES = []

GLOBAL_CLASS_TO_INDEX = {}

GLOBAL_INDEX_TO_CLASS = {}

for category in CATEGORIES:

    for defect in DEFECT_CLASSES[category]:

        name = f"{category}::{defect}"

        index = len(
            GLOBAL_CLASS_NAMES
        )

        GLOBAL_CLASS_NAMES.append(
            name
        )

        GLOBAL_CLASS_TO_INDEX[name] = (
            index
        )

        GLOBAL_INDEX_TO_CLASS[index] = (
            name
        )


NUM_CLASSES = len(
    GLOBAL_CLASS_NAMES
)


# ============================================================
# SEED
# ============================================================

def seed_everything():

    random.seed(SEED)

    np.random.seed(SEED)

    torch.manual_seed(SEED)

    if torch.cuda.is_available():

        torch.cuda.manual_seed_all(
            SEED
        )


seed_everything()


# ============================================================
# TRANSFORMS
# ============================================================

train_transform = transforms.Compose([

    transforms.Resize(
        (IMAGE_SIZE, IMAGE_SIZE)
    ),

    transforms.RandomHorizontalFlip(
        0.5
    ),

    transforms.RandomVerticalFlip(
        0.15
    ),

    transforms.RandomRotation(
        5
    ),

    transforms.ColorJitter(
        brightness=0.12,
        contrast=0.12,
        saturation=0.08,
    ),

    transforms.ToTensor(),

    transforms.Normalize(
        [0.5, 0.5, 0.5],
        [0.5, 0.5, 0.5],
    ),
])


val_transform = transforms.Compose([

    transforms.Resize(
        (IMAGE_SIZE, IMAGE_SIZE)
    ),

    transforms.ToTensor(),

    transforms.Normalize(
        [0.5, 0.5, 0.5],
        [0.5, 0.5, 0.5],
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

        if not os.path.isdir(
            test_dir
        ):
            continue

        for defect in sorted(
            os.listdir(test_dir)
        ):

            if defect == "good":
                continue

            defect_dir = os.path.join(
                test_dir,
                defect
            )

            if not os.path.isdir(
                defect_dir
            ):
                continue

            class_name = (
                f"{category}::{defect}"
            )

            for filename in sorted(
                os.listdir(defect_dir)
            ):

                path = os.path.join(
                    defect_dir,
                    filename
                )

                if not os.path.isfile(
                    path
                ):
                    continue

                samples.append({

                    "image_path":
                        path,

                    "category":
                        category,

                    "category_index":
                        CATEGORY_TO_INDEX[
                            category
                        ],

                    "defect":
                        defect,

                    "class_name":
                        class_name,

                    "global_label":
                        GLOBAL_CLASS_TO_INDEX[
                            class_name
                        ],
                })

    return samples


# ============================================================
# STRATIFIED SPLIT
# ============================================================

def split_samples(
    samples,
    validation_ratio=0.20
):

    groups = {}

    for sample in samples:

        groups.setdefault(
            sample["class_name"],
            []
        ).append(sample)

    train = []

    val = []

    for class_name in sorted(
        groups
    ):

        items = groups[
            class_name
        ].copy()

        random.shuffle(
            items
        )

        if len(items) <= 1:

            train.extend(items)

            continue

        n_val = max(
            1,
            int(
                len(items)
                *
                validation_ratio
            )
        )

        if n_val >= len(items):

            n_val = len(items) - 1

        val.extend(
            items[:n_val]
        )

        train.extend(
            items[n_val:]
        )

    random.shuffle(train)

    random.shuffle(val)

    return train, val


# ============================================================
# DATASET
# ============================================================

class DefectDataset(
    Dataset
):

    def __init__(
        self,
        samples,
        training=False
    ):

        self.samples = samples

        self.training = training

    def __len__(self):

        return len(
            self.samples
        )

    def __getitem__(
        self,
        index
    ):

        sample = self.samples[
            index
        ]

        image = Image.open(
            sample["image_path"]
        ).convert("RGB")

        if self.training:

            tensor = train_transform(
                image
            )

        else:

            tensor = val_transform(
                image
            )

        return (
            tensor,
            torch.tensor(
                sample["category_index"],
                dtype=torch.long
            ),
            torch.tensor(
                sample["global_label"],
                dtype=torch.long
            )
        )


# ============================================================
# CONV BLOCK
# ============================================================

class ConvBlock(
    nn.Module
):

    def __init__(
        self,
        in_channels,
        out_channels
    ):

        super().__init__()

        self.block = nn.Sequential(

            nn.Conv2d(
                in_channels,
                out_channels,
                3,
                padding=1,
                bias=False
            ),

            nn.BatchNorm2d(
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

            nn.BatchNorm2d(
                out_channels
            ),

            nn.ReLU(
                inplace=True
            ),

            nn.MaxPool2d(2),

            nn.Dropout2d(
                0.08
            ),
        )

    def forward(self, x):

        return self.block(x)


# ============================================================
# MODEL
# ============================================================

class DefectCNNV3(
    nn.Module
):

    def __init__(self):

        super().__init__()

        self.features = nn.Sequential(

            ConvBlock(
                3,
                32
            ),

            ConvBlock(
                32,
                64
            ),

            ConvBlock(
                64,
                128
            ),

            ConvBlock(
                128,
                256
            ),

            ConvBlock(
                256,
                384
            ),
        )

        self.pool = nn.AdaptiveAvgPool2d(
            1
        )

        self.max_pool = nn.AdaptiveMaxPool2d(
            1
        )

        self.embedding = nn.Sequential(

            nn.Linear(
                384 * 2,
                512
            ),

            nn.BatchNorm1d(
                512
            ),

            nn.ReLU(
                inplace=True
            ),

            nn.Dropout(
                0.35
            ),
        )

        self.category_head = nn.Linear(
            512,
            len(CATEGORIES)
        )

        self.defect_heads = nn.ModuleDict({

            category:
                nn.Linear(
                    512,
                    len(
                        DEFECT_CLASSES[
                            category
                        ]
                    )
                )

            for category in CATEGORIES
        })

    def forward(
        self,
        x
    ):

        x = self.features(x)

        avg = self.pool(
            x
        ).flatten(1)

        mx = self.max_pool(
            x
        ).flatten(1)

        x = torch.cat(
            [avg, mx],
            dim=1
        )

        features = self.embedding(
            x
        )

        category_logits = (
            self.category_head(
                features
            )
        )

        return (
            features,
            category_logits
        )


# ============================================================
# FOCAL LOSS
# ============================================================

class FocalLoss(
    nn.Module
):

    def __init__(
        self,
        weight=None,
        gamma=2.0
    ):

        super().__init__()

        self.weight = weight

        self.gamma = gamma

    def forward(
        self,
        logits,
        targets
    ):

        ce = F.cross_entropy(
            logits,
            targets,
            weight=self.weight,
            reduction="none"
        )

        pt = torch.exp(
            -ce
        )

        loss = (
            (1 - pt)
            ** self.gamma
            * ce
        )

        return loss.mean()


# ============================================================
# CATEGORY LOSS
# ============================================================

def create_losses(
    train_samples
):

    losses = {}

    for category in CATEGORIES:

        classes = (
            DEFECT_CLASSES[
                category
            ]
        )

        counts = np.ones(
            len(classes),
            dtype=np.float32
        )

        mapping = {
            name: i
            for i, name
            in enumerate(classes)
        }

        for sample in train_samples:

            if (
                sample["category"]
                != category
            ):
                continue

            counts[
                mapping[
                    sample["defect"]
                ]
            ] += 1

        weights = (
            1.0
            /
            np.sqrt(counts)
        )

        weights = (
            weights
            /
            weights.mean()
        )

        weights = np.clip(
            weights,
            0.5,
            2.5
        )

        weight_tensor = torch.tensor(
            weights,
            dtype=torch.float32,
            device=DEVICE
        )

        losses[category] = (
            FocalLoss(
                weight=weight_tensor,
                gamma=FOCAL_GAMMA
            )
        )

    return losses


# ============================================================
# BALANCED SAMPLER
# ============================================================

def create_sampler(
    samples
):

    counts = Counter(
        sample["global_label"]
        for sample in samples
    )

    weights = {

        label:
            1.0 /
            np.sqrt(count)

        for label, count
        in counts.items()
    }

    sample_weights = [

        weights[
            sample["global_label"]
        ]

        for sample in samples
    ]

    return WeightedRandomSampler(

        torch.tensor(
            sample_weights,
            dtype=torch.double
        ),

        num_samples=len(
            samples
        ),

        replacement=True
    )


# ============================================================
# TRAIN
# ============================================================

def train_epoch(
    model,
    loader,
    losses,
    optimizer
):

    model.train()

    total_loss = 0.0

    total = 0

    correct_defect = 0

    correct_category = 0

    for (
        images,
        categories,
        labels
    ) in loader:

        images = images.to(
            DEVICE
        )

        categories = categories.to(
            DEVICE
        )

        labels = labels.to(
            DEVICE
        )

        optimizer.zero_grad()

        features, category_logits = (
            model(images)
        )

        category_loss = (
            F.cross_entropy(
                category_logits,
                categories,
                label_smoothing=0.05
            )
        )

        defect_loss = torch.tensor(
            0.0,
            device=DEVICE
        )

        batch_correct = 0

        batch_count = 0

        for category_index in (
            torch.unique(
                categories
            )
        ):

            idx = (
                categories
                == category_index
            )

            category_name = (
                INDEX_TO_CATEGORY[
                    int(
                        category_index.item()
                    )
                ]
            )

            category_features = (
                features[idx]
            )

            category_labels = (
                labels[idx]
            )

            defect_names = (
                DEFECT_CLASSES[
                    category_name
                ]
            )

            local_targets = []

            for label in (
                category_labels.tolist()
            ):

                full_name = (
                    GLOBAL_INDEX_TO_CLASS[
                        int(label)
                    ]
                )

                defect_name = (
                    full_name.split(
                        "::"
                    )[1]
                )

                local_targets.append(
                    defect_names.index(
                        defect_name
                    )
                )

            local_targets = torch.tensor(
                local_targets,
                dtype=torch.long,
                device=DEVICE
            )

            logits = (
                model.defect_heads[
                    category_name
                ](
                    category_features
                )
            )

            loss = losses[
                category_name
            ](
                logits,
                local_targets
            )

            count = (
                int(
                    idx.sum().item()
                )
            )

            defect_loss += (
                loss * count
            )

            predictions = (
                logits.argmax(
                    dim=1
                )
            )

            batch_correct += int(
                (
                    predictions
                    ==
                    local_targets
                ).sum().item()
            )

            batch_count += count

        defect_loss /= max(
            images.size(0),
            1
        )

        total = (
            images.size(0)
        )

        loss = (
            defect_loss
            +
            0.05
            *
            category_loss
        )

        loss.backward()

        torch.nn.utils.clip_grad_norm_(
            model.parameters(),
            5.0
        )

        optimizer.step()

        total_loss += (
            loss.item()
            *
            total
        )

        correct_defect += (
            batch_correct
        )

        correct_category += int(
            (
                category_logits.argmax(
                    dim=1
                )
                ==
                categories
            ).sum().item()
        )

    return {

        "loss":
            total_loss
            /
            max(
                len(loader.dataset),
                1
            ),

        "defect_accuracy":
            correct_defect
            /
            max(
                len(loader.dataset),
                1
            ),

        "category_accuracy":
            correct_category
            /
            max(
                len(loader.dataset),
                1
            )
    }


# ============================================================
# VALIDATION
# ============================================================

@torch.no_grad()
def evaluate(
    model,
    loader
):

    model.eval()

    exact_true = []

    exact_pred = []

    oracle_true = []

    oracle_pred = []

    category_true = []

    category_pred = []

    for (
        images,
        categories,
        labels
    ) in loader:

        images = images.to(
            DEVICE
        )

        categories = categories.to(
            DEVICE
        )

        labels = labels.to(
            DEVICE
        )

        features, category_logits = (
            model(images)
        )

        predicted_categories = (
            category_logits.argmax(
                dim=1
            )
        )

        for i in range(
            images.size(0)
        ):

            actual_category = int(
                categories[i].item()
            )

            actual_label = int(
                labels[i].item()
            )

            predicted_category = int(
                predicted_categories[
                    i
                ].item()
            )

            predicted_category_name = (
                INDEX_TO_CATEGORY[
                    predicted_category
                ]
            )

            actual_category_name = (
                INDEX_TO_CATEGORY[
                    actual_category
                ]
            )

            # ----------------------------------------------
            # EXACT / PREDICTED CATEGORY
            # ----------------------------------------------

            predicted_logits = (
                model.defect_heads[
                    predicted_category_name
                ](
                    features[
                        i:i + 1
                    ]
                )
            )

            predicted_local = int(
                predicted_logits.argmax(
                    dim=1
                ).item()
            )

            predicted_defect = (
                DEFECT_CLASSES[
                    predicted_category_name
                ][
                    predicted_local
                ]
            )

            predicted_global = (
                GLOBAL_CLASS_TO_INDEX[
                    f"{predicted_category_name}::"
                    f"{predicted_defect}"
                ]
            )

            # ----------------------------------------------
            # ORACLE CATEGORY
            # ----------------------------------------------

            oracle_logits = (
                model.defect_heads[
                    actual_category_name
                ](
                    features[
                        i:i + 1
                    ]
                )
            )

            oracle_local = int(
                oracle_logits.argmax(
                    dim=1
                ).item()
            )

            oracle_defect = (
                DEFECT_CLASSES[
                    actual_category_name
                ][
                    oracle_local
                ]
            )

            oracle_global = (
                GLOBAL_CLASS_TO_INDEX[
                    f"{actual_category_name}::"
                    f"{oracle_defect}"
                ]
            )

            exact_true.append(
                actual_label
            )

            exact_pred.append(
                predicted_global
            )

            oracle_true.append(
                actual_label
            )

            oracle_pred.append(
                oracle_global
            )

            category_true.append(
                actual_category
            )

            category_pred.append(
                predicted_category
            )

    return {

        "exact_accuracy":
            accuracy_score(
                exact_true,
                exact_pred
            ),

        "exact_precision":
            precision_score(
                exact_true,
                exact_pred,
                average="weighted",
                zero_division=0
            ),

        "exact_recall":
            recall_score(
                exact_true,
                exact_pred,
                average="weighted",
                zero_division=0
            ),

        "exact_f1":
            f1_score(
                exact_true,
                exact_pred,
                average="weighted",
                zero_division=0
            ),

        "oracle_accuracy":
            accuracy_score(
                oracle_true,
                oracle_pred
            ),

        "oracle_precision":
            precision_score(
                oracle_true,
                oracle_pred,
                average="weighted",
                zero_division=0
            ),

        "oracle_recall":
            recall_score(
                oracle_true,
                oracle_pred,
                average="weighted",
                zero_division=0
            ),

        "oracle_f1":
            f1_score(
                oracle_true,
                oracle_pred,
                average="weighted",
                zero_division=0
            ),

        "category_accuracy":
            accuracy_score(
                category_true,
                category_pred
            ),

        "exact_confusion_matrix":
            confusion_matrix(
                exact_true,
                exact_pred
            ).tolist(),

        "oracle_confusion_matrix":
            confusion_matrix(
                oracle_true,
                oracle_pred
            ).tolist(),

        "exact_true":
            exact_true,

        "exact_pred":
            exact_pred,

        "oracle_true":
            oracle_true,

        "oracle_pred":
            oracle_pred,
    }


# ============================================================
# MAIN
# ============================================================

def main():

    print()

    print("=" * 72)

    print(
        "VISIONINSPECT AI"
    )

    print(
        "DEFECT CLASSIFICATION V3"
    )

    print(
        "DEFECT-FOCUSED CUSTOM CNN"
    )

    print("=" * 72)

    print()

    print(
        f"Device: {DEVICE}"
    )

    print(
        f"Categories: {len(CATEGORIES)}"
    )

    print(
        f"Defect classes: {NUM_CLASSES}"
    )

    print(
        f"Image size: "
        f"{IMAGE_SIZE}x{IMAGE_SIZE}"
    )

    print(
        f"Batch size: {BATCH_SIZE}"
    )

    print(
        f"Learning rate: "
        f"{LEARNING_RATE}"
    )

    print(
        f"Epochs: {EPOCHS}"
    )

    print(
        "Pretrained: NO"
    )

    print(
        "Transfer learning: NO"
    )

    print()

    # --------------------------------------------------------
    # DATA
    # --------------------------------------------------------

    samples = collect_samples()

    train_samples, val_samples = (
        split_samples(samples)
    )

    print(
        f"Total samples: "
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

    # --------------------------------------------------------
    # DATASETS
    # --------------------------------------------------------

    train_dataset = DefectDataset(
        train_samples,
        training=True
    )

    val_dataset = DefectDataset(
        val_samples,
        training=False
    )

    sampler = create_sampler(
        train_samples
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

    # --------------------------------------------------------
    # MODEL
    # --------------------------------------------------------

    model = DefectCNNV3().to(
        DEVICE
    )

    losses = create_losses(
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

    # --------------------------------------------------------
    # PATHS
    # --------------------------------------------------------

    model_path = os.path.join(
        MODEL_DIR,
        "defect_cnn_v3_best.pth"
    )

    results_path = os.path.join(
        RESULTS_DIR,
        "defect_cnn_v3_results.json"
    )

    history_path = os.path.join(
        RESULTS_DIR,
        "defect_cnn_v3_history.json"
    )

    # --------------------------------------------------------
    # TRAIN
    # --------------------------------------------------------

    best_f1 = -1.0

    patience = 0

    history = []

    for epoch in range(
        1,
        EPOCHS + 1
    ):

        train_metrics = train_epoch(
            model,
            train_loader,
            losses,
            optimizer
        )

        validation = evaluate(
            model,
            val_loader
        )

        scheduler.step(
            validation[
                "oracle_f1"
            ]
        )

        lr = (
            optimizer.param_groups[
                0
            ]["lr"]
        )

        print()

        print(
            f"Epoch "
            f"{epoch:02d}/{EPOCHS} | "
            f"Loss "
            f"{train_metrics['loss']:.4f} | "
            f"Train Defect "
            f"{train_metrics['defect_accuracy'] * 100:.2f}% | "
            f"Train Cat "
            f"{train_metrics['category_accuracy'] * 100:.2f}% | "
            f"Exact "
            f"{validation['exact_accuracy'] * 100:.2f}% | "
            f"Oracle "
            f"{validation['oracle_accuracy'] * 100:.2f}% | "
            f"Oracle F1 "
            f"{validation['oracle_f1'] * 100:.2f}% | "
            f"Category "
            f"{validation['category_accuracy'] * 100:.2f}% | "
            f"LR "
            f"{lr:.7f}"
        )

        history.append({

            "epoch":
                epoch,

            "train":
                train_metrics,

            "validation":
                {
                    key: value
                    for key, value
                    in validation.items()
                    if isinstance(
                        value,
                        (int, float)
                    )
                },

            "learning_rate":
                lr
        })

        with open(
            history_path,
            "w",
            encoding="utf-8"
        ) as file:

            json.dump(
                history,
                file,
                indent=2
            )

        # ----------------------------------------------------
        # BEST
        # ----------------------------------------------------

        current_f1 = (
            validation[
                "oracle_f1"
            ]
        )

        if current_f1 > best_f1:

            best_f1 = current_f1

            patience = 0

            torch.save(

                {

                    "epoch":
                        epoch,

                    "model_state_dict":
                        model.state_dict(),

                    "optimizer_state_dict":
                        optimizer.state_dict(),

                    "scheduler_state_dict":
                        scheduler.state_dict(),

                    "best_oracle_f1":
                        best_f1,

                    "categories":
                        CATEGORIES,

                    "defect_classes":
                        DEFECT_CLASSES,

                    "global_class_names":
                        GLOBAL_CLASS_NAMES,

                    "architecture":
                        "defect_cnn_v3",

                    "pretrained":
                        False,

                    "image_size":
                        IMAGE_SIZE,

                },

                model_path
            )

            print(
                "  -> BEST V3 MODEL SAVED"
            )

        else:

            patience += 1

        if patience >= PATIENCE:

            print()

            print(
                "EARLY STOPPING"
            )

            break

    # --------------------------------------------------------
    # FINAL EVALUATION
    # --------------------------------------------------------

    checkpoint = torch.load(
        model_path,
        map_location=DEVICE,
        weights_only=False
    )

    model.load_state_dict(
        checkpoint[
            "model_state_dict"
        ]
    )

    final = evaluate(
        model,
        val_loader
    )

    # --------------------------------------------------------
    # REMOVE ARRAYS FROM SUMMARY
    # --------------------------------------------------------

    summary = {

        key: value

        for key, value
        in final.items()

        if not isinstance(
            value,
            list
        )
    }

    summary[
        "best_oracle_f1"
    ] = best_f1

    summary[
        "architecture"
    ] = "defect_cnn_v3"

    summary[
        "pretrained"
    ] = False

    summary[
        "num_classes"
    ] = NUM_CLASSES

    summary[
        "categories"
    ] = CATEGORIES

    # --------------------------------------------------------
    # SAVE
    # --------------------------------------------------------

    with open(
        results_path,
        "w",
        encoding="utf-8"
    ) as file:

        json.dump(
            summary,
            file,
            indent=2
        )

    # --------------------------------------------------------
    # REPORT
    # --------------------------------------------------------

    report = classification_report(

        final[
            "oracle_true"
        ],

        final[
            "oracle_pred"
        ],

        target_names=
            GLOBAL_CLASS_NAMES,

        zero_division=0,

        output_dict=True
    )

    report_path = os.path.join(
        RESULTS_DIR,
        "defect_cnn_v3_classification_report.json"
    )

    with open(
        report_path,
        "w",
        encoding="utf-8"
    ) as file:

        json.dump(
            report,
            file,
            indent=2
        )

    # --------------------------------------------------------
    # FINAL PRINT
    # --------------------------------------------------------

    print()

    print("=" * 72)

    print(
        "V3 FINAL RESULT"
    )

    print("=" * 72)

    print(
        f"Exact Accuracy : "
        f"{final['exact_accuracy'] * 100:.2f}%"
    )

    print(
        f"Exact Precision: "
        f"{final['exact_precision'] * 100:.2f}%"
    )

    print(
        f"Exact Recall   : "
        f"{final['exact_recall'] * 100:.2f}%"
    )

    print(
        f"Exact F1       : "
        f"{final['exact_f1'] * 100:.2f}%"
    )

    print(
        f"Oracle Accuracy: "
        f"{final['oracle_accuracy'] * 100:.2f}%"
    )

    print(
        f"Oracle F1      : "
        f"{final['oracle_f1'] * 100:.2f}%"
    )

    print(
        f"Category Acc   : "
        f"{final['category_accuracy'] * 100:.2f}%"
    )

    print()

    print(
        f"Model: {model_path}"
    )

    print(
        f"Results: {results_path}"
    )

    print(
        f"Report: {report_path}"
    )


# ============================================================
# RUN
# ============================================================

if __name__ == "__main__":

    main()