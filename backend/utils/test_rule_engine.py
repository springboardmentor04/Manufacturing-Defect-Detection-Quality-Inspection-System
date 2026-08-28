import json
import sys
from pathlib import Path

# Ensure project root and backend are on sys.path for imports
root = Path(__file__).resolve().parents[2]
backend_dir = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(root))
sys.path.insert(0, str(backend_dir))

from services import rule_engine

path = 'backend/uploads/3b4229cc-bb68-4d01-8e53-37f1ef80d90d.webp'

with open(path, 'rb') as f:
    b = f.read()

res = rule_engine.detect_defects(b)

print(json.dumps(res, indent=2))
