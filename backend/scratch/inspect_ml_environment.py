import os
import sys
import platform
import json

def inspect_environment():
    info = {
        "python_version": sys.version,
        "platform": platform.platform(),
        "processor": platform.processor(),
        "pytorch": None,
        "cuda_available": False,
        "cuda_version": None,
        "device_count": 0,
        "device_name": None,
        "vram_gb": 0.0,
        "ultralytics": None,
        "dataset_yaml_valid": False
    }

    # Check PyTorch & CUDA
    try:
        import torch
        info["pytorch"] = torch.__version__
        info["cuda_available"] = torch.cuda.is_available()
        if info["cuda_available"]:
            info["cuda_version"] = torch.version.cuda
            info["device_count"] = torch.cuda.device_count()
            info["device_name"] = torch.cuda.get_device_name(0)
            vram_bytes = torch.cuda.get_device_properties(0).total_memory
            info["vram_gb"] = round(vram_bytes / (1024**3), 2)
    except Exception as e:
        info["pytorch_error"] = str(e)

    # Check Ultralytics
    try:
        import ultralytics
        info["ultralytics"] = ultralytics.__version__
    except Exception as e:
        info["ultralytics_error"] = str(e)

    # Check dataset.yaml
    yaml_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../dataset_yolo/dataset.yaml"))
    if os.path.exists(yaml_path):
        with open(yaml_path) as f:
            content = f.read()
            if "nc: 73" in content and "train: images/train" in content:
                info["dataset_yaml_valid"] = True
                info["dataset_yaml_path"] = yaml_path

    print(json.dumps(info, indent=2))

if __name__ == "__main__":
    inspect_environment()
