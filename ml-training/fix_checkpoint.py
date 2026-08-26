import torch
from pathlib import Path

# Automatically find last.pt
files = list(Path("runs").rglob("last.pt"))

if not files:
    raise FileNotFoundError("Could not find last.pt inside runs folder.")

path = files[0]

print("Checkpoint found:")
print(path)

# Load checkpoint
ckpt = torch.load(path, map_location="cpu", weights_only=False)

print("\nBEFORE")
print("epoch:", ckpt.get("epoch"))
print("epochs:", ckpt.get("train_args", {}).get("epochs"))

# The original training completed 50 epochs.
# Ultralytics stores the completed epoch as 49 internally.
ckpt["epoch"] = 49

# Extend total training from 50 to 100 epochs.
ckpt["train_args"]["epochs"] = 100

# Save
torch.save(ckpt, path)

print("\nAFTER")
print("epoch:", ckpt.get("epoch"))
print("epochs:", ckpt.get("train_args", {}).get("epochs"))

print("\nCheckpoint successfully updated.")