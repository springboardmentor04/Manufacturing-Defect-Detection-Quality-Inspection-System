"""
VisionInspectAI - CV-Based Anomaly Fallback Layer
==================================================

When the YOLO model is too weak / not trained on a specific defect type,
this module provides a second opinion using classical computer-vision
heuristics so obviously broken products are never silently passed.

Four independent checks are fused into a single AnomalyScore [0–100]:

  1. Dark-Spot / Contamination Check
     — detects unusual dark blobs (burn marks, contamination, missing material)
     via adaptive thresholding on the L channel (LAB colour space).

  2. Edge-Irregularity Check
     — a structurally sound product should have smooth, regular edges.
       Fragmented / noisy edges → high irregularity score.

  3. Colour-Saturation Anomaly Check
     — burn marks and corrosion produce highly saturated orange/brown patches
       that should not appear on clean factory products.

  4. Structural Asymmetry Check
     — many industrial parts are roughly symmetric (e.g. round caps).
       High left-right AND top-bottom asymmetry together flag structural damage.

Weights: 35% dark-spot, 25% edge, 20% colour, 20% symmetry.

Returns:
    dict:
        anomaly_score   float [0, 100]   overall anomaly level
        cv_prediction   "GOOD"|"DEFECT"  threshold at 45
        cv_confidence   float [0, 100]   confidence in the cv_prediction
        cv_flags        list[str]        which checks fired
"""

import numpy as np
import cv2
from pathlib import Path


# ── Thresholds ────────────────────────────────────────────────────────────────
# Tuned to reduce false positives on good images while still catching real defects.
# Diagnostics showed dark_score hitting 83 and edge_score 60 on known-good images
# because backgrounds are naturally dark and products have complex edges.
DARK_BLOB_MIN_AREA_FRAC  = 0.02    # blob must be ≥ 2% of image area (raised from 1%)
DARK_BLOB_SCORE_SCALE    = 150.0   # raised from 100 → harder to reach score=100
EDGE_FRAG_SCALE          = 200.0   # raised from 150 → natural edges less penalised
SATURATED_FRAC_SCALE     = 2.0     # unchanged — burn/rust is still rare on good items
SYMMETRY_DIFF_SCALE      = 5000.0  # raised from 3000 → products not always symmetric

ANOMALY_DEFECT_THRESHOLD = 55.0    # raised from 45 → require stronger signal for DEFECT
ANOMALY_HIGH_THRESHOLD   = 70.0    # raised from 60


# ── Main entry point ──────────────────────────────────────────────────────────

def run_cv_anomaly_check(image_path: str) -> dict:
    """
    Run all CV checks on *image_path* (the preprocessed 224×224 JPEG).

    Returns a dict with anomaly_score, cv_prediction, cv_confidence, cv_flags.
    If the image cannot be read, returns a neutral (GOOD) result so we don't
    accidentally block uploads when OpenCV fails.
    """
    img_bgr = cv2.imread(str(image_path))
    if img_bgr is None:
        return _neutral_result("image_read_error")

    img_bgr = cv2.resize(img_bgr, (224, 224))  # ensure 224×224

    flags = []

    # ── 1. Dark-spot / contamination ─────────────────────────────────────────
    dark_score, dark_fired = _dark_spot_check(img_bgr)
    if dark_fired:
        flags.append("dark_contamination")

    # ── 2. Edge irregularity ─────────────────────────────────────────────────
    edge_score, edge_fired = _edge_irregularity_check(img_bgr)
    if edge_fired:
        flags.append("edge_irregularity")

    # ── 3. Colour-saturation anomaly ─────────────────────────────────────────
    colour_score, colour_fired = _colour_saturation_check(img_bgr)
    if colour_fired:
        flags.append("colour_anomaly")

    # ── 4. Structural asymmetry ──────────────────────────────────────────────
    sym_score, sym_fired = _asymmetry_check(img_bgr)
    if sym_fired:
        flags.append("structural_asymmetry")

    # ── Weighted fusion ───────────────────────────────────────────────────────
    weighted_score = (
        dark_score   * 0.35 +
        edge_score   * 0.25 +
        colour_score * 0.20 +
        sym_score    * 0.20
    )
    
    # Prevent dilution for massive failures only:
    # If any single check is critically high (> 85), guarantee the score crosses the 55.0 threshold.
    # Require AT LEAST 2 checks fired before applying the boost — prevents single-check false positives.
    anomaly_score = weighted_score
    n_fired = sum(1 for s in [dark_score, edge_score, colour_score, sym_score] if s >= 55.0)
    if max(dark_score, edge_score, colour_score, sym_score) > 85.0 and n_fired >= 2:
        anomaly_score = max(weighted_score, 60.0)
        
    anomaly_score = round(min(100.0, max(0.0, anomaly_score)), 2)

    if anomaly_score >= ANOMALY_DEFECT_THRESHOLD:
        cv_prediction = "DEFECT"
        # Confidence scales from 50% at threshold to 99% at 100
        cv_confidence = round(
            50.0 + (anomaly_score - ANOMALY_DEFECT_THRESHOLD)
                   / (100.0 - ANOMALY_DEFECT_THRESHOLD) * 49.0, 2
        )
    else:
        cv_prediction = "GOOD"
        # Confidence scales from 99% at score=0 to 50% at threshold
        cv_confidence = round(
            99.0 - (anomaly_score / ANOMALY_DEFECT_THRESHOLD) * 49.0, 2
        )

    return {
        "anomaly_score":  anomaly_score,
        "cv_prediction":  cv_prediction,
        "cv_confidence":  cv_confidence,
        "cv_flags":       flags,
        # individual subscores for debugging
        "_dark_score":    round(dark_score,   2),
        "_edge_score":    round(edge_score,   2),
        "_colour_score":  round(colour_score, 2),
        "_sym_score":     round(sym_score,    2),
    }


# ── Individual checks ─────────────────────────────────────────────────────────

def _dark_spot_check(img_bgr: np.ndarray):
    """
    Detect unusually dark blobs (burn marks, missing material, contamination).
    Works in LAB colour space on the L (lightness) channel.
    """
    lab  = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2LAB)
    l_ch = lab[:, :, 0]          # L channel: 0=black, 255=white

    # Adaptive threshold: pixels significantly darker than local neighbourhood
    thresh = cv2.adaptiveThreshold(
        l_ch, 255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY_INV,
        blockSize=31, C=20
    )

    # Morphological close to merge nearby dark pixels into blobs
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))
    thresh = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel)

    # Find blobs
    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    total_area   = img_bgr.shape[0] * img_bgr.shape[1]
    min_area     = total_area * DARK_BLOB_MIN_AREA_FRAC

    blob_area_total = sum(cv2.contourArea(c) for c in contours if cv2.contourArea(c) >= min_area)
    blob_frac = blob_area_total / total_area

    score = min(100.0, blob_frac * DARK_BLOB_SCORE_SCALE)
    fired = score >= 55.0   # raised from 30 — backgrounds can be naturally dark
    return score, fired


def _edge_irregularity_check(img_bgr: np.ndarray):
    """
    Fragmented, noisy edges → structural damage or contamination.
    Counts the number of significant edge contours relative to image area.
    """
    gray   = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    edges  = cv2.Canny(blurred, 50, 150)

    contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    total_area   = img_bgr.shape[0] * img_bgr.shape[1]

    # Only count contours large enough to matter
    sig_contours = [c for c in contours if cv2.contourArea(c) > total_area * 0.0002]
    n_sig = len(sig_contours)

    score = min(100.0, (n_sig / total_area) * total_area / EDGE_FRAG_SCALE)
    # Simpler: normalise by a baseline contour count
    score = min(100.0, n_sig / EDGE_FRAG_SCALE * 100.0)
    fired = score >= 55.0   # raised from 35 — good products have complex edges too
    return score, fired


def _colour_saturation_check(img_bgr: np.ndarray):
    """
    Burn marks, rust, oil leaks → highly saturated orange/brown/yellow patches
    that don't belong on a clean product.
    """
    hsv = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2HSV)
    s_ch = hsv[:, :, 1]   # Saturation channel

    # Pixels with HIGH saturation (>140) AND hue in orange/brown/yellow range
    hue = hsv[:, :, 0]
    # Orange/brown: hue 5–30, Yellow: 25–35 (OpenCV hue 0-179)
    anomalous_hue  = ((hue >= 5)  & (hue <= 35))
    high_sat       = s_ch > 140
    anomalous_mask = anomalous_hue & high_sat

    total_pixels  = img_bgr.shape[0] * img_bgr.shape[1]
    frac_anomalous = anomalous_mask.sum() / total_pixels

    score = min(100.0, frac_anomalous * SATURATED_FRAC_SCALE * 100.0)
    fired = score >= 35.0   # slightly raised from 25
    return score, fired


def _asymmetry_check(img_bgr: np.ndarray):
    """
    Many factory parts are symmetric. Severe asymmetry flags structural damage.
    We compare left-vs-right AND top-vs-bottom halves using MSE.
    """
    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY).astype(np.float32)
    h, w = gray.shape

    # Left-right asymmetry
    left  = gray[:, :w // 2]
    right = np.fliplr(gray[:, w // 2:])
    min_w = min(left.shape[1], right.shape[1])
    lr_mse = float(np.mean((left[:, :min_w] - right[:, :min_w]) ** 2))

    # Top-bottom asymmetry
    top    = gray[:h // 2, :]
    bottom = np.flipud(gray[h // 2:, :])
    min_h  = min(top.shape[0], bottom.shape[0])
    tb_mse = float(np.mean((top[:min_h, :] - bottom[:min_h, :]) ** 2))

    # Average asymmetry
    avg_mse = (lr_mse + tb_mse) / 2.0
    score   = min(100.0, avg_mse / SYMMETRY_DIFF_SCALE * 100.0)
    fired   = score >= 65.0   # raised from 40 — most products are NOT perfectly symmetric
    return score, fired


def _neutral_result(reason: str) -> dict:
    return {
        "anomaly_score": 0.0,
        "cv_prediction": "GOOD",
        "cv_confidence": 70.0,
        "cv_flags":      [reason],
        "_dark_score":   0.0,
        "_edge_score":   0.0,
        "_colour_score": 0.0,
        "_sym_score":    0.0,
    }
