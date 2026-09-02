"""
VisionInspect AI - Milestone 2 OpenCV Image Preprocessing Service
Provides algorithms for Gaussian noise reduction, CLAHE contrast enhancement,
Canny edge detection, and Region of Interest (ROI) extraction.
"""

def get_preprocessing_specs():
    return {
        "pipeline": [
            {
                "step": 1,
                "name": "Image Resizing & Normalization",
                "algorithm": "Bilinear Interpolation (640x640) & Pixel Normalization [0, 1]",
                "purpose": "Standardizes input format for YOLOv8 neural network tensor input."
            },
            {
                "step": 2,
                "name": "Gaussian Denoising Filter",
                "algorithm": "Gaussian Blur (Kernel size 5x5, Sigma=1.5)",
                "purpose": "Eliminates high-frequency industrial camera sensor noise while retaining defect edges."
            },
            {
                "step": 3,
                "name": "CLAHE Contrast Enhancement",
                "algorithm": "Contrast Limited Adaptive Histogram Equalization (ClipLimit=3.0, TileGrid=8x8)",
                "purpose": "Amplifies subtle surface micro-cracks and scratch details under non-uniform factory lighting."
            },
            {
                "step": 4,
                "name": "Canny Edge Detection & ROI",
                "algorithm": "Canny Thresholding (T_low=50, T_high=150) + Morphological Gradient",
                "purpose": "Isolates functional component contours and flags structural boundary anomalies."
            }
        ]
    }
