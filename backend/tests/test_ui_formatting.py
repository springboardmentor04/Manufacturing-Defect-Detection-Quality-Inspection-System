import json
import os
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from ml.quality.assessment_engine import category_label, format_defect_name, type_score


def test_all_73_dataset_classes_are_formatted_cleanly():
    mapping_path = os.path.join(os.path.dirname(__file__), "../../datasets/yolo_dataset/class_mapping.json")
    with open(mapping_path, "r", encoding="utf-8") as f:
        mapping = json.load(f)

    assert len(mapping) == 73

    for class_id, entry in mapping.items():
        defect_type = entry["defect_type"]
        category = entry["category"]
        class_name = entry["class_name"]

        # Ensure raw values exist
        assert defect_type and category and class_name

        # Ensure category_label formats it cleanly into title case
        formatted = category_label(defect_type, category)
        assert formatted
        assert "_" not in formatted, f"Formatted name should not contain underscores: {formatted}"
        assert formatted[0].isupper(), f"Formatted name should be capitalized: {formatted}"

        # Ensure severity type_score calculates deterministically
        score = type_score(defect_type)
        assert 0.0 <= score <= 100.0


def test_known_mvtec_defect_types():
    assert category_label("broken_large") == "Broken Large"
    assert category_label("broken_small") == "Broken Small"
    assert category_label("contamination") == "Contamination"
    assert category_label("crack") == "Crack"
    assert category_label("scratch") == "Scratch"
    assert category_label("hole") == "Hole"
    assert category_label("bent_wire") == "Bent Wire"
    assert category_label("missing_cable") == "Missing Cable"
    assert category_label("cut_inner_insulation") == "Cut Inner Insulation"
    assert format_defect_name("bottle_broken_large", "bottle") == "Broken Large"


