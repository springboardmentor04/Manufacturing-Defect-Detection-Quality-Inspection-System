"""Focused tests for the authoritative defect-class resolution mechanism.

The mapping source of truth is datasets/yolo_dataset/class_mapping.json.
Mocks are used ONLY here, clearly isolated, to simulate multi-class model
metadata; production code never fabricates detection classes.
"""

import os
import sys

import cv2
import numpy as np

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from ml.inference.class_resolution import (
    CLASS_MAPPING_PATH,
    describe_model_classes,
    load_class_mapping,
    resolve_detection_class,
)
from ml.inference.pipeline import InferencePipeline


# ---------------------------------------------------------------------------
# Authoritative mapping file checks
# ---------------------------------------------------------------------------

def test_class_mapping_file_loads_with_73_entries():
    assert os.path.isfile(CLASS_MAPPING_PATH), f"Missing mapping file: {CLASS_MAPPING_PATH}"
    mapping = load_class_mapping()
    assert len(mapping) == 73


def test_required_defect_type_mappings():
    mapping = load_class_mapping()
    expected = {
        "0": ("bottle_broken_large", "bottle", "broken_large"),
        "3": ("cable_bent_wire", "cable", "bent_wire"),
        "11": ("capsule_crack", "capsule", "crack"),
        "43": ("pill_faulty_imprint", "pill", "faulty_imprint"),
        "60": ("transistor_misplaced", "transistor", "misplaced"),
        "65": ("wood_scratch", "wood", "scratch"),
        "66": ("zipper_broken_teeth", "zipper", "broken_teeth"),
    }
    for class_id, (class_name, category, defect_type) in expected.items():
        entry = mapping[class_id]
        assert entry["class_name"] == class_name, f"class {class_id}: {entry}"
        assert entry["category"] == category, f"class {class_id}: {entry}"
        assert entry["defect_type"] == defect_type, f"class {class_id}: {entry}"


def test_resolve_detection_class_uses_model_metadata_and_mapping():
    # Simulated multi-class model whose names match the dataset mapping.
    model_names = {
        0: "bottle_broken_large",
        3: "cable_bent_wire",
        11: "capsule_crack",
        43: "pill_faulty_imprint",
        60: "transistor_misplaced",
        65: "wood_scratch",
        66: "zipper_broken_teeth",
    }
    cases = {
        0: ("bottle_broken_large", "bottle", "broken_large"),
        3: ("cable_bent_wire", "cable", "bent_wire"),
        11: ("capsule_crack", "capsule", "crack"),
        43: ("pill_faulty_imprint", "pill", "faulty_imprint"),
        60: ("transistor_misplaced", "transistor", "misplaced"),
        65: ("wood_scratch", "wood", "scratch"),
        66: ("zipper_broken_teeth", "zipper", "broken_teeth"),
    }
    for class_id, (class_name, category, defect_type) in cases.items():
        resolved = resolve_detection_class(class_id, model_names)
        assert resolved["mapped"] is True
        assert resolved["class_id"] == class_id
        assert resolved["class_name"] == class_name
        assert resolved["product_category"] == category
        assert resolved["defect_type"] == defect_type


def test_resolve_class_name_for_mvtec_classes():
    from ml.inference.class_resolution import resolve_class_name
    
    bottle_res = resolve_class_name("bottle_broken_large")
    assert bottle_res is not None
    assert bottle_res["class_id"] == 0
    assert bottle_res["category"] == "bottle"
    assert bottle_res["defect_type"] == "broken_large"
    
    transistor_res = resolve_class_name("transistor_misplaced")
    assert transistor_res is not None
    assert transistor_res["class_id"] == 60
    assert transistor_res["category"] == "transistor"
    assert transistor_res["defect_type"] == "misplaced"


def test_generic_single_class_model_is_reported_unmapped_without_fabrication():
    # Honest fallback to model's own class name without fabricating categories
    resolved = resolve_detection_class(0, {0: "defect"}, image_path="datasets/mvtec_raw/bottle/test/broken_large/000.png")
    assert resolved["mapped"] is False
    assert resolved["class_name"] == "defect"
    assert resolved["defect_type"] == "defect"
    assert resolved["suggested_defect_type"] is None
    assert resolved["classification_source"] == "model"


def test_describe_model_classes_reports_mismatch():
    info = describe_model_classes({0: "defect"})
    assert info["model_class_count"] == 1
    assert info["model_class_names"] == ["defect"]
    assert info["mapping_available"] is True
    assert info["mapping_class_count"] == 73


# ---------------------------------------------------------------------------
# Pipeline integration with a mocked multi-class detector (isolated to tests)
# ---------------------------------------------------------------------------

class _FakeTensor(list):
    """Minimal stand-in for a torch tensor row returned by YOLO boxes."""

    def tolist(self):
        return list(self)


class _FakeBox:
    def __init__(self, cls_idx, confidence, bbox):
        self.cls = [cls_idx]
        self.conf = [confidence]
        self.xyxy = [_FakeTensor(bbox)]


class _FakeResult:
    def __init__(self, boxes):
        self.boxes = boxes


class _FakeMultiClassModel:
    """Stands in for ultralytics.YOLO with a configurable detection list."""

    names = {11: "capsule_crack", 60: "transistor_misplaced"}

    def __init__(self, detections=None):
        # Each detection: (class_id, confidence, [x1, y1, x2, y2])
        self.detections = detections if detections is not None else [
            (60, 0.91, [20.0, 20.0, 80.0, 80.0]),
        ]

    def __call__(self, image_path, conf=0.55, verbose=False):
        boxes = [_FakeBox(cls, c, bbox) for cls, c, bbox in self.detections]
        return [_FakeResult(boxes)]


def _make_pipeline_with_fake_model(model):
    pipeline = InferencePipeline.__new__(InferencePipeline)  # skip real YOLO load
    pipeline.model_path = None
    pipeline.confidence_threshold = 0.55
    pipeline.model = model
    pipeline.classifier_model = None
    pipeline.model_error = None
    pipeline.model_status = "AVAILABLE"
    pipeline.model_mode = "production"
    pipeline.model_names = dict(getattr(model, "names", {}))
    from ml.inference.class_resolution import describe_model_classes as describe
    pipeline.class_resolution_info = describe(pipeline.model_names)
    return pipeline


def test_pipeline_maps_detected_class_to_actual_defect_type(tmp_path):
    image_path = tmp_path / "defect.png"
    assert cv2.imwrite(str(image_path), np.full((160, 160, 3), 150, dtype=np.uint8))

    pipeline = _make_pipeline_with_fake_model(_FakeMultiClassModel())
    result = pipeline.inspect_image(str(image_path))

    assert len(result["defects"]) == 1
    defect = result["defects"][0]
    assert defect["type"] == "misplaced"          # actual defect_type
    assert defect["class_id"] == 60
    assert defect["class_name"] == "transistor_misplaced"
    assert defect["product_category"] == "transistor"
    assert defect["class_mapped"] is True
    assert defect["severity_score"] > 0
    assert result["quality_assessment"]["defect_count"] == 1
    assert result["overall_decision"] == result["quality_assessment"]["overall_result"]
    # No mismatch note because every detection mapped successfully.
    assert result["model_message"] is None


def test_pipeline_good_image_has_no_invented_defect(tmp_path):
    image_path = tmp_path / "good.png"
    assert cv2.imwrite(str(image_path), np.full((200, 200, 3), 210, dtype=np.uint8))

    # Detector finds nothing on this image -> zero-defect result must stay PASS.
    pipeline = _make_pipeline_with_fake_model(_FakeMultiClassModel(detections=[]))
    result = pipeline.inspect_image(str(image_path))

    assert result["defects"] == []
    assert result["status"] == "normal"
    assert result["quality_assessment"]["overall_result"] == "PASS"
    assert result["quality_assessment"]["defect_count"] == 0
    assert result["quality_assessment"]["recommended_action"] == "No defects detected. Product is acceptable."