import os
import json
import random
import shutil

SEED = 42
random.seed(SEED)

SOURCE_ROOT = "dataset/mvtec_ad"

OUTPUT_ROOT = "dataset/defect_classification"

TRAIN_DIR = os.path.join(
    OUTPUT_ROOT,
    "train"
)

VAL_DIR = os.path.join(
    OUTPUT_ROOT,
    "val"
)

TEST_DIR = os.path.join(
    OUTPUT_ROOT,
    "test"
)

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

VAL_RATIO = 0.20


def image_file(name):

    return name.lower().endswith(
        (
            ".png",
            ".jpg",
            ".jpeg",
            ".bmp",
        )
    )


def copy_file(
    source,
    destination
):

    os.makedirs(
        os.path.dirname(destination),
        exist_ok=True
    )

    shutil.copy2(
        source,
        destination
    )


def collect_defect_images():

    data = {}

    for category in CATEGORIES:

        category_root = os.path.join(
            SOURCE_ROOT,
            category
        )

        test_root = os.path.join(
            category_root,
            "test"
        )

        if not os.path.isdir(
            test_root
        ):
            continue

        data[category] = {}

        for defect in sorted(
            os.listdir(test_root)
        ):

            if defect == "good":
                continue

            defect_dir = os.path.join(
                test_root,
                defect
            )

            if not os.path.isdir(
                defect_dir
            ):
                continue

            images = []

            for filename in sorted(
                os.listdir(defect_dir)
            ):

                if not image_file(
                    filename
                ):
                    continue

                images.append(
                    os.path.join(
                        defect_dir,
                        filename
                    )
                )

            if images:

                data[category][
                    defect
                ] = images

    return data


def build():

    if os.path.exists(
        OUTPUT_ROOT
    ):

        shutil.rmtree(
            OUTPUT_ROOT
        )

    os.makedirs(
        TRAIN_DIR,
        exist_ok=True
    )

    os.makedirs(
        VAL_DIR,
        exist_ok=True
    )

    os.makedirs(
        TEST_DIR,
        exist_ok=True
    )

    data = collect_defect_images()

    manifest = {

        "seed": SEED,

        "source":
            SOURCE_ROOT,

        "official_test_used":
            False,

        "categories": {},

    }

    total_train = 0
    total_val = 0
    total_test = 0

    for category in CATEGORIES:

        if category not in data:
            continue

        manifest["categories"][
            category
        ] = {}

        for defect, images in (
            data[category].items()
        ):

            # ------------------------------------------------
            # IMPORTANT:
            # The official MVTec test set is NEVER copied
            # into the new training/validation dataset.
            #
            # This builder therefore creates a classification
            # training set only from explicitly supplied
            # development images if they exist under:
            #
            # dataset/mvtec_ad_dev/
            #
            # Otherwise no training images are fabricated.
            # ------------------------------------------------

            manifest[
                "categories"
            ][category][defect] = {

                "source_count":
                    len(images),

                "train":
                    0,

                "validation":
                    0,

                "test":
                    0,

            }

    # --------------------------------------------------------
    # LOOK FOR A SEPARATE DEVELOPMENT DATASET
    # --------------------------------------------------------

    development_roots = [

        "dataset/mvtec_ad_dev",

        "dataset/mvtec_defect_train",

        "dataset/defect_data",

    ]

    development_root = None

    for root in development_roots:

        if os.path.isdir(root):

            development_root = root

            break

    if development_root is None:

        print()
        print("=" * 72)
        print(
            "NO DEFECT DEVELOPMENT DATASET FOUND"
        )
        print("=" * 72)
        print()
        print(
            "Official MVTec test images were NOT copied."
        )
        print()
        print(
            "Create/copy a separate development dataset at:"
        )
        print()
        print(
            "dataset/mvtec_ad_dev/"
        )
        print()
        print(
            "Then run this script again."
        )
        print()

        with open(
            os.path.join(
                OUTPUT_ROOT,
                "manifest.json"
            ),
            "w",
            encoding="utf-8"
        ) as file:

            json.dump(
                manifest,
                file,
                indent=2
            )

        return

    # --------------------------------------------------------
    # DEVELOPMENT DATA
    # --------------------------------------------------------

    for category in CATEGORIES:

        test_root = os.path.join(
            development_root,
            category,
            "test"
        )

        if not os.path.isdir(
            test_root
        ):
            continue

        for defect in sorted(
            os.listdir(test_root)
        ):

            if defect == "good":
                continue

            defect_dir = os.path.join(
                test_root,
                defect
            )

            if not os.path.isdir(
                defect_dir
            ):
                continue

            images = [

                os.path.join(
                    defect_dir,
                    filename
                )

                for filename
                in sorted(
                    os.listdir(
                        defect_dir
                    )
                )

                if image_file(
                    filename
                )
            ]

            random.shuffle(
                images
            )

            if len(images) < 2:
                continue

            val_count = max(
                1,
                int(
                    len(images)
                    * VAL_RATIO
                )
            )

            val_images = images[
                :val_count
            ]

            train_images = images[
                val_count:
            ]

            for image in train_images:

                filename = os.path.basename(
                    image
                )

                copy_file(

                    image,

                    os.path.join(
                        TRAIN_DIR,
                        category,
                        defect,
                        filename
                    )
                )

                total_train += 1

            for image in val_images:

                filename = os.path.basename(
                    image
                )

                copy_file(

                    image,

                    os.path.join(
                        VAL_DIR,
                        category,
                        defect,
                        filename
                    )
                )

                total_val += 1

    # --------------------------------------------------------
    # OFFICIAL TEST REMAINS COMPLETELY SEPARATE
    # --------------------------------------------------------

    for category in CATEGORIES:

        source_test = os.path.join(
            SOURCE_ROOT,
            category,
            "test"
        )

        if not os.path.isdir(
            source_test
        ):
            continue

        for defect in sorted(
            os.listdir(source_test)
        ):

            if defect == "good":
                continue

            defect_dir = os.path.join(
                source_test,
                defect
            )

            if not os.path.isdir(
                defect_dir
            ):
                continue

            for filename in sorted(
                os.listdir(defect_dir)
            ):

                if not image_file(
                    filename
                ):
                    continue

                source = os.path.join(
                    defect_dir,
                    filename
                )

                destination = os.path.join(
                    TEST_DIR,
                    category,
                    defect,
                    filename
                )

                copy_file(
                    source,
                    destination
                )

                total_test += 1

    manifest[
        "development_root"
    ] = development_root

    manifest[
        "train_count"
    ] = total_train

    manifest[
        "validation_count"
    ] = total_val

    manifest[
        "official_test_count"
    ] = total_test

    manifest[
        "leakage_policy"
    ] = (
        "Official MVTec test images are "
        "never used for training or validation."
    )

    with open(
        os.path.join(
            OUTPUT_ROOT,
            "manifest.json"
        ),
        "w",
        encoding="utf-8"
    ) as file:

        json.dump(
            manifest,
            file,
            indent=2
        )

    print()
    print("=" * 72)
    print(
        "DEFECT DATASET BUILD COMPLETE"
    )
    print("=" * 72)

    print(
        f"Training   : {total_train}"
    )

    print(
        f"Validation : {total_val}"
    )

    print(
        f"Official Test : {total_test}"
    )

    print()
    print(
        "Official test images remain isolated."
    )


if __name__ == "__main__":

    build()