"""
VisionInspect AI - Severity Scoring Engine
Computes standardized defect severity scores using the weighted formula:
Severity = (Size * 30%) + (Location * 25%) + (DefectType * 25%) + (Confidence * 20%)
"""

DEFECT_TYPE_WEIGHTS = {
    "Surface Scratch": 35.0,
    "Cosmetic Spot": 30.0,
    "Discoloration": 40.0,
    "Solder Bridge": 65.0,
    "Insulation Cut": 75.0,
    "Surface Crack": 90.0,
    "Structural Hole": 95.0,
    "Missing Component": 95.0
}

class SeverityCalculator:
    @staticmethod
    def classify_severity_level(score: float) -> str:
        if score < 40.0:
            return "Low"
        elif score < 60.0:
            return "Medium"
        elif score < 80.0:
            return "High"
        else:
            return "Critical"

    @staticmethod
    def evaluate_pass_fail(score: float, max_allowable_threshold: float = 40.0) -> str:
        return "PASS" if score < max_allowable_threshold else "FAIL"

    def calculate_defect_severity(
        self,
        size_score: float,
        location_score: float,
        defect_type: str,
        confidence: float
    ) -> dict:
        """
        Calculates exact multi-factor defect severity score.
        """
        defect_type_score = DEFECT_TYPE_WEIGHTS.get(defect_type, 50.0)
        
        # Standardized Formula
        severity_score = (
            (size_score * 0.30) +
            (location_score * 0.25) +
            (defect_type_score * 0.25) +
            (confidence * 0.20)
        )
        
        severity_score = round(min(max(severity_score, 0.0), 100.0), 2)
        level = self.classify_severity_level(severity_score)
        pass_fail = self.evaluate_pass_fail(severity_score)

        return {
            "size_score": size_score,
            "location_score": location_score,
            "defect_type_score": defect_type_score,
            "confidence": confidence,
            "severity_score": severity_score,
            "severity_level": level,
            "pass_fail": pass_fail,
            "formula_breakdown": {
                "size_contribution": round(size_score * 0.30, 2),
                "location_contribution": round(location_score * 0.25, 2),
                "type_contribution": round(defect_type_score * 0.25, 2),
                "confidence_contribution": round(confidence * 0.20, 2)
            }
        }
