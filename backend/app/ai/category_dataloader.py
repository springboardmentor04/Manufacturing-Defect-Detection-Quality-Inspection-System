import os
from collections import Counter

from PIL import Image
from torch.utils.data import Dataset
from torchvision import transforms


# ============================================================
# PATHS
# ============================================================

PROJECT_ROOT = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "../..")
)

DATASET_ROOT = os.path.join(
    PROJECT_ROOT,
    "dataset",
    "mvtec_ad"
)


# ============================================================
# MVTec CATEGORIES
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

IMAGE_EXTENSIONS = {
    ".jpg",
    ".jpeg",
    ".png",
    ".bmp",
    ".webp",
}


# ============================================================
# TRANSFORMS
# ============================================================

CATEGORY_TRANSFORM = transforms.Compose([
    transforms.Resize((256, 256)),
    transforms.ToTensor(),
    transforms.Normalize(
        mean=[0.485, 0.456, 0.406],
        std=[0.229, 0.224, 0.225],
    ),
])


# ============================================================
# DATASET
# ============================================================

class MVTecCategoryDataset(Dataset):

    def __init__(
        self,
        root_dir=DATASET_ROOT,
        transform=None,
        include_defective=True,
    ):

        self.root_dir = root_dir
        self.transform = transform or CATEGORY_TRANSFORM
        self.include_defective = include_defective

        self.samples = []

        self.category_to_index = {
            category: index
            for index, category in enumerate(CATEGORIES)
        }

        self.index_to_category = {
            index: category
            for category, index in self.category_to_index.items()
        }

        self._load_samples()

    # --------------------------------------------------------
    # LOAD DATA
    # --------------------------------------------------------

    def _load_samples(self):

        for category in CATEGORIES:

            category_path = os.path.join(
                self.root_dir,
                category
            )

            if not os.path.isdir(category_path):
                continue

            # ------------------------------------------------
            # GOOD IMAGES
            # ------------------------------------------------

            train_good_path = os.path.join(
                category_path,
                "train",
                "good"
            )

            self._add_images(
                train_good_path,
                category,
                "good"
            )

            # ------------------------------------------------
            # DEFECTIVE IMAGES
            # ------------------------------------------------

            if self.include_defective:

                test_path = os.path.join(
                    category_path,
                    "test"
                )

                if os.path.isdir(test_path):

                    for defect_type in sorted(
                        os.listdir(test_path)
                    ):

                        if defect_type == "good":
                            continue

                        defect_path = os.path.join(
                            test_path,
                            defect_type
                        )

                        self._add_images(
                            defect_path,
                            category,
                            defect_type
                        )

    # --------------------------------------------------------
    # ADD IMAGES
    # --------------------------------------------------------

    def _add_images(
        self,
        folder,
        category,
        defect_type
    ):

        if not os.path.isdir(folder):
            return

        for filename in sorted(os.listdir(folder)):

            extension = os.path.splitext(
                filename
            )[1].lower()

            if extension not in IMAGE_EXTENSIONS:
                continue

            image_path = os.path.join(
                folder,
                filename
            )

            category_index = self.category_to_index[
                category
            ]

            self.samples.append({
                "image_path": image_path,
                "category": category,
                "category_index": category_index,
                "defect_type": defect_type,
            })

    # --------------------------------------------------------
    # DATASET LENGTH
    # --------------------------------------------------------

    def __len__(self):
        return len(self.samples)

    # --------------------------------------------------------
    # GET ITEM
    # --------------------------------------------------------

    def __getitem__(self, index):

        sample = self.samples[index]

        image = Image.open(
            sample["image_path"]
        ).convert("RGB")

        if self.transform:
            image = self.transform(image)

        return {
            "image": image,
            "category": sample["category"],
            "category_index": sample["category_index"],
            "defect_type": sample["defect_type"],
            "image_path": sample["image_path"],
        }


# ============================================================
# DATASET ANALYSIS
# ============================================================

def analyze_dataset(dataset):

    category_counts = Counter()
    category_defect_counts = Counter()

    for sample in dataset.samples:

        category = sample["category"]
        defect_type = sample["defect_type"]

        category_counts[category] += 1

        category_defect_counts[
            (category, defect_type)
        ] += 1

    return category_counts, category_defect_counts


# ============================================================
# MAIN
# ============================================================

if __name__ == "__main__":

    print("\n" + "=" * 70)
    print("VISIONINSPECT AI")
    print("AUTOMATIC PRODUCT CATEGORY DATASET")
    print("=" * 70)

    dataset = MVTecCategoryDataset()

    print(f"\nTotal images : {len(dataset)}")
    print(f"Total categories : {len(dataset.category_to_index)}")

    print("\nCategory Mapping")
    print("-" * 50)

    for index, category in dataset.index_to_category.items():
        print(f"{index:>2} -> {category}")

    category_counts, category_defect_counts = analyze_dataset(
        dataset
    )

    print("\nCategory Image Counts")
    print("-" * 50)

    for category in CATEGORIES:
        print(
            f"{category:<15} "
            f"{category_counts[category]:>5} images"
        )

    print("\nDefect Distribution")
    print("-" * 70)

    current_category = None

    for (category, defect_type), count in sorted(
        category_defect_counts.items()
    ):

        if category != current_category:

            print(f"\n[{category}]")
            current_category = category

        print(
            f"  {defect_type:<30} {count:>5}"
        )

    print("\n" + "=" * 70)
    print("DATASET READY")
    print("=" * 70)