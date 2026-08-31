import os
import sys
import platform
import json
import psutil

def inspect_hardware():
    mem = psutil.virtual_memory()
    info = {
        "python_version": sys.version,
        "platform": platform.platform(),
        "processor": platform.processor(),
        "ram_total_gb": round(mem.total / (1024**3), 2),
        "ram_available_gb": round(mem.available / (1024**3), 2),
        "pytorch": None,
        "cuda_available": False,
        "cuda_version": None,
        "ultralytics": None
    }

    try:
        import torch
        info["pytorch"] = torch.__version__
        info["cuda_available"] = torch.cuda.is_available()
        if info["cuda_available"]:
            info["cuda_version"] = torch.version.cuda
    except Exception as e:
        info["pytorch_error"] = str(e)

    try:
        import ultralytics
        info["ultralytics"] = ultralytics.__version__
    except Exception as e:
        info["ultralytics_error"] = str(e)

    print(json.dumps(info, indent=2))

if __name__ == "__main__":
    inspect_hardware()
