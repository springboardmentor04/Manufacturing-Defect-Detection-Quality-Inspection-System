import os
import sys
import glob
from pathlib import Path
import json
import numpy as np
import torch
import torch.nn.functional as F

# Setup paths
base_dir = Path(__file__).resolve().parent.parent
sys.path.append(str(base_dir))

from inference.infer import InferenceEngine
from config.config import config
from utils.logger import logger

def build_prototypes():
    engine = InferenceEngine()
    prototypes = {}
    
    for category in config.SUPPORTED_CATEGORIES:
        test_dir = config.DATASET_PATH / category / 'test' / 'good'
        
        if not test_dir.exists():
            continue
            
        logger.info(f"Building prototype for {category}...")
        features = []
        
        # Use first 20 good images to build prototype
        img_paths = list(test_dir.glob('*.png'))[:20]
        for img_path in img_paths:
            img_tensor = engine.preprocessor.preprocess(str(img_path)).to(engine.device)
            with torch.no_grad():
                out = engine.model(img_tensor)
                # the teacher output is a spatial feature map. Let's global average pool it to 1D
                teacher_feat = out['teacher'].mean(dim=(2, 3)) 
                features.append(teacher_feat)
                
        if features:
            avg_feat = torch.cat(features, dim=0).mean(dim=0).cpu().tolist()
            prototypes[category] = avg_feat
            
    output_file = Path(__file__).resolve().parents[1] / "config" / "prototypes.json"
    with open(output_file, 'w') as f:
        json.dump(prototypes, f)
    print(f"Prototypes saved to {output_file}")

if __name__ == "__main__":
    build_prototypes()
