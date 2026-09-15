import torch
import glob
from pathlib import Path
import sys
import numpy as np
import os

base_dir = Path('ai-model')
sys.path.append(str(base_dir))

from inference.infer import InferenceEngine

engine = InferenceEngine()

def get_spatial_var(img_path):
    tensor = engine.preprocessor.preprocess(img_path).to(engine.device)
    with torch.no_grad():
        out = engine.model(tensor)
    if out.dim() == 4:
        return out.var(dim=[2, 3]).mean().item()
    return 0.0

for cat in ['bottle', 'cable', 'capsule', 'wood']:
    good = list(glob.glob(f'dataset/mvtec_ad/{cat}/test/good/*.png'))[:10]
    bad = []
    for defect in os.listdir(f'dataset/mvtec_ad/{cat}/test/'):
        if defect != 'good':
            bad.extend(list(glob.glob(f'dataset/mvtec_ad/{cat}/test/{defect}/*.png'))[:2])
    
    good_scores = [get_spatial_var(g) for g in good]
    bad_scores = [get_spatial_var(b) for b in bad]
    
    print(f'{cat.upper()}:')
    print(f'  GOOD: mean={np.mean(good_scores):.4f}, min={np.min(good_scores):.4f}, max={np.max(good_scores):.4f}')
    print(f'  BAD:  mean={np.mean(bad_scores):.4f}, min={np.min(bad_scores):.4f}, max={np.max(bad_scores):.4f}')
