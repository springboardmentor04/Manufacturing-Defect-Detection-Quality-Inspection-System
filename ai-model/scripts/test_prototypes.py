import os
import sys
import glob
from pathlib import Path
import json
import numpy as np
import torch
import torch.nn.functional as F

base_dir = Path(__file__).resolve().parent.parent
sys.path.append(str(base_dir))

from inference.infer import InferenceEngine
from config.config import config

def test_prototypes():
    engine = InferenceEngine()
    
    proto_file = Path(__file__).resolve().parents[1] / "config" / "prototypes.json"
    with open(proto_file, 'r') as f:
        prototypes = json.load(f)
        
    proto_tensors = {k: torch.tensor(v).to(engine.device) for k, v in prototypes.items()}
    
    correct = 0
    total = 0
    
    for category in config.SUPPORTED_CATEGORIES:
        test_dir = config.DATASET_PATH / category / 'test' / 'good'
        if not test_dir.exists(): continue
        
        img_paths = list(test_dir.glob('*.png'))[:10]
        for img_path in img_paths:
            img_tensor = engine.preprocessor.preprocess(str(img_path)).to(engine.device)
            with torch.no_grad():
                out = engine.model(img_tensor)
                feat = out['teacher'].mean(dim=(2, 3))
                
            best_cat = None
            best_sim = -1
            
            for k, p_tensor in proto_tensors.items():
                sim = F.cosine_similarity(feat, p_tensor.unsqueeze(0)).item()
                if sim > best_sim:
                    best_sim = sim
                    best_cat = k
                    
            if best_cat == category:
                correct += 1
            else:
                print(f"Failed {category}: Classified as {best_cat}")
            total += 1
            
    print(f"Accuracy: {correct}/{total} ({correct/total*100:.2f}%)")

if __name__ == "__main__":
    test_prototypes()
