"""
check_available_defect_data.py

Counts how many raw MVTec defect images exist per unified label
(crack, scratch, cut, etc.) across ALL 15 categories, so we know
whether more data is available than what got used in
classifier_dataset already.

Run inside ml-training venv:

    python check_available_defect_data.py
"""

from pathlib import Path
from collections import defaultdict

SOURCE_DIR = Path(
    r"C:\Users\veene.LAPTOP-VQNJ8SHT\Downloads\mvtec_anomaly_detection"
)

# Same mapping used in build_defect_classifier_dataset.py
DEFECT_LABEL_MAP = {
    "crack": "crack",
    "broken_large": "broken", "broken_small": "broken", "broken": "broken",
    "broken_teeth": "broken", "damaged_case": "broken",
    "scratch": "scratch", "scratch_head": "scratch", "scratch_neck": "scratch",
    "contamination": "contamination", "metal_contamination": "contamination",
    "oil": "contamination", "liquid": "contamination", "gray_stroke": "contamination",
    "hole": "hole", "poke": "hole", "poke_insulation": "hole",
    "missing_cable": "missing_component", "missing_wire": "missing_component",
    "bent": "deformation", "bent_wire": "deformation", "bent_lead": "deformation",
    "flip": "deformation", "fold": "deformation", "misplaced": "deformation",
    "squeeze": "deformation", "squeezed_teeth": "deformation",
    "manipulated_front": "deformation", "cut_lead": "deformation",
    "cable_swap": "deformation",
    "color": "discoloration", "faulty_imprint": "discoloration", "print": "discoloration",
    "cut": "cut", "cut_inner_insulation": "cut", "cut_outer_insulation": "cut",
    "split_teeth": "cut", "fabric_border": "cut", "fabric_interior": "cut",
    "glue": "foreign_material", "glue_strip": "foreign_material",
    "thread": "foreign_material", "thread_side": "foreign_material",
    "thread_top": "foreign_material",
    "combined": "other", "rough": "other", "pill_type": "other", "defective": "other",
}


def unify_label(raw_name: str) -> str:
    return DEFECT_LABEL_MAP.get(raw_name, raw_name)


def main():

    categories = sorted([p for p in SOURCE_DIR.iterdir() if p.is_dir()])

    by_unified_label = defaultdict(int)
    by_raw_label = defaultdict(int)
    by_label_per_category = defaultdict(lambda: defaultdict(int))

    for category_dir in categories:
        test_dir = category_dir / "test"

        if not test_dir.exists():
            continue

        defect_dirs = [
            d for d in test_dir.iterdir()
            if d.is_dir() and d.name != "good"
        ]

        for defect_dir in defect_dirs:
            raw_label = defect_dir.name
            unified_label = unify_label(raw_label)

            count = len(list(defect_dir.glob("*.png")))

            by_unified_label[unified_label] += count
            by_raw_label[raw_label] += count
            by_label_per_category[unified_label][category_dir.name] += count

    print("Total available images per UNIFIED label (all 15 categories):")
    print(f"{'Label':20s} {'Count':>8s}")
    print("-" * 30)
    for label, count in sorted(by_unified_label.items(), key=lambda x: -x[1]):
        print(f"{label:20s} {count:>8d}")

    print("\n\nBreakdown for 'crack' by category:")
    for cat, count in sorted(by_label_per_category["crack"].items(), key=lambda x: -x[1]):
        print(f"  {cat:20s} {count}")

    print("\nBreakdown for 'cut' by category:")
    for cat, count in sorted(by_label_per_category["cut"].items(), key=lambda x: -x[1]):
        print(f"  {cat:20s} {count}")


if __name__ == "__main__":
    main()