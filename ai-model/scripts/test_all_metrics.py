import torch
import torch.nn.functional as F
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
        t = out['teacher'] # [B, 512, 8, 8]
        s = out['student']
        err = torch.pow(s - t, 2).mean(dim=1)
        err_flat = err.view(-1)
        
        # New ideas
        diff = s - t
        diff_abs = torch.abs(diff).mean(dim=1).view(-1)
        
        t_flat = t.view(-1)
        s_flat = s.view(-1)
        
        return {
            'max': err.max().item(),
            'mean': err.mean().item(),
            'abs_max': diff_abs.max().item(),
            't_sum': t.sum().item(),
            's_sum': s.sum().item(),
            'sum_diff': abs(t.sum().item() - s.sum().item()),
            'l1_loss': F.l1_loss(s, t).item(),
            'cos_sim_mean': F.cosine_similarity(s, t, dim=1).mean().item()
        }
    return None

cat = 'bottle'
dataset_dir = base_dir.parent / 'dataset' / 'mvtec_ad'
good = list(glob.glob(str(dataset_dir / cat / 'test' / 'good' / '*.png')))[:5]
bad = list(glob.glob(str(dataset_dir / cat / 'test' / 'broken_large' / '*.png')))[:2]

for g in good:
    print(f"GOOD: {get_stats(g)}")
for b in bad:
    print(f"BAD: {get_stats(b)}")
