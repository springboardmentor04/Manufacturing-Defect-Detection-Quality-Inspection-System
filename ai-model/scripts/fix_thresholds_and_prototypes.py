import os
import sys
from pathlib import Path
import subprocess

base_dir = Path(__file__).resolve().parent.parent
sys.path.append(str(base_dir))

print("Starting strict recalibration and prototype generation...")

print("Step 1/2: Generating new Defect Error Profiles...")
subprocess.run(["python", str(base_dir / "scripts" / "generate_defect_prototypes.py")], check=True)

print("Step 2/2: Recalibrating Thresholds for 99% strict recall...")
subprocess.run(["python", str(base_dir / "scripts" / "calibrate_thresholds.py")], check=True)

print("DONE.")
