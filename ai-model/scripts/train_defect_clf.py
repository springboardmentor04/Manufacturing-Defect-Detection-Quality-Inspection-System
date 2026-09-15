import os
import sys
import pickle
from pathlib import Path
import torch
from PIL import Image
from sklearn.linear_model import LogisticRegression

base_dir = Path("c:/Users/ASUS/Desktop/AI infosys/visioninspect-ai")
sys.path.append(str(base_dir / "ai-model"))

from inference.model_loader import ModelLoader
from preprocessing.transforms import get_transforms
from config.config import config

dataset_dir = base_dir / "dataset" / "mvtec_ad"
models_dir = base_dir / "ai-model" / "weights" / "defect_classifiers"
os.makedirs(models_dir, exist_ok=True)

def train_classifiers():
    loader = ModelLoader()
    device = loader.device
    transforms = get_transforms(is_training=False)
    
    for category in config.SUPPORTED_CATEGORIES:
        print(f"Training LR classifier for {category}...")
        try:
            model = loader.load_model(category)
            model.eval()
        except:
            continue
            
        cat_test_dir = dataset_dir / category / "test"
        if not cat_test_dir.exists():
            continue
            
        defect_types = [d for d in cat_test_dir.iterdir() if d.is_dir() and d.name != "good"]
        
        X = []
        y = []
        
        with torch.no_grad():
            for d in defect_types:
                defect_name = d.name.replace("_", " ").title()
                for img_path in d.glob("*.png"):
                    img = Image.open(img_path).convert('RGB')
                    tensor = transforms(img).unsqueeze(0).to(device)
                    outputs = model(tensor)
                    
                    # Use teacher features pooled
                    teacher_features = outputs.get("teacher")
                    feat_vector = teacher_features.mean(dim=(2, 3)).squeeze().cpu().numpy()
                    
                    X.append(feat_vector)
                    y.append(defect_name)
                    
        if not X:
            continue
            
        clf = LogisticRegression(max_iter=1000, class_weight='balanced')
        clf.fit(X, y)
        
        with open(models_dir / f"{category}_clf.pkl", "wb") as f:
            pickle.dump(clf, f)
            
    print("LR classifiers trained!")

if __name__ == "__main__":
    train_classifiers()
