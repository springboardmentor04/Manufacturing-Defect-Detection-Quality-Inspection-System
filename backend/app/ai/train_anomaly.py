import os

import torch
import torch.nn as nn
import torch.optim as optim

from PIL import Image
from torch.utils.data import Dataset, DataLoader, random_split
from torchvision import transforms

from app.ai.anomaly_model import AnomalyAutoencoder


# ==================================================
# Device
# ==================================================

device = torch.device(
    "cuda" if torch.cuda.is_available() else "cpu"
)

print("=" * 50)
print("VisionInspect AI - Anomaly Detection Training")
print("=" * 50)

print(f"Device: {device}")


# ==================================================
# Dataset
# ==================================================

class NormalBottleDataset(Dataset):

    def __init__(self, root_dir):

        self.images = []

        good_folder = os.path.join(
            root_dir,
            "bottle",
            "train",
            "good"
        )

        for filename in os.listdir(good_folder):

            filepath = os.path.join(
                good_folder,
                filename
            )

            if os.path.isfile(filepath):

                self.images.append(filepath)

        self.transform = transforms.Compose([
            transforms.Resize((256, 256)),
            transforms.ToTensor()
        ])

    def __len__(self):

        return len(self.images)

    def __getitem__(self, index):

        image = Image.open(
            self.images[index]
        ).convert("RGB")

        image = self.transform(image)

        return image


# ==================================================
# Load Dataset
# ==================================================

dataset = NormalBottleDataset(
    "dataset/mvtec_ad"
)

print(f"Normal bottle images: {len(dataset)}")


# ==================================================
# Train / Validation Split
# ==================================================

train_size = int(
    0.8 * len(dataset)
)

val_size = len(dataset) - train_size

train_dataset, val_dataset = random_split(
    dataset,
    [train_size, val_size],
    generator=torch.Generator().manual_seed(42)
)


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


# ==================================================
# Model
# ==================================================

model = AnomalyAutoencoder().to(device)


# ==================================================
# Loss
# ==================================================

criterion = nn.MSELoss()


# ==================================================
# Optimizer
# ==================================================

optimizer = optim.Adam(
    model.parameters(),
    lr=0.001,
    weight_decay=0.0001
)


# ==================================================
# Training
# ==================================================

epochs = 30

best_val_loss = float("inf")

patience = 5
counter = 0


save_path = "app/ai/saved_models"

os.makedirs(
    save_path,
    exist_ok=True
)


for epoch in range(epochs):

    # ---------------- Training ----------------

    model.train()

    train_loss = 0.0

    for images in train_loader:

        images = images.to(device)

        optimizer.zero_grad()

        reconstructed = model(images)

        loss = criterion(
            reconstructed,
            images
        )

        loss.backward()

        optimizer.step()

        train_loss += loss.item()


    train_loss /= len(train_loader)


    # ---------------- Validation ----------------

    model.eval()

    val_loss = 0.0

    with torch.no_grad():

        for images in val_loader:

            images = images.to(device)

            reconstructed = model(images)

            loss = criterion(
                reconstructed,
                images
            )

            val_loss += loss.item()


    val_loss /= len(val_loader)


    print(
        f"Epoch {epoch + 1}/{epochs}"
        f" | Train Loss: {train_loss:.6f}"
        f" | Val Loss: {val_loss:.6f}"
    )


    # ---------------- Best Model ----------------

    if val_loss < best_val_loss:

        best_val_loss = val_loss

        counter = 0

        torch.save(
            model.state_dict(),
            os.path.join(
                save_path,
                "bottle_anomaly_model.pth"
            )
        )

        print("  → Best model saved.")

    else:

        counter += 1

        print(
            f"  → No improvement "
            f"({counter}/{patience})"
        )


    # ---------------- Early Stopping ----------------

    if counter >= patience:

        print("\nEarly Stopping Triggered!")

        break


print("\nTraining Completed")

print(
    f"Best Validation Loss: {best_val_loss:.6f}"
)

print(
    "Model saved as: "
    "bottle_anomaly_model.pth"
)