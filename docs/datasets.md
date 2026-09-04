# VisionInspect AI — Dataset Architecture & Data Engineering

## 1. MVTec Anomaly Detection (AD) Benchmark

VisionInspect AI is trained and validated on the industrial **MVTec Anomaly Detection (AD)** benchmark, the gold standard for automated visual quality inspection. The dataset comprehensively captures realistic industrial manufacturing flaws across 15 distinct categories:

| Category Type | Product Categories | Representative Defect Classes |
| :--- | :--- | :--- |
| **Industrial Objects (10)** | Bottle, Cable, Capsule, Hazelnut, Metal Nut, Pill, Screw, Toothbrush, Transistor, Zipper | Broken, Cracked, Contamination, Bent Wire, Misplaced Component, Spliced Lead, Scratch, Thread Flaw |
| **Industrial Textures (5)** | Carpet, Grid, Leather, Tile, Wood | Hole, Cut, Color Spot, Thread, Glue, Rough Surface, Warp, Crack |

---

## 2. Dataset Hierarchy & Layout

```
datasets/mvtec_raw/
├── bottle/
│   ├── ground_truth/
│   │   ├── broken_large/ (000_mask.png, ...)
│   │   ├── broken_small/
│   │   └── contamination/
│   ├── test/
│   │   ├── broken_large/ (000.png, ...)
│   │   ├── broken_small/
│   │   ├── contamination/
│   │   └── good/
│   └── train/
│       └── good/
├── cable/ ...
├── capsule/ ...
└── ... (15 categories, 73 defect classes total)
```

---

## 3. Data Preprocessing & Annotation Conversion

1. **Pixel-Mask to Bounding Box Synthesis**:
   - Ground truth binary masks from `ground_truth/` are parsed using morphological connected components (`cv2.findContours` / `np.where`).
   - Bounding boxes are generated in normalized YOLO format: `[class_id, x_center, y_center, width, height]`.

2. **Adaptive Contrast Enhancement (CLAHE)**:
   - Input images undergo Contrast Limited Adaptive Histogram Equalization on the Luminance ($L$) channel in LAB color space to reveal subtle surface scratches without amplifying noise.

3. **Data Augmentation Strategies**:
   - Random Affine Translations ($\pm 5\%$), Multi-angle Rotations ($\pm 15^\circ$), Perspective Jitter, Brightness Scaling ($\pm 12\%$), and Gaussian Blur ($k=3$) to ensure illumination invariance on factory lines.
