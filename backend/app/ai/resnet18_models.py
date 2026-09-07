"""
VisionInspect AI - ResNet18 model utilities.

Uses ImageNet-pretrained ResNet18 only.
No training.
No fine-tuning.
No custom checkpoint.
"""

from __future__ import annotations

from typing import Tuple

import torch
import torch.nn as nn
from torchvision import models, transforms


IMAGE_SIZE = 224

IMAGENET_MEAN = [0.485, 0.456, 0.406]
IMAGENET_STD = [0.229, 0.224, 0.225]

TRANSFORM = transforms.Compose(
    [
        transforms.Resize((IMAGE_SIZE, IMAGE_SIZE)),
        transforms.ToTensor(),
        transforms.Normalize(
            mean=IMAGENET_MEAN,
            std=IMAGENET_STD,
        ),
    ]
)


def create_resnet18() -> nn.Module:
    """Create ImageNet-pretrained ResNet18."""
    weights = models.ResNet18_Weights.DEFAULT
    model = models.resnet18(weights=weights)
    model.eval()
    return model


class ResNet18FeatureExtractor(nn.Module):
    """ResNet18 without its final ImageNet classifier."""

    def __init__(self, model: nn.Module) -> None:
        super().__init__()

        self.backbone = nn.Sequential(
            *list(model.children())[:-1]
        )

    def forward(
        self,
        x: torch.Tensor,
    ) -> torch.Tensor:

        features = self.backbone(x)

        features = torch.flatten(
            features,
            1,
        )

        return torch.nn.functional.normalize(
            features,
            p=2,
            dim=1,
        )


def create_feature_extractor() -> Tuple[nn.Module, torch.device]:
    """Create the pretrained ResNet18 feature extractor."""

    device = torch.device(
        "cuda"
        if torch.cuda.is_available()
        else "cpu"
    )

    model = create_resnet18()

    extractor = ResNet18FeatureExtractor(
        model
    ).to(device)

    extractor.eval()

    return extractor, device