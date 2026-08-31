"""
VisionInspect AI - Severity Scoring Engine & Automated Pass/Fail Decision Engine
Phase 6.2 Implementation according to Approved Phase 6.1 Specification
"""

import math
import logging
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

# ==============================================================================
# STEP 4 & 9: CENTRALIZED CONFIGURATION & MAPPINGS
# ==============================================================================

# Centralized 73-Class Risk Multiplier Mapping (Exact Approved Phase 6.1 Values)
CLASS_RISK_MAPPING: Dict[str, Dict[str, Any]] = {
    # Tier 1: Zero-Tolerance Critical Defects (Rc = 3.0 - 3.5)
    "bottle_broken_large": {"tier": 1, "tier_name": "Tier 1: Zero-Tolerance Critical", "risk_multiplier": 3.5},
    "cable_cut_outer_insulation": {"tier": 1, "tier_name": "Tier 1: Zero-Tolerance Critical", "risk_multiplier": 3.5},
    "cable_missing_cable": {"tier": 1, "tier_name": "Tier 1: Zero-Tolerance Critical", "risk_multiplier": 3.5},
    "cable_missing_wire": {"tier": 1, "tier_name": "Tier 1: Zero-Tolerance Critical", "risk_multiplier": 3.5},
    "capsule_crack": {"tier": 1, "tier_name": "Tier 1: Zero-Tolerance Critical", "risk_multiplier": 3.5},
    "pill_crack": {"tier": 1, "tier_name": "Tier 1: Zero-Tolerance Critical", "risk_multiplier": 3.5},
    "screw_manipulated_front": {"tier": 1, "tier_name": "Tier 1: Zero-Tolerance Critical", "risk_multiplier": 3.2},
    "transistor_bent_lead": {"tier": 1, "tier_name": "Tier 1: Zero-Tolerance Critical", "risk_multiplier": 3.5},
    "transistor_cut_lead": {"tier": 1, "tier_name": "Tier 1: Zero-Tolerance Critical", "risk_multiplier": 3.5},
    "transistor_damaged_case": {"tier": 1, "tier_name": "Tier 1: Zero-Tolerance Critical", "risk_multiplier": 3.2},
    "transistor_misplaced": {"tier": 1, "tier_name": "Tier 1: Zero-Tolerance Critical", "risk_multiplier": 3.2},
    "zipper_broken_teeth": {"tier": 1, "tier_name": "Tier 1: Zero-Tolerance Critical", "risk_multiplier": 3.5},

    # Tier 2: Structural & Component Major Defects (Rc = 2.0 - 2.5)
    "bottle_broken_small": {"tier": 2, "tier_name": "Tier 2: Structural & Component Major", "risk_multiplier": 2.5},
    "cable_bent_wire": {"tier": 2, "tier_name": "Tier 2: Structural & Component Major", "risk_multiplier": 2.2},
    "cable_cut_inner_insulation": {"tier": 2, "tier_name": "Tier 2: Structural & Component Major", "risk_multiplier": 2.5},
    "capsule_poke": {"tier": 2, "tier_name": "Tier 2: Structural & Component Major", "risk_multiplier": 2.4},
    "carpet_cut": {"tier": 2, "tier_name": "Tier 2: Structural & Component Major", "risk_multiplier": 2.2},
    "carpet_hole": {"tier": 2, "tier_name": "Tier 2: Structural & Component Major", "risk_multiplier": 2.2},
    "grid_broken": {"tier": 2, "tier_name": "Tier 2: Structural & Component Major", "risk_multiplier": 2.5},
    "hazelnut_crack": {"tier": 2, "tier_name": "Tier 2: Structural & Component Major", "risk_multiplier": 2.2},
    "hazelnut_hole": {"tier": 2, "tier_name": "Tier 2: Structural & Component Major", "risk_multiplier": 2.5},
    "leather_cut": {"tier": 2, "tier_name": "Tier 2: Structural & Component Major", "risk_multiplier": 2.2},
    "metal_nut_bent": {"tier": 2, "tier_name": "Tier 2: Structural & Component Major", "risk_multiplier": 2.4},
    "tile_crack": {"tier": 2, "tier_name": "Tier 2: Structural & Component Major", "risk_multiplier": 2.5},
    "wood_hole": {"tier": 2, "tier_name": "Tier 2: Structural & Component Major", "risk_multiplier": 2.2},
    "zipper_split_teeth": {"tier": 2, "tier_name": "Tier 2: Structural & Component Major", "risk_multiplier": 2.4},

    # Tier 3: Surface & Assembly Moderate Defects (Rc = 1.5 - 1.9)
    "bottle_contamination": {"tier": 3, "tier_name": "Tier 3: Surface & Assembly Moderate", "risk_multiplier": 1.8},
    "cable_cable_swap": {"tier": 3, "tier_name": "Tier 3: Surface & Assembly Moderate", "risk_multiplier": 1.9},
    "cable_poke_insulation": {"tier": 3, "tier_name": "Tier 3: Surface & Assembly Moderate", "risk_multiplier": 1.8},
    "capsule_faulty_imprint": {"tier": 3, "tier_name": "Tier 3: Surface & Assembly Moderate", "risk_multiplier": 1.5},
    "capsule_squeeze": {"tier": 3, "tier_name": "Tier 3: Surface & Assembly Moderate", "risk_multiplier": 1.7},
    "carpet_metal_contamination": {"tier": 3, "tier_name": "Tier 3: Surface & Assembly Moderate", "risk_multiplier": 1.9},
    "grid_bent": {"tier": 3, "tier_name": "Tier 3: Surface & Assembly Moderate", "risk_multiplier": 1.6},
    "grid_glue": {"tier": 3, "tier_name": "Tier 3: Surface & Assembly Moderate", "risk_multiplier": 1.5},
    "grid_metal_contamination": {"tier": 3, "tier_name": "Tier 3: Surface & Assembly Moderate", "risk_multiplier": 1.9},
    "hazelnut_cut": {"tier": 3, "tier_name": "Tier 3: Surface & Assembly Moderate", "risk_multiplier": 1.6},
    "leather_poke": {"tier": 3, "tier_name": "Tier 3: Surface & Assembly Moderate", "risk_multiplier": 1.5},
    "metal_nut_scratch": {"tier": 3, "tier_name": "Tier 3: Surface & Assembly Moderate", "risk_multiplier": 1.5},
    "pill_contamination": {"tier": 3, "tier_name": "Tier 3: Surface & Assembly Moderate", "risk_multiplier": 1.9},
    "pill_faulty_imprint": {"tier": 3, "tier_name": "Tier 3: Surface & Assembly Moderate", "risk_multiplier": 1.5},
    "pill_pill_type": {"tier": 3, "tier_name": "Tier 3: Surface & Assembly Moderate", "risk_multiplier": 1.8},
    "screw_scratch_head": {"tier": 3, "tier_name": "Tier 3: Surface & Assembly Moderate", "risk_multiplier": 1.6},
    "screw_scratch_neck": {"tier": 3, "tier_name": "Tier 3: Surface & Assembly Moderate", "risk_multiplier": 1.6},
    "screw_thread_side": {"tier": 3, "tier_name": "Tier 3: Surface & Assembly Moderate", "risk_multiplier": 1.9},
    "screw_thread_top": {"tier": 3, "tier_name": "Tier 3: Surface & Assembly Moderate", "risk_multiplier": 1.8},
    "tile_glue_strip": {"tier": 3, "tier_name": "Tier 3: Surface & Assembly Moderate", "risk_multiplier": 1.5},
    "toothbrush_defective": {"tier": 3, "tier_name": "Tier 3: Surface & Assembly Moderate", "risk_multiplier": 1.9},
    "wood_scratch": {"tier": 3, "tier_name": "Tier 3: Surface & Assembly Moderate", "risk_multiplier": 1.5},
    "zipper_fabric_border": {"tier": 3, "tier_name": "Tier 3: Surface & Assembly Moderate", "risk_multiplier": 1.6},
    "zipper_fabric_interior": {"tier": 3, "tier_name": "Tier 3: Surface & Assembly Moderate", "risk_multiplier": 1.7},
    "zipper_squeezed_teeth": {"tier": 3, "tier_name": "Tier 3: Surface & Assembly Moderate", "risk_multiplier": 1.8},

    # Tier 4: Minor Cosmetic & Texture Anomalies (Rc = 1.1 - 1.4)
    "capsule_scratch": {"tier": 4, "tier_name": "Tier 4: Minor Cosmetic & Texture", "risk_multiplier": 1.3},
    "carpet_color": {"tier": 4, "tier_name": "Tier 4: Minor Cosmetic & Texture", "risk_multiplier": 1.2},
    "carpet_thread": {"tier": 4, "tier_name": "Tier 4: Minor Cosmetic & Texture", "risk_multiplier": 1.1},
    "grid_thread": {"tier": 4, "tier_name": "Tier 4: Minor Cosmetic & Texture", "risk_multiplier": 1.1},
    "hazelnut_print": {"tier": 4, "tier_name": "Tier 4: Minor Cosmetic & Texture", "risk_multiplier": 1.2},
    "leather_color": {"tier": 4, "tier_name": "Tier 4: Minor Cosmetic & Texture", "risk_multiplier": 1.2},
    "leather_fold": {"tier": 4, "tier_name": "Tier 4: Minor Cosmetic & Texture", "risk_multiplier": 1.3},
    "leather_glue": {"tier": 4, "tier_name": "Tier 4: Minor Cosmetic & Texture", "risk_multiplier": 1.4},
    "metal_nut_color": {"tier": 4, "tier_name": "Tier 4: Minor Cosmetic & Texture", "risk_multiplier": 1.2},
    "metal_nut_flip": {"tier": 4, "tier_name": "Tier 4: Minor Cosmetic & Texture", "risk_multiplier": 1.4},
    "pill_color": {"tier": 4, "tier_name": "Tier 4: Minor Cosmetic & Texture", "risk_multiplier": 1.2},
    "pill_scratch": {"tier": 4, "tier_name": "Tier 4: Minor Cosmetic & Texture", "risk_multiplier": 1.3},
    "tile_gray_stroke": {"tier": 4, "tier_name": "Tier 4: Minor Cosmetic & Texture", "risk_multiplier": 1.2},
    "tile_oil": {"tier": 4, "tier_name": "Tier 4: Minor Cosmetic & Texture", "risk_multiplier": 1.3},
    "tile_rough": {"tier": 4, "tier_name": "Tier 4: Minor Cosmetic & Texture", "risk_multiplier": 1.3},
    "wood_color": {"tier": 4, "tier_name": "Tier 4: Minor Cosmetic & Texture", "risk_multiplier": 1.2},
    "wood_liquid": {"tier": 4, "tier_name": "Tier 4: Minor Cosmetic & Texture", "risk_multiplier": 1.4},
    "zipper_rough": {"tier": 4, "tier_name": "Tier 4: Minor Cosmetic & Texture", "risk_multiplier": 1.3},

    # Tier 5: Combined & Multi-Defect Aggregates (Rc = 2.2 - 2.8)
    "cable_combined": {"tier": 5, "tier_name": "Tier 5: Multi-Defect Aggregates", "risk_multiplier": 2.8},
    "pill_combined": {"tier": 5, "tier_name": "Tier 5: Multi-Defect Aggregates", "risk_multiplier": 2.8},
    "wood_combined": {"tier": 5, "tier_name": "Tier 5: Multi-Defect Aggregates", "risk_multiplier": 2.5},
    "zipper_combined": {"tier": 5, "tier_name": "Tier 5: Multi-Defect Aggregates", "risk_multiplier": 2.6},
}

# Initial Project-Configurable Product Threshold Mapping (Exact Approved Values)
PRODUCT_THRESHOLDS: Dict[str, float] = {
    "capsule": 30.0,
    "pill": 30.0,
    "transistor": 35.0,
    "cable": 35.0,
    "bottle": 40.0,
    "metal_nut": 40.0,
    "screw": 40.0,
    "zipper": 45.0,
    "grid": 45.0,
    "toothbrush": 45.0,
    "tile": 50.0,
    "leather": 50.0,
    "wood": 50.0,
    "carpet": 55.0,
    "hazelnut": 55.0,
}

# Object Categories vs Texture Categories
OBJECT_CATEGORIES = {
    "bottle", "cable", "capsule", "grid", "hazelnut",
    "metal_nut", "pill", "screw", "toothbrush", "transistor", "zipper"
}

TEXTURE_CATEGORIES = {"carpet", "leather", "tile", "wood"}

FULL_IMAGE_AREA = 320.0 * 320.0  # 102,400 pixels²


# ==============================================================================
# STEP 3: PRODUCT ROI DERIVATION
# ==============================================================================

def get_product_roi_area(product_category: str, product_bbox_area: Optional[float] = None) -> float:
    """
    Derives product ROI area based on product category:
    - Texture categories -> Full Image Area (102,400 px²)
    - Object categories -> Provided product bounding envelope / mask area
    - Fallback -> 102,400 px² if unprovided or invalid
    """
    category_clean = product_category.lower().strip()

    if category_clean in TEXTURE_CATEGORIES:
        return FULL_IMAGE_AREA

    if category_clean in OBJECT_CATEGORIES and product_bbox_area is not None and product_bbox_area > 0:
        return float(product_bbox_area)

    # Deterministic Fallback
    return FULL_IMAGE_AREA


# ==============================================================================
# STEP 2 & 5: SINGLE DEFECT SEVERITY SCORE FORMULA
# ==============================================================================

def calculate_single_defect_severity(
    defect_class: str,
    confidence: float,
    defect_area: float,
    product_roi_area: float,
    base_score: float = 25.0
) -> Dict[str, Any]:
    """
    Calculates single defect severity score S_i:
    S_i = min(100, B * R_c * W_size * W_conf)
    """
    # 1. Look up class risk multiplier & tier
    class_info = CLASS_RISK_MAPPING.get(defect_class)
    if not class_info:
        logger.warning(f"Unknown defect class '{defect_class}'. Applying fallback risk multiplier R_default = 2.0")
        class_info = {"tier": 3, "tier_name": "Tier 3: Fallback Risk", "risk_multiplier": 2.0}

    risk_multiplier = float(class_info["risk_multiplier"])
    tier = int(class_info["tier"])
    tier_name = str(class_info["tier_name"])

    # 2. Calculate Clamped Size Ratio
    raw_ratio = defect_area / max(1.0, product_roi_area)
    size_ratio = min(1.0, max(0.0, raw_ratio))

    # 3. Calculate Size Weight W_size
    size_weight = 1.0 + 5.0 * size_ratio

    # 4. Calculate Confidence Weight W_conf
    confidence_weight = 0.5 + 0.5 * float(confidence)

    # 5. Compute Individual Score S_i
    raw_score = base_score * risk_multiplier * size_weight * confidence_weight
    individual_score = min(100.0, max(0.0, raw_score))

    # 6. Map to Severity Level
    if individual_score < 25.0:
        severity_level = "LOW"
    elif individual_score < 50.0:
        severity_level = "MEDIUM"
    elif individual_score < 75.0:
        severity_level = "HIGH"
    else:
        severity_level = "CRITICAL"

    return {
        "defect_class": defect_class,
        "confidence": float(confidence),
        "defect_area": float(defect_area),
        "product_roi_area": float(product_roi_area),
        "size_ratio": float(size_ratio),
        "risk_multiplier": risk_multiplier,
        "confidence_weight": float(confidence_weight),
        "size_weight": float(size_weight),
        "individual_severity_score": round(float(individual_score), 4),
        "severity_level": severity_level,
        "risk_tier": tier,
        "risk_tier_name": tier_name
    }


# ==============================================================================
# STEP 6: MULTI-DEFECT SUB-LINEAR ACCUMULATION
# ==============================================================================

def aggregate_multi_defect_severity(detections: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Sub-linear multi-defect aggregation formula:
    S_total = min(100, S_max + 0.30 * sum(S_other))
    """
    if not detections:
        return {
            "max_score": 0.0,
            "total_score": 0.0,
            "overall_severity": "NONE"
        }

    scores = [d["individual_severity_score"] for d in detections]
    s_max = max(scores)
    other_scores_sum = sum(s for s in scores if s != s_max)
    # If duplicate max scores exist, include extra max scores in sub-linear sum
    duplicate_max_count = scores.count(s_max)
    if duplicate_max_count > 1:
        other_scores_sum += s_max * (duplicate_max_count - 1)

    s_total = min(100.0, s_max + 0.30 * other_scores_sum)

    # Determine overall severity level from total score
    if s_total < 25.0:
        overall_severity = "LOW"
    elif s_total < 50.0:
        overall_severity = "MEDIUM"
    elif s_total < 75.0:
        overall_severity = "HIGH"
    else:
        overall_severity = "CRITICAL"

    return {
        "max_score": round(float(s_max), 4),
        "total_score": round(float(s_total), 4),
        "overall_severity": overall_severity
    }


# ==============================================================================
# STEP 7, 8, 10: COMPLETE DECISION ENGINE
# ==============================================================================

def evaluate_inspection_severity(
    raw_predictions: List[Dict[str, Any]],
    product_category: str,
    product_bbox_area: Optional[float] = None
) -> Dict[str, Any]:
    """
    Complete Automated Decision Engine according to approved Phase 6.1 Order of Evaluation:
    1. Filter predictions below confidence 0.25 (discard as background).
    2. If no valid defects remain -> PASS, severity = NONE, score = 0.0.
    3. Check Tier-1 critical defects & precedence rules.
    4. Calculate individual severity scores & sub-linear total score.
    5. Evaluate product threshold & low confidence flags.
    6. Return structured inspection decision payload.
    """
    category_clean = product_category.lower().strip()
    product_threshold = PRODUCT_THRESHOLDS.get(category_clean, 40.0)
    roi_area = get_product_roi_area(category_clean, product_bbox_area)

    # Step 1: Filter confidence < 0.25
    valid_predictions = [p for p in raw_predictions if float(p.get("confidence", 0.0)) >= 0.25]

    # Step 2: No valid defects -> PASS
    if not valid_predictions:
        return {
            "inspection_status": "PASS",
            "overall_severity": "NONE",
            "overall_score": 0.0,
            "product_category": category_clean,
            "product_threshold": product_threshold,
            "number_of_detected_defects": 0,
            "low_confidence_flag": False,
            "decision_reason": "No defect detected above confidence threshold (0.25). Quality standard met.",
            "detections": []
        }

    # Step 3: Process valid predictions & calculate individual scores
    processed_detections = []
    has_tier1_conf_ge_050 = False
    has_tier1_conf_025_049 = False
    tier1_defect_names = []
    has_low_confidence_detection = False

    for pred in valid_predictions:
        d_class = str(pred["defect_class"])
        conf = float(pred["confidence"])
        bbox = pred.get("bounding_box", {"width": 0, "height": 0})
        area = float(pred.get("defect_area", bbox.get("width", 0) * bbox.get("height", 0)))

        det_eval = calculate_single_defect_severity(
            defect_class=d_class,
            confidence=conf,
            defect_area=area,
            product_roi_area=roi_area
        )
        det_eval["bounding_box"] = bbox
        processed_detections.append(det_eval)

        # Track Tier-1 Precedence Triggers
        if det_eval["risk_tier"] == 1:
            tier1_defect_names.append(d_class)
            if conf >= 0.50:
                has_tier1_conf_ge_050 = True
            elif 0.25 <= conf < 0.50:
                has_tier1_conf_025_049 = True

        # Track Low Confidence Flag for Non-Tier-1
        if 0.25 <= conf < 0.35:
            has_low_confidence_detection = True

    # Step 4: Multi-defect aggregation
    aggregation = aggregate_multi_defect_severity(processed_detections)
    total_score = aggregation["total_score"]
    max_score = aggregation["max_score"]
    overall_severity = aggregation["overall_severity"]

    # Check for any single defect score >= 75.0
    has_single_score_ge_75 = any(d["individual_severity_score"] >= 75.0 for d in processed_detections)

    # Step 5: Evaluate Precedence Rules & Final Decision Order

    # RULE 1: Tier-1 Critical Defect with conf >= 0.50 -> FAIL regardless of score/threshold
    if has_tier1_conf_ge_050:
        return {
            "inspection_status": "FAIL",
            "overall_severity": "CRITICAL",
            "overall_score": max(total_score, 85.0),
            "product_category": category_clean,
            "product_threshold": product_threshold,
            "number_of_detected_defects": len(processed_detections),
            "low_confidence_flag": has_low_confidence_detection,
            "decision_reason": f"Tier-1 Zero-Tolerance Critical Defect detected with confidence >= 0.50 ({', '.join(set(tier1_defect_names))}). Immediate FAIL.",
            "detections": processed_detections
        }

    # RULE 2: Tier-1 Critical Defect with 0.25 <= conf < 0.50 -> MANUAL_REVIEW (unless score >= 75 -> FAIL)
    if has_tier1_conf_025_049:
        if has_single_score_ge_75 or total_score >= 75.0:
            return {
                "inspection_status": "FAIL",
                "overall_severity": "CRITICAL",
                "overall_score": max(total_score, 75.0),
                "product_category": category_clean,
                "product_threshold": product_threshold,
                "number_of_detected_defects": len(processed_detections),
                "low_confidence_flag": True,
                "decision_reason": f"Tier-1 Critical Defect ({', '.join(set(tier1_defect_names))}) calculated severity score >= 75.0. Immediate FAIL.",
                "detections": processed_detections
            }
        else:
            return {
                "inspection_status": "MANUAL_REVIEW",
                "overall_severity": overall_severity,
                "overall_score": total_score,
                "product_category": category_clean,
                "product_threshold": product_threshold,
                "number_of_detected_defects": len(processed_detections),
                "low_confidence_flag": True,
                "decision_reason": f"Tier-1 Critical Defect ({', '.join(set(tier1_defect_names))}) detected with moderate confidence (0.25-0.49). Escapacated for MANUAL_REVIEW.",
                "detections": processed_detections
            }

    # RULE 4: Non-Tier-1 Defect with Score >= 75.0 -> FAIL
    if has_single_score_ge_75:
        return {
            "inspection_status": "FAIL",
            "overall_severity": "CRITICAL",
            "overall_score": total_score,
            "product_category": category_clean,
            "product_threshold": product_threshold,
            "number_of_detected_defects": len(processed_detections),
            "low_confidence_flag": has_low_confidence_detection,
            "decision_reason": "Single defect calculated severity score exceeded CRITICAL limit (>= 75.0). FAIL.",
            "detections": processed_detections
        }

    # Threshold Check: Total Score >= Product Threshold -> FAIL
    if total_score >= product_threshold:
        return {
            "inspection_status": "FAIL",
            "overall_severity": overall_severity,
            "overall_score": total_score,
            "product_category": category_clean,
            "product_threshold": product_threshold,
            "number_of_detected_defects": len(processed_detections),
            "low_confidence_flag": has_low_confidence_detection,
            "decision_reason": f"Total accumulated severity score ({total_score:.1f}) exceeded product threshold ({product_threshold:.1f}). FAIL.",
            "detections": processed_detections
        }

    # Otherwise -> PASS (with low confidence flag if applicable)
    reason = "All detected defect scores remained below product threshold. Quality standard met."
    if has_low_confidence_detection:
        reason += " (Passed with LOW_CONFIDENCE_FLAG logged)."

    return {
        "inspection_status": "PASS",
        "overall_severity": overall_severity,
        "overall_score": total_score,
        "product_category": category_clean,
        "product_threshold": product_threshold,
        "number_of_detected_defects": len(processed_detections),
        "low_confidence_flag": has_low_confidence_detection,
        "decision_reason": reason,
        "detections": processed_detections
    }
