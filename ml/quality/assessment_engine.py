from typing import Dict, Iterable, Tuple


SEVERITY_RANK = {"LOW": 0, "MEDIUM": 1, "HIGH": 2, "CRITICAL": 3}


def _clamp(value: float) -> float:
    return max(0.0, min(100.0, float(value)))


def calculate_size_score(area: float, image_dimensions: Tuple[int, int]) -> float:
    image_width, image_height = image_dimensions
    image_area = max(float(image_width * image_height), 1.0)
    # A defect occupying 20% or more of the inspected image is maximally severe.
    return _clamp((max(float(area), 0.0) / image_area) * 500.0)


def calculate_location_score(bbox: Iterable[float], image_dimensions: Tuple[int, int]) -> float:
    x1, y1, x2, y2 = [float(value) for value in bbox]
    width, height = image_dimensions
    center_x = (x1 + x2) / 2.0
    center_y = (y1 + y2) / 2.0
    normalized_distance = min(
        (((center_x - width / 2.0) / max(width / 2.0, 1.0)) ** 2 +
         ((center_y - height / 2.0) / max(height / 2.0, 1.0)) ** 2) ** 0.5,
        1.0,
    )
    # Central assembly areas are treated as more quality-sensitive than outer edges.
    return _clamp(90.0 - (normalized_distance * 50.0))


def normalize_defect_type(defect_type: str) -> str:
    return (defect_type or "").strip().lower().replace(" ", "_").replace("-", "_")


def format_defect_name(defect_type: str, product_category: str = None) -> str:
    """
    Format raw MVTec / YOLO defect strings into clean human-readable titles.
    Examples:
      - 'broken_large' -> 'Broken Large'
      - 'bottle_broken_large' -> 'Broken Large'
      - 'bent_wire' -> 'Bent Wire'
      - 'scratch' -> 'Scratch'
      - 'hole' -> 'Hole'
    """
    if not defect_type:
        return ""
    normalized = normalize_defect_type(defect_type)
    if not normalized or normalized in {"no_defect", "none", "pass", "normal"}:
        return ""

    if product_category:
        prod = normalize_defect_type(product_category)
        if normalized.startswith(f"{prod}_"):
            normalized = normalized[len(prod) + 1:]

    # Also handle standard MVTec category prefixes (e.g. 'bottle_broken_large')
    mvtec_categories = [
        "bottle", "cable", "capsule", "carpet", "grid", "hazelnut",
        "leather", "metal_nut", "pill", "screw", "tile", "toothbrush",
        "transistor", "wood", "zipper"
    ]
    for cat in mvtec_categories:
        if normalized.startswith(f"{cat}_") and len(normalized) > len(cat) + 1:
            normalized = normalized[len(cat) + 1:]
            break

    words = normalized.replace("_", " ").split()
    return " ".join(word.capitalize() for word in words)


def category_label(defect_type: str, product_category: str = None) -> str:
    """Format defect type for display across UI and reports."""
    return format_defect_name(defect_type, product_category)


def type_score(defect_type: str) -> float:
    normalized = normalize_defect_type(defect_type)
    if not normalized:
        return 50.0

    critical_keywords = ("missing", "broken", "split", "damaged", "cut", "hole", "crack")
    high_keywords = ("bent", "manipulated", "misplaced", "defective", "swap", "flip", "combined", "fold", "poke")
    
    if any(kw in normalized for kw in critical_keywords):
        return 90.0
    if any(kw in normalized for kw in high_keywords):
        return 75.0
    return 60.0  # Surface, cosmetic, texture, color, contamination, scratch base score


def severity_level(score: float) -> str:
    if score >= 80:
        return "CRITICAL"
    if score >= 60:
        return "HIGH"
    if score >= 40:
        return "MEDIUM"
    return "LOW"


def quality_risk_for(score: float) -> str:
    level = severity_level(score)
    return {
        "CRITICAL": "Critical risk",
        "HIGH": "High risk",
        "MEDIUM": "Moderate risk",
        "LOW": "Low risk",
    }.get(level, "Low risk")


# Defect keywords categorised by manufacturability / repairability
UNCORRECTABLE_DEFECT_KEYWORDS = (
    "missing", "broken", "split", "damaged", "cut", "hole", "crack",
    "crushed", "fracture", "structural", "defective"
)

REWORKABLE_DEFECT_KEYWORDS = (
    "scratch", "contamination", "bent", "manipulated", "misplaced", "swap",
    "flip", "combined", "fold", "poke", "color", "texture", "spot", "stain",
    "glue", "thread", "rough", "imprint", "faulty_imprint", "fabric_border",
    "squeezed_teeth", "cable_swap", "bent_wire"
)


def is_reworkable_defect(defect_type: str, level: str) -> bool:
    """Determine if a defect is correctable / reworkable vs non-recoverable fail."""
    normalized = normalize_defect_type(defect_type)
    if level == "CRITICAL":
        return False
    if any(kw in normalized for kw in UNCORRECTABLE_DEFECT_KEYWORDS):
        return False
    if any(kw in normalized for kw in REWORKABLE_DEFECT_KEYWORDS):
        return True
    # If not explicitly uncorrectable and not critical severity, it is reworkable
    return level in {"MEDIUM", "LOW", "HIGH"}


def recommended_action(level: str, decision: str, manual_review_required: bool) -> str:
    if decision == "PASS":
        return "No defect detected. Product meets acceptance criteria."
    if decision == "REVIEW":
        return "Automatic decision confidence is insufficient. Route for manual quality review."
    if decision == "REWORK":
        return "Correctable defect detected. Route product for rework/reprocessing and re-inspection."
    # FAIL
    return "Non-correctable defect detected. Reject and quarantine product."


def decision_for(
    defect_type: str,
    level: str,
    manual_review_required: bool = False,
    confidence: float = 100.0,
) -> str:
    """
    Produce strictly one of the 4 Quality Decisions: PASS, FAIL, REVIEW, REWORK.
    """
    cleaned = (defect_type or "").strip().lower()
    if not cleaned or cleaned in {"none", "pass", "no_defect", "good", "normal", "acceptable"} or str(level).strip().upper() in {"NONE", "PASS"}:
        return "PASS"

    if manual_review_required or confidence < 70.0:
        return "REVIEW"

    if is_reworkable_defect(defect_type, level):
        return "REWORK"

    return "FAIL"


def assess_defect(defect: Dict, image_dimensions: Tuple[int, int]) -> Dict:
    confidence = _clamp(defect.get("confidence", 0.0))
    size = calculate_size_score(defect.get("area", 0.0), image_dimensions)
    location = calculate_location_score(defect.get("bbox", [0, 0, 0, 0]), image_dimensions)
    defect_type_score = type_score(defect.get("type", ""))
    score = round((size * 0.30) + (location * 0.25) + (defect_type_score * 0.25) + (confidence * 0.20), 2)
    level = severity_level(score)
    classification_conf = defect.get("classification_confidence")
    if classification_conf is not None:
        manual_review_required = confidence < 70.0 or classification_conf < 60.0
    else:
        manual_review_required = confidence < 70.0

    quality_decision = decision_for(
        defect_type=defect.get("type", ""),
        level=level,
        manual_review_required=manual_review_required,
        confidence=confidence,
    )

    return {
        "category": category_label(defect.get("type", ""), defect.get("product_category")),
        "size_score": size,
        "location_score": location,
        "type_score": defect_type_score,
        "confidence_score": confidence,
        "severity_score": score,
        "severity_level": level,
        "quality_risk": quality_risk_for(score),
        "quality_decision": quality_decision,
        "recommended_action": recommended_action(level, quality_decision, manual_review_required),
        "manual_review_required": manual_review_required,
    }


def build_defect_summary(defects: Iterable[Dict]) -> list[dict]:
    summaries = []
    for defect in defects:
        metadata = defect.copy()
        metadata["category"] = category_label(metadata.get("type", ""), metadata.get("product_category"))
        metadata["severity_level"] = defect.get("severity_level", severity_level(defect.get("severity_score", 0.0)))
        metadata["quality_risk"] = defect.get("quality_risk", quality_risk_for(defect.get("severity_score", 0.0)))
        metadata["quality_decision"] = defect.get("quality_decision", decision_for(
            defect.get("type", ""),
            metadata["severity_level"],
            defect.get("manual_review_required", False),
            defect.get("confidence", 100.0),
        ))
        summaries.append(metadata)
    return summaries


def assess_inspection(defects: Iterable[Dict], image_quality_status: str = "GOOD") -> Dict:
    defects = list(defects)
    if not defects:
        return {
            "overall_result": "PASS",
            "highest_severity": "LOW",
            "quality_risk": "Low risk",
            "defect_count": 0,
            "recommended_action": "No defects detected. Product meets acceptance criteria.",
            "manual_review_required": False,
        }

    highest = max(defects, key=lambda defect: (SEVERITY_RANK.get(defect.get("severity_level", "LOW"), 0), defect.get("severity_score", 0.0)))
    manual_review_required = any(defect.get("manual_review_required", False) for defect in defects) or (image_quality_status == "POOR")

    decisions = [d.get("quality_decision", "FAIL") for d in defects]

    if manual_review_required or "REVIEW" in decisions:
        overall_result = "REVIEW"
    elif "FAIL" in decisions or highest.get("severity_level") == "CRITICAL":
        overall_result = "FAIL"
    elif all(dec == "REWORK" for dec in decisions):
        overall_result = "REWORK"
    else:
        overall_result = "FAIL"

    return {
        "overall_result": overall_result,
        "highest_severity": highest.get("severity_level", "LOW"),
        "quality_risk": highest.get("quality_risk", "Low risk"),
        "defect_count": len(defects),
        "recommended_action": highest.get("recommended_action", recommended_action(highest.get("severity_level", "LOW"), overall_result, manual_review_required)),
        "manual_review_required": manual_review_required,
    }
