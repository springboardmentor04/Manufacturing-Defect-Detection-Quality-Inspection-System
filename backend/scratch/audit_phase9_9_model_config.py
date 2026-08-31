"""
Audit Script for Phase 9.9 — Final Model & Configuration Verification
Inspects the frozen YOLOv8s best.pt checkpoint, calculates SHA256 checksum, extracts full 73-class mapping,
searches project for checkpoint references, queries PostgreSQL ai_models registry, and verifies Severity Engine rules.
"""

import os
import sys
import hashlib
import json
import torch
from datetime import datetime

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
BACKEND_ROOT = os.path.join(PROJECT_ROOT, "backend")
if BACKEND_ROOT not in sys.path:
    sys.path.insert(0, BACKEND_ROOT)

from app.database import SessionLocal
from app.models.ai_models import AIModel
from app.services.severity_engine import evaluate_inspection_severity

def audit_model_config():
    print("=" * 60)
    print("RUNNING PHASE 9.9 FINAL MODEL & CONFIGURATION AUDIT")
    print("=" * 60)

    results = {}
    best_weights_path = os.path.join(PROJECT_ROOT, "runs", "detect", "yolo_phase4_4_architecture", "weights", "best.pt")

    # STEP 1: Final Model Checkpoint Audit
    if os.path.exists(best_weights_path):
        stat_info = os.stat(best_weights_path)
        hasher = hashlib.sha256()
        with open(best_weights_path, "rb") as f:
            while chunk := f.read(8192):
                hasher.update(chunk)
        sha256_checksum = hasher.hexdigest()

        results["checkpoint_verification"] = {
            "path": best_weights_path,
            "exists": True,
            "size_bytes": stat_info.st_size,
            "size_mb": round(stat_info.st_size / (1024 * 1024), 2),
            "modified_time": datetime.fromtimestamp(stat_info.st_mtime).strftime("%Y-%m-%d %H:%M:%S"),
            "sha256_checksum": sha256_checksum
        }
    else:
        results["checkpoint_verification"] = {"path": best_weights_path, "exists": False}

    # STEP 2 & 3: Model Architecture & 73-Class Mapping Extraction
    try:
        from ultralytics import YOLO
        model = YOLO(best_weights_path)
        model_names = model.names
        param_count = sum(p.numel() for p in model.model.parameters())

        results["model_architecture"] = {
            "architecture": "YOLOv8s",
            "total_parameters": param_count,
            "parameter_count_million": round(param_count / 1e6, 2),
            "input_resolution": "320x320",
            "class_count": len(model_names),
            "class_count_matches_73": len(model_names) == 73
        }

        results["class_mapping"] = [
            {"class_id": cid, "class_name": cname}
            for cid, cname in sorted(model_names.items(), key=lambda x: x[0])
        ]
    except Exception as e:
        results["model_architecture"] = {"error": str(e)}
        results["class_mapping"] = []

    # STEP 4: Checkpoint References Search in Codebase
    checkpoint_refs = []
    for root, dirs, files in os.walk(PROJECT_ROOT):
        if any(skip in root for skip in [".git", "node_modules", "venv", "__pycache__", ".gemini"]):
            continue
        for file in files:
            if file.endswith((".py", ".json", ".yaml", ".yml", ".env", ".js", ".jsx")):
                fpath = os.path.join(root, file)
                try:
                    with open(fpath, "r", encoding="utf-8", errors="ignore") as f:
                        content = f.read()
                        if "best.pt" in content or "yolo_phase" in content or "runs/detect" in content:
                            rel_path = os.path.relpath(fpath, PROJECT_ROOT)
                            checkpoint_refs.append(rel_path)
                except Exception:
                    pass

    results["checkpoint_code_references"] = {
        "active_production_weights": "runs/detect/yolo_phase4_4_architecture/weights/best.pt",
        "referenced_files_count": len(checkpoint_refs),
        "referenced_files": checkpoint_refs
    }

    # STEP 9: Severity Engine Inspection
    dummy_pred = [
        {"defect_class": "bottle_broken_large", "confidence": 0.865, "defect_area": 282864, "bounding_box": {"x_min": 309, "y_min": 252, "width": 498, "height": 568}}
    ]
    sev_eval = evaluate_inspection_severity(dummy_pred, "bottle")
    results["severity_engine_verification"] = {
        "engine_module": "backend/app/services/severity_engine.py",
        "severity_levels": ["CRITICAL", "MAJOR", "MINOR", "LOW", "NONE"],
        "dummy_critical_test": {
            "overall_severity": sev_eval.get("overall_severity"),
            "overall_score": sev_eval.get("overall_score"),
            "inspection_status": sev_eval.get("inspection_status")
        }
    }

    # STEP 11: Database Model Registry Check
    db = SessionLocal()
    db_models = db.query(AIModel).all()
    registry_list = []
    for m in db_models:
        registry_list.append({
            "id": str(m.id),
            "model_name": m.model_name,
            "model_version": m.model_version,
            "architecture": m.architecture,
            "map50": float(m.accuracy) if m.accuracy is not None else None,
            "precision": float(m.precision) if m.precision is not None else None,
            "recall": float(m.recall) if m.recall is not None else None,
            "f1_score": float(m.f1_score) if m.f1_score is not None else None,
            "deployment_status": m.deployment_status
        })

    results["database_model_registry"] = registry_list
    db.close()

    print(json.dumps(results, indent=2))
    return results

if __name__ == "__main__":
    audit_model_config()
