from pathlib import Path
import argparse
import copy
import random

import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import (
    Dataset,
    DataLoader,
    WeightedRandomSampler,
)
from torchvision import (
    models,
    transforms,
)
from PIL import Image

from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    accuracy_score,
    precision_recall_fscore_support,
    confusion_matrix,
)


# ============================================================
# VISIONINSPECT AI
# GENERIC PRETRAINED RESNET18 CATEGORY TRAINER
# ============================================================

SEED = 42

IMAGE_SIZE = 224

BATCH_SIZE = 8

MAX_EPOCHS = 30

HEAD_EPOCHS = 4

LEARNING_RATE_HEAD = 1e-3

LEARNING_RATE_BACKBONE = 1e-4

WEIGHT_DECAY = 1e-4

DROPOUT = 0.35

LABEL_SMOOTHING = 0.05

VALIDATION_RATIO = 0.20

PATIENCE = 7

MIN_DELTA = 0.002


DEVICE = torch.device(
    "cuda"
    if torch.cuda.is_available()
    else "cpu"
)


# ============================================================
# PATHS
# ============================================================

BACKEND_DIR = Path(
    __file__
).resolve().parents[2]

DATASET_ROOT = (
    BACKEND_DIR
    / "dataset"
    / "mvtec_ad"
)

MODEL_DIR = (
    BACKEND_DIR
    / "app"
    / "ai"
    / "saved_models"
)

MODEL_DIR.mkdir(
    parents=True,
    exist_ok=True
)


# ============================================================
# REPRODUCIBILITY
# ============================================================

def set_seed(seed=SEED):

    random.seed(seed)

    np.random.seed(seed)

    torch.manual_seed(seed)

    if torch.cuda.is_available():

        torch.cuda.manual_seed_all(
            seed
        )

    torch.backends.cudnn.deterministic = True

    torch.backends.cudnn.benchmark = False


set_seed()


# ============================================================
# IMAGE EXTENSIONS
# ============================================================

IMAGE_EXTENSIONS = {
    ".jpg",
    ".jpeg",
    ".png",
    ".bmp",
    ".webp",
}


# ============================================================
# DATASET
# ============================================================

class InspectionDataset(Dataset):

    def __init__(
        self,
        samples,
        transform,
    ):

        self.samples = samples

        self.transform = transform


    def __len__(self):

        return len(
            self.samples
        )


    def __getitem__(
        self,
        index,
    ):

        image_path, label = (
            self.samples[index]
        )

        image = Image.open(
            image_path
        ).convert("RGB")

        image = self.transform(
            image
        )

        return image, label


# ============================================================
# TRANSFORMS
# ============================================================

train_transform = transforms.Compose([

    transforms.Resize(
        (256, 256)
    ),

    transforms.RandomResizedCrop(
        IMAGE_SIZE,
        scale=(0.80, 1.0)
    ),

    transforms.RandomHorizontalFlip(
        p=0.5
    ),

    transforms.RandomRotation(
        degrees=8
    ),

    transforms.ColorJitter(
        brightness=0.15,
        contrast=0.15,
        saturation=0.10,
        hue=0.02
    ),

    transforms.ToTensor(),

    transforms.Normalize(
        mean=[
            0.485,
            0.456,
            0.406,
        ],
        std=[
            0.229,
            0.224,
            0.225,
        ],
    ),
])


validation_transform = transforms.Compose([

    transforms.Resize(
        (IMAGE_SIZE, IMAGE_SIZE)
    ),

    transforms.ToTensor(),

    transforms.Normalize(
        mean=[
            0.485,
            0.456,
            0.406,
        ],
        std=[
            0.229,
            0.224,
            0.225,
        ],
    ),
])


# ============================================================
# DATA COLLECTION
# ============================================================

def collect_category_dataset(category):

    category_dir = DATASET_ROOT / category

    if not category_dir.exists():

        raise FileNotFoundError(
            f"\nCategory not found:\n"
            f"{category_dir}"
        )

    train_dir = category_dir / "train"

    test_dir = category_dir / "test"


    # --------------------------------------------------------
    # DISCOVER DEFECT TYPES
    #
    # IMPORTANT:
    # test/good is NOT a defect class.
    # --------------------------------------------------------

    defect_types = []

    if test_dir.exists():

        for directory in sorted(
            test_dir.iterdir()
        ):

            if not directory.is_dir():
                continue

            # Never include "good" as a defect
            if directory.name.lower() == "good":
                continue

            defect_types.append(
                directory.name
            )


    if not defect_types:

        raise RuntimeError(
            f"No defect classes found in:\n"
            f"{test_dir}"
        )


    # --------------------------------------------------------
    # FINAL CLASS LIST
    # --------------------------------------------------------

    class_names = [
        "good"
    ] + defect_types


    class_to_index = {
        name: index
        for index, name in enumerate(
            class_names
        )
    }


    samples = []


    # --------------------------------------------------------
    # GOOD IMAGES
    #
    # MVTec normal images are stored in train/good.
    # --------------------------------------------------------

    good_dir = train_dir / "good"


    if not good_dir.exists():

        raise RuntimeError(
            f"Good images not found:\n"
            f"{good_dir}"
        )


    for image_path in sorted(
        good_dir.iterdir()
    ):

        if (
            image_path.is_file()
            and image_path.suffix.lower()
            in IMAGE_EXTENSIONS
        ):

            samples.append(
                (
                    image_path,
                    class_to_index["good"],
                )
            )


    # --------------------------------------------------------
    # DEFECT IMAGES
    #
    # MVTec defect examples are stored in:
    #
    # test/<defect_type>
    # --------------------------------------------------------

    for defect_type in defect_types:

        defect_dir = (
            test_dir
            / defect_type
        )


        label = class_to_index[
            defect_type
        ]


        if not defect_dir.exists():
            continue


        for image_path in sorted(
            defect_dir.iterdir()
        ):

            if (
                image_path.is_file()
                and image_path.suffix.lower()
                in IMAGE_EXTENSIONS
            ):

                samples.append(
                    (
                        image_path,
                        label,
                    )
                )


    return (
        samples,
        class_names,
    )


# ============================================================
# PRINT DATASET
# ============================================================

def print_dataset_info(
    samples,
    class_names,
):

    counts = {
        name: 0
        for name in class_names
    }


    for _, label in samples:

        counts[
            class_names[label]
        ] += 1


    print()

    print(
        "DATASET DISTRIBUTION"
    )

    print(
        "-" * 60
    )


    for name in class_names:

        print(
            f"{name:<35}"
            f"{counts[name]:>6}"
        )


    print(
        "-" * 60
    )


    print(
        f"{'TOTAL':<35}"
        f"{len(samples):>6}"
    )


# ============================================================
# STRATIFIED SPLIT
# ============================================================

def split_dataset(
    samples,
):

    labels = [
        label
        for _, label in samples
    ]


    indices = list(
        range(
            len(samples)
        )
    )


    train_indices, val_indices = (
        train_test_split(
            indices,
            test_size=VALIDATION_RATIO,
            random_state=SEED,
            stratify=labels,
        )
    )


    train_samples = [
        samples[i]
        for i in train_indices
    ]


    val_samples = [
        samples[i]
        for i in val_indices
    ]


    return (
        train_samples,
        val_samples,
    )


# ============================================================
# CLASS COUNTS
# ============================================================

def get_class_counts(
    samples,
    num_classes,
):

    counts = [
        0
        for _ in range(
            num_classes
        )
    ]


    for _, label in samples:

        counts[label] += 1


    return counts


# ============================================================
# BALANCED SAMPLER
# ============================================================

def create_balanced_sampler(
    samples,
    num_classes,
):

    counts = get_class_counts(
        samples,
        num_classes,
    )


    class_weights = []


    for count in counts:

        if count > 0:

            class_weights.append(
                1.0 / count
            )

        else:

            class_weights.append(
                0.0
            )


    sample_weights = [
        class_weights[label]
        for _, label in samples
    ]


    sampler = (
        WeightedRandomSampler(
            weights=torch.DoubleTensor(
                sample_weights
            ),
            num_samples=len(
                samples
            ),
            replacement=True,
        )
    )


    return sampler


# ============================================================
# MODEL
# ============================================================

def create_model(
    num_classes
):

    print()

    print(
        "Loading ImageNet ResNet18..."
    )


    model = models.resnet18(
        weights=models.ResNet18_Weights.DEFAULT
    )


    # --------------------------------------------------------
    # Freeze entire pretrained backbone
    # --------------------------------------------------------

    for parameter in (
        model.parameters()
    ):

        parameter.requires_grad = False


    # --------------------------------------------------------
    # Replace classifier
    # --------------------------------------------------------

    in_features = (
        model.fc.in_features
    )


    model.fc = nn.Sequential(

        nn.Dropout(
            p=DROPOUT
        ),

        nn.Linear(
            in_features,
            num_classes,
        ),
    )


    model = model.to(
        DEVICE
    )


    print(
        "✓ ImageNet pretrained weights loaded"
    )


    return model


# ============================================================
# UNFREEZE LAST RESNET BLOCK
# ============================================================

def unfreeze_last_block(
    model
):

    for parameter in (
        model.layer4.parameters()
    ):

        parameter.requires_grad = True


# ============================================================
# TRAIN ONE EPOCH
# ============================================================

def train_one_epoch(
    model,
    loader,
    criterion,
    optimizer,
):

    model.train()


    total_loss = 0.0

    y_true = []

    y_pred = []


    for images, labels in loader:

        images = images.to(
            DEVICE
        )

        labels = labels.to(
            DEVICE
        )


        optimizer.zero_grad(
            set_to_none=True
        )


        outputs = model(
            images
        )


        loss = criterion(
            outputs,
            labels
        )


        loss.backward()


        torch.nn.utils.clip_grad_norm_(
            model.parameters(),
            max_norm=2.0
        )


        optimizer.step()


        total_loss += (
            loss.item()
            *
            images.size(0)
        )


        predictions = (
            torch.argmax(
                outputs,
                dim=1
            )
        )


        y_true.extend(
            labels.cpu().numpy()
        )

        y_pred.extend(
            predictions.cpu().numpy()
        )


    loss = (
        total_loss
        /
        len(loader.dataset)
    )


    accuracy = accuracy_score(
        y_true,
        y_pred
    )


    precision, recall, f1, _ = (
        precision_recall_fscore_support(
            y_true,
            y_pred,
            average="macro",
            zero_division=0,
        )
    )


    return (
        loss,
        accuracy,
        precision,
        recall,
        f1,
    )


# ============================================================
# VALIDATION
# ============================================================

def validate(
    model,
    loader,
    criterion,
):

    model.eval()


    total_loss = 0.0

    y_true = []

    y_pred = []


    with torch.no_grad():

        for images, labels in loader:

            images = images.to(
                DEVICE
            )

            labels = labels.to(
                DEVICE
            )


            outputs = model(
                images
            )


            loss = criterion(
                outputs,
                labels
            )


            total_loss += (
                loss.item()
                *
                images.size(0)
            )


            predictions = (
                torch.argmax(
                    outputs,
                    dim=1
                )
            )


            y_true.extend(
                labels.cpu().numpy()
            )

            y_pred.extend(
                predictions.cpu().numpy()
            )


    loss = (
        total_loss
        /
        len(loader.dataset)
    )


    accuracy = accuracy_score(
        y_true,
        y_pred
    )


    precision, recall, f1, _ = (
        precision_recall_fscore_support(
            y_true,
            y_pred,
            average="macro",
            zero_division=0,
        )
    )


    return (
        loss,
        accuracy,
        precision,
        recall,
        f1,
        y_true,
        y_pred,
    )


# ============================================================
# MAIN
# ============================================================

def main():

    parser = argparse.ArgumentParser(
        description=(
            "Train ImageNet "
            "ResNet18 for an "
            "MVTec category"
        )
    )


    parser.add_argument(
        "--category",
        required=True,
        type=str,
        help=(
            "MVTec category, "
            "for example bottle"
        ),
    )


    args = parser.parse_args()


    category = (
        args.category.strip().lower()
    )


    print()

    print("=" * 90)

    print(
        "VISIONINSPECT AI"
    )

    print(
        "PRETRAINED RESNET18 CATEGORY TRAINER"
    )

    print("=" * 90)


    print(
        f"Category       : {category}"
    )

    print(
        f"Device         : {DEVICE}"
    )

    print(
        "Backbone       : ImageNet ResNet18"
    )

    print(
        "Training       : Fine-tuning"
    )

    print(
        f"Image size     : "
        f"{IMAGE_SIZE}x{IMAGE_SIZE}"
    )

    print(
        f"Batch size     : {BATCH_SIZE}"
    )

    print(
        f"Max epochs     : {MAX_EPOCHS}"
    )

    print(
        f"Validation     : "
        f"{VALIDATION_RATIO * 100:.0f}%"
    )

    print("=" * 90)


    # ========================================================
    # DATASET
    # ========================================================

    print()

    print(
        "COLLECTING DATASET..."
    )


    (
        samples,
        class_names,
    ) = collect_category_dataset(
        category
    )


    print_dataset_info(
        samples,
        class_names,
    )


    print()

    print(
        f"Classes: "
        f"{len(class_names)}"
    )


    # ========================================================
    # SPLIT
    # ========================================================

    (
        train_samples,
        val_samples,
    ) = split_dataset(
        samples
    )


    print()

    print("=" * 90)

    print(
        "STRATIFIED TRAIN / VALIDATION SPLIT"
    )

    print("=" * 90)


    print(
        f"Training   : "
        f"{len(train_samples)}"
    )

    print(
        f"Validation : "
        f"{len(val_samples)}"
    )


    train_counts = get_class_counts(
        train_samples,
        len(class_names),
    )


    val_counts = get_class_counts(
        val_samples,
        len(class_names),
    )


    print()


    for i, name in enumerate(
        class_names
    ):

        print(
            f"{name:<35}"
            f"train={train_counts[i]:>3} "
            f"val={val_counts[i]:>3}"
        )


    # ========================================================
    # DATA LOADERS
    # ========================================================

    train_dataset = (
        InspectionDataset(
            train_samples,
            train_transform,
        )
    )


    val_dataset = (
        InspectionDataset(
            val_samples,
            validation_transform,
        )
    )


    sampler = (
        create_balanced_sampler(
            train_samples,
            len(class_names),
        )
    )


    train_loader = DataLoader(
        train_dataset,
        batch_size=BATCH_SIZE,
        sampler=sampler,
        num_workers=0,
        pin_memory=torch.cuda.is_available(),
    )


    val_loader = DataLoader(
        val_dataset,
        batch_size=BATCH_SIZE,
        shuffle=False,
        num_workers=0,
        pin_memory=torch.cuda.is_available(),
    )


    print()

    print(
        "✓ Balanced sampler enabled"
    )

    print(
        "✓ Data augmentation enabled"
    )

    print(
        "✓ Label smoothing enabled"
    )

    print(
        "✓ Weight decay enabled"
    )

    print(
        "✓ Early stopping enabled"
    )


    # ========================================================
    # MODEL
    # ========================================================

    model = create_model(
        len(class_names)
    )


    criterion = nn.CrossEntropyLoss(
        label_smoothing=LABEL_SMOOTHING
    )


    # ========================================================
    # STAGE 1 — CLASSIFIER HEAD
    # ========================================================

    print()

    print("=" * 90)

    print(
        "STAGE 1 — CLASSIFIER HEAD"
    )

    print("=" * 90)


    print(
        f"Epochs : {HEAD_EPOCHS}"
    )

    print(
        f"LR     : "
        f"{LEARNING_RATE_HEAD}"
    )


    optimizer = torch.optim.AdamW(
        filter(
            lambda p: p.requires_grad,
            model.parameters(),
        ),
        lr=LEARNING_RATE_HEAD,
        weight_decay=WEIGHT_DECAY,
    )


    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(
        optimizer,
        T_max=HEAD_EPOCHS,
    )


    best_f1 = -1.0

    best_state = None

    best_epoch = 0

    no_improvement = 0

    history = []


    # ========================================================
    # TRAINING
    # ========================================================

    for epoch in range(
        1,
        MAX_EPOCHS + 1
    ):

        # ----------------------------------------------------
        # Unfreeze final ResNet block after head stage
        # ----------------------------------------------------

        if epoch == HEAD_EPOCHS + 1:

            print()

            print("=" * 90)

            print(
                "STAGE 2 — FINE-TUNING RESNET18 LAYER4"
            )

            print("=" * 90)

            print(
                f"Learning rate: "
                f"{LEARNING_RATE_BACKBONE}"
            )


            unfreeze_last_block(
                model
            )


            optimizer = torch.optim.AdamW(
                filter(
                    lambda p: p.requires_grad,
                    model.parameters(),
                ),
                lr=LEARNING_RATE_BACKBONE,
                weight_decay=WEIGHT_DECAY,
            )


            remaining_epochs = (
                MAX_EPOCHS
                - HEAD_EPOCHS
            )


            scheduler = (
                torch.optim.lr_scheduler.CosineAnnealingLR(
                    optimizer,
                    T_max=max(
                        remaining_epochs,
                        1
                    ),
                )
            )


        # ----------------------------------------------------
        # TRAIN
        # ----------------------------------------------------

        (
            train_loss,
            train_acc,
            train_precision,
            train_recall,
            train_f1,
        ) = train_one_epoch(
            model,
            train_loader,
            criterion,
            optimizer,
        )


        # ----------------------------------------------------
        # VALIDATE
        # ----------------------------------------------------

        (
            val_loss,
            val_acc,
            val_precision,
            val_recall,
            val_f1,
            y_true,
            y_pred,
        ) = validate(
            model,
            val_loader,
            criterion,
        )


        scheduler.step()


        current_lr = (
            optimizer.param_groups[0]["lr"]
        )


        gap = (
            train_f1
            -
            val_f1
        )


        history.append(
            {
                "epoch": epoch,
                "train_loss": train_loss,
                "train_accuracy": train_acc,
                "train_f1": train_f1,
                "val_loss": val_loss,
                "val_accuracy": val_acc,
                "val_f1": val_f1,
                "gap": gap,
            }
        )


        # ----------------------------------------------------
        # PRINT
        # ----------------------------------------------------

        print()

        print(
            f"Epoch "
            f"{epoch:02d}/{MAX_EPOCHS}"
        )


        print(
            f"  LR: {current_lr:.7f}"
        )


        print(
            f"  TRAIN "
            f"Loss={train_loss:.4f} "
            f"Acc={train_acc * 100:.2f}% "
            f"Prec={train_precision * 100:.2f}% "
            f"Recall={train_recall * 100:.2f}% "
            f"F1={train_f1 * 100:.2f}%"
        )


        print(
            f"  VAL   "
            f"Loss={val_loss:.4f} "
            f"Acc={val_acc * 100:.2f}% "
            f"Prec={val_precision * 100:.2f}% "
            f"Recall={val_recall * 100:.2f}% "
            f"F1={val_f1 * 100:.2f}%"
        )


        # ----------------------------------------------------
        # TRAINING STATE
        # ----------------------------------------------------

        if (
            train_f1 < 0.70
            and val_f1 < 0.70
        ):

            print(
                "  ⚠️ UNDERFITTING"
            )

        elif gap > 0.18:

            print(
                "  ⚠️ OVERFITTING"
            )

        elif gap > 0.10:

            print(
                "  • Mild train/validation gap"
            )

        else:

            print(
                "  ✓ HEALTHY GENERALIZATION"
            )


        # ----------------------------------------------------
        # BEST MODEL
        # ----------------------------------------------------

        if (
            val_f1
            >
            best_f1 + MIN_DELTA
        ):

            best_f1 = val_f1

            best_epoch = epoch

            best_state = copy.deepcopy(
                model.state_dict()
            )

            no_improvement = 0

            print(
                "  🎯 BEST MODEL UPDATED"
            )

        else:

            no_improvement += 1

            print(
                f"  No improvement: "
                f"{no_improvement}/{PATIENCE}"
            )


        # ----------------------------------------------------
        # EARLY STOPPING
        # ----------------------------------------------------

        if (
            no_improvement
            >= PATIENCE
        ):

            print()

            print(
                "🛑 EARLY STOPPING"
            )

            break


    # ========================================================
    # RESTORE BEST MODEL
    # ========================================================

    if best_state is None:

        raise RuntimeError(
            "No valid model checkpoint was created."
        )


    model.load_state_dict(
        best_state
    )

    model.eval()


    # ========================================================
    # FINAL VALIDATION
    # ========================================================

    (
        final_loss,
        final_accuracy,
        final_precision,
        final_recall,
        final_f1,
        final_true,
        final_pred,
    ) = validate(
        model,
        val_loader,
        criterion,
    )


    # ========================================================
    # CONFUSION MATRIX
    # ========================================================

    cm = confusion_matrix(
        final_true,
        final_pred,
        labels=list(
            range(
                len(class_names)
            )
        ),
    )


    # ========================================================
    # SAVE
    # ========================================================

    model_path = (
        MODEL_DIR
        /
        f"{category}_resnet18.pth"
    )


    checkpoint = {

        "model_state_dict":
            model.state_dict(),

        "architecture":
            "resnet18",

        "category":
            category,

        "class_names":
            class_names,

        "num_classes":
            len(class_names),

        "image_size":
            IMAGE_SIZE,

        "pretrained":
            True,

        "imagenet":
            True,

        "fine_tuned":
            True,

        "training_from_scratch":
            False,

        "best_epoch":
            best_epoch,

        "validation_loss":
            final_loss,

        "validation_accuracy":
            final_accuracy,

        "validation_precision":
            final_precision,

        "validation_recall":
            final_recall,

        "validation_f1":
            final_f1,

        "confusion_matrix":
            cm.tolist(),

        "seed":
            SEED,

        "validation_ratio":
            VALIDATION_RATIO,

        "label_smoothing":
            LABEL_SMOOTHING,

        "weight_decay":
            WEIGHT_DECAY,

        "dropout":
            DROPOUT,

        "history":
            history,
    }


    torch.save(
        checkpoint,
        model_path,
    )


    # ========================================================
    # FINAL OUTPUT
    # ========================================================

    print()

    print("=" * 90)

    print(
        f"FINAL RESNET18 MODEL: "
        f"{category.upper()}"
    )

    print("=" * 90)


    print(
        f"Best epoch : "
        f"{best_epoch}"
    )


    print(
        f"Accuracy   : "
        f"{final_accuracy * 100:.2f}%"
    )


    print(
        f"Precision  : "
        f"{final_precision * 100:.2f}%"
    )


    print(
        f"Recall     : "
        f"{final_recall * 100:.2f}%"
    )


    print(
        f"Macro F1   : "
        f"{final_f1 * 100:.2f}%"
    )


    print()

    print(
        "CONFUSION MATRIX"
    )


    print(
        f"{'Actual':<30}"
        +
        "".join(
            f"{name[:9]:>10}"
            for name in class_names
        )
    )


    for i, row in enumerate(
        cm
    ):

        print(
            f"{class_names[i]:<30}"
            +
            "".join(
                f"{value:>10}"
                for value in row
            )
        )


    # ========================================================
    # TARGET
    # ========================================================

    print()

    print(
        "TARGET CHECK"
    )


    if (
        final_accuracy >= 0.90
        and final_f1 >= 0.90
    ):

        print(
            "✓ 90% TARGET ACHIEVED"
        )

    else:

        print(
            "⚠️ 90% TARGET NOT YET ACHIEVED"
        )


    # ========================================================
    # MODEL DETAILS
    # ========================================================

    print()

    print(
        "MODEL"
    )


    print(
        "  Architecture        : ResNet18"
    )

    print(
        "  Pretrained          : YES"
    )

    print(
        "  ImageNet            : YES"
    )

    print(
        "  Fine-tuned          : YES"
    )

    print(
        "  Training from scratch: NO"
    )

    print(
        f"  Parameters          : "
        f"{sum(p.numel() for p in model.parameters()):,}"
    )


    print()

    print(
        "SAVED MODEL"
    )


    print(
        model_path
    )


    print()

    print("=" * 90)

    print(
        f"{category.upper()} RESNET18 TRAINING COMPLETE"
    )

    print("=" * 90)

    print()


# ============================================================
# ENTRY POINT
# ============================================================

if __name__ == "__main__":

    main()