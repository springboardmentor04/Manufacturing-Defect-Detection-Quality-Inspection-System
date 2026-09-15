import torch
import os
from pathlib import Path
from typing import Optional
from collections import OrderedDict

from config.config import config
from models.factory import ModelFactory
from model_registry import ModelRegistry

class ModelLoader:
    """Singleton model loader for production inference with LRU Cache for per-category models."""
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(ModelLoader, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance
        
    def __init__(self):
        if self._initialized:
            return
            
        self.registry = ModelRegistry()
        self.cache = OrderedDict()
        self.max_cache_size = 3  # Cache up to 3 models in VRAM to prevent OOM
        self.device = torch.device(getattr(config, 'INFERENCE_DEVICE', "cpu"))
        self._initialized = True
        
    def get_model_path(self, category: str = None) -> Path:
        weights_dir = getattr(config, 'WEIGHTS_PATH', Path("weights"))
        if category:
            model_name = getattr(config, 'MULTI_MODEL_FORMAT', "model_{category}.pth").format(category=category)
            model_path = weights_dir / model_name
            if model_path.exists():
                return model_path
        
        # Fallback to production_model.pth if per-category doesn't exist
        return self.registry.get_production_model_path()
        
    def load_model(self, category: str = None) -> torch.nn.Module:
        """Loads and caches the model for the given category."""
        cache_key = category if category else "default"
        
        # Check LRU cache
        if cache_key in self.cache:
            self.cache.move_to_end(cache_key)
            return self.cache[cache_key]
            
        model_path = self.get_model_path(category)
        if not model_path.exists():
            raise FileNotFoundError(f"Model not found at {model_path}")
            
        if os.path.getsize(model_path) < 1000:
            raise ValueError(f"Model file {model_path} appears corrupted (too small)")
            
        # Extract backbone from metadata
        metadata_key = f"model_{category}" if category else "production_model"
        metadata = self.registry.get_model_metadata(metadata_key)
        # Fallback to production metadata if category metadata doesn't exist
        if not metadata:
            metadata = self.registry.get_model_metadata("production_model")
            
        backbone = metadata.get("Backbone", "resnet18").lower() if metadata else "resnet18"
        
        model = ModelFactory.create_model(config.MODEL_NAME, backbone=backbone).to(self.device)
        model.initialize()
        
        checkpoint = torch.load(model_path, map_location=self.device, weights_only=False)
        state_dict = checkpoint.get("state_dict", checkpoint)
        model.load_state_dict(state_dict, strict=False)
        
        model.eval()
        
        # Add to cache and evict if full
        self.cache[cache_key] = model
        if len(self.cache) > self.max_cache_size:
            self.cache.popitem(last=False)
            
        # Optional: Empty cuda cache to free memory from evicted model
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
            
        return model
