"""
VISIONINSPECT AI - DEFECT CLASSIFICATION V2

Custom CNN from scratch.
NO pretrained models.
NO ImageNet weights.
NO transfer learning.

V2:
- 512x512 full image
- detail branch
- feature fusion
- category-aware defect heads
- class-balanced loss
- weighted sampling
- deterministic validation
- checkpoint resume
- training history
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
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
)


# ============================================================
# PATHS
# ============================================================

DATASET_ROOT = os.path.join("dataset", "mvtec_ad")

MODEL_DIR = os.path.join(
    "app",
    "ai",
    "saved_models",
    "defect_models",
)

RESULTS_DIR = os.path.join(
    "app",
    "ai",
    "evaluation_results",
    "defect_models",
)

os.makedirs(MODEL_DIR, exist_ok=True)
os.makedirs(RESULTS_DIR, exist_ok=True)


# ============================================================
# DATA
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


# ============================================================
# SETTINGS
# ============================================================

IMAGE_SIZE = 512

DETAIL_CROP_SIZE = 384
DETAIL_OUTPUT_SIZE = 256

BATCH_SIZE = 8

LEARNING_RATE = 0.0002
WEIGHT_DECAY = 0.0001

EPOCHS = 40
PATIENCE = 7

VAL_RATIO = 0.20

# Category accuracy is already strong.
# Reduce its influence and focus learning on defects.
CATEGORY_LOSS_WEIGHT = 1.0

SEED = 42

DEVICE = torch.device(
    "cuda" if torch.cuda.is_available() else "cpu"
)


# ============================================================
# RESUME SETTINGS
# ============================================================

BEST_MODEL_PATH = os.path.join(
    MODEL_DIR,
    "shared_category_aware_defect_model_v2.pth",
)

RESULTS_PATH = os.path.join(
    RESULTS_DIR,
    "shared_category_aware_defect_v2_evaluation.json",
)

HISTORY_PATH = os.path.join(
    RESULTS_DIR,
    "shared_category_aware_defect_v2_training_history.json",
)

# Existing run reached Epoch 9.
# Epoch 8 was the best checkpoint.
RESUME_FROM_CHECKPOINT = True
RESUME_EPOCH = 8


# ============================================================
# MAPS
# ============================================================

CATEGORY_TO_INDEX = {
    category: index
    for index, category in enumerate(CATEGORIES)
}

INDEX_TO_CATEGORY = {
    index: category
    for category, index in CATEGORY_TO_INDEX.items()
}


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


NUM_GLOBAL_CLASSES = len(
    GLOBAL_CLASS_NAMES
)


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
# TRANSFORMS
# ============================================================

TRAIN_BASE_TRANSFORM = transforms.Compose([

    transforms.Resize(
        (IMAGE_SIZE, IMAGE_SIZE)
    ),

    transforms.RandomHorizontalFlip(
        p=0.5
    ),

    transforms.RandomRotation(
        degrees=3
    ),
])


VAL_BASE_TRANSFORM = transforms.Compose([

    transforms.Resize(
        (IMAGE_SIZE, IMAGE_SIZE)
    ),
])


TO_TENSOR = transforms.Compose([

    transforms.ToTensor(),

    transforms.Normalize(
        [0.5, 0.5, 0.5],
        [0.5, 0.5, 0.5],
    ),
])


DETAIL_RESIZE = transforms.Resize(
    (
        DETAIL_OUTPUT_SIZE,
        DETAIL_OUTPUT_SIZE,
    )
)


# ============================================================
# DATA COLLECTION
# ============================================================

def collect_samples():

    samples = []

    for category in CATEGORIES:

        test_dir = os.path.join(
            DATASET_ROOT,
            category,
            "test",
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
                defect,
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
                    filename,
                )

                if not os.path.isfile(
                    image_path
                ):

                    continue

                samples.append({

                    "image_path":
                        image_path,

                    "category":
                        category,

                    "category_index":
                        CATEGORY_TO_INDEX[
                            category
                        ],

                    "defect_type":
                        defect,

                    "class_name":
                        full_name,

                    "global_label":
                        GLOBAL_CLASS_TO_INDEX[
                            full_name
                        ],
                })

    return samples


# ============================================================
# SPLIT
# ============================================================

def split_samples(samples):

    grouped = {}

    for sample in samples:

        grouped.setdefault(
            sample["class_name"],
            [],
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
                round(
                    total * VAL_RATIO
                ),
            ),
        )

        val_samples.extend(
            items[:val_count]
        )

        train_samples.extend(
            items[val_count:]
        )

    random.shuffle(
        train_samples
    )

    random.shuffle(
        val_samples
    )

    return (
        train_samples,
        val_samples,
    )


# ============================================================
# DATASET
# ============================================================

class DefectDataset(Dataset):

    def __init__(
        self,
        samples,
        training=False,
    ):

        self.samples = samples

        self.training = training

    def __len__(self):

        return len(self.samples)

    def __getitem__(self, index):

        sample = self.samples[index]

        image = Image.open(
            sample["image_path"]
        ).convert("RGB")

        if self.training:

            image = TRAIN_BASE_TRANSFORM(
                image
            )

        else:

            image = VAL_BASE_TRANSFORM(
                image
            )

        # ----------------------------------------------------
        # FULL IMAGE
        # ----------------------------------------------------

        full_tensor = TO_TENSOR(
            image
        )

        # ----------------------------------------------------
        # DETAIL CROP
        # ----------------------------------------------------

        width, height = image.size

        crop_size = min(
            DETAIL_CROP_SIZE,
            width,
            height,
        )

        if (
            self.training
            and random.random() < 0.75
        ):

            max_left = max(
                0,
                width - crop_size,
            )

            max_top = max(
                0,
                height - crop_size,
            )

            left = random.randint(
                0,
                max_left,
            )

            top = random.randint(
                0,
                max_top,
            )

        else:

            left = max(
                0,
                (width - crop_size)
                // 2,
            )

            top = max(
                0,
                (height - crop_size)
                // 2,
            )

        detail = image.crop(
            (
                left,
                top,
                left + crop_size,
                top + crop_size,
            )
        )

        detail = DETAIL_RESIZE(
            detail
        )

        detail_tensor = TO_TENSOR(
            detail
        )

        category = torch.tensor(
            sample["category_index"],
            dtype=torch.long,
        )

        global_label = torch.tensor(
            sample["global_label"],
            dtype=torch.long,
        )

        return (
            full_tensor,
            detail_tensor,
            category,
            global_label,
        )


# ============================================================
# CNN BLOCK
# ============================================================

class ConvBlock(nn.Module):

    def __init__(
        self,
        in_channels,
        out_channels,
    ):

        super().__init__()

        self.block = nn.Sequential(

            nn.Conv2d(
                in_channels,
                out_channels,
                kernel_size=3,
                padding=1,
                bias=False,
            ),

            nn.GroupNorm(
                8,
                out_channels,
            ),

            nn.ReLU(
                inplace=True
            ),

            nn.Conv2d(
                out_channels,
                out_channels,
                kernel_size=3,
                padding=1,
                bias=False,
            ),

            nn.GroupNorm(
                8,
                out_channels,
            ),

            nn.ReLU(
                inplace=True
            ),

            nn.MaxPool2d(2),
        )

    def forward(self, x):

        return self.block(x)


# ============================================================
# V2 MODEL
# ============================================================

class DefectCNNV2(nn.Module):

    def __init__(self):

        super().__init__()

        self.full_features = nn.Sequential(

            ConvBlock(3, 32),

            ConvBlock(32, 64),

            ConvBlock(64, 128),

            ConvBlock(128, 256),
        )

        self.detail_features = nn.Sequential(

            ConvBlock(3, 32),

            ConvBlock(32, 64),

            ConvBlock(64, 128),

            ConvBlock(128, 256),
        )

        self.full_avg = nn.AdaptiveAvgPool2d(
            (8, 8)
        )

        self.full_max = nn.AdaptiveMaxPool2d(
            (8, 8)
        )

        self.detail_avg = nn.AdaptiveAvgPool2d(
            (4, 4)
        )

        self.detail_max = nn.AdaptiveMaxPool2d(
            (4, 4)
        )

        self.projection = nn.Sequential(

            nn.Flatten(),

            nn.Linear(
                40960,
                512,
            ),

            nn.ReLU(
                inplace=True
            ),

            nn.Dropout(0.25),
        )

        self.category_head = nn.Linear(
            512,
            len(CATEGORIES),
        )

        self.defect_heads = nn.ModuleDict({

            category: nn.Linear(
                512,
                len(
                    DEFECT_CLASSES[
                        category
                    ]
                ),
            )

            for category in CATEGORIES

        })

    def extract_features(
        self,
        full_image,
        detail_image,
    ):

        full = self.full_features(
            full_image
        )

        detail = self.detail_features(
            detail_image
        )

        full_features = torch.cat(
            [
                self.full_avg(full),
                self.full_max(full),
            ],
            dim=1,
        )

        detail_features = torch.cat(
            [
                self.detail_avg(detail),
                self.detail_max(detail),
            ],
            dim=1,
        )

        full_features = torch.flatten(
            full_features,
            1,
        )

        detail_features = torch.flatten(
            detail_features,
            1,
        )

        combined = torch.cat(
            [
                full_features,
                detail_features,
            ],
            dim=1,
        )

        return self.projection(
            combined
        )

    def forward(
        self,
        full_image,
        detail_image,
    ):

        features = self.extract_features(
            full_image,
            detail_image,
        )

        category_logits = (
            self.category_head(
                features
            )
        )

        return (
            features,
            category_logits,
        )


# ============================================================
# TARGET CONVERSION
# ============================================================

def local_target(
    global_labels,
    category_name,
):

    names = DEFECT_CLASSES[
        category_name
    ]

    local_map = {
        name: index
        for index, name
        in enumerate(names)
    }

    targets = []

    for global_label in (
        global_labels.tolist()
    ):

        full_name = (
            GLOBAL_INDEX_TO_CLASS[
                int(global_label)
            ]
        )

        defect_name = full_name.split(
            "::",
            1,
        )[1]

        targets.append(
            local_map[defect_name]
        )

    return torch.tensor(
        targets,
        dtype=torch.long,
        device=global_labels.device,
    )


# ============================================================
# CLASS BALANCED LOSSES
# ============================================================

def create_category_criteria(
    train_samples,
):

    criteria = {}

    for category in CATEGORIES:

        defect_names = (
            DEFECT_CLASSES[
                category
            ]
        )

        local_map = {
            name: index
            for index, name
            in enumerate(
                defect_names
            )
        }

        counts = np.ones(
            len(defect_names),
            dtype=np.float32,
        )

        for sample in train_samples:

            if (
                sample["category"]
                != category
            ):

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
            max(
                weights.mean(),
                1e-8,
            )
        )

        weights = np.clip(
            weights,
            0.75,
            1.75,
        )

        criteria[category] = (
            nn.CrossEntropyLoss(
                weight=torch.tensor(
                    weights,
                    dtype=torch.float32,
                    device=DEVICE,
                ),
                label_smoothing=0.01,
            )
        )

    return criteria


# ============================================================
# SAMPLER
# ============================================================

def create_sampler(
    train_samples,
):

    counts = Counter(
        sample["global_label"]
        for sample in train_samples
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

        for sample
        in train_samples
    ]

    return WeightedRandomSampler(

        torch.tensor(
            sample_weights,
            dtype=torch.double,
        ),

        num_samples=len(
            train_samples
        ),

        replacement=True,
    )


# ============================================================
# TRAINING
# ============================================================

def train_one_epoch(
    model,
    loader,
    criteria,
    optimizer,
):

    model.train()

    running_loss = 0.0

    total_samples = 0

    defect_correct = 0

    category_correct = 0

    for (
        full_images,
        detail_images,
        categories,
        global_labels,
    ) in loader:

        full_images = full_images.to(
            DEVICE
        )

        detail_images = detail_images.to(
            DEVICE
        )

        categories = categories.to(
            DEVICE
        )

        global_labels = global_labels.to(
            DEVICE
        )

        optimizer.zero_grad()

        features, category_logits = (
            model(
                full_images,
                detail_images,
            )
        )

        category_loss = (
            nn.functional.cross_entropy(
                category_logits,
                categories,
            )
        )

        batch_size = (
            full_images.size(0)
        )

        defect_loss_sum = torch.tensor(
            0.0,
            device=DEVICE,
        )

        batch_defect_correct = 0

        for category_index_tensor in (
            torch.unique(categories)
        ):

            category_index = int(
                category_index_tensor.item()
            )

            category_name = (
                INDEX_TO_CATEGORY[
                    category_index
                ]
            )

            category_mask = (
                categories
                == category_index_tensor
            )

            category_features = (
                features[
                    category_mask
                ]
            )

            category_global_labels = (
                global_labels[
                    category_mask
                ]
            )

            local_targets = local_target(
                category_global_labels,
                category_name,
            )

            defect_logits = (
                model.defect_heads[
                    category_name
                ](
                    category_features
                )
            )

            defect_loss = criteria[
                category_name
            ](
                defect_logits,
                local_targets,
            )

            category_count = int(
                category_mask.sum().item()
            )

            defect_loss_sum = (
                defect_loss_sum
                + defect_loss
                * category_count
            )

            batch_defect_correct += int(
                (
                    defect_logits.argmax(
                        dim=1
                    )
                    ==
                    local_targets
                ).sum().item()
            )

        defect_loss = (
            defect_loss_sum /
            max(batch_size, 1)
        )

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
            max_norm=5.0,
        )

        optimizer.step()

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
                category_logits.argmax(
                    dim=1
                )
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
            max(total_samples, 1),
    }


# ============================================================
# EVALUATION
# ============================================================

@torch.no_grad()
def evaluate(
    model,
    loader,
    criteria,
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
        full_images,
        detail_images,
        categories,
        global_labels,
    ) in loader:

        full_images = full_images.to(
            DEVICE
        )

        detail_images = detail_images.to(
            DEVICE
        )

        categories = categories.to(
            DEVICE
        )

        global_labels = global_labels.to(
            DEVICE
        )

        features, category_logits = (
            model(
                full_images,
                detail_images,
            )
        )

        predicted_categories = (
            category_logits.argmax(
                dim=1
            )
        )

        category_loss = (
            nn.functional.cross_entropy(
                category_logits,
                categories,
            )
        )

        oracle_global = [
            -1
            for _ in range(
                full_images.size(0)
            )
        ]

        defect_loss_sum = torch.tensor(
            0.0,
            device=DEVICE,
        )

        for category_index_tensor in (
            torch.unique(categories)
        ):

            category_index = int(
                category_index_tensor.item()
            )

            category_name = (
                INDEX_TO_CATEGORY[
                    category_index
                ]
            )

            category_mask = (
                categories
                == category_index_tensor
            )

            positions = (
                category_mask
                .nonzero(
                    as_tuple=False
                )
                .flatten()
            )

            category_features = (
                features[
                    category_mask
                ]
            )

            category_global_labels = (
                global_labels[
                    category_mask
                ]
            )

            local_targets = local_target(
                category_global_labels,
                category_name,
            )

            defect_logits = (
                model.defect_heads[
                    category_name
                ](
                    category_features
                )
            )

            category_count = int(
                category_mask.sum().item()
            )

            defect_loss = criteria[
                category_name
            ](
                defect_logits,
                local_targets,
            )

            defect_loss_sum = (
                defect_loss_sum
                + defect_loss
                * category_count
            )

            predicted_local = (
                defect_logits.argmax(
                    dim=1
                )
            )

            for j, position in enumerate(
                positions.tolist()
            ):

                predicted_defect = (
                    DEFECT_CLASSES[
                        category_name
                    ][
                        int(
                            predicted_local[
                                j
                            ].item()
                        )
                    ]
                )

                oracle_global[
                    position
                ] = (
                    GLOBAL_CLASS_TO_INDEX[
                        f"{category_name}::"
                        f"{predicted_defect}"
                    ]
                )

        # ----------------------------------------------------
        # END-TO-END PREDICTION
        # ----------------------------------------------------

        for i in range(
            full_images.size(0)
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

        batch_size = (
            full_images.size(0)
        )

        defect_loss = (
            defect_loss_sum /
            max(batch_size, 1)
        )

        batch_loss = (
            defect_loss
            +
            CATEGORY_LOSS_WEIGHT
            *
            category_loss
        )

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
                exact_predictions,
            ),

        "exact_precision":
            precision_score(
                exact_labels,
                exact_predictions,
                average="weighted",
                zero_division=0,
            ),

        "exact_recall":
            recall_score(
                exact_labels,
                exact_predictions,
                average="weighted",
                zero_division=0,
            ),

        "exact_f1":
            f1_score(
                exact_labels,
                exact_predictions,
                average="weighted",
                zero_division=0,
            ),

        "oracle_accuracy":
            accuracy_score(
                oracle_labels,
                oracle_predictions,
            ),

        "oracle_precision":
            precision_score(
                oracle_labels,
                oracle_predictions,
                average="weighted",
                zero_division=0,
            ),

        "oracle_recall":
            recall_score(
                oracle_labels,
                oracle_predictions,
                average="weighted",
                zero_division=0,
            ),

        "oracle_f1":
            f1_score(
                oracle_labels,
                oracle_predictions,
                average="weighted",
                zero_division=0,
            ),

        "category_accuracy":
            accuracy_score(
                category_labels,
                category_predictions,
            ),
    }


# ============================================================
# CATEGORY EXPORT MODEL
# ============================================================

class ExportedDefectCNNV2(nn.Module):

    def __init__(
        self,
        num_classes,
    ):

        super().__init__()

        self.full_features = nn.Sequential(

            ConvBlock(3, 32),

            ConvBlock(32, 64),

            ConvBlock(64, 128),

            ConvBlock(128, 256),
        )

        self.detail_features = nn.Sequential(

            ConvBlock(3, 32),

            ConvBlock(32, 64),

            ConvBlock(64, 128),

            ConvBlock(128, 256),
        )

        self.full_avg = nn.AdaptiveAvgPool2d(
            (8, 8)
        )

        self.full_max = nn.AdaptiveMaxPool2d(
            (8, 8)
        )

        self.detail_avg = nn.AdaptiveAvgPool2d(
            (4, 4)
        )

        self.detail_max = nn.AdaptiveMaxPool2d(
            (4, 4)
        )

        self.projection = nn.Sequential(

            nn.Flatten(),

            nn.Linear(
                40960,
                512,
            ),

            nn.ReLU(
                inplace=True
            ),

            nn.Dropout(0.25),
        )

        self.classifier = nn.Sequential(

            nn.Linear(
                512,
                num_classes,
            )
        )

    def extract_features(
        self,
        full_image,
        detail_image,
    ):

        full = self.full_features(
            full_image
        )

        detail = self.detail_features(
            detail_image
        )

        full_features = torch.cat(
            [
                self.full_avg(full),
                self.full_max(full),
            ],
            dim=1,
        )

        detail_features = torch.cat(
            [
                self.detail_avg(detail),
                self.detail_max(detail),
            ],
            dim=1,
        )

        combined = torch.cat(
            [
                torch.flatten(
                    full_features,
                    1,
                ),
                torch.flatten(
                    detail_features,
                    1,
                ),
            ],
            dim=1,
        )

        return self.projection(
            combined
        )

    def forward(
        self,
        full_image,
        detail_image,
    ):

        features = self.extract_features(
            full_image,
            detail_image,
        )

        return self.classifier(
            features
        )


# ============================================================
# SAVE CATEGORY MODELS
# ============================================================

def save_category_models(
    model,
):

    state = model.state_dict()

    for category in CATEGORIES:

        defect_names = (
            DEFECT_CLASSES[
                category
            ]
        )

        exported = (
            ExportedDefectCNNV2(
                len(defect_names)
            )
        )

        exported_state = (
            exported.state_dict()
        )

        for key in list(
            exported_state.keys()
        ):

            if (
                key.startswith(
                    "full_features."
                )
                or
                key.startswith(
                    "detail_features."
                )
            ):

                exported_state[key] = (
                    state[key]
                    .detach()
                    .cpu()
                    .clone()
                )

        exported_state[
            "projection.1.weight"
        ] = (
            state[
                "projection.1.weight"
            ]
            .detach()
            .cpu()
            .clone()
        )

        exported_state[
            "projection.1.bias"
        ] = (
            state[
                "projection.1.bias"
            ]
            .detach()
            .cpu()
            .clone()
        )

        head = model.defect_heads[
            category
        ]

        exported_state[
            "classifier.0.weight"
        ] = (
            head.weight
            .detach()
            .cpu()
            .clone()
        )

        exported_state[
            "classifier.0.bias"
        ] = (
            head.bias
            .detach()
            .cpu()
            .clone()
        )

        exported.load_state_dict(
            exported_state
        )

        model_path = os.path.join(
            MODEL_DIR,
            f"{category}_defect_model_v2.pth",
        )

        torch.save(
            {
                "model_state_dict":
                    exported.state_dict(),

                "category":
                    category,

                "class_names":
                    defect_names,

                "num_classes":
                    len(defect_names),

                "image_size":
                    IMAGE_SIZE,

                "detail_crop_size":
                    DETAIL_CROP_SIZE,

                "detail_output_size":
                    DETAIL_OUTPUT_SIZE,

                "pretrained":
                    False,

                "architecture":
                    "dual_scale_custom_cnn_v2",
            },
            model_path,
        )


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
        "DEFECT CLASSIFICATION V2"
    )

    print(
        "CUSTOM CNN - FROM SCRATCH"
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
        f"Defect classes: "
        f"{NUM_GLOBAL_CLASSES}"
    )

    print(
        f"Full image: "
        f"{IMAGE_SIZE}x{IMAGE_SIZE}"
    )

    print(
        f"Detail crop: "
        f"{DETAIL_CROP_SIZE}"
        f"->{DETAIL_OUTPUT_SIZE}"
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
        f"Category loss weight: "
        f"{CATEGORY_LOSS_WEIGHT}"
    )

    print(
        f"Resume checkpoint: "
        f"{RESUME_FROM_CHECKPOINT}"
    )

    print(
        f"Resume epoch: "
        f"{RESUME_EPOCH}"
    )

    print(
        "Pretrained: NO"
    )

    print(
        "ImageNet: NO"
    )

    print(
        "Transfer learning: NO"
    )

    # --------------------------------------------------------
    # DATA
    # --------------------------------------------------------

    samples = collect_samples()

    if not samples:

        raise RuntimeError(
            "No defective images found."
        )

    train_samples, val_samples = (
        split_samples(samples)
    )

    print()

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

    print(
        "Category split:"
    )

    for category in CATEGORIES:

        train_count = sum(
            sample["category"]
            == category
            for sample in train_samples
        )

        val_count = sum(
            sample["category"]
            == category
            for sample in val_samples
        )

        print(
            f"  {category:<12}"
            f" train={train_count:3d}"
            f" val={val_count:3d}"
            f" classes="
            f"{len(DEFECT_CLASSES[category])}"
        )

    # --------------------------------------------------------
    # DATASETS
    # --------------------------------------------------------

    train_dataset = DefectDataset(
        train_samples,
        training=True,
    )

    val_dataset = DefectDataset(
        val_samples,
        training=False,
    )

    sampler = create_sampler(
        train_samples
    )

    train_loader = DataLoader(
        train_dataset,
        batch_size=BATCH_SIZE,
        sampler=sampler,
        num_workers=0,
    )

    val_loader = DataLoader(
        val_dataset,
        batch_size=BATCH_SIZE,
        shuffle=False,
        num_workers=0,
    )

    # --------------------------------------------------------
    # MODEL
    # --------------------------------------------------------

    model = DefectCNNV2().to(
        DEVICE
    )

    criteria = create_category_criteria(
        train_samples
    )

    optimizer = optim.AdamW(
        model.parameters(),
        lr=LEARNING_RATE,
        weight_decay=WEIGHT_DECAY,
    )

    scheduler = (
        optim.lr_scheduler.ReduceLROnPlateau(
            optimizer,
            mode="max",
            factor=0.5,
            patience=3,
            min_lr=1e-6,
        )
    )

    best_f1 = -1.0

    patience_counter = 0

    start_epoch = 1

    history = []

    # --------------------------------------------------------
    # RESUME
    # --------------------------------------------------------

    if (
        RESUME_FROM_CHECKPOINT
        and os.path.isfile(
            BEST_MODEL_PATH
        )
    ):

        print()

        print(
            "Loading existing V2 "
            "checkpoint..."
        )

        checkpoint = torch.load(
            BEST_MODEL_PATH,
            map_location=DEVICE,
            weights_only=False,
        )

        model.load_state_dict(
            checkpoint[
                "model_state_dict"
            ],
            strict=True,
        )

        # If checkpoint contains optimizer/scheduler
        # state, restore it.
        if (
            "optimizer_state_dict"
            in checkpoint
        ):

            optimizer.load_state_dict(
                checkpoint[
                    "optimizer_state_dict"
                ]
            )

        if (
            "scheduler_state_dict"
            in checkpoint
        ):

            scheduler.load_state_dict(
                checkpoint[
                    "scheduler_state_dict"
                ]
            )

        best_f1 = float(
            checkpoint.get(
                "best_oracle_f1",
                -1.0,
            )
        )

        saved_epoch = int(
            checkpoint.get(
                "epoch",
                RESUME_EPOCH,
            )
        )

        start_epoch = (
            saved_epoch + 1
        )

        patience_counter = int(
            checkpoint.get(
                "patience_counter",
                0,
            )
        )

        print(
            f"Checkpoint epoch: "
            f"{saved_epoch}"
        )

        print(
            f"Best Oracle F1: "
            f"{best_f1 * 100:.2f}%"
        )

        print(
            f"Starting epoch: "
            f"{start_epoch}"
        )

    else:

        print()

        print(
            "Starting V2 training "
            "from scratch."
        )

    # --------------------------------------------------------
    # OLD HISTORY
    # --------------------------------------------------------

    if os.path.isfile(
        HISTORY_PATH
    ):

        try:

            with open(
                HISTORY_PATH,
                "r",
                encoding="utf-8",
            ) as file:

                history = json.load(
                    file
                )

        except Exception:

            history = []

    # --------------------------------------------------------
    # TRAIN
    # --------------------------------------------------------

    for epoch in range(
        start_epoch,
        EPOCHS + 1,
    ):

        train_metrics = (
            train_one_epoch(
                model,
                train_loader,
                criteria,
                optimizer,
            )
        )

        val_metrics = evaluate(
            model,
            val_loader,
            criteria,
        )

        scheduler.step(
            val_metrics[
                "oracle_f1"
            ]
        )

        current_lr = (
            optimizer
            .param_groups[0]["lr"]
        )

        print()

        print(
            f"Epoch {epoch:02d}/{EPOCHS} | "
            f"Train Loss "
            f"{train_metrics['loss']:.4f} | "
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
            f"{current_lr:.7f}"
        )

        # ----------------------------------------------------
        # HISTORY
        # ----------------------------------------------------

        history.append({

            "epoch":
                epoch,

            "train":
                train_metrics,

            "validation":
                val_metrics,

            "learning_rate":
                current_lr,

            "best_oracle_f1":
                best_f1,
        })

        with open(
            HISTORY_PATH,
            "w",
            encoding="utf-8",
        ) as history_file:

            json.dump(
                history,
                history_file,
                indent=2,
            )

        # ----------------------------------------------------
        # BEST CHECKPOINT
        # ----------------------------------------------------

        if (
            val_metrics[
                "oracle_f1"
            ]
            >
            best_f1
        ):

            best_f1 = (
                val_metrics[
                    "oracle_f1"
                ]
            )

            patience_counter = 0

            torch.save(
                {

                    "epoch":
                        epoch,

                    "best_oracle_f1":
                        best_f1,

                    "model_state_dict":
                        model.state_dict(),

                    "optimizer_state_dict":
                        optimizer.state_dict(),

                    "scheduler_state_dict":
                        scheduler.state_dict(),

                    "patience_counter":
                        patience_counter,

                    "categories":
                        CATEGORIES,

                    "defect_classes":
                        DEFECT_CLASSES,

                    "global_class_names":
                        GLOBAL_CLASS_NAMES,

                    "image_size":
                        IMAGE_SIZE,

                    "detail_crop_size":
                        DETAIL_CROP_SIZE,

                    "detail_output_size":
                        DETAIL_OUTPUT_SIZE,

                    "pretrained":
                        False,

                    "architecture":
                        "dual_scale_custom_cnn_v2",
                },

                BEST_MODEL_PATH,
            )

            print(
                "  -> Best V2 model saved."
            )

        else:

            patience_counter += 1

        # ----------------------------------------------------
        # EARLY STOPPING
        # ----------------------------------------------------

        if (
            patience_counter
            >= PATIENCE
        ):

            print()

            print(
                f"Early stopping after "
                f"{epoch} epochs."
            )

            break

    # --------------------------------------------------------
    # LOAD BEST MODEL
    # --------------------------------------------------------

    checkpoint = torch.load(
        BEST_MODEL_PATH,
        map_location=DEVICE,
        weights_only=False,
    )

    model.load_state_dict(
        checkpoint[
            "model_state_dict"
        ]
    )

    final_metrics = evaluate(
        model,
        val_loader,
        criteria,
    )

    # --------------------------------------------------------
    # FINAL RESULTS
    # --------------------------------------------------------

    print()

    print("=" * 72)

    print(
        "V2 FINAL MODEL RESULT"
    )

    print("=" * 72)

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
        f"Oracle Precision: "
        f"{final_metrics['oracle_precision'] * 100:.2f}%"
    )

    print(
        f"Oracle Recall: "
        f"{final_metrics['oracle_recall'] * 100:.2f}%"
    )

    print(
        f"Oracle F1      : "
        f"{final_metrics['oracle_f1'] * 100:.2f}%"
    )

    print(
        f"Category Acc   : "
        f"{final_metrics['category_accuracy'] * 100:.2f}%"
    )

    # --------------------------------------------------------
    # SAVE RESULTS
    # --------------------------------------------------------

    results = {

        "version":
            "V2",

        "architecture":
            "dual_scale_custom_cnn_v2",

        "pretrained":
            False,

        "imagenet":
            False,

        "transfer_learning":
            False,

        "total_samples":
            len(samples),

        "training_samples":
            len(train_samples),

        "validation_samples":
            len(val_samples),

        "categories":
            CATEGORIES,

        "total_defect_classes":
            NUM_GLOBAL_CLASSES,

        "image_size":
            IMAGE_SIZE,

        "detail_crop_size":
            DETAIL_CROP_SIZE,

        "detail_output_size":
            DETAIL_OUTPUT_SIZE,

        "batch_size":
            BATCH_SIZE,

        "learning_rate":
            LEARNING_RATE,

        "weight_decay":
            WEIGHT_DECAY,

        "category_loss_weight":
            CATEGORY_LOSS_WEIGHT,

        "final_metrics":
            final_metrics,
    }

    with open(
        RESULTS_PATH,
        "w",
        encoding="utf-8",
    ) as file:

        json.dump(
            results,
            file,
            indent=2,
        )

    # --------------------------------------------------------
    # EXPORT CATEGORY MODELS
    # --------------------------------------------------------

    save_category_models(
        model
    )

    print()

    print("=" * 72)

    print(
        "V2 TRAINING COMPLETE"
    )

    print("=" * 72)

    print(
        f"Shared model: "
        f"{BEST_MODEL_PATH}"
    )

    print(
        f"Results: "
        f"{RESULTS_PATH}"
    )

    print(
        f"History: "
        f"{HISTORY_PATH}"
    )

    print(
        f"Category V2 models: "
        f"{MODEL_DIR}"
    )


# ============================================================
# ENTRY POINT
# ============================================================

if __name__ == "__main__":

    main()