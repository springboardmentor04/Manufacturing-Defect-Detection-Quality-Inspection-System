import torch
import torch.nn as nn
import torch.optim as optim

from app.ai.model import CustomCNN
from app.ai.dataloader import get_dataloaders


# ==========================================
# DEVICE
# ==========================================

device = torch.device("cpu")

print("=" * 60)
print("VisionInspect AI - Learning Sanity Test")
print("=" * 60)


# ==========================================
# LOAD DATA
# ==========================================

train_loader, _, _, _ = get_dataloaders(
    batch_size=16
)


# Get ONE fixed batch
images, labels = next(iter(train_loader))

images = images.to(device)
labels = labels.to(device)


print("Batch shape:", images.shape)
print("Labels:", labels.tolist())


# ==========================================
# MODEL
# ==========================================

model = CustomCNN().to(device)


# ==========================================
# LOSS + OPTIMIZER
# ==========================================

criterion = nn.CrossEntropyLoss()

optimizer = optim.Adam(
    model.parameters(),
    lr=0.001
)


# ==========================================
# TRAIN ON SAME BATCH
# ==========================================

model.train()

for step in range(100):

    optimizer.zero_grad()

    outputs = model(images)

    loss = criterion(
        outputs,
        labels
    )

    loss.backward()

    optimizer.step()


    # Check accuracy
    predictions = outputs.argmax(
        dim=1
    )

    accuracy = (
        predictions == labels
    ).float().mean().item() * 100


    if (
        step == 0
        or (step + 1) % 10 == 0
    ):

        print(
            f"Step {step + 1:03d}"
            f" | Loss: {loss.item():.4f}"
            f" | Accuracy: {accuracy:.2f}%"
        )


print("\n" + "=" * 60)

print("Sanity test completed.")

print("=" * 60)