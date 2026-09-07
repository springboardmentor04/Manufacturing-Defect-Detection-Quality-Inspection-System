# backend/app/ai/defect_dataloader.py

import os
from collections import Counter

import numpy as np
from PIL import Image

import torch
from torch.utils.data import Dataset
from torchvision import transforms


# ============================================================
# PATH
# ============================================================

BASE_DIR = os.path.dirname(
    os.path.dirname(
        os.path.dirname(
            os.path.abspath(__file__)
        )
    )
)

DATASET_ROOT = os.path.join(
    BASE_DIR,
    "dataset",
    "mvtec_ad"
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
    "zipper"
]


IMAGE_EXTENSIONS = {
    ".png",
    ".jpg",
    ".jpeg",
    ".bmp"
}


# ============================================================
# DATASET
# ============================================================

class MVTecDefectDataset(Dataset):

    def __init__(
        self,
        root_dir=DATASET_ROOT,
        transform=None,
        crop_to_mask=True,
        padding=20
    ):

        self.root_dir = root_dir

        self.transform = transform

        self.crop_to_mask = crop_to_mask

        self.padding = padding

        self.samples = []


        self._load_samples()


    # ========================================================
    # LOAD SAMPLES
    # ========================================================

    def _load_samples(self):

        for category in CATEGORIES:

            category_path = os.path.join(
                self.root_dir,
                category
            )


            test_path = os.path.join(
                category_path,
                "test"
            )


            ground_truth_path = os.path.join(
                category_path,
                "ground_truth"
            )


            if not os.path.isdir(test_path):

                continue


            for defect_type in sorted(
                os.listdir(test_path)
            ):

                # Ignore normal images
                if defect_type == "good":

                    continue


                defect_path = os.path.join(
                    test_path,
                    defect_type
                )


                if not os.path.isdir(
                    defect_path
                ):

                    continue


                mask_path_folder = os.path.join(
                    ground_truth_path,
                    defect_type
                )


                for filename in sorted(
                    os.listdir(defect_path)
                ):

                    extension = os.path.splitext(
                        filename
                    )[1].lower()


                    if extension not in IMAGE_EXTENSIONS:

                        continue


                    image_path = os.path.join(
                        defect_path,
                        filename
                    )


                    image_name = os.path.splitext(
                        filename
                    )[0]


                    mask_filename = (
                        image_name
                        + "_mask.png"
                    )


                    mask_path = os.path.join(
                        mask_path_folder,
                        mask_filename
                    )


                    self.samples.append({

                        "image_path":
                            image_path,

                        "mask_path":
                            mask_path,

                        "category":
                            category,

                        "defect_type":
                            defect_type

                    })


    # ========================================================
    # LENGTH
    # ========================================================

    def __len__(self):

        return len(
            self.samples
        )


    # ========================================================
    # CROP USING MASK
    # ========================================================

    def _crop_to_defect(
        self,
        image,
        mask
    ):

        mask_array = np.array(
            mask
        )


        # Convert mask to binary
        if mask_array.ndim == 3:

            mask_array = mask_array[:, :, 0]


        binary_mask = (
            mask_array > 0
        )


        # If mask is empty,
        # return original image
        if not binary_mask.any():

            return image


        ys, xs = np.where(
            binary_mask
        )


        x_min = int(
            xs.min()
        )

        x_max = int(
            xs.max()
        )

        y_min = int(
            ys.min()
        )

        y_max = int(
            ys.max()
        )


        width, height = image.size


        x_min = max(
            0,
            x_min - self.padding
        )

        y_min = max(
            0,
            y_min - self.padding
        )

        x_max = min(
            width - 1,
            x_max + self.padding
        )

        y_max = min(
            height - 1,
            y_max + self.padding
        )


        return image.crop(
            (
                x_min,
                y_min,
                x_max + 1,
                y_max + 1
            )
        )


    # ========================================================
    # GET ITEM
    # ========================================================

    def __getitem__(self, index):

        sample = self.samples[
            index
        ]


        image = Image.open(
            sample["image_path"]
        ).convert("RGB")


        mask = None


        if os.path.exists(
            sample["mask_path"]
        ):

            mask = Image.open(
                sample["mask_path"]
            ).convert("L")


        if (
            self.crop_to_mask
            and mask is not None
        ):

            image = self._crop_to_defect(
                image,
                mask
            )


        if self.transform:

            image = self.transform(
                image
            )


        return {

            "image":
                image,

            "category":
                sample["category"],

            "defect_type":
                sample["defect_type"],

            "image_path":
                sample["image_path"],

            "mask_path":
                sample["mask_path"]

        }


# ============================================================
# DATASET SUMMARY
# ============================================================

def print_dataset_summary(dataset):

    category_counts = Counter()

    defect_counts = Counter()

    missing_masks = []


    for sample in dataset.samples:

        category_counts[
            sample["category"]
        ] += 1


        defect_counts[
            (
                sample["category"],
                sample["defect_type"]
            )
        ] += 1


        if not os.path.exists(
            sample["mask_path"]
        ):

            missing_masks.append(
                sample
            )


    print("\n")
    print("=" * 70)
    print("VISIONINSPECT AI")
    print("MASK-AWARE DEFECT DATASET")
    print("=" * 70)


    print(
        f"Total defective images: "
        f"{len(dataset)}"
    )


    print(
        f"Missing masks: "
        f"{len(missing_masks)}"
    )


    print("\nCategory Counts")
    print("-" * 50)


    for category in CATEGORIES:

        print(
            f"{category:<15}"
            f"{category_counts[category]:>6}"
        )


    print("\nDefect Counts")
    print("-" * 70)


    current_category = None


    for (
        category,
        defect_type
    ), count in sorted(
        defect_counts.items()
    ):

        if category != current_category:

            print(
                f"\n[{category}]"
            )

            current_category = category


        print(
            f"  "
            f"{defect_type:<30}"
            f"{count:>5}"
        )


    print("\n" + "=" * 70)


# ============================================================
# MAIN VERIFICATION
# ============================================================

if __name__ == "__main__":

    dataset = MVTecDefectDataset(
        crop_to_mask=True
    )


    print_dataset_summary(
        dataset
    )


    if len(dataset) == 0:

        raise RuntimeError(
            "No defective images found."
        )


    missing_masks = [

        sample

        for sample in dataset.samples

        if not os.path.exists(
            sample["mask_path"]
        )

    ]


    if missing_masks:

        print("\nMISSING MASK EXAMPLES:")

        for sample in missing_masks[:10]:

            print(
                sample["mask_path"]
            )


        raise RuntimeError(
            f"{len(missing_masks)} "
            "defect masks are missing."
        )


    # --------------------------------------------------------
    # Test one sample
    # --------------------------------------------------------

    sample = dataset[0]


    print("\nSample Test")
    print("-" * 50)

    print(
        "Category:",
        sample["category"]
    )

    print(
        "Defect:",
        sample["defect_type"]
    )

    print(
        "Image:",
        sample["image_path"]
    )

    print(
        "Mask:",
        sample["mask_path"]
    )

    print(
        "Processed image size:",
        sample["image"].size
    )


    print("\n")
    print("=" * 70)
    print("MASK DATASET VERIFICATION PASSED")
    print("=" * 70)