import torch
import torch.nn as nn
from torchvision.models import resnet18, ResNet18_Weights

class CustomCNN(nn.Module):
    def __init__(self, dropout_rate: float = 0.5, freeze_backbone: bool = True, num_classes: int = 15):
        super(CustomCNN, self).__init__()
        
        # Load pre-trained ResNet18
        self.backbone = resnet18(weights=ResNet18_Weights.IMAGENET1K_V1)
        
        if freeze_backbone:
            # Freeze the early layers to prevent overfitting on small datasets
            for name, param in self.backbone.named_parameters():
                if any(layer in name for layer in ['conv1', 'bn1', 'layer1', 'layer2']):
                    param.requires_grad = False
        
        # Extract the number of input features to the final fully connected layer
        num_ftrs = self.backbone.fc.in_features
        
        # Replace the final fully connected layer (fc) for multi-class classification
        self.backbone.fc = nn.Sequential(
            nn.Linear(num_ftrs, 256),
            nn.BatchNorm1d(256),
            nn.LeakyReLU(0.1, inplace=True),
            nn.Dropout(p=dropout_rate),
            nn.Linear(256, num_classes)  # output neurons for multi-class classification
        )

    def forward(self, x):
        # We pass the input directly through the modified ResNet18
        x = self.backbone(x)
        return x
