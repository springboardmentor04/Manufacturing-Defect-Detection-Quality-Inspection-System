"""Authoritative defect-class resolution for the inference pipeline.

Single source of truth for mapping YOLO class ids and names to human-readable
defect information: ``datasets/yolo_dataset/class_mapping.json`` (produced from
MVTec dataset configuration).

Resolution rules:
1. The raw class name always comes from the loaded model's own metadata
   (``model.names``), or the classifier model's predicted class.
2. If the model's raw class name exists in ``class_mapping.json``, the entry's
   ``category`` (product category) and ``defect_type`` are used.
3. If the model exposes exactly as many classes as the mapping file and its
   names match the mapping names positionally, the mapping is applied by id.
4. If the loaded model is single-class ({0: "defect"}), it honestly reports
   class_name="defect", defect_type="defect", mapped=False.
5. No filename, folder-name, or context guessing is used. Predictions strictly
   derive from model inference.
"""

from __future__ import annotations

import json
import os
from functools import lru_cache
from typing import Any, Dict, Optional


ML_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
PROJECT_ROOT = os.path.abspath(os.path.join(ML_DIR, ".."))
CLASS_MAPPING_PATH = os.path.join(PROJECT_ROOT, "datasets", "yolo_dataset", "class_mapping.json")


@lru_cache(maxsize=4)
def load_class_mapping(path: str = CLASS_MAPPING_PATH) -> Dict[str, Dict[str, Any]]:
    """Load and cache the dataset class mapping keyed by class id (as str)."""
    if not path or not os.path.isfile(path):
        return {}
    try:
        with open(path, "r", encoding="utf-8") as handle:
            raw = json.load(handle)
    except (OSError, ValueError):
        return {}

    mapping: Dict[str, Dict[str, Any]] = {}
    if isinstance(raw, dict):
        for key, entry in raw.items():
            if isinstance(entry, dict) and "class_name" in entry:
                mapping[str(key)] = {
                    "class_id": int(entry.get("class_id", key)),
                    "class_name": str(entry["class_name"]),
                    "category": entry.get("category"),
                    "defect_type": entry.get("defect_type"),
                }
    elif isinstance(raw, list):
        for entry in raw:
            if isinstance(entry, dict) and "class_name" in entry:
                mapping[str(entry.get("class_id"))] = {
                    "class_id": int(entry.get("class_id", 0)),
                    "class_name": str(entry["class_name"]),
                    "category": entry.get("category"),
                    "defect_type": entry.get("defect_type"),
                }
    return mapping


@lru_cache(maxsize=4)
def _name_index(path: str = CLASS_MAPPING_PATH) -> Dict[str, Dict[str, Any]]:
    mapping = load_class_mapping(path)
    return {entry["class_name"]: entry for entry in mapping.values()}


def describe_model_classes(model_names: Optional[Dict[int, str]]) -> Dict[str, Any]:
    """Summarise the loaded model's real class configuration."""
    names = dict(model_names or {})
    mapping = load_class_mapping()
    return {
        "model_class_count": len(names),
        "model_class_names": [names[key] for key in sorted(names)],
        "mapping_available": bool(mapping),
        "mapping_class_count": len(mapping),
    }


def resolve_class_name(raw_name: str) -> Optional[Dict[str, Any]]:
    """Resolve a class name (e.g. 'bottle_broken_large') using the authoritative dataset mapping."""
    if not raw_name:
        return None
    by_name = _name_index()
    if raw_name in by_name:
        return by_name[raw_name]
    
    # Check if category prefix matches (e.g. 'broken_large' or 'bottle_broken_large')
    clean = raw_name.strip().lower()
    for entry in by_name.values():
        if entry["class_name"].lower() == clean:
            return entry
        
    return None


def resolve_detection_class(
    class_id: int,
    model_names: Optional[Dict[int, str]] = None,
    image_path: Optional[str] = None,
    product_name: Optional[str] = None,
) -> Dict[str, Any]:
    """Resolve a YOLO class id through the loaded model metadata + class mapping.

    Returns a dict with:
        class_id         - the detector's numeric class id
        class_name       - name from the model's own metadata or mapped class name
        product_category - MVTec product category when mapped, else product_name or None
        defect_type      - actual defect type when mapped, else the model's own class name
        mapped           - True when resolved via class_mapping.json
        classification_source - 'model'
    """
    names = dict(model_names or {})
    raw_name = names.get(class_id)
    if raw_name is None and names:
        raw_name = names.get(min(names) if class_id < min(names) else max(names))

    mapping = load_class_mapping()
    by_name = _name_index()

    entry = None
    if raw_name is not None and raw_name in by_name:
        entry = by_name[raw_name]
    elif mapping and names and len(names) == len(mapping):
        positional = mapping.get(str(class_id))
        if positional and (raw_name is None or positional["class_name"] == raw_name):
            entry = positional

    if entry is None:
        fallback_name = raw_name if raw_name is not None else f"class_{class_id}"
        return {
            "class_id": int(class_id),
            "class_name": fallback_name,
            "product_category": product_name,
            "defect_type": fallback_name,
            "suggested_defect_type": None,
            "classification_source": "model",
            "mapped": False,
        }

    return {
        "class_id": int(entry.get("class_id", class_id)),
        "class_name": entry["class_name"],
        "product_category": entry.get("category"),
        "defect_type": entry.get("defect_type") or entry["class_name"],
        "suggested_defect_type": None,
        "classification_source": "model",
        "mapped": True,
    }