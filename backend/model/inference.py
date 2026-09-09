import torch
from pathlib import Path
from typing import Tuple, Optional
from model.patchcore import PatchCore
from model.utils import load_tensor, load_json

def run_inference(
    model: PatchCore, 
    image_tensor: torch.Tensor,
    threshold: Optional[float] = None
) -> Tuple[str, float, torch.Tensor]:
    """
    Run inference on a single image tensor.
    
    Args:
        model: Initialized and loaded PatchCore model.
        image_tensor: Tensor of shape (1, C, H, W).
        threshold: Anomaly score threshold for classification. If None, it just returns scores.
        
    Returns:
        prediction: "GOOD" or "DEFECTIVE".
        anomaly_score: Image-level anomaly score.
        anomaly_map: Pixel-level anomaly map.
    """
    # Predict using PatchCore
    anomaly_score, anomaly_map = model.predict(image_tensor)
    
    # Classify based on threshold (default to arbitrary threshold if not provided, usually determined by evaluate.py)
    # The true threshold should be computed based on the validation set or training max score.
    # For now, default to 0.5 if not provided (though Euclidean distances can be > 1)
    if threshold is None:
        threshold = 0.5 # A placeholder threshold
        
    prediction = "DEFECTIVE" if anomaly_score > threshold else "GOOD"
    
    return prediction, anomaly_score, anomaly_map
