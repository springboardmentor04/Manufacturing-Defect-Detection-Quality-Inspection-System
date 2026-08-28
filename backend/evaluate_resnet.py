# ============================================================
# evaluate_resnet.py
#
# Evaluate the trained ResNet18 PASS/FAIL classifier
# on the MVTec processed test dataset.
# ============================================================

import os
from pathlib import Path

import torch
import torch.nn as nn

from torchvision import models, transforms
from torch.utils.data import Dataset, DataLoader

from PIL import Image

from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    classification_report,
    confusion_matrix
)


# ============================================================
# CONFIGURATION
# ============================================================

MODEL_PATH = (
    r"D:\InfosysSpringboard\VisionInspectAI"
    r"\backend\models\defect_classifier_resnet18_best.pth"
)

DATASET_ROOT = (
    r"D:\InfosysSpringboard\VisionInspectAI"
    r"\processed_dataset"
)

IMAGE_SIZE = 224

BATCH_SIZE = 32


# ============================================================
# DEVICE
# ============================================================

DEVICE = torch.device(
    "cuda"
    if torch.cuda.is_available()
    else "cpu"
)


# ============================================================
# HEADER
# ============================================================

print()
print("=" * 75)
print("RESNET18 MODEL EVALUATION")
print("=" * 75)

print(
    f"Model Path   : {MODEL_PATH}"
)

print(
    f"Dataset Path : {DATASET_ROOT}"
)

print(
    f"Device       : {DEVICE}"
)


# ============================================================
# CHECK MODEL
# ============================================================

if not os.path.exists(MODEL_PATH):

    raise FileNotFoundError(
        "\nResNet18 model not found:\n"
        f"{MODEL_PATH}"
    )


# ============================================================
# CHECK DATASET
# ============================================================

if not os.path.exists(DATASET_ROOT):

    raise FileNotFoundError(
        "\nProcessed dataset not found:\n"
        f"{DATASET_ROOT}"
    )


# ============================================================
# IMAGE TRANSFORMATION
#
# MUST MATCH THE TRANSFORMATION USED DURING TRAINING
# ============================================================

transform = transforms.Compose([

    transforms.Resize(
        (IMAGE_SIZE, IMAGE_SIZE)
    ),

    transforms.ToTensor(),

    transforms.Normalize(

        mean=[
            0.485,
            0.456,
            0.406
        ],

        std=[
            0.229,
            0.224,
            0.225
        ]

    )

])


# ============================================================
# MVTec TEST DATASET
#
# Structure expected:
#
# processed_dataset/
#
#   item/
#       train/
#           good/
#
#       test/
#           good/
#           defect1/
#           defect2/
#           ...
#
#
# good     -> PASS -> 0
# defects  -> FAIL -> 1
# ============================================================

class MVTecTestDataset(Dataset):

    def __init__(
        self,
        root_dir,
        transform=None
    ):

        self.root_dir = Path(
            root_dir
        )

        self.transform = transform

        self.samples = []


        # ====================================================
        # FIND MVTec ITEM FOLDERS
        # ====================================================

        item_folders = [

            folder

            for folder in self.root_dir.iterdir()

            if folder.is_dir()

        ]


        print()
        print("=" * 75)
        print("MVTec ITEMS FOUND")
        print("=" * 75)


        for item in sorted(
            item_folders,
            key=lambda x: x.name.lower()
        ):

            print(
                f"  {item.name}"
            )


        # ====================================================
        # SEARCH TEST FOLDERS
        # ====================================================

        for item_folder in item_folders:

            test_folder = (
                item_folder
                / "test"
            )


            if not test_folder.exists():

                continue


            # =================================================
            # DEFECT TYPE FOLDERS
            # =================================================

            defect_folders = [

                folder

                for folder in test_folder.iterdir()

                if folder.is_dir()

            ]


            for defect_folder in defect_folders:

                defect_type = (
                    defect_folder.name
                )


                # =============================================
                # LABEL
                # =============================================

                if (
                    defect_type.lower()
                    == "good"
                ):

                    label = 0

                else:

                    label = 1


                # =============================================
                # FIND IMAGES
                # =============================================

                for image_path in defect_folder.iterdir():

                    if image_path.suffix.lower() not in [

                        ".jpg",
                        ".jpeg",
                        ".png",
                        ".bmp",
                        ".tif",
                        ".tiff"

                    ]:

                        continue


                    self.samples.append(

                        (
                            image_path,
                            label,
                            item_folder.name,
                            defect_type
                        )

                    )


    # ========================================================
    # LENGTH
    # ========================================================

    def __len__(self):

        return len(
            self.samples
        )


    # ========================================================
    # GET ITEM
    # ========================================================

    def __getitem__(
        self,
        index
    ):

        image_path, label, item, defect_type = (
            self.samples[index]
        )


        try:

            image = Image.open(
                image_path
            ).convert("RGB")

        except Exception as error:

            raise RuntimeError(
                f"\nCould not open image:\n"
                f"{image_path}\n"
                f"Error: {error}"
            )


        if self.transform:

            image = self.transform(
                image
            )


        return (
            image,
            label
        )


# ============================================================
# LOAD DATASET
# ============================================================

print()
print("=" * 75)
print("LOADING TEST DATASET")
print("=" * 75)


dataset = MVTecTestDataset(

    root_dir=DATASET_ROOT,

    transform=transform

)


if len(dataset) == 0:

    raise RuntimeError(
        "\nNo test images were found.\n"
        "Check that your dataset contains:\n"
        "processed_dataset/<item>/test/<defect_type>/"
    )


print()
print(
    f"Total test images found: "
    f"{len(dataset)}"
)


# ============================================================
# DATA DISTRIBUTION
# ============================================================

pass_count = 0
fail_count = 0


for sample in dataset.samples:

    label = sample[1]


    if label == 0:

        pass_count += 1

    else:

        fail_count += 1


print()
print("=" * 75)
print("TEST DATA DISTRIBUTION")
print("=" * 75)

print(
    f"PASS / Good images    : {pass_count}"
)

print(
    f"FAIL / Defect images  : {fail_count}"
)

print(
    f"Total images          : {len(dataset)}"
)


# ============================================================
# DATA LOADER
# ============================================================

loader = DataLoader(

    dataset,

    batch_size=BATCH_SIZE,

    shuffle=False,

    num_workers=0

)


# ============================================================
# CREATE RESNET18
#
# THIS MUST EXACTLY MATCH THE TRAINED MODEL.
#
# CHECKPOINT REVEALED:
#
# fc.0.weight -> [256, 512]
# fc.0.bias   -> [256]
#
# fc.1.weight -> [256]
# fc.1.bias   -> [256]
#
# fc.4.weight -> [2, 256]
# fc.4.bias   -> [2]
#
# Therefore:
#
# Linear(512,256)
# BatchNorm1d(256)
# ReLU
# Dropout
# Linear(256,2)
# ============================================================

print()
print("=" * 75)
print("LOADING RESNET18")
print("=" * 75)


model = models.resnet18(
    weights=None
)


model.fc = nn.Sequential(

    nn.Linear(

        model.fc.in_features,

        256

    ),

    nn.BatchNorm1d(
        256
    ),

    nn.ReLU(
        inplace=True
    ),

    nn.Dropout(
        p=0.5
    ),

    nn.Linear(

        256,

        2

    )

)


# ============================================================
# LOAD CHECKPOINT
# ============================================================

print(
    "\nLoading checkpoint..."
)


checkpoint = torch.load(

    MODEL_PATH,

    map_location=DEVICE

)


# ============================================================
# DETERMINE STATE DICT
# ============================================================

if isinstance(
    checkpoint,
    dict
):

    if "state_dict" in checkpoint:

        state_dict = (
            checkpoint["state_dict"]
        )

    elif "model_state_dict" in checkpoint:

        state_dict = (
            checkpoint["model_state_dict"]
        )

    else:

        state_dict = checkpoint

else:

    state_dict = checkpoint


# ============================================================
# REMOVE module. PREFIX
#
# Handles models trained using DataParallel.
# ============================================================

clean_state_dict = {}


for key, value in state_dict.items():

    if key.startswith(
        "module."
    ):

        key = key.replace(

            "module.",

            "",

            1

        )


    clean_state_dict[
        key
    ] = value


# ============================================================
# LOAD MODEL WEIGHTS
# ============================================================

try:

    model.load_state_dict(

        clean_state_dict,

        strict=True

    )

except RuntimeError as error:

    print()
    print("=" * 75)
    print("MODEL ARCHITECTURE / CHECKPOINT ERROR")
    print("=" * 75)

    print(error)

    print()
    print(
        "The checkpoint could not be loaded."
    )

    raise


# ============================================================
# MOVE MODEL TO DEVICE
# ============================================================

model = model.to(
    DEVICE
)


# ============================================================
# EVALUATION MODE
# ============================================================

model.eval()


print()
print(
    "ResNet18 loaded successfully."
)


# ============================================================
# RUN EVALUATION
# ============================================================

print()
print("=" * 75)
print("RUNNING EVALUATION")
print("=" * 75)


all_labels = []

all_predictions = []


correct = 0

total = 0


# ============================================================
# INFERENCE
# ============================================================

with torch.no_grad():

    for batch_index, (
        images,
        labels
    ) in enumerate(loader):


        images = images.to(
            DEVICE
        )

        labels = labels.to(
            DEVICE
        )


        # -----------------------------------------------
        # MODEL PREDICTION
        # -----------------------------------------------

        outputs = model(
            images
        )


        # -----------------------------------------------
        # CLASS PREDICTION
        # -----------------------------------------------

        predictions = torch.argmax(

            outputs,

            dim=1

        )


        # -----------------------------------------------
        # COUNT CORRECT
        # -----------------------------------------------

        correct += (

            predictions == labels

        ).sum().item()


        total += (
            labels.size(0)
        )


        # -----------------------------------------------
        # STORE RESULTS
        # -----------------------------------------------

        all_labels.extend(

            labels
            .cpu()
            .numpy()
            .tolist()

        )


        all_predictions.extend(

            predictions
            .cpu()
            .numpy()
            .tolist()

        )


        # -----------------------------------------------
        # PROGRESS
        # -----------------------------------------------

        processed = min(

            total,

            len(dataset)

        )


        print(

            f"\rProcessed "
            f"{processed}/{len(dataset)} images",

            end=""

        )


print()


# ============================================================
# CALCULATE METRICS
# ============================================================

accuracy = accuracy_score(

    all_labels,

    all_predictions

)


precision_macro = precision_score(

    all_labels,

    all_predictions,

    average="macro",

    zero_division=0

)


recall_macro = recall_score(

    all_labels,

    all_predictions,

    average="macro",

    zero_division=0

)


f1_macro = f1_score(

    all_labels,

    all_predictions,

    average="macro",

    zero_division=0

)


precision_weighted = precision_score(

    all_labels,

    all_predictions,

    average="weighted",

    zero_division=0

)


recall_weighted = recall_score(

    all_labels,

    all_predictions,

    average="weighted",

    zero_division=0

)


f1_weighted = f1_score(

    all_labels,

    all_predictions,

    average="weighted",

    zero_division=0

)


# ============================================================
# CONFUSION MATRIX
# ============================================================

cm = confusion_matrix(

    all_labels,

    all_predictions,

    labels=[
        0,
        1
    ]

)


# ============================================================
# OVERALL PERFORMANCE
# ============================================================

print()
print("=" * 75)
print("RESNET18 OVERALL PERFORMANCE")
print("=" * 75)


print(
    f"Total Images          : {total}"
)


print(
    f"Correct Predictions   : {correct}"
)


print(
    f"Incorrect Predictions : "
    f"{total - correct}"
)


print(
    f"Accuracy              : "
    f"{accuracy * 100:.2f}%"
)


print(
    f"Precision (Macro)     : "
    f"{precision_macro * 100:.2f}%"
)


print(
    f"Recall (Macro)        : "
    f"{recall_macro * 100:.2f}%"
)


print(
    f"F1-Score (Macro)      : "
    f"{f1_macro * 100:.2f}%"
)


print(
    f"Precision (Weighted)  : "
    f"{precision_weighted * 100:.2f}%"
)


print(
    f"Recall (Weighted)     : "
    f"{recall_weighted * 100:.2f}%"
)


print(
    f"F1-Score (Weighted)   : "
    f"{f1_weighted * 100:.2f}%"
)


# ============================================================
# CLASSIFICATION REPORT
# ============================================================

report = classification_report(

    all_labels,

    all_predictions,

    labels=[
        0,
        1
    ],

    target_names=[
        "PASS",
        "FAIL"
    ],

    zero_division=0

)


print()
print("=" * 75)
print("PASS / FAIL CLASSIFICATION REPORT")
print("=" * 75)

print(
    report
)


# ============================================================
# CONFUSION MATRIX
# ============================================================

print()
print("=" * 75)
print("CONFUSION MATRIX")
print("=" * 75)


print()
print(
    "                 Predicted"
)

print(
    "                 PASS    FAIL"
)

print(
    f"Actual PASS      "
    f"{cm[0][0]:5d}   "
    f"{cm[0][1]:5d}"
)

print(
    f"Actual FAIL      "
    f"{cm[1][0]:5d}   "
    f"{cm[1][1]:5d}"
)


# ============================================================
# CALCULATE PASS / FAIL SPECIFIC METRICS
# ============================================================

pass_precision = precision_score(

    all_labels,

    all_predictions,

    pos_label=0,

    zero_division=0

)


pass_recall = recall_score(

    all_labels,

    all_predictions,

    pos_label=0,

    zero_division=0

)


pass_f1 = f1_score(

    all_labels,

    all_predictions,

    pos_label=0,

    zero_division=0

)


fail_precision = precision_score(

    all_labels,

    all_predictions,

    pos_label=1,

    zero_division=0

)


fail_recall = recall_score(

    all_labels,

    all_predictions,

    pos_label=1,

    zero_division=0

)


fail_f1 = f1_score(

    all_labels,

    all_predictions,

    pos_label=1,

    zero_division=0

)


# ============================================================
# PASS / FAIL METRICS
# ============================================================

print()
print("=" * 75)
print("CLASS-SPECIFIC PERFORMANCE")
print("=" * 75)


print()
print("PASS")

print(
    f"  Precision : "
    f"{pass_precision * 100:.2f}%"
)

print(
    f"  Recall    : "
    f"{pass_recall * 100:.2f}%"
)

print(
    f"  F1-Score  : "
    f"{pass_f1 * 100:.2f}%"
)


print()
print("FAIL")

print(
    f"  Precision : "
    f"{fail_precision * 100:.2f}%"
)

print(
    f"  Recall    : "
    f"{fail_recall * 100:.2f}%"
)

print(
    f"  F1-Score  : "
    f"{fail_f1 * 100:.2f}%"
)


# ============================================================
# SAVE RESULTS
# ============================================================

OUTPUT_FILE = (

    Path(__file__).resolve().parent

    / "resnet18_evaluation_results.txt"

)


with open(

    OUTPUT_FILE,

    "w",

    encoding="utf-8"

) as file:


    file.write(
        "RESNET18 MODEL EVALUATION\n"
    )

    file.write(
        "=" * 75 + "\n\n"
    )


    file.write(
        f"Model Path:\n{MODEL_PATH}\n\n"
    )


    file.write(
        f"Dataset Path:\n{DATASET_ROOT}\n\n"
    )


    file.write(
        f"Device: {DEVICE}\n\n"
    )


    file.write(
        "DATASET\n"
    )

    file.write(
        "-" * 75 + "\n"
    )


    file.write(
        f"PASS Images: {pass_count}\n"
    )

    file.write(
        f"FAIL Images: {fail_count}\n"
    )

    file.write(
        f"Total Images: {total}\n\n"
    )


    file.write(
        "OVERALL PERFORMANCE\n"
    )

    file.write(
        "-" * 75 + "\n"
    )


    file.write(
        f"Accuracy: "
        f"{accuracy * 100:.2f}%\n"
    )


    file.write(
        f"Precision (Macro): "
        f"{precision_macro * 100:.2f}%\n"
    )


    file.write(
        f"Recall (Macro): "
        f"{recall_macro * 100:.2f}%\n"
    )


    file.write(
        f"F1-Score (Macro): "
        f"{f1_macro * 100:.2f}%\n"
    )


    file.write(
        f"Precision (Weighted): "
        f"{precision_weighted * 100:.2f}%\n"
    )


    file.write(
        f"Recall (Weighted): "
        f"{recall_weighted * 100:.2f}%\n"
    )


    file.write(
        f"F1-Score (Weighted): "
        f"{f1_weighted * 100:.2f}%\n\n"
    )


    file.write(
        "CLASS-SPECIFIC PERFORMANCE\n"
    )

    file.write(
        "-" * 75 + "\n"
    )


    file.write(
        "PASS\n"
    )

    file.write(
        f"Precision: "
        f"{pass_precision * 100:.2f}%\n"
    )

    file.write(
        f"Recall: "
        f"{pass_recall * 100:.2f}%\n"
    )

    file.write(
        f"F1-Score: "
        f"{pass_f1 * 100:.2f}%\n\n"
    )


    file.write(
        "FAIL\n"
    )

    file.write(
        f"Precision: "
        f"{fail_precision * 100:.2f}%\n"
    )

    file.write(
        f"Recall: "
        f"{fail_recall * 100:.2f}%\n"
    )

    file.write(
        f"F1-Score: "
        f"{fail_f1 * 100:.2f}%\n\n"
    )


    file.write(
        "CLASSIFICATION REPORT\n"
    )

    file.write(
        "-" * 75 + "\n"
    )

    file.write(
        report
    )


    file.write(
        "\n\nCONFUSION MATRIX\n"
    )

    file.write(
        "-" * 75 + "\n"
    )

    file.write(
        "                 Predicted\n"
    )

    file.write(
        "                 PASS    FAIL\n"
    )

    file.write(
        f"Actual PASS      "
        f"{cm[0][0]:5d}   "
        f"{cm[0][1]:5d}\n"
    )

    file.write(
        f"Actual FAIL      "
        f"{cm[1][0]:5d}   "
        f"{cm[1][1]:5d}\n"
    )


# ============================================================
# FINAL MESSAGE
# ============================================================

print()
print("=" * 75)
print("EVALUATION COMPLETED")
print("=" * 75)

print(
    f"Results saved to:\n"
    f"{OUTPUT_FILE}"
)

print("=" * 75)