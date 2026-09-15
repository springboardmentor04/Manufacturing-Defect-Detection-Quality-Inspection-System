import os
import sys
import torch
import torch.nn.functional as F
from pathlib import Path
import json

base_dir = Path(__file__).resolve().parent.parent
sys.path.append(str(base_dir))

from config.config import config
from preprocessing.transforms import get_transforms
from dataset.loader import MVTecDataset
from models.factory import ModelFactory
from torch.utils.data import DataLoader
from tqdm import tqdm
from inference.model_loader import ModelLoader

def generate_defect_prototypes():
    model_loader = ModelLoader()
    device = model_loader.device
    print(f"Generating defect prototypes on {device}...")
    
    transforms = get_transforms(is_training=False)
    
    defect_prototypes = {}
    
    for category in config.SUPPORTED_CATEGORIES:
        print(f"Processing category: {category}")
        cat_prototypes = {}
        
        test_dir = config.DATASET_PATH / category / "test"
        if not test_dir.exists():
            print(f"Test directory not found for {category}")
            continue
            
        try:
            model = model_loader.load_model(category)
        except Exception as e:
            print(f"Failed to load model for {category}: {e}")
            continue
            
        for defect_folder in test_dir.iterdir():
            if not defect_folder.is_dir() or defect_folder.name == "good":
                continue
                
            defect_name = defect_folder.name
            
            # Properly iterate through paths to avoid MVTecDataset override complexity
            features_sum = None
            count = 0
            
            from PIL import Image
            with torch.no_grad():
                for img_path in list(defect_folder.glob("*.png")) + list(defect_folder.glob("*.jpg")):
                    img = Image.open(img_path).convert('RGB')
                    tensor = transforms(img).unsqueeze(0).to(device)
                    
                    outputs = model(tensor)
                    teacher_features = outputs.get("teacher")
                    student_features = outputs.get("student")
                    
                    if teacher_features is not None and student_features is not None:
                        # Compute error map (squared difference)
                        err = torch.pow(student_features - teacher_features, 2)
                        # Max error per channel spatial-wise gives the defect profile fingerprint
                        feat = err.amax(dim=(2, 3)).squeeze(0) # shape: [C]
                    else:
                        continue
                    
                    if features_sum is None:
                        features_sum = feat
                    else:
                        features_sum += feat
                    count += 1
                    
            if count > 0:
                mean_feat = features_sum / count
                cat_prototypes[defect_name] = mean_feat.cpu().tolist()
                print(f" - {defect_name}: {count} images")
                
        defect_prototypes[category] = cat_prototypes
        
    out_file = config.BASE_DIR / "ai-model" / "config" / "defect_prototypes.json"
    with open(out_file, 'w') as f:
        json.dump(defect_prototypes, f, indent=4)
        
    print(f"Saved defect prototypes to {out_file}")

if __name__ == "__main__":
    generate_defect_prototypes()
