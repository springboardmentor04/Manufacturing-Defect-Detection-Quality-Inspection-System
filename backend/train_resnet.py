import os
from pathlib import Path

import torch
import torch.nn as nn
import torch.optim as optim

from torch.utils.data import Dataset
from torch.utils.data import DataLoader

from torchvision import models
from torchvision import transforms

from PIL import Image

from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score
from sklearn.metrics import precision_score
from sklearn.metrics import recall_score
from sklearn.metrics import f1_score

from tqdm import tqdm


DATASET_PATH = Path(
    r"D:\InfosysSpringboard\VisionInspectAI\processed_dataset"
)

IMAGE_SIZE = 224

BATCH_SIZE = 32

EPOCHS = 15

LEARNING_RATE = 1e-4

MODEL_PATH = Path(__file__).parent / "models"

MODEL_PATH.mkdir(exist_ok=True)


device = torch.device(

    "cuda"

    if torch.cuda.is_available()

    else

    "cpu"

)

print("\nUsing Device :", device)


train_transform = transforms.Compose([

    transforms.Resize((256,256)),

    transforms.RandomResizedCrop(

        IMAGE_SIZE,

        scale=(0.85,1.0)

    ),

    transforms.RandomHorizontalFlip(),

    transforms.RandomRotation(10),

    transforms.ColorJitter(

        brightness=0.2,

        contrast=0.2,

        saturation=0.2

    ),

    transforms.ToTensor(),

    transforms.Normalize(

        mean=[0.485,0.456,0.406],

        std=[0.229,0.224,0.225]

    )

])

val_transform = transforms.Compose([

    transforms.Resize((IMAGE_SIZE,IMAGE_SIZE)),

    transforms.ToTensor(),

    transforms.Normalize(

        mean=[0.485,0.456,0.406],

        std=[0.229,0.224,0.225]

    )

])


class MVTecDataset(Dataset):

    def __init__(

        self,

        image_paths,

        labels,

        transform

    ):

        self.image_paths = image_paths

        self.labels = labels

        self.transform = transform

    def __len__(self):

        return len(self.image_paths)

    def __getitem__(self,index):

        image = Image.open(

            self.image_paths[index]

        ).convert("RGB")

        image = self.transform(image)

        label = self.labels[index]

        return image,label


image_paths = []

labels = []

for product in DATASET_PATH.iterdir():

    if not product.is_dir():

        continue

    train_good = product / "train" / "good"

    if train_good.exists():

        for img in train_good.glob("*"):

            image_paths.append(str(img))

            labels.append(0)

    test_folder = product / "test"

    if not test_folder.exists():

        continue

    for defect_folder in test_folder.iterdir():

        if not defect_folder.is_dir():

            continue

        label = 0 if defect_folder.name == "good" else 1

        for img in defect_folder.glob("*"):

            image_paths.append(str(img))

            labels.append(label)

print("\nDataset Loaded")

print("Total Images :",len(image_paths))

print("GOOD :",labels.count(0))

print("DEFECT :",labels.count(1))

train_images,\
val_images,\
train_labels,\
val_labels = train_test_split(

    image_paths,

    labels,

    test_size=0.2,

    random_state=42,

    stratify=labels

)

print()

print("Training :",len(train_images))

print("Validation :",len(val_images))

# ----------------------------------------------------
# Dataset Objects
# ----------------------------------------------------

train_dataset = MVTecDataset(

    train_images,

    train_labels,

    train_transform

)

val_dataset = MVTecDataset(

    val_images,

    val_labels,

    val_transform

)

train_loader = DataLoader(

    train_dataset,

    batch_size=BATCH_SIZE,

    shuffle=True,

    num_workers=0

)

val_loader = DataLoader(

    val_dataset,

    batch_size=BATCH_SIZE,

    shuffle=False,

    num_workers=0

)

# ----------------------------------------------------
# Model
# ----------------------------------------------------

model = models.resnet18(

    weights=models.ResNet18_Weights.DEFAULT

)

# Freeze everything

for param in model.parameters():

    param.requires_grad=False

# Fine-tune Layer4

for param in model.layer4.parameters():

    param.requires_grad=True

# Better Classifier

model.fc = nn.Sequential(

    nn.Linear(

        model.fc.in_features,

        512

    ),

    nn.BatchNorm1d(512),

    nn.ReLU(),

    nn.Dropout(0.5),

    nn.Linear(

        512,

        128

    ),

    nn.ReLU(),

    nn.Dropout(0.3),

    nn.Linear(

        128,

        2

    )

)

model = model.to(device)

# ----------------------------------------------------
# Weighted Loss
# ----------------------------------------------------

good = labels.count(0)

defect = labels.count(1)

weights = torch.tensor(

    [

        1.0,

        good/defect

    ],

    dtype=torch.float

).to(device)

criterion = nn.CrossEntropyLoss(

    weight=weights

)

# ----------------------------------------------------
# Optimizer
# ----------------------------------------------------

optimizer = optim.AdamW(

    filter(

        lambda p:p.requires_grad,

        model.parameters()

    ),

    lr=LEARNING_RATE,

    weight_decay=1e-4

)

scheduler = optim.lr_scheduler.CosineAnnealingLR(

    optimizer,

    T_max=EPOCHS

)

best_accuracy = 0
# ----------------------------------------------------
# Validation Function
# ----------------------------------------------------

def evaluate():

    model.eval()

    predictions = []

    actual = []

    running_loss = 0

    with torch.no_grad():

        for images, labels in val_loader:

            images = images.to(device)

            labels = labels.to(device)

            outputs = model(images)

            loss = criterion(outputs, labels)

            running_loss += loss.item()

            preds = torch.argmax(outputs, dim=1)

            predictions.extend(

                preds.cpu().numpy()

            )

            actual.extend(

                labels.cpu().numpy()

            )

    accuracy = accuracy_score(

        actual,

        predictions

    )

    precision = precision_score(

        actual,

        predictions,

        zero_division=0

    )

    recall = recall_score(

        actual,

        predictions,

        zero_division=0

    )

    f1 = f1_score(

        actual,

        predictions,

        zero_division=0

    )

    return (

        running_loss,

        accuracy,

        precision,

        recall,

        f1

    )

# ----------------------------------------------------
# Training
# ----------------------------------------------------

print("\nTraining Started...\n")

for epoch in range(EPOCHS):

    model.train()

    train_loss = 0

    loop = tqdm(

        train_loader,

        desc=f"Epoch {epoch+1}/{EPOCHS}"

    )

    for images, labels in loop:

        images = images.to(device)

        labels = labels.to(device)

        optimizer.zero_grad()

        outputs = model(images)

        loss = criterion(

            outputs,

            labels

        )

        loss.backward()

        optimizer.step()

        train_loss += loss.item()

        loop.set_postfix(

            loss=f"{loss.item():.4f}"

        )

    scheduler.step()

    val_loss, accuracy, precision, recall, f1 = evaluate()

    print("\n---------------------------------------")

    print(f"Epoch {epoch+1}/{EPOCHS}")

    print("---------------------------------------")

    print(f"Training Loss   : {train_loss:.4f}")

    print(f"Validation Loss : {val_loss:.4f}")

    print(f"Accuracy        : {accuracy*100:.2f}%")

    print(f"Precision       : {precision*100:.2f}%")

    print(f"Recall          : {recall*100:.2f}%")

    print(f"F1 Score        : {f1*100:.2f}%")

    print("---------------------------------------")

    if accuracy > best_accuracy:

        best_accuracy = accuracy

        torch.save(

            model.state_dict(),

            MODEL_PATH /

            "defect_classifier.pth"

        )

        print("✓ Best model saved.")

# ----------------------------------------------------
# Training Finished
# ----------------------------------------------------

print("\n=======================================")

print("Training Completed Successfully")

print("=======================================")

print(

    f"Best Validation Accuracy : "

    f"{best_accuracy*100:.2f}%"

)

print(

    f"Model Saved At : "

    f"{MODEL_PATH/'defect_classifier.pth'}"

)

print("=======================================\n")