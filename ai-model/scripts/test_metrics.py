import json
import torch
import numpy as np
from pathlib import Path
import sys
import glob
import os

base_dir = Path(__file__).resolve().parent.parent
sys.path.append(str(base_dir))

from inference.infer import InferenceEngine

engine = InferenceEngine()

def get_stats(img_path):
    tensor = engine.preprocessor.preprocess(img_path).to(engine.device)
    with torch.no_grad():
        out = engine.model(tensor)
    if out.get('teacher') is not None:
        t = out['teacher']
        s = out['student']
        err = torch.pow(s - t, 2).mean(dim=1) # [B, H, W]
        err_flat = err.view(-1)
        
        return {
            'max': err.max().item(),
            'mean': err.mean().item(),
            'top10_mean': torch.topk(err_flat, 10).values.mean().item(),
            'std': err.std().item()
        }
    return None

cat = 'bottle'
dataset_dir = base_dir.parent / 'dataset' / 'mvtec_ad'
good = list(glob.glob(str(dataset_dir / cat / 'test' / 'good' / '*.png')))[:5]
bad = []
for defect in os.listdir(dataset_dir / cat / 'test'):
    if defect != 'good':
        bad.extend(list(glob.glob(str(dataset_dir / cat / 'test' / defect / '*.png')))[:2])

print('GOOD STATS:')
for g in good:
    print(f"{Path(g).name}: {get_stats(g)}")
    
print('\nBAD STATS:')
for b in bad:
    print(f"{Path(b).parent.name}/{Path(b).name}: {get_stats(b)}")
