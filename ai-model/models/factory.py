from typing import Optional
from .base_model import BaseAnomalyModel
from .efficientad import EfficientADModel

class ModelFactory:
    @staticmethod
    def create_model(model_name: str, **kwargs) -> BaseAnomalyModel:
        model_name = model_name.lower()
        if model_name == "efficientad":
            backbone = kwargs.get("backbone", "resnet18")
            return EfficientADModel(backbone_name=backbone)
        elif model_name == "patchcore":
            raise NotImplementedError("PatchCore is not yet implemented.")
        elif model_name == "padim":
            raise NotImplementedError("PaDiM is not yet implemented.")
        elif model_name == "fastflow":
            raise NotImplementedError("FastFlow is not yet implemented.")
        else:
            raise ValueError(f"Unknown model name: {model_name}")
