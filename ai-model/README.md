# VisionInspect AI - Model Architecture

This directory (`ai-model/`) is the foundation for the real AI-powered anomaly detection model for the VisionInspect AI platform.

## Folder Structure

```
ai-model/
│
├── config/         # Centralized configuration settings and variables (Device, Paths, Configs)
├── dataset/        # Data loading, management, and dataset validation logic
├── preprocessing/  # Image transformation, resizing, tensor conversion, and data pipelines
├── models/         # (Future) Deep learning model architecture definitions
├── inference/      # (Future) Inference engine for production predictions
├── weights/        # (Future) Pre-trained model weights (e.g., .pth files)
├── utils/          # Utility scripts including centralized logging
├── logs/           # Output directory for application logs and AI events
├── scripts/        # Standalone scripts like AI health checks
├── tests/          # Unit tests and validation scripts for the AI module
├── requirements.txt # Dependencies specific strictly to the AI pipeline
└── README.md       # This documentation file
```

## Dataset Flow

1. **Validation**: The dataset directory is checked by `DatasetValidator` to ensure all categories and required splits (`train`, `test`, `ground_truth`) exist.
2. **Management**: `DatasetManager` provides an interface to query statistics, list categories, and check dataset health.
3. **Loading**: The PyTorch `Dataset` implementation (`loader.py`) reads images from disk and prepares them.
4. **Preprocessing**: The `PreprocessingPipeline` converts images to tensors, resizes them, and normalizes them for the network.

## Future Training Workflow

1. A standalone training script (to be added in `scripts/`) will utilize `DatasetManager` to fetch training splits.
2. The PyTorch models (in `models/`) will be instantiated.
3. Training loops will calculate loss against ground truth masks and save weights into the `weights/` directory.

## Future Inference Workflow

1. The inference engine (`inference/`) will load model architectures and their trained weights.
2. The backend will forward uploaded images to the AI module.
3. Preprocessing will prepare the image.
4. The inference module will output predictions, bounding boxes, or anomaly scores.

## AI Service Integration

The application backend currently utilizes a `MockAIService` within `backend/app/services/ai_service.py` to simulate delay, confidence, and inspection results. 

A `RealAIService` placeholder is introduced, inheriting from `BaseAIService`. In the future, switching from the Mock AI to the Real AI will be accomplished simply by toggling an environment or configuration variable, requiring no changes to the external REST API or Database schemas. The frontend dashboards will remain unaffected as the real model produces the same payload contract.
