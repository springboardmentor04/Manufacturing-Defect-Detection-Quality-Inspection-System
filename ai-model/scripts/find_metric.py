import torch
import torch.nn.functional as F
from pathlib import Path
import sys
import glob
import os
import numpy as np

base_dir = Path(__file__).resolve().parent.parent
sys.path.append(str(base_dir))

from inference.infer import InferenceEngine

engine = InferenceEngine()

def test_metrics():
    metrics = {
        'mse_max': lambda s, t: torch.pow(s - t, 2).mean(dim=1).max().item(),
        'mse_mean': lambda s, t: torch.pow(s - t, 2).mean(dim=1).mean().item(),
        'mse_std': lambda s, t: torch.pow(s - t, 2).mean(dim=1).std().item(),
        'mse_top10': lambda s, t: torch.topk(torch.pow(s - t, 2).mean(dim=1).flatten(), min(10, torch.pow(s - t, 2).mean(dim=1).numel())).values.mean().item(),
        'l1_max': lambda s, t: torch.abs(s - t).mean(dim=1).max().item(),
        'cos_max': lambda s, t: (1 - F.cosine_similarity(s, t, dim=1)).max().item(),
        'cos_mean': lambda s, t: (1 - F.cosine_similarity(s, t, dim=1)).mean().item(),
        'combined': lambda s, t: (torch.pow(s - t, 2).mean(dim=1) * (1 - F.cosine_similarity(s, t, dim=1))).max().item(),
        'l2_norm': lambda s, t: torch.norm(s - t, p=2, dim=1).max().item(),
        'variance': lambda s, t: torch.var(s - t, dim=1).max().item(),
    }

    dataset_dir = base_dir.parent / 'dataset' / 'mvtec_ad'
    
    for cat in ['cable', 'carpet', 'bottle', 'capsule']:
        print(f"\nEvaluating category: {cat}")
        good_imgs = list(glob.glob(str(dataset_dir / cat / 'test' / 'good' / '*.png')))[:20]
        bad_imgs = []
        for defect in os.listdir(dataset_dir / cat / 'test'):
            if defect != 'good':
                bad_imgs.extend(list(glob.glob(str(dataset_dir / cat / 'test' / defect / '*.png')))[:10])
                
        print(f"Good: {len(good_imgs)}, Bad: {len(bad_imgs)}")
        
        results = {m: {'good': [], 'bad': []} for m in metrics}
        
        for img in good_imgs:
            tensor = engine.preprocessor.preprocess(img).to(engine.device)
            with torch.no_grad():
                out = engine.model(tensor)
                s = out['student']
                t = out['teacher']
            for m_name, m_func in metrics.items():
                results[m_name]['good'].append(m_func(s, t))
                
        for img in bad_imgs:
            tensor = engine.preprocessor.preprocess(img).to(engine.device)
            with torch.no_grad():
                out = engine.model(tensor)
                s = out['student']
                t = out['teacher']
            for m_name, m_func in metrics.items():
                results[m_name]['bad'].append(m_func(s, t))
                
        for m_name, res in results.items():
            g = res['good']
            b = res['bad']
            if not g or not b: continue
            
            g_min, g_max = min(g), max(g)
            b_min, b_max = min(b), max(b)
            
            # Check if separated (either bad is strictly > good, or bad is strictly < good)
            if b_min > g_max:
                print(f"  [SUCCESS] {m_name}: BAD > GOOD (Good max: {g_max:.4f}, Bad min: {b_min:.4f})")
            elif b_max < g_min:
                print(f"  [SUCCESS] {m_name}: BAD < GOOD (Good min: {g_min:.4f}, Bad max: {b_max:.4f})")
            else:
                # Overlap
                pass

if __name__ == "__main__":
    test_metrics()
