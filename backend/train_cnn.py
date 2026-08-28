import os
from pathlib import Path

import torch
import torch.nn as nn
import torch.optim as optim

from PIL import Image

from torchvision import transforms

from torch.utils.data import Dataset
from torch.utils.data import DataLoader
from torch.utils.data import random_split

from model import DefectCNN

# -----------------------------

DATASET = Path(__file__).parent.parent / "processed_dataset"

IMAGE_SIZE = 224

BATCH_SIZE = 64

EPOCHS = 5

# -----------------------------

transform = transforms.Compose([
    transforms.Resize((IMAGE_SIZE, IMAGE_SIZE)),
    transforms.ToTensor()
])

# -----------------------------

class MVTecDataset(Dataset):

    def __init__(self):

        self.images = []

        self.labels = []

        for product in os.listdir(DATASET):

            product_path = DATASET / product

            if not product_path.is_dir():
                continue

            # ---------- GOOD ----------

            good_folder = product_path / "train" / "good"

            if good_folder.exists():

                for image in good_folder.iterdir():

                    self.images.append(str(image))

                    self.labels.append(0)

            # ---------- DEFECT ----------

            test_folder = product_path / "test"

            if test_folder.exists():

                for defect in os.listdir(test_folder):

                    if defect == "good":
                        continue

                    defect_path = test_folder / defect

                    for image in defect_path.iterdir():

                        self.images.append(str(image))

                        self.labels.append(1)

    def __len__(self):

        return len(self.images)

    def __getitem__(self,index):

        image = Image.open(self.images[index]).convert("RGB")

        image = transform(image)

        label = torch.tensor(self.labels[index])

        return image,label

# -----------------------------

dataset = MVTecDataset()

train_size = int(0.8*len(dataset))

val_size = len(dataset)-train_size

train_dataset,val_dataset = random_split(

    dataset,

    [train_size,val_size]

)

train_loader = DataLoader(

    train_dataset,

    batch_size=BATCH_SIZE,

    shuffle=True,

    num_workers=2

)

val_loader = DataLoader(

    val_dataset,

    batch_size=BATCH_SIZE,

    num_workers=2

)

print("GOOD + DEFECT Dataset")

print("Images :",len(dataset))

print("Training :",len(train_dataset))

print("Validation :",len(val_dataset))

# -----------------------------

device = torch.device(

    "cuda"

    if torch.cuda.is_available()

    else "cpu"

)

print("Device :",device)

model = DefectCNN(2)

model.to(device)

criterion = nn.CrossEntropyLoss()

optimizer = optim.Adam(

    model.parameters(),

    lr=0.0005

)

best_accuracy = 0

for epoch in range(EPOCHS):

    model.train()

    correct = 0

    total = 0

    running_loss = 0

    for images,labels in train_loader:

        images = images.to(device)

        labels = labels.to(device)

        optimizer.zero_grad()

        outputs = model(images)

        loss = criterion(outputs,labels)

        loss.backward()

        optimizer.step()

        running_loss += loss.item()

        _,predicted = torch.max(outputs,1)

        total += labels.size(0)

        correct += (predicted==labels).sum().item()

    train_accuracy = 100*correct/total

    model.eval()

    correct = 0

    total = 0

    with torch.no_grad():

        for images,labels in val_loader:

            images = images.to(device)

            labels = labels.to(device)

            outputs = model(images)

            _,predicted = torch.max(outputs,1)

            total += labels.size(0)

            correct += (predicted==labels).sum().item()

    val_accuracy = 100*correct/total

    print(

        f"Epoch {epoch+1}/{EPOCHS}"

        f"  Loss={running_loss:.2f}"

        f"  Train={train_accuracy:.2f}%"

        f"  Validation={val_accuracy:.2f}%"

    )

    if val_accuracy > best_accuracy:

        best_accuracy = val_accuracy

        torch.save(

            model.state_dict(),

            "defect_classifier.pth"

        )

print("\nBest Validation Accuracy :",best_accuracy)