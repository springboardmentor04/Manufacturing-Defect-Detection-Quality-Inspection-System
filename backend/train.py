from torch.utils.data import Dataset, DataLoader
from PIL import Image
import torchvision.transforms as transforms
import os
import cv2
import torch
import torch.nn as nn
from sklearn.model_selection import train_test_split
import json


print("===================================")
print(" VisionInspect AI - Model Training ")
print("===================================")


# --------------------------------------------------
# 1. DATASET LOCATION
# --------------------------------------------------

dataset_path = r"C:\Users\DELL 3410\Downloads\mvtec_anomaly_detection"

if not os.path.exists(dataset_path):
    print("ERROR: Dataset folder not found!")
    print("Dataset path:", dataset_path)
    exit()

print("Dataset Found Successfully!")


# --------------------------------------------------
# 2. MVTec CATEGORIES
# --------------------------------------------------

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
label_map = {"good": 0}

for category in categories:

    category_path = os.path.join(
        dataset_path,
        category
    )

    if os.path.exists(category_path):
        print("-", category)
    else:
        print("-", category, "(NOT FOUND)")


# --------------------------------------------------
# 3. LOAD ALL LABELED IMAGES
# --------------------------------------------------

print("\nLoading Images...")

images = []
labels = []

good_count = 0
defect_count = 0


for category in categories:

    category_path = os.path.join(
        dataset_path,
        category
    )

    if not os.path.isdir(category_path):
        continue


    # ----------------------------------------------
    # Load train images
    # ----------------------------------------------

    train_path = os.path.join(
        category_path,
        "train"
    )

    if os.path.isdir(train_path):

        for root, dirs, files in os.walk(train_path):

            for file in files:

                if not file.lower().endswith(".png"):
                    continue

                image_path = os.path.join(
                    root,
                    file
                )

                image = cv2.imread(image_path)

                if image is None:
                    continue

                image = cv2.cvtColor(
                    image,
                    cv2.COLOR_BGR2RGB
                )

                image = cv2.resize(
                    image,
                    (128, 128)
                )

                # MVTec train images are GOOD
                label = 0

                images.append(image)
                labels.append(label)

                good_count += 1


    # ----------------------------------------------
    # Load test images
    # ----------------------------------------------

    test_path = os.path.join(
        category_path,
        "test"
    )

    if os.path.isdir(test_path):

        for root, dirs, files in os.walk(test_path):

            for file in files:

                if not file.lower().endswith(".png"):
                    continue

                image_path = os.path.join(
                    root,
                    file
                )

                image = cv2.imread(image_path)

                if image is None:
                    continue

                image = cv2.cvtColor(
                    image,
                    cv2.COLOR_BGR2RGB
                )

                image = cv2.resize(
                    image,
                    (128, 128)
                )

                folder_name = os.path.basename(root).lower()

                if folder_name not in label_map:
                    label_map[folder_name] = len(label_map)

                label = label_map[folder_name]

                if folder_name == "good":
                    good_count += 1
                else:
                    defect_count += 1

                images.append(image)
                labels.append(label)

print("-----------------------------------")
print("Total Images Loaded :", len(images))
print("Good Images         :", good_count)
print("Defective Images    :", defect_count)
print("-----------------------------------")


# --------------------------------------------------
# 4. CHECK DATASET
# --------------------------------------------------

if len(images) == 0:

    print("ERROR: No images were loaded!")
    exit()


if len(set(labels)) < 2:

    print("ERROR: Only one class was loaded!")
    exit()


print("\nImage Preprocessing Completed Successfully!")


# --------------------------------------------------
# 5. CONVERT TO TRAIN / VALIDATION / TEST
# --------------------------------------------------
#
# 70% = Training
# 15% = Validation
# 15% = Unseen Test
#
# The final test images are NOT used during training.
# --------------------------------------------------

print("\nCreating Train / Validation / Test Split...")


train_images, temp_images, train_labels, temp_labels = train_test_split(
    images,
    labels,
    test_size=0.30,
    random_state=42,
    stratify=labels
)


val_images, test_images, val_labels, test_labels = train_test_split(
    temp_images,
    temp_labels,
    test_size=0.50,
    random_state=42,
    stratify=temp_labels
)


print("\nDataset Split:")
print("Training Images   :", len(train_images))
print("Validation Images :", len(val_images))
print("Unseen Test Images:", len(test_images))


# --------------------------------------------------
# 6. IMAGE TRANSFORM
# --------------------------------------------------

transform = transforms.Compose([
    transforms.Resize((128, 128)),
    transforms.ToTensor()
])


# --------------------------------------------------
# 7. DATASET CLASS
# --------------------------------------------------

class MVTecDataset(Dataset):

    def __init__(
        self,
        images,
        labels,
        transform=None
    ):

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

        return (
            image,
            torch.tensor(
                label,
                dtype=torch.long
            )
        )


# --------------------------------------------------
# 8. CREATE DATASETS
# --------------------------------------------------

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

test_dataset = MVTecDataset(
    test_images,
    test_labels,
    transform
)


# --------------------------------------------------
# 9. DATA LOADERS
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

test_loader = DataLoader(
    test_dataset,
    batch_size=16,
    shuffle=False
)


# --------------------------------------------------
# 10. CUSTOM CNN MODEL
# --------------------------------------------------
#
# This model is created from scratch.
# No pretrained model is used.
# --------------------------------------------------

print("\nStarting CNN Model Creation...")


class DefectCNN(nn.Module):

    def __init__(self):

        super(DefectCNN, self).__init__()


        self.conv1 = nn.Conv2d(
            3,
            16,
            3,
            padding=1
        )


        self.relu = nn.ReLU()


        self.pool = nn.MaxPool2d(
            2,
            2
        )


        self.conv2 = nn.Conv2d(
            16,
            32,
            3,
            padding=1
        )


        self.fc1 = nn.Linear(
            32 * 32 * 32,
            128
        )


        self.fc2 = nn.Linear(
            128,
            len(label_map)
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
print("Model is trained from scratch.")


# --------------------------------------------------
# 11. LOSS AND OPTIMIZER
# --------------------------------------------------

# Calculate class weights to help handle
# the difference between GOOD and DEFECT counts.

train_label_tensor = torch.tensor(
    train_labels,
    dtype=torch.long
)

class_counts = torch.bincount(
    train_label_tensor,
    minlength=len(label_map)
).float()


class_weights = (
    len(train_labels)
    /
    (len(label_map) * class_counts)
)


criterion = nn.CrossEntropyLoss(
    weight=class_weights
)


optimizer = torch.optim.Adam(
    model.parameters(),
    lr=0.001
)


# --------------------------------------------------
# 12. TRAINING SETTINGS
# --------------------------------------------------

epochs = 50

train_losses = []
train_accuracies = []

val_losses = []
val_accuracies = []


# --------------------------------------------------
# 13. TRAINING
# --------------------------------------------------

print("\n===================================")
print("Starting 50 Epoch Model Training")
print("===================================\n")


for epoch in range(epochs):


    # ----------------------------------------------
    # TRAINING
    # ----------------------------------------------

    model.train()

    running_loss = 0.0

    correct = 0

    total = 0


    for images_batch, labels_batch in train_loader:

        optimizer.zero_grad()


        outputs = model(
            images_batch
        )


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
        running_loss /
        len(train_loader)
    )


    train_accuracy = (
        100 *
        correct /
        total
    )


    # ----------------------------------------------
    # VALIDATION
    # ----------------------------------------------

    model.eval()

    val_running_loss = 0.0

    val_correct = 0

    val_total = 0


    with torch.no_grad():

        for images_batch, labels_batch in val_loader:

            outputs = model(
                images_batch
            )


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
        val_running_loss /
        len(val_loader)
    )


    val_accuracy = (
        100 *
        val_correct /
        val_total
    )


    # ----------------------------------------------
    # SAVE HISTORY
    # ----------------------------------------------

    train_losses.append(
        train_loss
    )

    train_accuracies.append(
        train_accuracy
    )

    val_losses.append(
        val_loss
    )

    val_accuracies.append(
        val_accuracy
    )


    # ----------------------------------------------
    # PRINT RESULTS
    # ----------------------------------------------

    print(
        f"Epoch {epoch + 1}/{epochs} "
        f"| Train Loss: {train_loss:.4f} "
        f"| Train Accuracy: {train_accuracy:.2f}% "
        f"| Val Loss: {val_loss:.4f} "
        f"| Val Accuracy: {val_accuracy:.2f}%"
    )


# --------------------------------------------------
# 14. TRAINING COMPLETE
# --------------------------------------------------

print("\n===================================")
print("Training Completed Successfully!")
print("===================================")


# --------------------------------------------------
# 15. SAVE MODEL
# --------------------------------------------------

model_path = os.path.join(
    os.path.dirname(__file__),
    "visioninspect_model.pth"
)


torch.save(
    model.state_dict(),
    model_path
)
label_map_path = os.path.join(
    os.path.dirname(__file__),
    "label_map.json"
)

with open(label_map_path, "w") as file:
    json.dump(
        label_map,
        file,
        indent=4
    )

print("Label mapping saved:")
print(label_map_path)


print("\nModel Saved Successfully!")

print(
    "File:",
    model_path
)


# --------------------------------------------------
# 16. UNSEEN TEST EVALUATION
# --------------------------------------------------

print("\n===================================")
print("Evaluating Unseen Test Data")
print("===================================")


model.eval()

test_correct = 0

test_total = 0

test_loss_total = 0.0


with torch.no_grad():

    for images_batch, labels_batch in test_loader:

        outputs = model(
            images_batch
        )


        loss = criterion(
            outputs,
            labels_batch
        )


        test_loss_total += loss.item()


        _, predicted = torch.max(
            outputs,
            1
        )


        test_total += labels_batch.size(0)


        test_correct += (
            predicted == labels_batch
        ).sum().item()


test_loss = (
    test_loss_total /
    len(test_loader)
)


test_accuracy = (
    100 *
    test_correct /
    test_total
)


print(
    f"Unseen Test Loss     : {test_loss:.4f}"
)

print(
    f"Unseen Test Accuracy : {test_accuracy:.2f}%"
)


# --------------------------------------------------
# 17. FINAL RESULTS
# --------------------------------------------------

print("\n===================================")
print("FINAL MODEL RESULTS")
print("===================================")


print(
    f"Final Training Accuracy   : "
    f"{train_accuracies[-1]:.2f}%"
)


print(
    f"Final Validation Accuracy : "
    f"{val_accuracies[-1]:.2f}%"
)


print(
    f"Final Training Loss       : "
    f"{train_losses[-1]:.4f}"
)


print(
    f"Final Validation Loss     : "
    f"{val_losses[-1]:.4f}"
)


print(
    f"Unseen Test Accuracy      : "
    f"{test_accuracy:.2f}%"
)


# --------------------------------------------------
# 18. SAVE TRAINING HISTORY
# --------------------------------------------------

history = {

    "train_loss": train_losses,

    "train_accuracy": train_accuracies,

    "val_loss": val_losses,

    "val_accuracy": val_accuracies,

    "test_loss": test_loss,

    "test_accuracy": test_accuracy
}


history_path = os.path.join(
    os.path.dirname(__file__),
    "training_history.json"
)


with open(
    history_path,
    "w"
) as file:

    json.dump(
        history,
        file,
        indent=4
    )


print("\nTraining history saved:")
print(history_path)


print("\n===================================")
print(" VisionInspect AI Training Done ")
print("===================================")