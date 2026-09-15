# Comprehensive Evaluation Report (Test Set)

**Model:** YOLO11n-seg (Optimized)

**Threshold:** 0.15

## Overall Metrics

| Metric | Value |
|---|---|
| True Positives (Defect correctly caught) | 143 |
| True Negatives (Good item passed) | 409 |
| False Positives (Good item rejected) | 2 |
| False Negatives (Defect missed) | 15 |
| Precision | 0.9862 |
| Recall | 0.9051 |
| F1-Score | 0.9439 |
| False Positive Rate (FPR) | 0.0049 (0.49%) |
| False Negative Rate (FNR) | 0.0949 (9.49%) |


## Per-Category Breakdown

| Category | TP | TN | FP | FN | Precision | Recall | F1 | FPR | FNR |
|---|---|---|---|---|---|---|---|---|---|
| **Bottle** | 7 | 20 | 0 | 2 | 1.000 | 0.778 | 0.875 | 0.000 | 0.222 |
| **Cable** | 13 | 36 | 1 | 0 | 0.929 | 1.000 | 0.963 | 0.027 | 0.000 |
| **Capsule** | 18 | 23 | 0 | 2 | 1.000 | 0.900 | 0.947 | 0.000 | 0.100 |
| **Carpet** | 12 | 37 | 0 | 3 | 1.000 | 0.800 | 0.889 | 0.000 | 0.200 |
| **Grid** | 8 | 25 | 0 | 1 | 1.000 | 0.889 | 0.941 | 0.000 | 0.111 |
| **Hazelnut** | 8 | 41 | 0 | 0 | 1.000 | 1.000 | 1.000 | 0.000 | 0.000 |
| **Leather** | 9 | 27 | 0 | 0 | 1.000 | 1.000 | 1.000 | 0.000 | 0.000 |
| **Metal_nut** | 8 | 25 | 0 | 1 | 1.000 | 0.889 | 0.941 | 0.000 | 0.111 |
| **Pill** | 8 | 25 | 0 | 1 | 1.000 | 0.889 | 0.941 | 0.000 | 0.111 |
| **Screw** | 12 | 39 | 0 | 3 | 1.000 | 0.800 | 0.889 | 0.000 | 0.200 |
| **Tile** | 14 | 30 | 1 | 0 | 0.933 | 1.000 | 0.966 | 0.032 | 0.000 |
| **Toothbrush** | 2 | 4 | 0 | 1 | 1.000 | 0.667 | 0.800 | 0.000 | 0.333 |
| **Transistor** | 3 | 27 | 0 | 1 | 1.000 | 0.750 | 0.857 | 0.000 | 0.250 |
| **Wood** | 3 | 28 | 0 | 0 | 1.000 | 1.000 | 1.000 | 0.000 | 0.000 |
| **Zipper** | 18 | 22 | 0 | 0 | 1.000 | 1.000 | 1.000 | 0.000 | 0.000 |