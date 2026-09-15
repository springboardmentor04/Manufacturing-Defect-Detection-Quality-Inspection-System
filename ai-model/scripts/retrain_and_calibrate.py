import os
import sys
from pathlib import Path
import subprocess

base_dir = Path(__file__).resolve().parent.parent
sys.path.append(str(base_dir))

from scripts.train_all import train_all

print("Starting full retraining pipeline...")
train_all()
print("Starting calibration...")
subprocess.run(["python", str(base_dir / "scripts" / "calibrate_thresholds.py")], check=True)
print("DONE.")
