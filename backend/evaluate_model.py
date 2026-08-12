from torch.utils.data import Dataset, DataLoader
from PIL import Image
import torchvision.transforms as transforms
import os
import cv2
import torch
import torch.nn as nn
from sklearn.model_selection import train_test_split

print("===================================")
print(" VisionInspect AI - Model Training ")
print("===================================")

# --------------------------------------------------
# 1. DATASET LOCATION
# --------------------------------------------------

dataset_path = r"C:\Users\DELL 3410\Downloads\mvtec_anomaly_detection"
import os
import tarfile

# Extract MVTec AD dataset if it is still a .tar archive
if dataset_path.lower().endswith(".tar"):
    extract_path = r"C:\Users\DELL 3410\Downloads"

    print("Extracting MVTec AD dataset...")
    with tarfile.open(dataset_path, "r") as tar:
        tar.extractall(path=extract_path)

    dataset_path = os.path.join(
        extract_path,
        "mvtec_anomaly_detection"
    )

    print("Dataset extracted successfully!")
    print("Dataset path:", dataset_path)

if not os.path.exists(dataset_path):
    print("Dataset folder not found!")
    exit()

print("Dataset Found Successfully!")

# MVTec categories
categories = [
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

print("\nDataset Categories:")

for category in categories:
    category_path = os.path.join(dataset_path, category)

    if os.path.exists(category_path):
        print("-", category)
    else:
        print("-", category, "(NOT FOUND)")


# --------------------------------------------------
# 2. LOAD ALL IMAGES
# --------------------------------------------------

print("\nLoading Images...")

images = []
labels = []

good_count = 0
defect_count = 0

for category in categories:

    category_path = os.path.join(dataset_path, category)

    if not os.path.isdir(category_path):
        continue

    # We use train and test folders
    for split in ["train", "test"]:

        split_path = os.path.join(category_path, split)

        if not os.path.isdir(split_path):
            continue

        for root, dirs, files in os.walk(split_path):

            for file in files:

                if not file.lower().endswith(".png"):
                    continue

                image_path = os.path.join(root, file)

                image = cv2.imread(image_path)

                if image is None:
                    continue

                # BGR -> RGB
                image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

                # Resize
                image = cv2.resize(image, (128, 128))

                # Label
                # good = 0
                # anything else = defect
                if os.path.basename(root).lower() == "good":
                    label = 0
                    good_count += 1
                else:
                    label = 1
                    defect_count += 1

                images.append(image)
                labels.append(label)


print("-----------------------------------")
print("Total Images Loaded :", len(images))
print("Good Images         :", good_count)
print("Defective Images    :", defect_count)
print("-----------------------------------")


# --------------------------------------------------
# 3. CHECK DATASET
# --------------------------------------------------

if len(images) == 0:
    print("ERROR: No images were loaded!")
    exit()

if len(set(labels)) < 2:
    print("ERROR: Only one class was loaded!")
    print("Good/defect images are not being detected correctly.")
    exit()

print("\nImage Preprocessing Completed Successfully!")


# --------------------------------------------------
# 4. TRAIN / VALIDATION SPLIT
# --------------------------------------------------

train_images, val_images, train_labels, val_labels = train_test_split(
    images,
    labels,
    test_size=0.20,
    random_state=42,
    stratify=labels
)

print("\nDataset Split:")
print("Training Images   :", len(train_images))
print("Validation Images :", len(val_images))


# --------------------------------------------------
# 5. IMAGE TRANSFORM
# --------------------------------------------------

transform = transforms.Compose([
    transforms.Resize((128, 128)),
    transforms.ToTensor()
])


# --------------------------------------------------
# 6. DATASET CLASS
# --------------------------------------------------

class MVTecDataset(Dataset):

    def __init__(self, images, labels, transform=None):
        self.images = images
        self.labels = labels
        self.transform = transform

    def __len__(self):
        return len(self.images)

    def __getitem__(self, index):

        image = self.images[index]
        label = self.labels[index]

        image = Image.fromarray(image)

        if self.transform:
            image = self.transform(image)

        return image, torch.tensor(label, dtype=torch.long)


train_dataset = MVTecDataset(
    train_images,
    train_labels,
    transform
)

val_dataset = MVTecDataset(
    val_images,
    val_labels,
    transform
)


# --------------------------------------------------
# 7. DATA LOADERS
# --------------------------------------------------

train_loader = DataLoader(
    train_dataset,
    batch_size=16,
    shuffle=True
)

val_loader = DataLoader(
    val_dataset,
    batch_size=16,
    shuffle=False
)


# --------------------------------------------------
# 8. CNN MODEL
# --------------------------------------------------

print("\nStarting CNN Model Creation...")


class DefectCNN(nn.Module):

    def __init__(self):

        super(DefectCNN, self).__init__()

        self.conv1 = nn.Conv2d(
            3, 16, 3, padding=1
        )

        self.relu = nn.ReLU()

        self.pool = nn.MaxPool2d(
            2, 2
        )

        self.conv2 = nn.Conv2d(
            16, 32, 3, padding=1
        )

        self.fc1 = nn.Linear(
            32 * 32 * 32,
            128
        )

        self.fc2 = nn.Linear(
            128,
            2
        )

    def forward(self, x):

        x = self.pool(
            self.relu(
                self.conv1(x)
            )
        )

        x = self.pool(
            self.relu(
                self.conv2(x)
            )
        )

        x = x.view(
            x.size(0),
            -1
        )

        x = self.relu(
            self.fc1(x)
        )

        x = self.fc2(x)

        return x


model = DefectCNN()

print("CNN Model Created Successfully!")


# --------------------------------------------------
# 9. LOSS AND OPTIMIZER
# --------------------------------------------------

criterion = nn.CrossEntropyLoss()

optimizer = torch.optim.Adam(
    model.parameters(),
    lr=0.001
)


# --------------------------------------------------
# 10. TRAINING
# --------------------------------------------------

print("\nStarting Model Training...\n")

epochs = 50

train_losses = []
train_accuracies = []

val_losses = []
val_accuracies = []


for epoch in range(epochs):

    # ------------------------------
    # TRAINING
    # ------------------------------

    model.train()

    running_loss = 0.0
    correct = 0
    total = 0

    for images_batch, labels_batch in train_loader:

        optimizer.zero_grad()

        outputs = model(images_batch)

        loss = criterion(
            outputs,
            labels_batch
        )

        loss.backward()

        optimizer.step()

        running_loss += loss.item()

        _, predicted = torch.max(
            outputs,
            1
        )

        total += labels_batch.size(0)

        correct += (
            predicted == labels_batch
        ).sum().item()


    train_loss = (
        running_loss / len(train_loader)
    )

    train_accuracy = (
        100 * correct / total
    )


    # ------------------------------
    # VALIDATION
    # ------------------------------

    model.eval()

    val_running_loss = 0.0
    val_correct = 0
    val_total = 0

    with torch.no_grad():

        for images_batch, labels_batch in val_loader:

            outputs = model(images_batch)

            loss = criterion(
                outputs,
                labels_batch
            )

            val_running_loss += loss.item()

            _, predicted = torch.max(
                outputs,
                1
            )

            val_total += labels_batch.size(0)

            val_correct += (
                predicted == labels_batch
            ).sum().item()


    val_loss = (
        val_running_loss / len(val_loader)
    )

    val_accuracy = (
        100 * val_correct / val_total
    )


    # Save history

    train_losses.append(train_loss)
    train_accuracies.append(train_accuracy)

    val_losses.append(val_loss)
    val_accuracies.append(val_accuracy)


    # Print results

    print(
        f"Epoch {epoch + 1}/{epochs} "
        f"| Train Loss: {train_loss:.4f} "
        f"| Train Accuracy: {train_accuracy:.2f}% "
        f"| Val Loss: {val_loss:.4f} "
        f"| Val Accuracy: {val_accuracy:.2f}%"
    )


# --------------------------------------------------
# 11. TRAINING COMPLETE
# --------------------------------------------------

print("\n===================================")
print("Training Completed Successfully!")
print("===================================")


# --------------------------------------------------
# 12. SAVE MODEL
# --------------------------------------------------

torch.save(
    model.state_dict(),
    "visioninspect_model.pth"
)

print("Model Saved Successfully!")
print("File: visioninspect_model.pth")


# --------------------------------------------------
# 13. FINAL RESULTS
# --------------------------------------------------

print("\nFinal Results:")

print(
    f"Final Training Accuracy : "
    f"{train_accuracies[-1]:.2f}%"
)

print(
    f"Final Validation Accuracy : "
    f"{val_accuracies[-1]:.2f}%"
)

print(
    f"Final Training Loss : "
    f"{train_losses[-1]:.4f}"
)

print(
    f"Final Validation Loss : "
    f"{val_losses[-1]:.4f}"
)