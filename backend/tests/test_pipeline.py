"""
Unit tests for VisionInspect AI image processing, defect detection, and severity assessment.
"""
import unittest
import numpy as np
import tempfile
import cv2
import os

from app.services.severity_assessment import (
    calculate_severity,
    calculate_size_score,
    calculate_location_score,
    calculate_defect_type_score,
    calculate_confidence_score_pct,
    derive_severity_level,
)
from app.services.image_processing import preprocess_image, analyze_quality
from app.services.defect_detection import predict_defect, _classify_defect_type


class TestSeverityAssessment(unittest.TestCase):
    def test_calculate_size_score(self):
        # Pass -> 0.0
        self.assertEqual(calculate_size_score("pass", 0.05), 0.0)
        # Fail with 0.2% anomaly ratio -> low size score
        score_small = calculate_size_score("fail", 0.002)
        self.assertTrue(10.0 <= score_small <= 30.0)
        # Fail with 2.5% anomaly ratio -> max size score (100.0)
        score_large = calculate_size_score("fail", 0.025)
        self.assertEqual(score_large, 100.0)

    def test_calculate_location_score(self):
        # Pass -> 0.0
        self.assertEqual(calculate_location_score("pass", [{"x": 100, "y": 100, "w": 20, "h": 20}]), 0.0)
        # Center defect (x=128, y=128) -> high location score (~95-100)
        center_boxes = [{"x": 118, "y": 118, "w": 20, "h": 20}]
        score_center = calculate_location_score("fail", center_boxes, 256, 256)
        self.assertTrue(score_center >= 90.0)
        # Edge defect (x=5, y=5) -> lower location score (~35-50)
        edge_boxes = [{"x": 2, "y": 2, "w": 10, "h": 10}]
        score_edge = calculate_location_score("fail", edge_boxes, 256, 256)
        self.assertTrue(score_edge < score_center)

    def test_calculate_defect_type_score(self):
        self.assertEqual(calculate_defect_type_score("pass", "scratch"), 0.0)
        self.assertEqual(calculate_defect_type_score("fail", "scratch"), 35.0)
        self.assertEqual(calculate_defect_type_score("fail", "contamination"), 65.0)
        self.assertEqual(calculate_defect_type_score("fail", "crack"), 90.0)
        self.assertEqual(calculate_defect_type_score("fail", "broken_large"), 98.0)

    def test_derive_severity_level(self):
        # Low severity
        level, action = derive_severity_level(30.0, "fail")
        self.assertEqual(level, "Low")
        # Medium severity
        level, action = derive_severity_level(50.0, "fail")
        self.assertEqual(level, "Medium")
        # High severity
        level, action = derive_severity_level(70.0, "fail")
        self.assertEqual(level, "High")
        # Critical severity
        level, action = derive_severity_level(90.0, "fail")
        self.assertEqual(level, "Critical")
        self.assertIn("Reject Product", action)

    def test_overall_severity_formula_example(self):
        """
        Tests example from spec:
            Type: Surface Crack (95)
            Size Score: 85
            Location Score: 90
            Defect Type Score: 95
            Confidence Score: 92
            Expected Overall Severity: ~90.2 (Critical)
        """
        assessment = calculate_severity(
            status="fail",
            anomaly_ratio=0.017,  # yields size score ~85
            bounding_boxes=[{"x": 120, "y": 120, "w": 30, "h": 30}],  # center location score ~90
            defect_type="surface_crack",  # score 95
            confidence_score=0.92,  # score 92%
            image_width=256,
            image_height=256,
        )

        self.assertEqual(assessment["severity_level"], "Critical")
        self.assertTrue(80.0 <= assessment["severity_score"] <= 100.0)
        self.assertIn("severity_details", assessment)
        self.assertIn("quality_recommendation", assessment)


class TestImageProcessingPipeline(unittest.TestCase):
    def setUp(self):
        # Create temporary synthetic test image
        self.tmp_dir = tempfile.mkdtemp()
        self.img_path = os.path.join(self.tmp_dir, "test_item.png")
        img = np.ones((256, 256, 3), dtype=np.uint8) * 180
        # Draw synthetic defect scratch
        cv2.line(img, (50, 50), (200, 200), (20, 20, 20), 4)
        cv2.imwrite(self.img_path, img)

    def tearDown(self):
        if os.path.exists(self.img_path):
            os.remove(self.img_path)
        os.rmdir(self.tmp_dir)

    def test_quality_analysis(self):
        report = analyze_quality(self.img_path)
        self.assertEqual(report["width"], 256)
        self.assertEqual(report["height"], 256)
        self.assertTrue(report["sharpness_score"] > 0)
        self.assertIn("quality_score", report)

    def test_predict_defect_fallback(self):
        prediction = predict_defect(self.img_path, "Test Product")
        self.assertIn(prediction["status"], ["pass", "fail"])
        self.assertIn("confidence_score", prediction)
        self.assertIn("severity_score", prediction)
        self.assertIn("severity_level", prediction)


if __name__ == "__main__":
    unittest.main()
