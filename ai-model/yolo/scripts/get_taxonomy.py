import os
from pathlib import Path
import json

def get_taxonomy():
    dataset_dir = Path("c:/Users/ASUS/Desktop/AI infosys/visioninspect-ai/dataset/mvtec_ad")
    categories = [d for d in dataset_dir.iterdir() if d.is_dir()]
    
    # Track raw subtypes
    taxonomy = {}
    
    for cat in categories:
        test_dir = cat / "test"
        if not test_dir.exists(): continue
        
        for subtype in test_dir.iterdir():
            if subtype.is_dir() and subtype.name != "good":
                if subtype.name not in taxonomy:
                    taxonomy[subtype.name] = []
                taxonomy[subtype.name].append(cat.name)
                
    # Sort and create unified mapping
    unified_classes = list(taxonomy.keys())
    unified_classes.sort()
    
    print("Identified Semantic Defect Classes:")
    for cls in unified_classes:
        print(f"{cls}: {taxonomy[cls]}")
        
    print(f"\nTotal unique classes: {len(unified_classes)}")
    
    with open("c:/Users/ASUS/Desktop/AI infosys/visioninspect-ai/ai-model/yolo/taxonomy.json", "w") as f:
        json.dump({"classes": unified_classes, "mapping": taxonomy}, f, indent=4)

if __name__ == "__main__":
    get_taxonomy()
