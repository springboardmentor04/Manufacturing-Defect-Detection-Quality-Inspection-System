import cv2
import pandas as pd
import shutil
from pathlib import Path
from tqdm import tqdm

# ---------------------------------------------------

ROOT = Path(__file__).parent.parent

DATASET = ROOT / "dataset" / "mvtec_ad"

OUTPUT = ROOT / "processed_dataset"

SIZE = (224,224)

# ---------------------------------------------------

if OUTPUT.exists():
    shutil.rmtree(OUTPUT)

OUTPUT.mkdir(parents=True)

# ---------------------------------------------------

records = []

# ---------------------------------------------------

for product in DATASET.iterdir():

    if not product.is_dir():
        continue

    print(f"\nProcessing {product.name}")

    save_product = OUTPUT / product.name

    # ====================================================
    # TRAIN
    # ====================================================

    train_good = product / "train" / "good"

    train_save = save_product / "train" / "good"

    train_save.mkdir(parents=True, exist_ok=True)

    for image in tqdm(train_good.glob("*.*")):

        img = cv2.imread(str(image))

        if img is None:
            continue

        img = cv2.resize(img,SIZE)

        cv2.imwrite(
            str(train_save / image.name),
            img
        )

        records.append({

            "product":product.name,

            "split":"train",

            "class":"good",

            "label":0,

            "image":str(train_save / image.name),

            "mask":""

        })

    # ====================================================
    # TEST
    # ====================================================

    test_folder = product / "test"

    gt_folder = product / "ground_truth"

    if test_folder.exists():

        for defect in test_folder.iterdir():

            if not defect.is_dir():
                continue

            defect_save = save_product / "test" / defect.name

            defect_save.mkdir(parents=True,exist_ok=True)

            mask_source = gt_folder / defect.name

            mask_save = save_product / "masks" / defect.name

            mask_save.mkdir(parents=True,exist_ok=True)

            for image in tqdm(defect.glob("*.*")):

                img = cv2.imread(str(image))

                if img is None:
                    continue

                img = cv2.resize(img,SIZE)

                image_output = defect_save / image.name

                cv2.imwrite(
                    str(image_output),
                    img
                )

                # -----------------------
                # Mask
                # -----------------------

                mask_path = ""

                if defect.name != "good":

                    gt = mask_source / image.name.replace(".png","_mask.png")

                    if gt.exists():

                        mask = cv2.imread(
                            str(gt),
                            cv2.IMREAD_GRAYSCALE
                        )

                        mask = cv2.resize(mask,SIZE)

                        save_mask = mask_save / gt.name

                        cv2.imwrite(
                            str(save_mask),
                            mask
                        )

                        mask_path = str(save_mask)

                records.append({

                    "product":product.name,

                    "split":"test",

                    "class":defect.name,

                    "label":0 if defect.name=="good" else 1,

                    "image":str(image_output),

                    "mask":mask_path

                })

# ---------------------------------------------------

metadata = pd.DataFrame(records)

metadata.to_csv(

    OUTPUT/"metadata.csv",

    index=False

)

print("\nDataset preprocessing completed.")

print(f"Total Images : {len(metadata)}")