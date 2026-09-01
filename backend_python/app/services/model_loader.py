import os
from pathlib import Path
import torch
import torch.nn as nn
from torchvision import models

BASE_DIR = Path(__file__).resolve().parent.parent
WEIGHTS_DIR = BASE_DIR / "weights"
WEIGHTS_DIR.mkdir(parents=True, exist_ok=True)

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# --- UNet Segmentation Architecture ---
class ConvBlock(nn.Module):
    def __init__(self, in_ch, out_ch):
        super().__init__()
        self.block = nn.Sequential(
            nn.Conv2d(in_ch, out_ch, 3, padding=1),
            nn.BatchNorm2d(out_ch),
            nn.ReLU(inplace=True),
            nn.Conv2d(out_ch, out_ch, 3, padding=1),
            nn.BatchNorm2d(out_ch),
            nn.ReLU(inplace=True)
        )
    def forward(self, x):
        return self.block(x)

class UNet(nn.Module):
    def __init__(self):
        super().__init__()
        self.enc1 = ConvBlock(3, 32)
        self.enc2 = ConvBlock(32, 64)
        self.enc3 = ConvBlock(64, 128)
        self.pool = nn.MaxPool2d(2)
        self.bottleneck = ConvBlock(128, 256)
        self.up3 = nn.ConvTranspose2d(256, 128, 2, stride=2)
        self.dec3 = ConvBlock(256, 128)
        self.up2 = nn.ConvTranspose2d(128, 64, 2, stride=2)
        self.dec2 = ConvBlock(128, 64)
        self.up1 = nn.ConvTranspose2d(64, 32, 2, stride=2)
        self.dec1 = ConvBlock(64, 32)
        self.out_conv = nn.Conv2d(32, 1, 1)

    def forward(self, x):
        e1 = self.enc1(x)
        e2 = self.enc2(self.pool(e1))
        e3 = self.enc3(self.pool(e2))
        b = self.bottleneck(self.pool(e3))
        d3 = self.dec3(torch.cat([self.up3(b), e3], dim=1))
        d2 = self.dec2(torch.cat([self.up2(d3), e2], dim=1))
        d1 = self.dec1(torch.cat([self.up1(d2), e1], dim=1))
        return torch.sigmoid(self.out_conv(d1))

# --- GradCAM Hook Class ---
class GradCAM:
    def __init__(self, model, target_layer):
        self.model = model
        self.gradients = None
        self.activations = None
        target_layer.register_forward_hook(self._save_activation)
        target_layer.register_full_backward_hook(self._save_gradient)

    def _save_activation(self, module, inp, out):
        self.activations = out.detach()

    def _save_gradient(self, module, grad_in, grad_out):
        self.gradients = grad_out[0].detach()

    def generate(self, input_tensor, class_idx=1):
        self.model.eval()
        tensor_req = input_tensor.clone().detach().requires_grad_(True)
        output = self.model(tensor_req)
        self.model.zero_grad()
        score = output[0, class_idx]
        score.backward()

        weights = self.gradients.mean(dim=(2, 3), keepdim=True)
        cam = (weights * self.activations).sum(dim=1, keepdim=True)
        cam = torch.relu(cam)
        cam = cam.squeeze().cpu().numpy()

        cam = cam - cam.min()
        cam = cam / (cam.max() + 1e-8)
        return cam, torch.softmax(output, dim=1)[0].detach().cpu().numpy()

# --- Model Manager Singleton ---
class ModelManager:
    classifier = None
    segmenter = None
    grad_cam = None
    classifier_loaded = False
    segmenter_loaded = False

model_manager = ModelManager()

def build_classifier():
    base = models.resnet18(weights=None)
    base.fc = nn.Linear(base.fc.in_features, 2)
    return base.to(DEVICE)

def build_segmenter():
    model = UNet()
    return model.to(DEVICE)

def initialize_models():
    cls_path = WEIGHTS_DIR / "best_model.pth"
    seg_path = WEIGHTS_DIR / "best_seg_model.pth"

    # Initialize Classifier
    model_manager.classifier = build_classifier()
    if cls_path.exists():
        try:
            state_dict = torch.load(cls_path, map_location=DEVICE)
            model_manager.classifier.load_state_dict(state_dict)
            model_manager.classifier_loaded = True
            print(f"[PyTorch Models] Successfully loaded ResNet18 classifier from {cls_path.name}")
        except Exception as e:
            print(f"[PyTorch Models] Warning: Failed to load {cls_path.name}: {e}")
    else:
        print(f"[PyTorch Models] Note: {cls_path.name} not found in {WEIGHTS_DIR}. Using default ResNet18 architecture.")

    # Target last conv layer for GradCAM
    model_manager.classifier.eval()
    model_manager.grad_cam = GradCAM(model_manager.classifier, model_manager.classifier.layer4[-1])

    # Initialize UNet Segmenter
    model_manager.segmenter = build_segmenter()
    if seg_path.exists():
        try:
            state_dict = torch.load(seg_path, map_location=DEVICE)
            model_manager.segmenter.load_state_dict(state_dict)
            model_manager.segmenter_loaded = True
            print(f"[PyTorch Models] Successfully loaded UNet segmenter from {seg_path.name}")
        except Exception as e:
            print(f"[PyTorch Models] Warning: Failed to load {seg_path.name}: {e}")
    else:
        print(f"[PyTorch Models] Note: {seg_path.name} not found in {WEIGHTS_DIR}. Using default UNet architecture.")

    model_manager.segmenter.eval()

# Auto-initialize models on import
initialize_models()
