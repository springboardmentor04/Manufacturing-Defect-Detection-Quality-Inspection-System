# ============================================================
# VISIONINSPECT AI
# BINARY MODEL SANITY / MEMORIZATION TEST
#
# PURPOSE:
#   Determine whether the CNN + preprocessing + labels
#   are capable of learning a tiny fixed dataset.
#
# IMPORTANT:
#   NO PRETRAINED MODEL
#   NO IMAGENET
#   NO TRANSFER LEARNING
#
# THIS IS NOT THE PRODUCTION TRAINING SCRIPT.
#
# If the model can memorize a tiny dataset:
#       model/pipeline can learn
#
# If it cannot:
#       there is likely a model/preprocessing/label problem
#
# ============================================================

import random
from pathlib import Path

import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim

from PIL import Image

from sklearn.metrics import accuracy_score

from torch.utils.data import (
    Dataset,
    DataLoader,
)

from torchvision import transforms


# ============================================================
# CONFIGURATION
# ============================================================

SEED = 42

IMAGE_SIZE = 256

# Small fixed dataset
SAMPLES_PER_CLASS = 16

BATCH_SIZE = 8

EPOCHS = 100

LEARNING_RATE = 0.001

NUM_WORKERS = 0


# ============================================================
# PATHS
# ============================================================

AI_DIR = Path(__file__).resolve().parent

BACKEND_DIR = AI_DIR.parent.parent

DATASET_DIR = (
    BACKEND_DIR
    / "dataset"
    / "mvtec_ad"
)


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
# IMAGE EXTENSIONS
# ============================================================

IMAGE_EXTENSIONS = {
    ".png",
    ".jpg",
    ".jpeg",
    ".bmp",
    ".webp",
}


# ============================================================
# DEVICE
# ============================================================

DEVICE = torch.device(
    "cuda"
    if torch.cuda.is_available()
    else "cpu"
)


# ============================================================
# SEED
# ============================================================

def set_seed():

    random.seed(SEED)

    np.random.seed(SEED)

    torch.manual_seed(SEED)

    if torch.cuda.is_available():

        torch.cuda.manual_seed_all(SEED)

    torch.backends.cudnn.deterministic = True

    torch.backends.cudnn.benchmark = False


# ============================================================
# COLLECT IMAGES
#
# IMPORTANT:
#   We deliberately select a very small fixed dataset.
#
#   16 Normal
#   16 Defective
# ============================================================

def collect_images():

    normal_images = []

    defective_images = []

    print()
    print("=" * 90)
    print("COLLECTING SANITY-TEST DATA")
    print("=" * 90)

    for category in CATEGORIES:

        category_dir = (
            DATASET_DIR
            / category
        )

        if not category_dir.exists():

            continue

        # ----------------------------------------------------
        # NORMAL
        # ----------------------------------------------------

        good_dir = (
            category_dir
            / "train"
            / "good"
        )

        if good_dir.exists():

            files = sorted(
                [
                    path
                    for path
                    in good_dir.iterdir()
                    if (
                        path.is_file()
                        and
                        path.suffix.lower()
                        in IMAGE_EXTENSIONS
                    )
                ]
            )

            for path in files:

                normal_images.append(
                    {
                        "path": str(path),
                        "label": 0,
                        "category": category,
                        "defect": "good",
                    }
                )

        # ----------------------------------------------------
        # DEFECTIVE
        # ----------------------------------------------------

        test_dir = (
            category_dir
            / "test"
        )

        if not test_dir.exists():

            continue

        for defect_dir in sorted(
            test_dir.iterdir()
        ):

            if (
                not defect_dir.is_dir()
                or defect_dir.name == "good"
            ):

                continue

            files = sorted(
                [
                    path
                    for path
                    in defect_dir.iterdir()
                    if (
                        path.is_file()
                        and
                        path.suffix.lower()
                        in IMAGE_EXTENSIONS
                    )
                ]
            )

            for path in files:

                defective_images.append(
                    {
                        "path": str(path),
                        "label": 1,
                        "category": category,
                        "defect":
                            defect_dir.name,
                    }
                )

    # --------------------------------------------------------
    # DETERMINISTIC SELECTION
    # --------------------------------------------------------

    rng = random.Random(
        SEED
    )

    rng.shuffle(
        normal_images
    )

    rng.shuffle(
        defective_images
    )

    normal_selected = (
        normal_images[
            :SAMPLES_PER_CLASS
        ]
    )

    defective_selected = (
        defective_images[
            :SAMPLES_PER_CLASS
        ]
    )

    samples = (
        normal_selected
        + defective_selected
    )

    rng.shuffle(
        samples
    )

    print(
        f"Normal candidates    : "
        f"{len(normal_images)}"
    )

    print(
        f"Defective candidates : "
        f"{len(defective_images)}"
    )

    print()

    print(
        f"Selected Normal      : "
        f"{len(normal_selected)}"
    )

    print(
        f"Selected Defective   : "
        f"{len(defective_selected)}"
    )

    print(
        f"Total test images    : "
        f"{len(samples)}"
    )

    print("=" * 90)

    return samples


# ============================================================
# DATASET
# ============================================================

class SanityDataset(
    Dataset
):

    def __init__(
        self,
        samples,
    ):

        self.samples = samples

        self.transform = transforms.Compose(
            [

                transforms.Resize(
                    (
                        IMAGE_SIZE,
                        IMAGE_SIZE,
                    )
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
            ]
        )

    def __len__(self):

        return len(
            self.samples
        )

    def __getitem__(
        self,
        index,
    ):

        sample = (
            self.samples[index]
        )

        image_path = Path(
            sample["path"]
        )

        image = Image.open(
            image_path
        ).convert("RGB")

        original_width = image.width

        original_height = image.height

        image = self.transform(
            image
        )

        label = torch.tensor(
            sample["label"],
            dtype=torch.long,
        )

        return (
            image,
            label,
            str(image_path),
            sample["category"],
            sample["defect"],
            original_width,
            original_height,
        )


# ============================================================
# CUSTOM CNN
#
# Deliberately simple.
#
# Completely initialized from scratch.
# ============================================================

class SmallSanityCNN(
    nn.Module
):

    def __init__(self):

        super().__init__()

        self.features = nn.Sequential(

            nn.Conv2d(
                3,
                32,
                kernel_size=3,
                padding=1,
            ),

            nn.ReLU(
                inplace=True
            ),

            nn.MaxPool2d(
                2
            ),

            nn.Conv2d(
                32,
                64,
                kernel_size=3,
                padding=1,
            ),

            nn.ReLU(
                inplace=True
            ),

            nn.MaxPool2d(
                2
            ),

            nn.Conv2d(
                64,
                128,
                kernel_size=3,
                padding=1,
            ),

            nn.ReLU(
                inplace=True
            ),

            nn.MaxPool2d(
                2
            ),

            nn.Conv2d(
                128,
                256,
                kernel_size=3,
                padding=1,
            ),

            nn.ReLU(
                inplace=True
            ),

            nn.AdaptiveAvgPool2d(
                (1, 1)
            ),
        )

        self.classifier = nn.Sequential(

            nn.Flatten(),

            nn.Linear(
                256,
                64,
            ),

            nn.ReLU(
                inplace=True
            ),

            nn.Linear(
                64,
                2,
            ),
        )

        self.initialize_weights()

    # --------------------------------------------------------
    # FROM-SCRATCH INITIALIZATION
    # --------------------------------------------------------

    def initialize_weights(
        self
    ):

        for module in self.modules():

            if isinstance(
                module,
                nn.Conv2d,
            ):

                nn.init.kaiming_normal_(
                    module.weight,
                    nonlinearity="relu",
                )

                if module.bias is not None:

                    nn.init.zeros_(
                        module.bias
                    )

            elif isinstance(
                module,
                nn.Linear,
            ):

                nn.init.kaiming_normal_(
                    module.weight,
                    nonlinearity="relu",
                )

                if module.bias is not None:

                    nn.init.zeros_(
                        module.bias
                    )

    def forward(
        self,
        x,
    ):

        x = self.features(
            x
        )

        x = self.classifier(
            x
        )

        return x


# ============================================================
# INSPECT SELECTED DATA
# ============================================================

def inspect_dataset(
    dataset,
):

    print()
    print("=" * 90)
    print("SELECTED SAMPLE INSPECTION")
    print("=" * 90)

    normal_count = 0

    defective_count = 0

    for index in range(
        len(dataset)
    ):

        (
            image,
            label,
            path,
            category,
            defect,
            width,
            height,
        ) = dataset[index]

        if label.item() == 0:

            normal_count += 1

        else:

            defective_count += 1

        if index < 20:

            label_name = (
                "NORMAL"
                if label.item() == 0
                else "DEFECTIVE"
            )

            print(
                f"{index + 1:02d}. "
                f"{label_name:<10} "
                f"{category:<12} "
                f"{defect:<25} "
                f"{width}x{height}"
            )

            print(
                f"    {path}"
            )

    print()
    print(
        f"Normal selected    : "
        f"{normal_count}"
    )

    print(
        f"Defective selected : "
        f"{defective_count}"
    )

    print("=" * 90)


# ============================================================
# TRAIN
# ============================================================

def train():

    set_seed()

    print()
    print("=" * 100)
    print("VISIONINSPECT AI")
    print("BINARY CNN SANITY TEST")
    print("=" * 100)

    print(
        f"Device : {DEVICE}"
    )

    print(
        "Pretrained model : NO"
    )

    print(
        "ImageNet         : NO"
    )

    print(
        "Transfer learning: NO"
    )

    print(
        "Purpose          : MEMORIZATION TEST"
    )

    print("=" * 100)

    # --------------------------------------------------------
    # DATA
    # --------------------------------------------------------

    samples = collect_images()

    if len(samples) != (
        SAMPLES_PER_CLASS * 2
    ):

        raise RuntimeError(
            "Could not create the expected "
            "balanced sanity dataset."
        )

    dataset = SanityDataset(
        samples
    )

    inspect_dataset(
        dataset
    )

    loader = DataLoader(
        dataset,
        batch_size=BATCH_SIZE,
        shuffle=True,
        num_workers=NUM_WORKERS,
    )

    # --------------------------------------------------------
    # MODEL
    # --------------------------------------------------------

    print()
    print("=" * 90)
    print("CREATING SANITY CNN")
    print("=" * 90)

    model = SmallSanityCNN()

    model = model.to(
        DEVICE
    )

    parameters = sum(
        parameter.numel()
        for parameter
        in model.parameters()
    )

    print(
        f"Parameters : "
        f"{parameters:,}"
    )

    print(
        "Initialization: RANDOM"
    )

    print("=" * 90)

    # --------------------------------------------------------
    # LOSS
    # --------------------------------------------------------

    criterion = nn.CrossEntropyLoss()

    # --------------------------------------------------------
    # OPTIMIZER
    # --------------------------------------------------------

    optimizer = optim.Adam(
        model.parameters(),
        lr=LEARNING_RATE,
    )

    # ========================================================
    # TRAINING
    # ========================================================

    best_accuracy = 0.0

    for epoch in range(
        1,
        EPOCHS + 1,
    ):

        model.train()

        total_loss = 0.0

        labels_all = []

        predictions_all = []

        for (
            images,
            labels,
            _paths,
            _categories,
            _defects,
            _widths,
            _heights,
        ) in loader:

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
                labels,
            )

            loss.backward()

            optimizer.step()

            total_loss += (
                loss.item()
                * images.size(0)
            )

            predictions = (
                torch.argmax(
                    outputs,
                    dim=1,
                )
            )

            labels_all.extend(
                labels.detach()
                .cpu()
                .tolist()
            )

            predictions_all.extend(
                predictions.detach()
                .cpu()
                .tolist()
            )

        accuracy = accuracy_score(
            labels_all,
            predictions_all,
        )

        average_loss = (
            total_loss
            / len(dataset)
        )

        if accuracy > best_accuracy:

            best_accuracy = accuracy

        # ----------------------------------------------------
        # PRINT EVERY EPOCH
        # ----------------------------------------------------

        print(
            f"Epoch "
            f"{epoch:03d}/{EPOCHS} | "
            f"Loss: "
            f"{average_loss:.5f} | "
            f"Accuracy: "
            f"{accuracy * 100:.2f}%"
        )

        # ----------------------------------------------------
        # SUCCESS CONDITION
        #
        # We want the model to memorize the tiny dataset.
        # ----------------------------------------------------

        if accuracy >= 0.99:

            print()
            print(
                "=" * 90
            )

            print(
                "🎯 SANITY TEST PASSED"
            )

            print(
                f"Training accuracy reached "
                f"{accuracy * 100:.2f}%"
            )

            print()
            print(
                "The CNN can learn the selected "
                "images."
            )

            print(
                "This means the basic:"
            )

            print(
                "  image loading"
            )

            print(
                "  preprocessing"
            )

            print(
                "  labels"
            )

            print(
                "  forward pass"
            )

            print(
                "  loss"
            )

            print(
                "  backpropagation"
            )

            print(
                "pipeline"
            )

            print(
                "is capable of learning."
            )

            print()
            print(
                "Best accuracy: "
                f"{best_accuracy * 100:.2f}%"
            )

            print(
                "=" * 90
            )

            return True

    # ========================================================
    # FAILURE
    # ========================================================

    print()
    print("=" * 90)
    print("⚠️ SANITY TEST DID NOT PASS")
    print("=" * 90)

    print(
        f"Best accuracy: "
        f"{best_accuracy * 100:.2f}%"
    )

    print()

    if best_accuracy < 0.70:

        print(
            "CRITICAL:"
        )

        print(
            "The CNN cannot learn even a "
            "tiny fixed dataset."
        )

        print()
        print(
            "Investigate:"
        )

        print(
            "1. Image preprocessing"
        )

        print(
            "2. Labels"
        )

        print(
            "3. Dataset paths"
        )

        print(
            "4. Input normalization"
        )

        print(
            "5. Model implementation"
        )

        print(
            "6. PyTorch installation"
        )

    else:

        print(
            "The model learned partially, "
            "but did not memorize the "
            "tiny dataset."
        )

        print(
            "Further diagnosis is required."
        )

    print("=" * 90)

    return False


# ============================================================
# ENTRY POINT
# ============================================================

if __name__ == "__main__":

    train()