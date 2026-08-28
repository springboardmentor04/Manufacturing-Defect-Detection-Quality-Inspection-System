import time

class SeverityEngine:
    def __init__(self, size_weight=0.30, loc_weight=0.25, type_weight=0.25, conf_weight=0.20):
        self.w_size = size_weight
        self.w_loc = loc_weight
        self.w_type = type_weight
        self.w_conf = conf_weight
        
    def calculate_severity(self, size_score, loc_score, type_score, conf_score):
        # All inputs should be 0-100
        severity = (size_score * self.w_size) + \
                   (loc_score * self.w_loc) + \
                   (type_score * self.w_type) + \
                   (conf_score * self.w_conf)
                   
        level = "LOW"
        if severity >= 80:
            level = "CRITICAL"
        elif severity >= 60:
            level = "HIGH"
        elif severity >= 40:
            level = "MEDIUM"
            
        return severity, level

def get_location_score(defect_bbox, image_dims):
    # Dummy logic: center of image is 90, edge is 40
    return 90.0

def get_type_score(defect_type):
    mapping = {
        "scratch": 60,
        "crack": 95,
        "hole": 90,
        "contamination": 50,
        "missing_component": 100
    }
    return mapping.get(defect_type, 50)
    
def get_decision(level, confidence=None):
    if level and str(level).strip().upper() not in {"NONE", "PASS"}:
        return "FAIL"
    return "PASS"
