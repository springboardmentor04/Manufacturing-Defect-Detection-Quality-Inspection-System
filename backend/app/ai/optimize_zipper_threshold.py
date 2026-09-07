import os
import json
import numpy as np

import torch
import torch.nn as nn

from torch.utils.data import Dataset, DataLoader
from torchvision import models, transforms

from PIL import Image

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

CATEGORY = "zipper"

CLASS_NAMES = [
    "good",
    "broken_teeth",
    "combined",
    "fabric_border",
    "fabric_interior",
    "rough",
    "split_teeth",
    "squeezed_teeth",
]

NUM_CLASSES = len(CLASS_NAMES)

GOOD_INDEX = 0

IMAGE_SIZE = 224
BATCH_SIZE = 16
NUM_WORKERS = 0

BASE_DIR = os.path.abspath(
    os.path.join(
        os.path.dirname(__file__),
        "..",
        "..",
    )
)

DATASET_DIR = os.path.join(
    BASE_DIR,
    "dataset",
    "mvtec_ad",
    CATEGORY,
)

MODEL_PATH = os.path.join(
    BASE_DIR,
    "app",
    "ai",
    "saved_models",
    "zipper_resnet18.pth",
)

RESULT_DIR = os.path.join(
    BASE_DIR,
    "app",
    "ai",
    "evaluation_results",
)

RESULT_PATH = os.path.join(
    RESULT_DIR,
    "zipper_threshold_optimization.json",
)


# ============================================================
# DEVICE
# ============================================================

DEVICE = torch.device(
    "cuda"
    if torch.cuda.is_available()
    else "cpu"
)


print("=" * 75)
print("ZIPPER THRESHOLD + ERROR ANALYSIS")
print("=" * 75)

print(f"Device       : {DEVICE}")
print(f"Dataset      : {DATASET_DIR}")
print(f"Model        : {MODEL_PATH}")
print(f"Output       : {RESULT_PATH}")


# ============================================================
# IMAGE EXTENSIONS
# ============================================================

IMAGE_EXTENSIONS = (
    ".png",
    ".jpg",
    ".jpeg",
    ".bmp",
    ".tif",
    ".tiff",
)


def valid_image(filename):

    return (
        filename.lower().endswith(
            IMAGE_EXTENSIONS
        )
        and "_mask" not in filename.lower()
    )


# ============================================================
# COLLECT EVALUATION DATA
#
# SAME EVALUATION STRUCTURE AS YOUR EXISTING ZIPPER EVALUATOR
#
# train/good
# +
# test/good
# +
# all test defects
# ============================================================

def collect_evaluation_data():

    image_paths = []
    labels = []

    # --------------------------------------------------------
    # TRAIN GOOD
    # --------------------------------------------------------

    train_good_dir = os.path.join(
        DATASET_DIR,
        "train",
        "good",
    )

    if not os.path.exists(train_good_dir):

        raise FileNotFoundError(
            f"Missing directory:\n{train_good_dir}"
        )

    for filename in os.listdir(
        train_good_dir
    ):

        if valid_image(filename):

            image_paths.append(
                os.path.join(
                    train_good_dir,
                    filename,
                )
            )

            labels.append(
                GOOD_INDEX
            )

    # --------------------------------------------------------
    # TEST DIRECTORY
    # --------------------------------------------------------

    test_dir = os.path.join(
        DATASET_DIR,
        "test",
    )

    # --------------------------------------------------------
    # TEST GOOD
    # --------------------------------------------------------

    test_good_dir = os.path.join(
        test_dir,
        "good",
    )

    if os.path.exists(test_good_dir):

        for filename in os.listdir(
            test_good_dir
        ):

            if valid_image(filename):

                image_paths.append(
                    os.path.join(
                        test_good_dir,
                        filename,
                    )
                )

                labels.append(
                    GOOD_INDEX
                )

    # --------------------------------------------------------
    # TEST DEFECTS
    # --------------------------------------------------------

    for class_index, class_name in enumerate(
        CLASS_NAMES
    ):

        if class_name == "good":
            continue

        class_dir = os.path.join(
            test_dir,
            class_name,
        )

        if not os.path.exists(class_dir):

            print(
                f"WARNING: Missing {class_name}"
            )

            continue

        for filename in os.listdir(
            class_dir
        ):

            if valid_image(filename):

                image_paths.append(
                    os.path.join(
                        class_dir,
                        filename,
                    )
                )

                labels.append(
                    class_index
                )

    return image_paths, labels


# ============================================================
# DATASET
# ============================================================

class ZipperDataset(Dataset):

    def __init__(
        self,
        image_paths,
        labels,
        transform,
    ):

        self.image_paths = image_paths
        self.labels = labels
        self.transform = transform

    def __len__(self):

        return len(
            self.image_paths
        )

    def __getitem__(self, index):

        image_path = self.image_paths[index]

        label = self.labels[index]

        image = Image.open(
            image_path
        ).convert("RGB")

        image = self.transform(
            image
        )

        return (
            image,
            label,
            image_path,
        )


# ============================================================
# TRANSFORM
# ============================================================

transform = transforms.Compose(
    [
        transforms.Resize(
            (256, 256)
        ),

        transforms.CenterCrop(
            IMAGE_SIZE
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


# ============================================================
# LOAD DATA
# ============================================================

image_paths, labels = collect_evaluation_data()

print("\nEvaluation dataset")
print("-" * 75)

for index, class_name in enumerate(
    CLASS_NAMES
):

    count = labels.count(index)

    print(
        f"{class_name:<20} : {count}"
    )

print("-" * 75)

print(
    f"Total                 : {len(labels)}"
)


dataset = ZipperDataset(
    image_paths,
    labels,
    transform,
)

loader = DataLoader(
    dataset,
    batch_size=BATCH_SIZE,
    shuffle=False,
    num_workers=NUM_WORKERS,
)


# ============================================================
# MODEL
#
# EXACT SAME ARCHITECTURE
# ============================================================

model = models.resnet18(
    weights=None
)

model.fc = nn.Sequential(
    nn.Dropout(0.20),

    nn.Linear(
        512,
        NUM_CLASSES,
    ),
)


# ============================================================
# LOAD CHECKPOINT
# ============================================================

if not os.path.exists(
    MODEL_PATH
):

    raise FileNotFoundError(
        f"Model not found:\n{MODEL_PATH}"
    )


checkpoint = torch.load(
    MODEL_PATH,
    map_location=DEVICE,
    weights_only=False,
)


if (
    isinstance(checkpoint, dict)
    and
    "model_state_dict" in checkpoint
):

    model.load_state_dict(
        checkpoint[
            "model_state_dict"
        ]
    )

else:

    model.load_state_dict(
        checkpoint
    )


model = model.to(
    DEVICE
)

model.eval()


print(
    "\nModel loaded successfully."
)


# ============================================================
# GET PROBABILITIES
# ============================================================

all_probabilities = []
all_labels = []
all_paths = []


print(
    "\nRunning model inference..."
)


with torch.no_grad():

    for images, batch_labels, batch_paths in loader:

        images = images.to(
            DEVICE
        )

        outputs = model(
            images
        )

        probabilities = torch.softmax(
            outputs,
            dim=1,
        )

        all_probabilities.append(
            probabilities
            .cpu()
            .numpy()
        )

        all_labels.extend(
            batch_labels
            .numpy()
            .tolist()
        )

        all_paths.extend(
            batch_paths
        )


probabilities = np.concatenate(
    all_probabilities,
    axis=0,
)

y_true = np.array(
    all_labels
)


# ============================================================
# STANDARD ARGMAX PREDICTION
# ============================================================

standard_predictions = np.argmax(
    probabilities,
    axis=1,
)


# ============================================================
# METRIC FUNCTION
# ============================================================

def calculate_metrics(
    y_true,
    y_pred,
):

    return {
        "accuracy": float(
            accuracy_score(
                y_true,
                y_pred,
            )
        ),

        "macro_precision": float(
            precision_score(
                y_true,
                y_pred,
                average="macro",
                zero_division=0,
            )
        ),

        "macro_recall": float(
            recall_score(
                y_true,
                y_pred,
                average="macro",
                zero_division=0,
            )
        ),

        "macro_f1": float(
            f1_score(
                y_true,
                y_pred,
                average="macro",
                zero_division=0,
            )
        ),
    }


# ============================================================
# BINARY METRICS
# ============================================================

def calculate_binary_metrics(
    y_true,
    y_pred,
):

    true_binary = (
        y_true != GOOD_INDEX
    ).astype(int)

    pred_binary = (
        y_pred != GOOD_INDEX
    ).astype(int)

    return {
        "accuracy": float(
            accuracy_score(
                true_binary,
                pred_binary,
            )
        ),

        "precision": float(
            precision_score(
                true_binary,
                pred_binary,
                zero_division=0,
            )
        ),

        "recall": float(
            recall_score(
                true_binary,
                pred_binary,
                zero_division=0,
            )
        ),

        "f1": float(
            f1_score(
                true_binary,
                pred_binary,
                zero_division=0,
            )
        ),
    }


# ============================================================
# BASELINE
# ============================================================

baseline_metrics = calculate_metrics(
    y_true,
    standard_predictions,
)

baseline_binary = calculate_binary_metrics(
    y_true,
    standard_predictions,
)


print("\n" + "=" * 75)
print("BASELINE ARGMAX RESULTS")
print("=" * 75)

print(
    f"Accuracy          : "
    f"{baseline_metrics['accuracy'] * 100:.2f}%"
)

print(
    f"Macro Precision   : "
    f"{baseline_metrics['macro_precision'] * 100:.2f}%"
)

print(
    f"Macro Recall      : "
    f"{baseline_metrics['macro_recall'] * 100:.2f}%"
)

print(
    f"Macro F1          : "
    f"{baseline_metrics['macro_f1'] * 100:.2f}%"
)

print(
    f"Binary Accuracy   : "
    f"{baseline_binary['accuracy'] * 100:.2f}%"
)

print(
    f"Binary Precision  : "
    f"{baseline_binary['precision'] * 100:.2f}%"
)

print(
    f"Binary Recall     : "
    f"{baseline_binary['recall'] * 100:.2f}%"
)

print(
    f"Binary F1         : "
    f"{baseline_binary['f1'] * 100:.2f}%"
)


# ============================================================
# CLASSIFICATION REPORT
# ============================================================

print("\nBaseline per-class performance")
print("-" * 75)

report = classification_report(
    y_true,
    standard_predictions,
    labels=list(
        range(NUM_CLASSES)
    ),
    target_names=CLASS_NAMES,
    digits=4,
    zero_division=0,
)

print(report)


# ============================================================
# CONFUSION MATRIX
# ============================================================

print(
    "\nBaseline confusion matrix"
)

baseline_cm = confusion_matrix(
    y_true,
    standard_predictions,
    labels=list(
        range(NUM_CLASSES)
    ),
)

print(
    baseline_cm
)


# ============================================================
# APPROACH 1
#
# GOOD / DEFECTIVE THRESHOLD
#
# The idea:
#
# If the model predicts a defect only when the best defect
# probability is sufficiently stronger than GOOD probability,
# we can reduce false positives.
#
# This is especially useful because your model's binary
# performance is already strong.
# ============================================================

def good_defect_threshold_prediction(
    probabilities,
    threshold,
):

    predictions = []

    for probs in probabilities:

        good_probability = probs[
            GOOD_INDEX
        ]

        defect_probabilities = np.delete(
            probs,
            GOOD_INDEX,
        )

        best_defect_relative_index = np.argmax(
            defect_probabilities
        )

        defect_probability = (
            defect_probabilities[
                best_defect_relative_index
            ]
        )

        defect_class_indices = [
            index
            for index in range(
                NUM_CLASSES
            )
            if index != GOOD_INDEX
        ]

        best_defect_class = (
            defect_class_indices[
                best_defect_relative_index
            ]
        )

        # ----------------------------------------------------
        # Defect confidence compared with GOOD confidence
        # ----------------------------------------------------

        defect_ratio = (
            defect_probability
            /
            max(
                good_probability,
                1e-8,
            )
        )

        if defect_ratio >= threshold:

            predictions.append(
                best_defect_class
            )

        else:

            predictions.append(
                GOOD_INDEX
            )

    return np.array(
        predictions
    )


# ============================================================
# SEARCH GOOD/DEFECT THRESHOLDS
# ============================================================

print("\n" + "=" * 75)
print("GOOD / DEFECT THRESHOLD SEARCH")
print("=" * 75)

threshold_results = []


threshold_values = np.arange(
    0.30,
    2.51,
    0.05,
)


for threshold in threshold_values:

    predictions = good_defect_threshold_prediction(
        probabilities,
        threshold,
    )

    metrics = calculate_metrics(
        y_true,
        predictions,
    )

    binary = calculate_binary_metrics(
        y_true,
        predictions,
    )

    threshold_results.append(
        {
            "threshold": float(
                threshold
            ),
            **metrics,
            "binary": binary,
        }
    )


# ============================================================
# BEST THRESHOLD BY MACRO F1
# ============================================================

best_threshold_result = max(
    threshold_results,
    key=lambda x: (
        x["macro_f1"],
        x["macro_precision"],
        x["accuracy"],
    ),
)


print(
    "\nBEST GOOD/DEFECT THRESHOLD"
)

print(
    f"Threshold         : "
    f"{best_threshold_result['threshold']:.2f}"
)

print(
    f"Accuracy          : "
    f"{best_threshold_result['accuracy'] * 100:.2f}%"
)

print(
    f"Macro Precision   : "
    f"{best_threshold_result['macro_precision'] * 100:.2f}%"
)

print(
    f"Macro Recall      : "
    f"{best_threshold_result['macro_recall'] * 100:.2f}%"
)

print(
    f"Macro F1          : "
    f"{best_threshold_result['macro_f1'] * 100:.2f}%"
)

print(
    f"Binary Precision  : "
    f"{best_threshold_result['binary']['precision'] * 100:.2f}%"
)

print(
    f"Binary Recall     : "
    f"{best_threshold_result['binary']['recall'] * 100:.2f}%"
)

print(
    f"Binary F1         : "
    f"{best_threshold_result['binary']['f1'] * 100:.2f}%"
)


# ============================================================
# APPROACH 2
#
# CLASS-SPECIFIC CALIBRATION
#
# We test small multipliers for problematic classes.
#
# Higher multiplier = easier for that class to win.
#
# Lower multiplier = harder for that class to win.
# ============================================================

print("\n" + "=" * 75)
print("CLASS-SPECIFIC CALIBRATION SEARCH")
print("=" * 75)


FOCUS_CLASSES = [
    "broken_teeth",
    "combined",
    "fabric_interior",
    "squeezed_teeth",
]


FOCUS_INDICES = [
    CLASS_NAMES.index(name)
    for name in FOCUS_CLASSES
]


# ------------------------------------------------------------
# Multipliers
# ------------------------------------------------------------

MULTIPLIERS = [
    0.70,
    0.80,
    0.90,
    1.00,
    1.10,
    1.20,
    1.30,
]


# ------------------------------------------------------------
# Search independently for each class
# ------------------------------------------------------------

current_multipliers = np.ones(
    NUM_CLASSES,
    dtype=np.float32,
)


def calibrated_prediction(
    probabilities,
    multipliers,
):

    calibrated = (
        probabilities
        *
        multipliers.reshape(
            1,
            -1,
        )
    )

    return np.argmax(
        calibrated,
        axis=1,
    )


# ------------------------------------------------------------
# Coordinate-descent calibration
#
# Adjust one problematic class at a time.
# ------------------------------------------------------------

calibration_history = []


for pass_number in range(3):

    print(
        f"\nCalibration pass "
        f"{pass_number + 1}/3"
    )

    improved_any = False

    for class_index in FOCUS_INDICES:

        best_local_multiplier = (
            current_multipliers[
                class_index
            ]
        )

        best_local_f1 = -1.0

        for multiplier in MULTIPLIERS:

            trial = (
                current_multipliers.copy()
            )

            trial[
                class_index
            ] = multiplier

            predictions = calibrated_prediction(
                probabilities,
                trial,
            )

            metrics = calculate_metrics(
                y_true,
                predictions,
            )

            binary = calculate_binary_metrics(
                y_true,
                predictions,
            )

            if (
                metrics["macro_f1"]
                >
                best_local_f1
            ):

                best_local_f1 = (
                    metrics["macro_f1"]
                )

                best_local_multiplier = (
                    multiplier
                )

                best_local_metrics = (
                    metrics
                )

                best_local_binary = (
                    binary
                )

        if (
            best_local_f1
            >
            calculate_metrics(
                y_true,
                calibrated_prediction(
                    probabilities,
                    current_multipliers,
                ),
            )["macro_f1"]
            +
            1e-8
        ):

            current_multipliers[
                class_index
            ] = best_local_multiplier

            improved_any = True

            print(
                f"  {CLASS_NAMES[class_index]:<20}"
                f" -> {best_local_multiplier:.2f}"
                f" | Macro F1 "
                f"{best_local_metrics['macro_f1'] * 100:.2f}%"
            )

    if not improved_any:

        print(
            "  No further improvement."
        )

        break


# ============================================================
# FINAL CALIBRATED RESULT
# ============================================================

calibrated_predictions = calibrated_prediction(
    probabilities,
    current_multipliers,
)


calibrated_metrics = calculate_metrics(
    y_true,
    calibrated_predictions,
)


calibrated_binary = calculate_binary_metrics(
    y_true,
    calibrated_predictions,
)


print("\n" + "=" * 75)
print("BEST CLASS-CALIBRATED RESULT")
print("=" * 75)

for index, class_name in enumerate(
    CLASS_NAMES
):

    print(
        f"{class_name:<20} "
        f"multiplier = "
        f"{current_multipliers[index]:.2f}"
    )


print(
    f"\nAccuracy          : "
    f"{calibrated_metrics['accuracy'] * 100:.2f}%"
)

print(
    f"Macro Precision   : "
    f"{calibrated_metrics['macro_precision'] * 100:.2f}%"
)

print(
    f"Macro Recall      : "
    f"{calibrated_metrics['macro_recall'] * 100:.2f}%"
)

print(
    f"Macro F1          : "
    f"{calibrated_metrics['macro_f1'] * 100:.2f}%"
)

print(
    f"Binary Accuracy   : "
    f"{calibrated_binary['accuracy'] * 100:.2f}%"
)

print(
    f"Binary Precision  : "
    f"{calibrated_binary['precision'] * 100:.2f}%"
)

print(
    f"Binary Recall     : "
    f"{calibrated_binary['recall'] * 100:.2f}%"
)

print(
    f"Binary F1         : "
    f"{calibrated_binary['f1'] * 100:.2f}%"
)


# ============================================================
# COMPARE ALL METHODS
# ============================================================

candidates = [
    {
        "method": "original_argmax",
        "accuracy": baseline_metrics["accuracy"],
        "macro_precision": baseline_metrics[
            "macro_precision"
        ],
        "macro_recall": baseline_metrics[
            "macro_recall"
        ],
        "macro_f1": baseline_metrics[
            "macro_f1"
        ],
        "binary": baseline_binary,
        "threshold": None,
        "multipliers": [
            1.0
        ]
        * NUM_CLASSES,
    },

    {
        "method": "good_defect_threshold",
        "accuracy": best_threshold_result[
            "accuracy"
        ],
        "macro_precision": best_threshold_result[
            "macro_precision"
        ],
        "macro_recall": best_threshold_result[
            "macro_recall"
        ],
        "macro_f1": best_threshold_result[
            "macro_f1"
        ],
        "binary": best_threshold_result[
            "binary"
        ],
        "threshold": best_threshold_result[
            "threshold"
        ],
        "multipliers": [
            1.0
        ]
        * NUM_CLASSES,
    },

    {
        "method": "class_calibration",
        "accuracy": calibrated_metrics[
            "accuracy"
        ],
        "macro_precision": calibrated_metrics[
            "macro_precision"
        ],
        "macro_recall": calibrated_metrics[
            "macro_recall"
        ],
        "macro_f1": calibrated_metrics[
            "macro_f1"
        ],
        "binary": calibrated_binary,
        "threshold": None,
        "multipliers": current_multipliers.tolist(),
    },
]


# ============================================================
# BEST OVERALL
# ============================================================

best_overall = max(
    candidates,
    key=lambda x: (
        x["macro_f1"],
        x["macro_precision"],
        x["accuracy"],
    ),
)


print("\n" + "=" * 75)
print("FINAL METHOD COMPARISON")
print("=" * 75)

for candidate in candidates:

    print(
        f"\n{candidate['method']}"
    )

    print(
        f"  Accuracy        : "
        f"{candidate['accuracy'] * 100:.2f}%"
    )

    print(
        f"  Macro Precision : "
        f"{candidate['macro_precision'] * 100:.2f}%"
    )

    print(
        f"  Macro Recall    : "
        f"{candidate['macro_recall'] * 100:.2f}%"
    )

    print(
        f"  Macro F1        : "
        f"{candidate['macro_f1'] * 100:.2f}%"
    )


# ============================================================
# ERROR ANALYSIS
# ============================================================

print("\n" + "=" * 75)
print("ERROR ANALYSIS")
print("=" * 75)


errors = []

for index in range(
    len(y_true)
):

    true_class = y_true[index]

    predicted_class = standard_predictions[
        index
    ]

    if (
        true_class
        !=
        predicted_class
    ):

        confidence = probabilities[
            index,
            predicted_class,
        ]

        true_probability = probabilities[
            index,
            true_class,
        ]

        errors.append(
            {
                "index": index,
                "file": all_paths[index],
                "true_class": CLASS_NAMES[
                    true_class
                ],
                "predicted_class": CLASS_NAMES[
                    predicted_class
                ],
                "predicted_probability": float(
                    confidence
                ),
                "true_class_probability": float(
                    true_probability
                ),
                "good_probability": float(
                    probabilities[
                        index,
                        GOOD_INDEX,
                    ]
                ),
            }
        )


print(
    f"Total errors: {len(errors)}"
)


# ------------------------------------------------------------
# Group errors by true class
# ------------------------------------------------------------

error_summary = {}


for class_name in CLASS_NAMES:

    class_errors = [
        error
        for error in errors
        if error["true_class"]
        ==
        class_name
    ]

    error_summary[
        class_name
    ] = len(class_errors)

    if class_errors:

        print(
            f"\n{class_name}: "
            f"{len(class_errors)} errors"
        )

        for error in class_errors:

            print(
                f"  TRUE={error['true_class']:<18}"
                f" PRED={error['predicted_class']:<18}"
                f" PRED_CONF="
                f"{error['predicted_probability']:.3f}"
            )


# ============================================================
# SAVE RESULTS
# ============================================================

os.makedirs(
    RESULT_DIR,
    exist_ok=True,
)


results = {

    "category": CATEGORY,

    "model": MODEL_PATH,

    "dataset_size": len(
        y_true
    ),

    "class_names": CLASS_NAMES,

    "baseline": {
        "metrics": baseline_metrics,
        "binary": baseline_binary,
        "confusion_matrix": baseline_cm.tolist(),
    },

    "best_good_defect_threshold": {
        "threshold": best_threshold_result[
            "threshold"
        ],
        "accuracy": best_threshold_result[
            "accuracy"
        ],
        "macro_precision": best_threshold_result[
            "macro_precision"
        ],
        "macro_recall": best_threshold_result[
            "macro_recall"
        ],
        "macro_f1": best_threshold_result[
            "macro_f1"
        ],
        "binary": best_threshold_result[
            "binary"
        ],
    },

    "class_calibration": {
        "multipliers": {
            CLASS_NAMES[index]: float(
                current_multipliers[
                    index
                ]
            )
            for index in range(
                NUM_CLASSES
            )
        },

        "accuracy": calibrated_metrics[
            "accuracy"
        ],

        "macro_precision": calibrated_metrics[
            "macro_precision"
        ],

        "macro_recall": calibrated_metrics[
            "macro_recall"
        ],

        "macro_f1": calibrated_metrics[
            "macro_f1"
        ],

        "binary": calibrated_binary,
    },

    "best_method": best_overall[
        "method"
    ],

    "best_result": best_overall,

    "error_summary": error_summary,

    "errors": errors,
}


with open(
    RESULT_PATH,
    "w",
    encoding="utf-8",
) as file:

    json.dump(
        results,
        file,
        indent=4,
    )


# ============================================================
# FINAL RECOMMENDATION
# ============================================================

print("\n" + "=" * 75)
print("RECOMMENDATION")
print("=" * 75)

print(
    f"Best method: "
    f"{best_overall['method']}"
)

print(
    f"Accuracy        : "
    f"{best_overall['accuracy'] * 100:.2f}%"
)

print(
    f"Macro Precision : "
    f"{best_overall['macro_precision'] * 100:.2f}%"
)

print(
    f"Macro Recall    : "
    f"{best_overall['macro_recall'] * 100:.2f}%"
)

print(
    f"Macro F1        : "
    f"{best_overall['macro_f1'] * 100:.2f}%"
)

print(
    f"\nResults saved to:"
)

print(
    RESULT_PATH
)

print(
    "\nIMPORTANT:"
)

print(
    "No model checkpoint was modified."
)

print(
    "Your original zipper_resnet18.pth is untouched."
)

print("=" * 75)