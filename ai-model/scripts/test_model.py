import os
import sys
from pathlib import Path

# Add ai-model root to sys.path so we can import config and models
sys.path.append(str(Path(__file__).resolve().parents[1]))

from models.factory import ModelFactory
from config.config import config
import torch

def main():
    model = ModelFactory.create_model(config.MODEL_NAME, backbone=config.BACKBONE)
    model.initialize()
    
    param_count = sum(p.numel() for p in model.parameters())
    
    status = "READY" if getattr(model, 'backbone', None) is not None else "UNINITIALIZED"
    
    model_display_name = "EfficientAD" if config.MODEL_NAME.lower() == "efficientad" else config.MODEL_NAME.capitalize()
    backbone_display = "ResNet18" if config.BACKBONE.lower() == "resnet18" else config.BACKBONE.capitalize()
    
    print("==========================================")
    print("VisionInspect AI Model Test")
    print("==========================================")
    print("Model")
    print(model_display_name)
    print("Backbone")
    print(backbone_display)
    print("Parameters")
    print(str(param_count))
    print("Input Size")
    print(f"{config.INPUT_SIZE[0]} x {config.INPUT_SIZE[1]}")
    print("Device")
    print("CPU / CUDA")
    print("Model Status")
    print(status)
    print("==========================================")

if __name__ == "__main__":
    main()
