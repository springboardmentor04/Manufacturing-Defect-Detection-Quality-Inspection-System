import os
import sys
import json

DATASET_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../dataset"))

def audit_dataset():
    if not os.path.exists(DATASET_DIR):
        print(f"ERROR: Dataset path does not exist: {DATASET_DIR}")
        return

    categories = sorted([d for d in os.listdir(DATASET_DIR) if os.path.isdir(os.path.join(DATASET_DIR, d))])

    report = {
        "dataset_path": DATASET_DIR,
        "total_categories": len(categories),
        "categories": {}
    }

    grand_total_train_good = 0
    grand_total_test_good = 0
    grand_total_test_defective = 0
    grand_total_test_images = 0
    grand_total_masks = 0
    grand_total_images = 0
    pairing_issues = []

    for cat in categories:
        cat_dir = os.path.join(DATASET_DIR, cat)
        train_good_dir = os.path.join(cat_dir, "train", "good")
        test_dir = os.path.join(cat_dir, "test")
        gt_dir = os.path.join(cat_dir, "ground_truth")

        cat_summary = {
            "name": cat,
            "train_good": 0,
            "test_good": 0,
            "test_defective": 0,
            "test_total": 0,
            "defect_types": {},
            "masks_total": 0,
            "total_images": 0,
            "pairing_mismatches": 0
        }

        # 1. Train Good
        if os.path.exists(train_good_dir):
            train_files = [f for f in os.listdir(train_good_dir) if not f.startswith(".") and f.lower().endswith(('.png', '.jpg', '.jpeg', '.bmp'))]
            cat_summary["train_good"] = len(train_files)

        # 2. Test Images
        if os.path.exists(test_dir):
            test_subdirs = sorted([d for d in os.listdir(test_dir) if os.path.isdir(os.path.join(test_dir, d))])
            for sub in test_subdirs:
                sub_path = os.path.join(test_dir, sub)
                test_files = [f for f in os.listdir(sub_path) if not f.startswith(".") and f.lower().endswith(('.png', '.jpg', '.jpeg', '.bmp'))]
                
                if sub == "good":
                    cat_summary["test_good"] = len(test_files)
                else:
                    cat_summary["defect_types"][sub] = {
                        "test_images": len(test_files),
                        "gt_masks": 0,
                        "matched": 0,
                        "missing_mask": []
                    }
                    cat_summary["test_defective"] += len(test_files)

        cat_summary["test_total"] = cat_summary["test_good"] + cat_summary["test_defective"]

        # 3. Ground Truth Masks
        if os.path.exists(gt_dir):
            for def_type, def_data in cat_summary["defect_types"].items():
                def_gt_dir = os.path.join(gt_dir, def_type)
                if os.path.exists(def_gt_dir):
                    gt_files = [f for f in os.listdir(def_gt_dir) if not f.startswith(".") and f.lower().endswith(('.png', '.jpg', '.jpeg', '.bmp'))]
                    def_data["gt_masks"] = len(gt_files)
                    cat_summary["masks_total"] += len(gt_files)

                    # Check 1-to-1 matching
                    test_files = [f for f in os.listdir(os.path.join(test_dir, def_type)) if not f.startswith(".") and f.lower().endswith(('.png', '.jpg', '.jpeg', '.bmp'))]
                    for tf in test_files:
                        tf_stem = os.path.splitext(tf)[0]
                        possible_mask_names = [f"{tf_stem}_mask.png", f"{tf_stem}_mask.PNG", f"{tf_stem}.png", f"{tf_stem}.PNG"]
                        found = any(os.path.exists(os.path.join(def_gt_dir, pmn)) for pmn in possible_mask_names)
                        if found:
                            def_data["matched"] += 1
                        else:
                            def_data["missing_mask"].append(tf)
                            cat_summary["pairing_mismatches"] += 1
                            pairing_issues.append(f"[{cat}/{def_type}] Missing mask for image {tf}")
                else:
                    pairing_issues.append(f"[{cat}] Missing ground_truth directory for defect type {def_type}")

        cat_summary["total_images"] = cat_summary["train_good"] + cat_summary["test_total"]

        grand_total_train_good += cat_summary["train_good"]
        grand_total_test_good += cat_summary["test_good"]
        grand_total_test_defective += cat_summary["test_defective"]
        grand_total_test_images += cat_summary["test_total"]
        grand_total_masks += cat_summary["masks_total"]
        grand_total_images += cat_summary["total_images"]

        report["categories"][cat] = cat_summary

    report["totals"] = {
        "train_good": grand_total_train_good,
        "test_good": grand_total_test_good,
        "test_defective": grand_total_test_defective,
        "test_total": grand_total_test_images,
        "masks_total": grand_total_masks,
        "grand_total_images": grand_total_images,
        "pairing_issues_count": len(pairing_issues)
    }
    report["pairing_issues"] = pairing_issues

    out_file = os.path.join(os.path.dirname(__file__), "mvtec_audit_result.json")
    with open(out_file, "w") as f:
        json.dump(report, f, indent=2)

    print("\n--- FAST AUDIT COMPLETE ---")
    print(f"Categories: {len(categories)}")
    print(f"Train Good: {grand_total_train_good}")
    print(f"Test Good: {grand_total_test_good}")
    print(f"Test Defective: {grand_total_test_defective}")
    print(f"Test Total: {grand_total_test_images}")
    print(f"Ground Truth Masks: {grand_total_masks}")
    print(f"Grand Total Images: {grand_total_images}")
    print(f"Pairing Mismatches: {len(pairing_issues)}")

if __name__ == "__main__":
    audit_dataset()
