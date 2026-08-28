# VisionInspect AI: Complete Google Colab Training Guide

This guide contains the exact code to run in Google Colab. It will:
1. Download the **official MVTec AD** manufacturing dataset (5.3 GB).
2. Extract the data and use a Python script to convert the pixel-level anomaly masks into YOLO-format bounding boxes.
3. Train the YOLOv8 model to detect manufacturing defects.
4. Download the final trained `best.pt` model to your computer.

## Step 1: Set up Google Colab

1. Go to [Google Colab](https://colab.research.google.com/)
2. Create a **New Notebook**.
3. Go to `Runtime` -> `Change runtime type` -> Select **T4 GPU** (or any available GPU).

## Step 2: Paste and Run the Code

Create a new code cell in your Colab notebook, paste the entire script below, and run it. **Note:** Downloading the dataset will take a few minutes depending on Colab's connection.

```python
import os
import shutil
import urllib.request
import tarfile
import cv2
import numpy as np
from pathlib import Path
from google.colab import files

# 1. Install Ultralytics
!pip install ultralytics -q
from ultralytics import YOLO

# 2. Download Official MVTec AD Dataset
MVTEC_URL = "https://www.mydrive.ch/shares/38536/3830184030e49fe74747669442f0f282/download/420938113-1629952094/mvtec_anomaly_detection.tar.xz"
archive_path = "/content/mvtec.tar.xz"
raw_dir = Path("/content/mvtec_raw")

print("Downloading MVTec AD Dataset (5.3 GB). This will take a few minutes...")
if not os.path.exists(archive_path):
    urllib.request.urlretrieve(MVTEC_URL, archive_path)

print("Extracting dataset...")
if not raw_dir.exists():
    raw_dir.mkdir(parents=True, exist_ok=True)
    with tarfile.open(archive_path, "r:xz") as tar:
        tar.extractall(path=raw_dir)

# 3. Format into YOLO Bounding Box Dataset
print("Converting MVTec masks into YOLO bounding boxes format...")
yolo_dir = Path("/content/yolo_dataset")
for split in ["train", "val"]:
    (yolo_dir / "images" / split).mkdir(parents=True, exist_ok=True)
    (yolo_dir / "labels" / split).mkdir(parents=True, exist_ok=True)

# For speed, we will train on a single category, e.g., 'bottle'. 
# You can loop through all categories in raw_dir for the full dataset!
category = "bottle"
cat_dir = raw_dir / category

# Process training data (MVTec train data has no defects, so we just add them as background/empty labels, or train on test data.
# Note: Since YOLO requires defects to learn, we will split the MVTec 'test' folder (which has defects) into train/val.
test_dir = cat_dir / "test"
ground_truth_dir = cat_dir / "ground_truth"

image_files = []
if test_dir.exists():
    for defect_type in os.listdir(test_dir):
        if defect_type == "good": continue
        for img_name in os.listdir(test_dir / defect_type):
            if img_name.endswith(('.png', '.jpg')):
                image_files.append((defect_type, img_name))

np.random.shuffle(image_files)
split_idx = int(len(image_files) * 0.8)
train_files = image_files[:split_idx]
val_files = image_files[split_idx:]

def process_files(files_list, split_name):
    for defect_type, img_name in files_list:
        img_path = test_dir / defect_type / img_name
        mask_path = ground_truth_dir / defect_type / f"{img_name.split('.')[0]}_mask.png"
        
        if not mask_path.exists(): continue
            
        img = cv2.imread(str(img_path))
        mask = cv2.imread(str(mask_path), cv2.IMREAD_GRAYSCALE)
        h, w = img.shape[:2]
        
        # Find contours to create bounding boxes
        contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        # Save image
        new_img_name = f"{category}_{defect_type}_{img_name}"
        cv2.imwrite(str(yolo_dir / "images" / split_name / new_img_name), img)
        
        # Save labels (Class 0 for defect)
        with open(yolo_dir / "labels" / split_name / f"{new_img_name.split('.')[0]}.txt", "w") as f:
            for cnt in contours:
                x, y, bw, bh = cv2.boundingRect(cnt)
                # YOLO format: class x_center y_center width height (normalized)
                x_c = (x + bw / 2) / w
                y_c = (y + bh / 2) / h
                nw = bw / w
                nh = bh / h
                f.write(f"0 {x_c:.6f} {y_c:.6f} {nw:.6f} {nh:.6f}\n")

process_files(train_files, "train")
process_files(val_files, "val")

# 4. Create data.yaml
yaml_content = f"""
path: {yolo_dir.absolute()}
train: images/train
val: images/val
nc: 1
names: ['defect']
"""
with open("/content/data.yaml", "w") as f:
    f.write(yaml_content)

# 5. Train YOLOv8 Model
print("Starting YOLOv8 training on Cloud GPU...")
model = YOLO('yolov8n.pt') 
results = model.train(
    data='/content/data.yaml',
    epochs=50, 
    imgsz=640, 
    batch=16,
    device=0 
)
print("Training Complete!")

# 6. Extract the Final Model
weights_path = '/content/runs/detect/train/weights/best.pt'
if os.path.exists(weights_path):
    print(f"Downloading {weights_path} to your local machine...")
    files.download(weights_path)
else:
    print("Error: Could not find the trained weights. Check the /content/runs/ directory.")
```

## Step 3: Import the Model Locally

Once your browser downloads `best.pt` from Google Colab, you need to import it into the VisionInspect AI system.

Run the following command in your terminal, providing the path to where your browser downloaded the file (usually your Downloads folder):

```bash
# Example for Windows:
python ml/import_model.py --path "C:\Users\YourName\Downloads\best.pt"

# Example for Mac/Linux:
python ml/import_model.py --path "~/Downloads/best.pt"
```

This script will automatically copy the file to `ml/models/best.pt`. The backend dynamic routing will immediately start using your newly trained Colab AI model for all subsequent web dashboard inspections!
