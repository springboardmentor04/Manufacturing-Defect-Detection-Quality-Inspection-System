import torch

from app.ai.model import DefectDetectionModel

model = DefectDetectionModel()

dummy = torch.randn(
    1,
    3,
    256,
    256
)

output = model(dummy)

print("Output Shape:", output.shape)

print(output)