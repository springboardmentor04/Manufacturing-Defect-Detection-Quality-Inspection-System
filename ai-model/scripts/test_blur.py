import torch
import torch.nn.functional as F
import torchvision.transforms.functional as TF
import numpy as np
from pathlib import Path
import sys
import glob
import os

base_dir = Path(__file__).resolve().parent.parent
sys.path.append(str(base_dir))

from inference.infer import InferenceEngine

engine = InferenceEngine()

def get_smoothed_max(img_path):
    tensor = engine.preprocessor.preprocess(img_path).to(engine.device)
    with torch.no_grad():
        out = engine.model(tensor)
    if out.get('teacher') is not None:
        t = out['teacher']
        s = out['student']
        
        # Calculate pixel-wise MSE [B, H, W]
        err = torch.pow(s - t, 2).mean(dim=1, keepdim=True) # [B, 1, 8, 8]
        
        # Upsample to 256x256
        err_up = F.interpolate(err, size=(256, 256), mode='bilinear', align_corners=False)
        
        # Apply Gaussian Blur (kernel size 21, sigma 4 is standard in Anomalib)
        err_blur = TF.gaussian_blur(err_up, kernel_size=[21, 21], sigma=[4.0, 4.0])
        
        return {
            'max': err.max().item(),
            'blur_max': err_blur.max().item()
        }
    return None

cat = 'bottle'
dataset_dir = base_dir.parent / 'dataset' / 'mvtec_ad'
good = list(glob.glob(str(dataset_dir / cat / 'test' / 'good' / '*.png')))[:5]
bad = list(glob.glob(str(dataset_dir / cat / 'test' / 'broken_large' / '*.png')))[:2]
bad.extend(list(glob.glob(str(dataset_dir / cat / 'test' / 'contamination' / '*.png')))[:2])

print('GOOD:')
for g in good:
    print(f"{Path(g).name}: {get_smoothed_max(g)}")
    
print('\nBAD:')
for b in bad:
    print(f"{Path(b).parent.name}/{Path(b).name}: {get_smoothed_max(b)}")
