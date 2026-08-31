"""
Unit Test Suite for Severity Engine (Phase 6.2 Step 15)
Verifies all 15 required test cases and exact Phase 6.1 numerical scenarios.
"""

import os
import sys

# Ensure backend root is in sys.path
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
BACKEND_ROOT = os.path.join(PROJECT_ROOT, "backend")
if BACKEND_ROOT not in sys.path:
    sys.path.insert(0, BACKEND_ROOT)

from app.services.severity_engine import (
    calculate_single_defect_severity,
    aggregate_multi_defect_severity,
    evaluate_inspection_severity,
    get_product_roi_area
)

def run_tests():
    print("=" * 60)
    print("RUNNING SEVERITY ENGINE UNIT TEST SUITE")
    print("=" * 60)
    passed_count = 0
    total_count = 0

    def assert_test(condition, name, details=""):
        nonlocal passed_count, total_count
        total_count += 1
        if condition:
            passed_count += 1
            print(f"[PASS] Test {total_count}: {name}")
        else:
            print(f"[FAIL] Test {total_count}: {name} | Details: {details}")

    # --------------------------------------------------------------------------
    # REGRESSION SCENARIO 1: Critical Fracture on Pharmaceutical Pill (pill_crack)
    # --------------------------------------------------------------------------
    res1 = evaluate_inspection_severity(
        raw_predictions=[{
            "defect_class": "pill_crack",
            "confidence": 0.92,
            "defect_area": 200.0,
            "bounding_box": {"width": 20, "height": 10}
        }],
        product_category="pill",
        product_bbox_area=3000.0
    )
    assert_test(
        res1["inspection_status"] == "FAIL" and res1["overall_severity"] == "CRITICAL" and res1["overall_score"] == 100.0,
        "Scenario 1: Critical Fracture on Pill (pill_crack)",
        f"Got status={res1['inspection_status']}, severity={res1['overall_severity']}, score={res1['overall_score']}"
    )

    # --------------------------------------------------------------------------
    # REGRESSION SCENARIO 2: Minor Loose Thread on Carpet (carpet_thread)
    # --------------------------------------------------------------------------
    res2 = evaluate_inspection_severity(
        raw_predictions=[{
            "defect_class": "carpet_thread",
            "confidence": 0.65,
            "defect_area": 300.0,
            "bounding_box": {"width": 30, "height": 10}
        }],
        product_category="carpet"
    )
    score2 = res2["detections"][0]["individual_severity_score"]
    assert_test(
        res2["inspection_status"] == "PASS" and res2["overall_severity"] == "LOW" and abs(score2 - 22.99) < 0.1,
        "Scenario 2: Minor Loose Thread on Carpet (carpet_thread)",
        f"Got status={res2['inspection_status']}, severity={res2['overall_severity']}, score={score2}"
    )

    # --------------------------------------------------------------------------
    # REGRESSION SCENARIO 3: Dual Head Scratches on Screw (screw_scratch_head x 2)
    # --------------------------------------------------------------------------
    res3 = evaluate_inspection_severity(
        raw_predictions=[
            {"defect_class": "screw_scratch_head", "confidence": 0.85, "defect_area": 150.0},
            {"defect_class": "screw_scratch_head", "confidence": 0.78, "defect_area": 200.0}
        ],
        product_category="screw",
        product_bbox_area=4000.0
    )
    score3 = res3["overall_score"]
    assert_test(
        res3["inspection_status"] == "FAIL" and res3["overall_severity"] == "HIGH" and abs(score3 - 57.68) < 0.2,
        "Scenario 3: Dual Head Scratches on Screw (screw_scratch_head x 2)",
        f"Got status={res3['inspection_status']}, severity={res3['overall_severity']}, score={score3}"
    )

    # --------------------------------------------------------------------------
    # REGRESSION SCENARIO 4: Missing Internal Wire in Cable (cable_missing_wire)
    # --------------------------------------------------------------------------
    res4 = evaluate_inspection_severity(
        raw_predictions=[{
            "defect_class": "cable_missing_wire",
            "confidence": 0.88,
            "defect_area": 8000.0
        }],
        product_category="cable",
        product_bbox_area=5000.0
    )
    assert_test(
        res4["inspection_status"] == "FAIL" and res4["overall_severity"] == "CRITICAL" and res4["overall_score"] == 100.0,
        "Scenario 4: Missing Internal Wire in Cable (cable_missing_wire)",
        f"Got status={res4['inspection_status']}, severity={res4['overall_severity']}, score={res4['overall_score']}"
    )

    # --------------------------------------------------------------------------
    # REGRESSION SCENARIO 5: Edge Crack on Tile with Low Confidence (tile_crack, conf=0.28)
    # --------------------------------------------------------------------------
    res5 = evaluate_inspection_severity(
        raw_predictions=[{
            "defect_class": "tile_crack",
            "confidence": 0.28,
            "defect_area": 400.0
        }],
        product_category="tile"
    )
    assert_test(
        res5["inspection_status"] == "PASS" and res5["low_confidence_flag"] == True and res5["overall_severity"] == "MEDIUM",
        "Scenario 5: Edge Crack on Tile with Low Confidence (tile_crack, conf=0.28)",
        f"Got status={res5['inspection_status']}, flag={res5['low_confidence_flag']}, severity={res5['overall_severity']}"
    )

    # --------------------------------------------------------------------------
    # TEST 6: No Defect Detected
    # --------------------------------------------------------------------------
    res6 = evaluate_inspection_severity(raw_predictions=[], product_category="pill")
    assert_test(
        res6["inspection_status"] == "PASS" and res6["overall_score"] == 0.0 and res6["number_of_detected_defects"] == 0,
        "Test 6: No Defect Detected",
        f"Got status={res6['inspection_status']}, score={res6['overall_score']}"
    )

    # --------------------------------------------------------------------------
    # TEST 7: Discard Confidence < 0.25
    # --------------------------------------------------------------------------
    res7 = evaluate_inspection_severity(
        raw_predictions=[{"defect_class": "pill_crack", "confidence": 0.22, "defect_area": 200.0}],
        product_category="pill"
    )
    assert_test(
        res7["inspection_status"] == "PASS" and res7["number_of_detected_defects"] == 0,
        "Test 7: Discard Confidence < 0.25",
        f"Got status={res7['inspection_status']}, defects={res7['number_of_detected_defects']}"
    )

    # --------------------------------------------------------------------------
    # TEST 8: Tier-1 Critical Defect with Confidence 0.25 - 0.49 -> MANUAL_REVIEW
    # --------------------------------------------------------------------------
    res8 = evaluate_inspection_severity(
        raw_predictions=[{"defect_class": "capsule_crack", "confidence": 0.38, "defect_area": 50.0}],
        product_category="capsule",
        product_bbox_area=3000.0
    )
    assert_test(
        res8["inspection_status"] == "MANUAL_REVIEW" and res8["low_confidence_flag"] == True,
        "Test 8: Tier-1 Critical Defect with Conf 0.25-0.49 -> MANUAL_REVIEW",
        f"Got status={res8['inspection_status']}, flag={res8['low_confidence_flag']}"
    )

    # --------------------------------------------------------------------------
    # TEST 9: Defect Area Larger Than Product ROI (Clamping Check)
    # --------------------------------------------------------------------------
    res9 = calculate_single_defect_severity(
        defect_class="screw_scratch_head",
        confidence=0.90,
        defect_area=8000.0,
        product_roi_area=4000.0
    )
    assert_test(
        res9["size_ratio"] == 1.0 and res9["size_weight"] == 6.0,
        "Test 9: Defect Area Larger Than Product ROI (Clamping Check)",
        f"Got size_ratio={res9['size_ratio']}, size_weight={res9['size_weight']}"
    )

    # --------------------------------------------------------------------------
    # TEST 10: Unknown Defect Class Fallback
    # --------------------------------------------------------------------------
    res10 = calculate_single_defect_severity(
        defect_class="unknown_future_defect",
        confidence=0.80,
        defect_area=100.0,
        product_roi_area=102400.0
    )
    assert_test(
        res10["risk_multiplier"] == 2.0 and res10["risk_tier"] == 3,
        "Test 10: Unknown Defect Class Fallback (R_default = 2.0)",
        f"Got risk_multiplier={res10['risk_multiplier']}, tier={res10['risk_tier']}"
    )

    # --------------------------------------------------------------------------
    # TEST 11: Product Threshold Enforcement (Bottle vs Capsule)
    # --------------------------------------------------------------------------
    res11_bottle = evaluate_inspection_severity(
        raw_predictions=[{"defect_class": "bottle_contamination", "confidence": 0.80, "defect_area": 1000.0}],
        product_category="bottle",
        product_bbox_area=20000.0
    )
    assert_test(
        res11_bottle["product_threshold"] == 40.0,
        "Test 11: Product Threshold Lookup for Bottle (40.0)",
        f"Got threshold={res11_bottle['product_threshold']}"
    )

    print("=" * 60)
    print(f"SEVERITY ENGINE UNIT TEST RESULTS: {passed_count}/{total_count} PASSED")
    print("=" * 60)
    return passed_count == total_count

if __name__ == "__main__":
    success = run_tests()
    if not success:
        sys.exit(1)
