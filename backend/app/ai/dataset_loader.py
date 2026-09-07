import os

# Path to the MVTec AD dataset
DATASET_PATH = os.path.join("dataset", "mvtec_ad")


def get_categories():
    """
    Returns all available object categories in the dataset.
    """
    if not os.path.exists(DATASET_PATH):
        return []

    categories = [
        folder
        for folder in os.listdir(DATASET_PATH)
        if os.path.isdir(os.path.join(DATASET_PATH, folder))
    ]

    return sorted(categories)


def get_category_info(category):
    """
    Returns the number of training and testing images for a category.
    """
    category_path = os.path.join(DATASET_PATH, category)

    if not os.path.exists(category_path):
        return None

    train_count = 0
    test_count = 0

    train_path = os.path.join(category_path, "train")
    test_path = os.path.join(category_path, "test")

    for root, _, files in os.walk(train_path):
        train_count += len(
            [f for f in files if f.lower().endswith((".png", ".jpg", ".jpeg"))]
        )

    for root, _, files in os.walk(test_path):
        test_count += len(
            [f for f in files if f.lower().endswith((".png", ".jpg", ".jpeg"))]
        )

    return {
        "category": category,
        "train_images": train_count,
        "test_images": test_count,
    }