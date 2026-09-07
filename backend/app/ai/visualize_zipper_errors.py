import os
import json
import shutil
import html

import numpy as np

import torch
import torch.nn as nn

from torch.utils.data import Dataset, DataLoader

from torchvision import models, transforms

from PIL import Image


# ============================================================
# CONFIGURATION
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


# ============================================================
# PATHS
# ============================================================

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


OUTPUT_DIR = os.path.join(
    BASE_DIR,
    "app",
    "ai",
    "zipper_error_analysis",
)


JSON_PATH = os.path.join(
    OUTPUT_DIR,
    "zipper_error_analysis.json",
)


HTML_PATH = os.path.join(
    OUTPUT_DIR,
    "index.html",
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
print("ZIPPER VISUAL ERROR ANALYSIS")
print("=" * 75)

print(
    f"Device       : {DEVICE}"
)

print(
    f"Dataset      : {DATASET_DIR}"
)

print(
    f"Model        : {MODEL_PATH}"
)

print(
    f"Output       : {OUTPUT_DIR}"
)


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
# SAME DATASET STRUCTURE AS YOUR EXISTING EVALUATOR
#
# train/good
# +
# test/good
# +
# test defects
# ============================================================

def collect_evaluation_data():

    image_paths = []
    labels = []

    # --------------------------------------------------------
    # TRAIN / GOOD
    # --------------------------------------------------------

    train_good_dir = os.path.join(
        DATASET_DIR,
        "train",
        "good",
    )

    if not os.path.exists(
        train_good_dir
    ):

        raise FileNotFoundError(
            f"Missing directory:\n"
            f"{train_good_dir}"
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
    # TEST
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

    if os.path.exists(
        test_good_dir
    ):

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

        if not os.path.exists(
            class_dir
        ):

            print(
                f"WARNING: Missing "
                f"{class_name}"
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

    return (
        image_paths,
        labels,
    )


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

    def __getitem__(
        self,
        index,
    ):

        path = self.image_paths[index]

        label = self.labels[index]

        image = Image.open(
            path
        ).convert("RGB")

        image = self.transform(
            image
        )

        return (
            image,
            label,
            path,
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

image_paths, labels = (
    collect_evaluation_data()
)


print("\nDataset")
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
    f"Total images         : "
    f"{len(labels)}"
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
# BUILD EXACT MODEL
# ============================================================

model = models.resnet18(
    weights=None
)


model.fc = nn.Sequential(
    nn.Dropout(
        0.20
    ),

    nn.Linear(
        512,
        NUM_CLASSES,
    ),
)


# ============================================================
# LOAD MODEL
# ============================================================

if not os.path.exists(
    MODEL_PATH
):

    raise FileNotFoundError(
        f"Model not found:\n"
        f"{MODEL_PATH}"
    )


checkpoint = torch.load(
    MODEL_PATH,
    map_location=DEVICE,
    weights_only=False,
)


if (
    isinstance(
        checkpoint,
        dict,
    )
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
# CREATE OUTPUT DIRECTORY
# ============================================================

if os.path.exists(
    OUTPUT_DIR
):

    print(
        "\nRemoving previous "
        "error-analysis folder..."
    )

    shutil.rmtree(
        OUTPUT_DIR
    )


os.makedirs(
    OUTPUT_DIR,
    exist_ok=True,
)


# ============================================================
# CREATE CLASS DIRECTORIES
#
# Errors are grouped by TRUE class.
# ============================================================

for class_name in CLASS_NAMES:

    os.makedirs(
        os.path.join(
            OUTPUT_DIR,
            class_name,
        ),
        exist_ok=True,
    )


# ============================================================
# INFERENCE
# ============================================================

print(
    "\nRunning inference..."
)


errors = []

correct_count = 0


with torch.no_grad():

    for (
        images,
        batch_labels,
        batch_paths,
    ) in loader:

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

        predictions = torch.argmax(
            probabilities,
            dim=1,
        )

        for index in range(
            len(batch_paths)
        ):

            true_index = int(
                batch_labels[index]
            )

            predicted_index = int(
                predictions[index]
            )

            probs = probabilities[
                index
            ].cpu().numpy()

            true_probability = float(
                probs[
                    true_index
                ]
            )

            predicted_probability = float(
                probs[
                    predicted_index
                ]
            )

            if (
                true_index
                ==
                predicted_index
            ):

                correct_count += 1

                continue


            # ------------------------------------------------
            # ERROR
            # ------------------------------------------------

            original_path = (
                batch_paths[index]
            )

            true_class = (
                CLASS_NAMES[
                    true_index
                ]
            )

            predicted_class = (
                CLASS_NAMES[
                    predicted_index
                ]
            )


            # ------------------------------------------------
            # Relative source filename
            # ------------------------------------------------

            original_filename = os.path.basename(
                original_path
            )


            # ------------------------------------------------
            # Make safe output filename
            # ------------------------------------------------

            safe_original_name = (
                original_filename
                .replace(
                    " ",
                    "_",
                )
                .replace(
                    ":",
                    "_",
                )
            )


            output_filename = (
                f"TRUE_{true_class}"
                f"__PRED_{predicted_class}"
                f"__CONF_"
                f"{predicted_probability:.3f}"
                f"__"
                f"{safe_original_name}"
            )


            # ------------------------------------------------
            # Group by TRUE CLASS
            # ------------------------------------------------

            true_class_dir = os.path.join(
                OUTPUT_DIR,
                true_class,
            )


            destination_path = os.path.join(
                true_class_dir,
                output_filename,
            )


            shutil.copy2(
                original_path,
                destination_path,
            )


            # ------------------------------------------------
            # All probabilities
            # ------------------------------------------------

            probability_dict = {}

            for class_index, class_name in enumerate(
                CLASS_NAMES
            ):

                probability_dict[
                    class_name
                ] = float(
                    probs[
                        class_index
                    ]
                )


            errors.append(
                {
                    "original_path": original_path,

                    "copied_path": destination_path,

                    "filename": original_filename,

                    "true_class": true_class,

                    "predicted_class": predicted_class,

                    "true_probability": true_probability,

                    "predicted_probability": predicted_probability,

                    "good_probability": float(
                        probs[
                            GOOD_INDEX
                        ]
                    ),

                    "probabilities": probability_dict,
                }
            )


# ============================================================
# ERROR COUNTS
# ============================================================

error_counts = {}

for class_name in CLASS_NAMES:

    error_counts[
        class_name
    ] = 0


for error in errors:

    error_counts[
        error["true_class"]
    ] += 1


# ============================================================
# PRINT SUMMARY
# ============================================================

total_images = len(
    labels
)

total_errors = len(
    errors
)


accuracy = (
    correct_count
    /
    total_images
)


print("\n" + "=" * 75)
print("VISUAL ERROR ANALYSIS COMPLETE")
print("=" * 75)


print(
    f"Total images       : "
    f"{total_images}"
)

print(
    f"Correct            : "
    f"{correct_count}"
)

print(
    f"Errors             : "
    f"{total_errors}"
)

print(
    f"Accuracy           : "
    f"{accuracy * 100:.2f}%"
)


# ============================================================
# ERROR SUMMARY
# ============================================================

print(
    "\nErrors by TRUE class"
)

print("-" * 75)


for class_name in CLASS_NAMES:

    print(
        f"{class_name:<20} : "
        f"{error_counts[class_name]}"
    )


# ============================================================
# ERROR PAIRS
#
# Example:
#
# combined -> split_teeth
# fabric_interior -> good
# ============================================================

error_pairs = {}


for error in errors:

    pair = (
        error["true_class"],
        error["predicted_class"],
    )

    if pair not in error_pairs:

        error_pairs[pair] = 0

    error_pairs[pair] += 1


print(
    "\nError pairs"
)

print("-" * 75)


sorted_pairs = sorted(
    error_pairs.items(),
    key=lambda x: x[1],
    reverse=True,
)


for (
    (true_class, predicted_class),
    count,
) in sorted_pairs:

    print(
        f"{true_class:<20}"
        f" -> "
        f"{predicted_class:<20}"
        f" : {count}"
    )


# ============================================================
# SAVE JSON
# ============================================================

json_data = {

    "category": CATEGORY,

    "model": MODEL_PATH,

    "dataset_size": total_images,

    "correct": correct_count,

    "errors": total_errors,

    "accuracy": accuracy,

    "class_names": CLASS_NAMES,

    "error_counts": error_counts,

    "error_pairs": {
        f"{true_class} -> {predicted_class}":
        count
        for (
            (true_class, predicted_class),
            count,
        ) in sorted_pairs
    },

    "errors": errors,
}


with open(
    JSON_PATH,
    "w",
    encoding="utf-8",
) as file:

    json.dump(
        json_data,
        file,
        indent=4,
    )


# ============================================================
# CREATE HTML REPORT
# ============================================================

html_parts = []


html_parts.append(
    """
<!DOCTYPE html>
<html>
<head>

<meta charset="UTF-8">

<title>Zipper AI Error Analysis</title>

<style>

body {
    font-family: Arial, sans-serif;
    margin: 30px;
    background: #f5f5f5;
}

h1 {
    margin-bottom: 5px;
}

h2 {
    margin-top: 35px;
}

.summary {
    background: white;
    padding: 20px;
    border-radius: 10px;
    margin-bottom: 25px;
}

.stats {
    display: flex;
    gap: 25px;
    flex-wrap: wrap;
}

.stat {
    background: white;
    padding: 15px 20px;
    border-radius: 10px;
    min-width: 140px;
}

.grid {
    display: grid;
    grid-template-columns:
        repeat(auto-fill, minmax(280px, 1fr));
    gap: 20px;
}

.card {
    background: white;
    padding: 12px;
    border-radius: 10px;
    box-shadow:
        0 2px 8px rgba(0,0,0,0.08);
}

.card img {
    width: 100%;
    height: 220px;
    object-fit: contain;
    background: #eee;
    border-radius: 6px;
}

.card-title {
    font-weight: bold;
    margin-top: 10px;
}

.card-info {
    font-size: 14px;
    margin-top: 6px;
    line-height: 1.5;
}

.error-section {
    margin-top: 40px;
}

table {
    border-collapse: collapse;
    width: 100%;
    background: white;
}

th, td {
    padding: 10px;
    border: 1px solid #ddd;
    text-align: left;
}

th {
    background: #eee;
}

</style>

</head>

<body>

<h1>🔍 VisionInspect AI — Zipper Error Analysis</h1>

<p>
Visual inspection of misclassified Zipper samples
using the original ResNet18 model.
</p>

<div class="summary">

<h2>Summary</h2>

<div class="stats">

<div class="stat">
<b>Total</b><br>
"""
)

html_parts.append(
    str(total_images)
)

html_parts.append(
    """
</div>

<div class="stat">
<b>Correct</b><br>
"""
)

html_parts.append(
    str(correct_count)
)

html_parts.append(
    """
</div>

<div class="stat">
<b>Errors</b><br>
"""
)

html_parts.append(
    str(total_errors)
)

html_parts.append(
    """
</div>

<div class="stat">
<b>Accuracy</b><br>
"""
)

html_parts.append(
    f"{accuracy * 100:.2f}%"
)

html_parts.append(
    """
</div>

</div>

</div>

"""
)


# ============================================================
# ERROR PAIR TABLE
# ============================================================

html_parts.append(
    """
<div class="error-section">

<h2>📊 Error Pairs</h2>

<table>

<tr>
<th>True Class</th>
<th>Predicted Class</th>
<th>Count</th>
</tr>
"""
)


for (
    (true_class, predicted_class),
    count,
) in sorted_pairs:

    html_parts.append(
        f"""
<tr>
<td>{html.escape(true_class)}</td>
<td>{html.escape(predicted_class)}</td>
<td>{count}</td>
</tr>
"""
    )


html_parts.append(
    """
</table>

</div>
"""
)


# ============================================================
# VISUAL ERROR CARDS
# ============================================================

for class_name in CLASS_NAMES:

    class_errors = [
        error
        for error in errors
        if error["true_class"]
        ==
        class_name
    ]

    if not class_errors:
        continue


    html_parts.append(
        f"""
<div class="error-section">

<h2>
TRUE CLASS: {html.escape(class_name)}
({len(class_errors)} errors)
</h2>

<div class="grid">
"""
    )


    for error in class_errors:

        copied_path = (
            error["copied_path"]
        )

        relative_image_path = os.path.relpath(
            copied_path,
            OUTPUT_DIR,
        )


        relative_image_path = (
            relative_image_path
            .replace(
                "\\",
                "/",
            )
        )


        html_parts.append(
            f"""
<div class="card">

<img
src="{html.escape(relative_image_path)}"
alt="Error image"
>

<div class="card-title">

TRUE:
{html.escape(error["true_class"])}

<br>

PREDICTED:
{html.escape(error["predicted_class"])}

</div>

<div class="card-info">

<b>Predicted confidence:</b>
{error["predicted_probability"]:.3f}

<br>

<b>True-class probability:</b>
{error["true_probability"]:.3f}

<br>

<b>Good probability:</b>
{error["good_probability"]:.3f}

<br>

<b>Original file:</b>
{html.escape(error["filename"])}

</div>

</div>
"""
        )


    html_parts.append(
        """
</div>

</div>
"""
    )


# ============================================================
# CLOSE HTML
# ============================================================

html_parts.append(
    """
</body>
</html>
"""
)


with open(
    HTML_PATH,
    "w",
    encoding="utf-8",
) as file:

    file.write(
        "".join(
            html_parts
        )
    )


# ============================================================
# FINAL OUTPUT
# ============================================================

print("\n" + "=" * 75)

print(
    "FILES CREATED"
)

print("=" * 75)

print(
    f"\nError images:"
)

print(
    OUTPUT_DIR
)

print(
    f"\nJSON report:"
)

print(
    JSON_PATH
)

print(
    f"\nHTML visual report:"
)

print(
    HTML_PATH
)

print(
    "\nOpen index.html in your browser "
    "to inspect every mistake visually."
)

print("=" * 75)