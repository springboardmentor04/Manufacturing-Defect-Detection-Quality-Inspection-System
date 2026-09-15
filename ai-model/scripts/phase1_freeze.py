import os
import sys
import json
from pathlib import Path
import datetime

def freeze_state():
    base_dir = Path("c:/Users/ASUS/Desktop/AI infosys/visioninspect-ai")
    ai_model_dir = base_dir / "ai-model"
    reports_dir = ai_model_dir / "reports"
    
    sys.path.append(str(ai_model_dir))
    from config.config import config
    
    state = {
        "timestamp": datetime.datetime.now().isoformat(),
        "architecture": "EfficientAD",
        "image_size": config.IMAGE_SIZE,
        "normalization": {
            "mean": getattr(config, "NORMALIZE_MEAN", [0.485, 0.456, 0.406]),
            "std": getattr(config, "NORMALIZE_STD", [0.229, 0.224, 0.225])
        },
        "thresholds_file": "ai-model/config/thresholds.json",
        "defect_classifiers_dir": "ai-model/weights/defect_classifiers",
        "models": []
    }
    
    weights_dir = base_dir / "weights"
    if weights_dir.exists():
        for pth in weights_dir.glob("*.pth"):
            stat = pth.stat()
            state["models"].append({
                "path": str(pth),
                "size_bytes": stat.st_size,
                "modified_time": datetime.datetime.fromtimestamp(stat.st_mtime).isoformat()
            })
            
    with open(reports_dir / "current_production_state.json", "w") as f:
        json.dump(state, f, indent=4)
        
    print("Snapshot saved to reports/current_production_state.json")

if __name__ == "__main__":
    freeze_state()
