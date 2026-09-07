# ============================================================
# VISIONINSPECT AI
# DATASET V2
# ============================================================

from __future__ import annotations

from pathlib import Path
from typing import Dict, List

from PIL import Image

from torch.utils.data import Dataset

import torch


# ============================================================
# BASE MANIFEST DATASET
# ============================================================

class ManifestDataset(Dataset):

    def __init__(
        self,
        samples: List[Dict],
        transform=None,
    ):

        self.samples = samples

        self.transform = transform

    # --------------------------------------------------------
    # LENGTH
    # --------------------------------------------------------

    def __len__(self):

        return len(
            self.samples
        )

    # --------------------------------------------------------
    # GET ITEM
    # --------------------------------------------------------

    def __getitem__(
        self,
        index,
    ):

        sample = self.samples[index]

        # ----------------------------------------------------
        # IMAGE PATH
        # ----------------------------------------------------

        image_path = Path(
            sample["image_path"]
        )

        if not image_path.exists():

            raise FileNotFoundError(
                f"Image not found: {image_path}"
            )

        # ----------------------------------------------------
        # IMAGE
        # ----------------------------------------------------

        try:

            image = Image.open(
                image_path
            ).convert("RGB")

        except Exception as exc:

            raise RuntimeError(
                f"Unable to read image: "
                f"{image_path}"
            ) from exc

        # ----------------------------------------------------
        # TRANSFORM
        # ----------------------------------------------------

        if self.transform is not None:

            image = self.transform(
                image
            )

        # ----------------------------------------------------
        # LABEL
        # ----------------------------------------------------
        #
        # Category manifests:
        #
        #     "good"
        #     "scratch"
        #     "crack"
        #
        # These remain strings.
        #
        # Binary/anomaly manifests:
        #
        #     0
        #     1
        #
        # These become tensors.
        # ----------------------------------------------------

        label = sample.get(
            "label"
        )

        if isinstance(
            label,
            bool,
        ):

            label = torch.tensor(
                int(label),
                dtype=torch.long,
            )

        elif isinstance(
            label,
            int,
        ):

            label = torch.tensor(
                label,
                dtype=torch.long,
            )

        elif isinstance(
            label,
            float,
        ):

            label = torch.tensor(
                int(label),
                dtype=torch.long,
            )

        elif isinstance(
            label,
            str,
        ):

            # Keep string metadata unchanged.
            pass

        elif label is None:

            pass

        else:

            raise TypeError(
                "Unsupported label type: "
                f"{type(label).__name__}"
            )

        # ----------------------------------------------------
        # CATEGORY INDEX
        # ----------------------------------------------------

        category_index = sample.get(
            "category_index"
        )

        if category_index is not None:

            try:

                category_index = torch.tensor(
                    int(category_index),
                    dtype=torch.long,
                )

            except (
                TypeError,
                ValueError,
            ) as exc:

                raise ValueError(
                    "Invalid category_index: "
                    f"{category_index!r}"
                ) from exc

        # ----------------------------------------------------
        # OPTIONAL METADATA
        # ----------------------------------------------------
        #
        # IMPORTANT:
        #
        # Some manifests do not contain:
        #
        #     label_name
        #     defect_type
        #
        # We use an empty string instead of None so that
        # PyTorch's default DataLoader can safely collate
        # batches.
        #
        # ----------------------------------------------------

        category = sample.get(
            "category",
            "",
        )

        label_name = sample.get(
            "label_name",
            "",
        )

        defect_type = sample.get(
            "defect_type",
            "",
        )

        source = sample.get(
            "source",
            "",
        )

        # ----------------------------------------------------
        # RETURN
        # ----------------------------------------------------

        return {

            "image": image,

            "label": label,

            "category": category,

            "category_index": category_index,

            "defect_type": defect_type,

            "label_name": label_name,

            "image_path": str(
                image_path
            ),

            "source": source,
        }


# ============================================================
# BINARY MANIFEST DATASET
# ============================================================

class BinaryManifestDataset(
    ManifestDataset
):

    def __getitem__(
        self,
        index,
    ):

        item = super().__getitem__(
            index
        )

        label = item["label"]

        if label is None:

            raise ValueError(
                "Binary dataset sample "
                "has no label.\n"
                f"Image: {item['image_path']}"
            )

        if not isinstance(
            label,
            torch.Tensor,
        ):

            raise TypeError(
                "Binary dataset requires "
                "a numeric label.\n"
                f"Received: {label!r}\n"
                f"Image: {item['image_path']}"
            )

        label_value = int(
            label.item()
        )

        if label_value not in (
            0,
            1,
        ):

            raise ValueError(
                "Binary label must be "
                "0 or 1.\n"
                f"Received: {label_value}"
            )

        return item


# ============================================================
# CATEGORY MANIFEST DATASET
# ============================================================

class CategoryManifestDataset(
    ManifestDataset
):

    def __getitem__(
        self,
        index,
    ):

        item = super().__getitem__(
            index
        )

        category_index = (
            item["category_index"]
        )

        if category_index is None:

            raise ValueError(
                "Category dataset sample "
                "has no category_index.\n"
                f"Image: {item['image_path']}"
            )

        if not isinstance(
            category_index,
            torch.Tensor,
        ):

            raise TypeError(
                "category_index must be "
                "a torch.Tensor."
            )

        category_value = int(
            category_index.item()
        )

        if (
            category_value < 0
            or category_value >= 15
        ):

            raise ValueError(
                "category_index must be "
                "between 0 and 14.\n"
                f"Received: {category_value}"
            )

        # ----------------------------------------------------
        # CATEGORY MODEL TARGET
        # ----------------------------------------------------
        #
        # The category model predicts:
        #
        #     bottle      -> 0
        #     cable       -> 1
        #     capsule     -> 2
        #     ...
        #     zipper      -> 14
        #
        # Therefore category_index becomes the model label.
        # ----------------------------------------------------

        item["label"] = (
            category_index
        )

        return item


# ============================================================
# ANOMALY MANIFEST DATASET
# ============================================================

class AnomalyManifestDataset(
    ManifestDataset
):

    def __getitem__(
        self,
        index,
    ):

        item = super().__getitem__(
            index
        )

        label = item["label"]

        if label is None:

            raise ValueError(
                "Anomaly dataset sample "
                "has no label.\n"
                f"Image: {item['image_path']}"
            )

        if not isinstance(
            label,
            torch.Tensor,
        ):

            raise TypeError(
                "Anomaly dataset requires "
                "a numeric label.\n"
                f"Received: {label!r}\n"
                f"Image: {item['image_path']}"
            )

        label_value = int(
            label.item()
        )

        if label_value not in (
            0,
            1,
        ):

            raise ValueError(
                "Anomaly label must be "
                "0 or 1.\n"
                f"Received: {label_value}"
            )

        # 0 = normal
        # 1 = defective

        item["label"] = label

        return item