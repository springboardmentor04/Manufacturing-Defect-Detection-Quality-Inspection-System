import torch
from torchvision import transforms
from PIL import Image

from config.config import config

class Preprocessor:
    def __init__(self):
        self.transform = transforms.Compose([
            transforms.Resize(config.INPUT_SIZE),
            transforms.ToTensor()
        ])
        
    def preprocess(self, image_path: str) -> torch.Tensor:
        image = Image.open(image_path).convert('RGB')
        return self.transform(image).unsqueeze(0)
