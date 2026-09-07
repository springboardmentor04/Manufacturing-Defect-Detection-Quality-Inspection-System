# ============================================================
# VISIONINSPECT AI
# BINARY MODEL EVALUATION
# ============================================================

import json
from pathlib import Path

import torch
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    confusion_matrix,
    classification_report,
)

from app.ai.train_binary import (
    DEVICE,
    MODEL_PATH,
    VAL_TRANSFORM,
    BinaryDataset,
    collect_samples,
    split_samples,
    create_model,
    create_dataloaders,
)


# ============================================================
# THRESHOLDS
# ============================================================

THRESHOLDS = [
    0.10,
    0.15,
    0.20,
    0.25,
    0.30,
    0.35,
    0.40,
    0.45,
    0.50,
    0.55,
    0.60,
    0.65,
    0.70,
    0.75,
    0.80,
    0.85,
    0.90,
]


# ============================================================
# LOAD MODEL
# ============================================================

def load_model():

    if not MODEL_PATH.exists():

        raise FileNotFoundError(
            f"Binary model not found:\n"
            f"{MODEL_PATH}\n\n"
            f"Train it first using:\n"
            f"python -m app.ai.train_binary"
        )

    model = create_model()

    checkpoint = torch.load(
        MODEL_PATH,
        map_location=DEVICE,
        weights_only=False,
    )

    if (
        isinstance(checkpoint, dict)
        and "model_state_dict"
        in checkpoint
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

    model.eval()

    return model


# ============================================================
# COLLECT PROBABILITIES
# ============================================================

@torch.no_grad()
def collect_predictions(
    model,
    val_loader,
):

    all_labels = []

    all_probabilities = []

    for images, labels in val_loader:

        images = images.to(
            DEVICE,
            non_blocking=True,
        )

        outputs = model(images)

        probabilities = torch.softmax(
            outputs,
            dim=1,
        )

        defective_probability = (
            probabilities[:, 1]
        )

        all_labels.extend(
            labels.tolist()
        )

        all_probabilities.extend(
            defective_probability
            .cpu()
            .tolist()
        )

    return (
        all_labels,
        all_probabilities,
    )


# ============================================================
# THRESHOLD EVALUATION
# ============================================================

def evaluate_thresholds(
    labels,
    probabilities,
):

    results = []

    print()
    print("=" * 95)
    print("THRESHOLD EVALUATION")
    print("=" * 95)

    print(
        f"{'Threshold':>10}"
        f"{'Accuracy':>12}"
        f"{'Precision':>12}"
        f"{'Recall':>12}"
        f"{'F1':>12}"
        f"{'TN':>8}"
        f"{'FP':>8}"
        f"{'FN':>8}"
        f"{'TP':>8}"
    )

    print("-" * 95)

    for threshold in THRESHOLDS:

        predictions = [
            1
            if probability >= threshold
            else 0
            for probability
            in probabilities
        ]

        accuracy = accuracy_score(
            labels,
            predictions,
        )

        precision = precision_score(
            labels,
            predictions,
            zero_division=0,
        )

        recall = recall_score(
            labels,
            predictions,
            zero_division=0,
        )

        f1 = f1_score(
            labels,
            predictions,
            zero_division=0,
        )

        matrix = confusion_matrix(
            labels,
            predictions,
            labels=[0, 1],
        )

        tn, fp, fn, tp = (
            matrix.ravel()
        )

        print(
            f"{threshold:10.2f}"
            f"{accuracy * 100:11.2f}%"
            f"{precision * 100:11.2f}%"
            f"{recall * 100:11.2f}%"
            f"{f1 * 100:11.2f}%"
            f"{tn:8d}"
            f"{fp:8d}"
            f"{fn:8d}"
            f"{tp:8d}"
        )

        results.append(
            {
                "threshold": threshold,
                "accuracy": accuracy,
                "precision": precision,
                "recall": recall,
                "f1": f1,
                "confusion_matrix":
                    matrix.tolist(),
            }
        )

    return results


# ============================================================
# SELECT BEST THRESHOLD
# ============================================================

def choose_threshold(
    results,
):

    # --------------------------------------------------------
    # PRIMARY:
    # Maximize F1
    # --------------------------------------------------------

    best_f1 = max(
        results,
        key=lambda item:
            item["f1"],
    )

    # --------------------------------------------------------
    # TARGET:
    # Prefer thresholds where
    # precision and recall are both >= 90%
    # --------------------------------------------------------

    target_results = [
        result
        for result in results
        if result["precision"] >= 0.90
        and result["recall"] >= 0.90
    ]

    print()
    print("=" * 95)
    print("BEST THRESHOLD")
    print("=" * 95)

    if target_results:

        best_target = max(
            target_results,
            key=lambda item:
                item["f1"],
        )

        print(
            "🎯 Threshold satisfying "
            "Precision >= 90% and Recall >= 90%"
        )

        print(
            f"Threshold : "
            f"{best_target['threshold']:.2f}"
        )

        print(
            f"Accuracy  : "
            f"{best_target['accuracy'] * 100:.2f}%"
        )

        print(
            f"Precision : "
            f"{best_target['precision'] * 100:.2f}%"
        )

        print(
            f"Recall    : "
            f"{best_target['recall'] * 100:.2f}%"
        )

        print(
            f"F1        : "
            f"{best_target['f1'] * 100:.2f}%"
        )

        selected = best_target

    else:

        print(
            "No threshold achieved "
            "both Precision >= 90% "
            "and Recall >= 90%."
        )

        print()
        print(
            "Best threshold by F1:"
        )

        print(
            f"Threshold : "
            f"{best_f1['threshold']:.2f}"
        )

        print(
            f"Accuracy  : "
            f"{best_f1['accuracy'] * 100:.2f}%"
        )

        print(
            f"Precision : "
            f"{best_f1['precision'] * 100:.2f}%"
        )

        print(
            f"Recall    : "
            f"{best_f1['recall'] * 100:.2f}%"
        )

        print(
            f"F1        : "
            f"{best_f1['f1'] * 100:.2f}%"
        )

        selected = best_f1

    print("=" * 95)

    return selected


# ============================================================
# MAIN
# ============================================================

def main():

    print()
    print("=" * 95)
    print("VISIONINSPECT AI - BINARY MODEL EVALUATION")
    print("=" * 95)

    print(
        f"Device: {DEVICE}"
    )

    print(
        f"Model : {MODEL_PATH}"
    )

    # --------------------------------------------------------
    # DATA
    # --------------------------------------------------------

    samples = collect_samples()

    (
        train_samples,
        val_samples,
    ) = split_samples(
        samples
    )

    # IMPORTANT:
    # Evaluation must use validation transform.
    val_dataset = BinaryDataset(
        val_samples,
        VAL_TRANSFORM,
    )

    from torch.utils.data import DataLoader

    val_loader = DataLoader(
        val_dataset,
        batch_size=32,
        shuffle=False,
        num_workers=0,
    )

    print()
    print(
        f"Validation samples: "
        f"{len(val_samples)}"
    )

    # --------------------------------------------------------
    # MODEL
    # --------------------------------------------------------

    model = load_model()

    print(
        "Model loaded successfully."
    )

    # --------------------------------------------------------
    # PREDICTIONS
    # --------------------------------------------------------

    labels, probabilities = (
        collect_predictions(
            model,
            val_loader,
        )
    )

    # --------------------------------------------------------
    # THRESHOLDS
    # --------------------------------------------------------

    results = evaluate_thresholds(
        labels,
        probabilities,
    )

    # --------------------------------------------------------
    # BEST
    # --------------------------------------------------------

    best = choose_threshold(
        results
    )

    # --------------------------------------------------------
    # REPORT AT BEST THRESHOLD
    # --------------------------------------------------------

    predictions = [
        1
        if probability >= best["threshold"]
        else 0
        for probability
        in probabilities
    ]

    print()
    print("=" * 95)
    print("CLASSIFICATION REPORT")
    print("=" * 95)

    print(
        classification_report(
            labels,
            predictions,
            target_names=[
                "Normal",
                "Defective",
            ],
            zero_division=0,
        )
    )

    # --------------------------------------------------------
    # SAVE EVALUATION
    # --------------------------------------------------------

    evaluation_path = (
        Path(MODEL_PATH).parent
        / "binary_evaluation.json"
    )

    output = {

        "model":
            str(MODEL_PATH),

        "device":
            str(DEVICE),

        "validation_samples":
            len(val_samples),

        "best_threshold":
            best["threshold"],

        "best_metrics": {
            "accuracy":
                best["accuracy"],

            "precision":
                best["precision"],

            "recall":
                best["recall"],

            "f1":
                best["f1"],
        },

        "confusion_matrix":
            best["confusion_matrix"],

        "threshold_results":
            results,
    }

    with open(
        evaluation_path,
        "w",
        encoding="utf-8",
    ) as file:

        json.dump(
            output,
            file,
            indent=2,
        )

    print()
    print(
        f"Evaluation saved to:"
    )

    print(
        evaluation_path
    )

    print()
    print("=" * 95)


# ============================================================
# ENTRY POINT
# ============================================================

if __name__ == "__main__":

    main()