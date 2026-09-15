from pathlib import Path
from typing import Dict, Any, Optional
import json

from config.config import config

class ModelRegistry:
    """Registry to manage available AI models and their metadata."""
    def __init__(self):
        self.weights_dir = getattr(config, 'WEIGHTS_PATH', Path("weights"))
        self.registry: Dict[str, Any] = {}
        self._load_registry()
        
    def _load_registry(self):
        metadata_path = self.weights_dir / "model_metadata.json"
        if metadata_path.exists():
            with open(metadata_path, 'r') as f:
                self.registry["production_model"] = json.load(f)
                
    def get_model_metadata(self, model_name: str = "production_model") -> Optional[Dict[str, Any]]:
        return self.registry.get(model_name)
        
    def get_production_model_path(self) -> Path:
        return self.weights_dir / getattr(config, 'DEFAULT_MODEL', 'production_model.pth')
