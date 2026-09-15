import sys
from pathlib import Path
import torch

# Add ai-model root to sys.path
sys.path.append(str(Path(__file__).resolve().parents[1]))

from inference.model_loader import ModelLoader
from model_registry import ModelRegistry
from config.config import config

def main():
    registry = ModelRegistry()
    loader = ModelLoader()
    
    model_path = registry.get_production_model_path()
    found = "FOUND" if model_path.exists() else "NOT FOUND"
    
    metadata = registry.get_model_metadata()
    version = metadata.get("Version", config.MODEL_VERSION) if metadata else config.MODEL_VERSION
    
    device = getattr(config, 'INFERENCE_DEVICE', "cpu").upper()
    
    try:
        if found == "FOUND":
            model = loader.load_model()
            loaded = "SUCCESS"
            status = "READY FOR INFERENCE"
        else:
            loaded = "FAILED"
            status = "NOT READY"
    except Exception as e:
        loaded = "FAILED"
        status = f"ERROR: {str(e)}"
        
    print("==========================================")
    print("VisionInspect AI")
    print("Production Model Loader")
    print("==========================================")
    print("Production Model")
    print(found)
    print("Model Version")
    print(version)
    print("Device")
    # Forcing exactly the print requested if torch returns cuda and instructions say CPU. 
    # Let's print exactly device.
    print(device)
    print("Model Loaded")
    print(loaded)
    print("Status")
    print(status)
    print("==========================================")

if __name__ == "__main__":
    main()
