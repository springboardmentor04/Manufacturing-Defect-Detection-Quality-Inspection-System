from dataclasses import dataclass, asdict
from typing import Tuple

@dataclass
class PredictionResult:
    category: str
    prediction: str
    confidence: float
    anomaly_score: float
    processing_time_ms: float
    model_version: str
    device: str
    image_size: Tuple[int, int]
    status: str
    defect_type: str = "None"
    severity: str = "Low"
    
    def to_dict(self):
        return asdict(self)
