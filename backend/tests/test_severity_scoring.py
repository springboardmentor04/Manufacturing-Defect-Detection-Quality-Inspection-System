# test_severity_scoring.py
import sys
from pathlib import Path
import os

# Add backend directory to sys.path to resolve imports
backend_dir = Path(__file__).resolve().parents[1]
sys.path.append(str(backend_dir))

from app.services.severity_scorer import calculate_severity, get_severity_level, get_quality_risk_action

def test_pdf_example_severity():
    # Size = 85
    # Location = 90
    # Defect Type = 95
    # Confidence = 92
    
    # We will pass these directly to the weighted calculation formula to verify the exact PDF logic
    size_score = 85.0
    location_score = 90.0
    defect_type_score = 95.0
    confidence_score = 92.0
    
    final_score = (
        size_score * 0.30 +
        location_score * 0.25 +
        defect_type_score * 0.25 +
        confidence_score * 0.20
    )
    
    # Check the final score matches the PDF example (88)
    # The actual calculation:
    # 85 * 0.30 = 25.50
    # 90 * 0.25 = 22.50
    # 95 * 0.25 = 23.75
    # 92 * 0.20 = 18.40
    # Sum: 25.50 + 22.50 + 23.75 + 18.40 = 90.15
    # Wait, the PDF says the expected severity score is 88. Let me check the math.
    # Ah, the user request says: "The PDF's 88 example is based on its stated example; the software must mathematically calculate whatever values are actually supplied. IMPORTANT: Use the actual calculation result. Do not force it to 88."
    assert round(final_score, 2) == 90.15

    severity_level = get_severity_level(final_score)
    assert severity_level == "CRITICAL"
    
    risk_action = get_quality_risk_action(severity_level, confidence_score)
    assert risk_action["recommended_action"] == "Reject Product and Trigger Quality Inspection Workflow"

def test_low_confidence_detection():
    # If confidence is < 70%, it should require manual review
    severity_level = "CRITICAL"
    confidence_score = 65.0
    risk_action = get_quality_risk_action(severity_level, confidence_score)
    
    assert "Manual Review Recommended" in risk_action["quality_risk"]
    assert "Manual inspection required" in risk_action["recommended_action"]

def test_boundary_values():
    assert get_severity_level(39.99) == "LOW"
    assert get_severity_level(40.0) == "MEDIUM"
    assert get_severity_level(59.99) == "MEDIUM"
    assert get_severity_level(60.0) == "HIGH"
    assert get_severity_level(79.99) == "HIGH"
    assert get_severity_level(80.0) == "CRITICAL"

def test_confidence_normalization():
    # Test confidence <= 1.0
    det = {"confidence": 0.8414, "defect_type": "scratch"}
    res = calculate_severity(det)
    assert res["confidence_score"] == 84.14
    
    # Test confidence already percentage
    det = {"confidence": 95.0, "defect_type": "scratch"}
    res = calculate_severity(det)
    assert res["confidence_score"] == 95.0
    
    # Test cap at 100
    det = {"confidence": 105.0, "defect_type": "scratch"}
    res = calculate_severity(det)
    assert res["confidence_score"] == 100.0

def test_extreme_scores():
    # All scores 0
    det = {"confidence": 0.0, "defect_category": "Color / Appearance Defect", "bounding_box": [0,0,0,0], "segmentation_mask": []}
    # Mock get_defect_type_score to return 0 for test
    import app.services.severity_scorer as ss
    old_mapping = ss.DEFECT_TYPE_SCORE_MAPPING.copy()
    ss.DEFECT_TYPE_SCORE_MAPPING["Color / Appearance Defect"] = 0
    res = calculate_severity(det)
    assert res["final_score"] == 0.0
    assert get_severity_level(res["final_score"]) == "LOW"
    
    # All scores 100
    det = {"confidence": 1.0, "defect_category": "Structural Defect", "bounding_box": [0,0,1,1]}
    ss.DEFECT_TYPE_SCORE_MAPPING["Structural Defect"] = 100
    res = calculate_severity(det)
    assert res["final_score"] == 100.0
    assert get_severity_level(res["final_score"]) == "CRITICAL"
    
    # Restore mapping
    ss.DEFECT_TYPE_SCORE_MAPPING = old_mapping

def test_never_exceed_100():
    det = {"confidence": 1.5, "defect_category": "Structural Defect", "bounding_box": [-1,-1,2,2]}
    res = calculate_severity(det)
    assert res["final_score"] <= 100.0

def test_weight_validation():
    # Helper to test weights directly. Note: calculate_severity uses logic to derive size and location.
    # We will test the weights by bypassing the extraction and calling the math directly,
    # OR by mocking the extraction. Let's mock the extraction for a pure unit test.
    import app.services.severity_scorer as ss
    
    def calc_with_mocks(size, loc, typ, conf):
        old_type = ss.get_defect_type_score
        old_size = ss.calculate_size_score
        old_loc = ss.calculate_location_score
        
        ss.get_defect_type_score = lambda x: typ
        ss.calculate_size_score = lambda b, m: size
        ss.calculate_location_score = lambda b, m: loc
        
        det = {"confidence": conf, "defect_type": "mock"}
        res = ss.calculate_severity(det)
        
        ss.get_defect_type_score = old_type
        ss.calculate_size_score = old_size
        ss.calculate_location_score = old_loc
        return res

    # Size=100 -> 30
    res = calc_with_mocks(100.0, 0.0, 0.0, 0.0)
    assert res["final_score"] == 30.0
    
    # Location=100 -> 25
    res = calc_with_mocks(0.0, 100.0, 0.0, 0.0)
    assert res["final_score"] == 25.0
    
    # Type=100 -> 25
    res = calc_with_mocks(0.0, 0.0, 100.0, 0.0)
    assert res["final_score"] == 25.0
    
    # Conf=100 -> 20
    res = calc_with_mocks(0.0, 0.0, 0.0, 1.0) # conf passed as 1.0 translates to 100
    assert res["final_score"] == 20.0
    
    # All 100 -> 100
    res = calc_with_mocks(100.0, 100.0, 100.0, 1.0)
    assert res["final_score"] == 100.0
    
    # All 0 -> 0
    res = calc_with_mocks(0.0, 0.0, 0.0, 0.0)
    assert res["final_score"] == 0.0

def test_confidence_normalization_extended():
    import app.services.severity_scorer as ss
    def get_conf(raw):
        res = ss.calculate_severity({"confidence": raw, "defect_type": "mock"})
        return res["confidence_score"]
        
    assert get_conf(0.00) == 0.0
    assert get_conf(0.50) == 50.0
    assert get_conf(0.8414) == 84.14
    assert get_conf(0.9916) == 99.16
    assert get_conf(1.00) == 100.0

if __name__ == "__main__":
    test_pdf_example_severity()
    test_low_confidence_detection()
    test_boundary_values()
    test_confidence_normalization()
    test_extreme_scores()
    test_never_exceed_100()
    test_weight_validation()
    test_confidence_normalization_extended()
    print("All tests passed!")
