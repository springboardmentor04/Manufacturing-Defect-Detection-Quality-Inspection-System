import sys
sys.path.append('c:/Users/ASUS/Desktop/AI infosys/visioninspect-ai/ai-model')
from inference.model_loader import ModelLoader
from preprocessing.transforms import get_transforms
from PIL import Image
from pathlib import Path
import torch
import torch.nn.functional as F

def get_scores(category, defect_type, use_smoothing=False):
    loader = ModelLoader()
    device = loader.device
    model = loader.load_model(category)
    model.eval()
    transforms = get_transforms(is_training=False)
    
    path = Path(f'c:/Users/ASUS/Desktop/AI infosys/visioninspect-ai/dataset/mvtec_ad/{category}/test/{defect_type}')
        
    scores = []
    with torch.no_grad():
        for img_path in path.glob('*.png'):
            img = Image.open(img_path).convert('RGB')
            tensor = transforms(img).unsqueeze(0).to(device)
            outputs = model(tensor)
            
            teacher_features = outputs.get('teacher')
            student_features = outputs.get('student')
            
            err = torch.pow(student_features - teacher_features, 2)
            anomaly_map = err.mean(dim=1, keepdim=True)
            
            if use_smoothing:
                anomaly_map = F.avg_pool2d(anomaly_map, kernel_size=9, stride=1, padding=4)
                
            score = anomaly_map.max().item()
            scores.append(score)
            
    return scores

print('--- Carpet without smoothing ---')
good_scores = get_scores('carpet', 'good', False)
hole_scores = get_scores('carpet', 'hole', False)
print(f'Good Max: {max(good_scores) if good_scores else "N/A"}')
print(f'Hole Min: {min(hole_scores) if hole_scores else "N/A"}')

print('\n--- Carpet WITH smoothing ---')
good_scores_smooth = get_scores('carpet', 'good', True)
hole_scores_smooth = get_scores('carpet', 'hole', True)
print(f'Good Max: {max(good_scores_smooth) if good_scores_smooth else "N/A"}')
print(f'Hole Min: {min(hole_scores_smooth) if hole_scores_smooth else "N/A"}')
