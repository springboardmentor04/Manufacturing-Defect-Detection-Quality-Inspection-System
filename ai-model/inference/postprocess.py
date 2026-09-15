import json
from pathlib import Path
from config.config import config
from utils.logger import logger

class PostProcessor:
    _thresholds = None

    @classmethod
    def _load_thresholds(cls):
        thresholds_path = Path(__file__).resolve().parents[1] / "config" / "thresholds.json"
        if thresholds_path.exists():
            try:
                with open(thresholds_path, 'r') as f:
                    cls._thresholds = json.load(f)
            except Exception as e:
                logger.error(f"Failed to load thresholds: {e}")
                cls._thresholds = {}
        else:
            cls._thresholds = {}

    @classmethod
    def process(cls, anomaly_score: float, category: str = None, threshold: float = None) -> tuple:
        """
        Calculates prediction and confidence based on anomaly score.
        Dynamically uses the calibrated min and max thresholds for the given category.
        """
        if threshold is None:
            cls._load_thresholds()
            if category and category in cls._thresholds:
                cat_thresholds = cls._thresholds[category]
                
                # Check if it's the old format (float) or new format (dict)
                if isinstance(cat_thresholds, dict):
                    min_t = cat_thresholds.get("min", 0.0)
                    max_t = cat_thresholds.get("max", getattr(config, 'CONFIDENCE_THRESHOLD', 1.0))
                else:
                    min_t = 0.0
                    max_t = float(cat_thresholds)
            else:
                min_t = 0.0
                max_t = getattr(config, 'CONFIDENCE_THRESHOLD', 1.0)
        else:
            min_t = 0.0
            max_t = threshold
                
        # If score is outside the normal bounds, it's an anomaly!
        if min_t <= anomaly_score <= max_t:
            prediction = "PASS"
            # Normalize confidence based on how close it is to the boundaries
            center = (min_t + max_t) / 2
            distance_from_center = abs(anomaly_score - center)
            max_distance = (max_t - min_t) / 2
            
            if max_distance > 0:
                confidence = max(0, min(100, (1 - (distance_from_center / max_distance)) * 100))
            else:
                confidence = 100
        else:
            prediction = "FAIL"
            if anomaly_score > max_t:
                bound_t = max_t
                max_possible = max_t * 5
                confidence = max(0, min(100, ((anomaly_score - bound_t) / (max_possible - bound_t)) * 100))
            else:
                bound_t = min_t
                min_possible = 0.0
                if bound_t > 0:
                    confidence = max(0, min(100, ((bound_t - anomaly_score) / bound_t) * 100))
                else:
                    confidence = 100
                    
        # Determine Severity
        if prediction == "PASS":
            severity = "None"
        else:
            if anomaly_score <= max_t * 1.5:
                severity = "Low"
            elif anomaly_score <= max_t * 3:
                severity = "Medium"
            else:
                severity = "High"
            
        return prediction, round(confidence, 2), severity
