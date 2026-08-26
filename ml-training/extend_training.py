import torch

path = r"runs\mvtec_yolo_1050_scratch\weights\last.pt"

checkpoint = torch.load(path, map_location="cpu", weights_only=False)

checkpoint["train_args"]["epochs"] = 100

torch.save(checkpoint, path)

print("Training epochs changed from 50 to 100.")
print("You can now resume training.")