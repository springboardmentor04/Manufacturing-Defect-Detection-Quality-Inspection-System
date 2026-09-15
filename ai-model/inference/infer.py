import time
import torch
import torch.nn.functional as F
import json
from pathlib import Path

from config.config import config
from .model_loader import ModelLoader
from .validator import ImageValidator
from .prediction import Preprocessor
from .postprocess import PostProcessor
from .result import PredictionResult
from utils.logger import logger

class InferenceEngine:
    def __init__(self):
        self.model_loader = ModelLoader()
        self.device = self.model_loader.device
        self.preprocessor = Preprocessor()
        
        proto_file = Path(__file__).resolve().parents[1] / "config" / "prototypes.json"
        if proto_file.exists():
            with open(proto_file, 'r') as f:
                prototypes = json.load(f)
            self.prototypes = {k: torch.tensor(v).to(self.device) for k, v in prototypes.items()}
        else:
            self.prototypes = None
            
        defect_proto_file = Path(__file__).resolve().parents[1] / "config" / "defect_prototypes.json"
        if defect_proto_file.exists():
            with open(defect_proto_file, 'r') as f:
                defect_prototypes = json.load(f)
            self.defect_prototypes = {}
            for cat, defects in defect_prototypes.items():
                self.defect_prototypes[cat] = {k: torch.tensor(v).to(self.device) for k, v in defects.items()}
        else:
            self.defect_prototypes = None
            
        # Load KNN defect classifiers
        self.defect_clfs = {}
        clf_dir = Path(__file__).resolve().parents[1] / "weights" / "defect_classifiers"
        if clf_dir.exists():
            import pickle
            for p in clf_dir.glob("*_clf.pkl"):
                cat = p.name.split("_")[0]
                with open(p, "rb") as f:
                    self.defect_clfs[cat] = pickle.load(f)
        
        
    def infer(self, image_path: str, category: str) -> PredictionResult:
        try:
            # 1. Validate Image
            ImageValidator.validate(image_path)
            
            # 2. Preprocess
            input_tensor = self.preprocessor.preprocess(image_path).to(self.device)
            
            # 3. Model Inference
            start_time = time.perf_counter()
            model = self.model_loader.load_model(category)
            
            with torch.no_grad():
                outputs = model(input_tensor)
                
                # Calculate MSE between Teacher and Student feature maps
                teacher_features = outputs.get("teacher")
                student_features = outputs.get("student")
                
                # Zero-shot classification to ensure correct category was uploaded
                if teacher_features is not None and self.prototypes is not None:
                    feat = teacher_features.mean(dim=(2, 3))
                    best_cat = None
                    best_sim = -1
                    
                    for k, p_tensor in self.prototypes.items():
                        sim = F.cosine_similarity(feat, p_tensor.unsqueeze(0)).item()
                        if sim > best_sim:
                            best_sim = sim
                            best_cat = k
                            
                    if best_cat != category:
                        raise ValueError(f"Uploaded image appears to be '{best_cat}', not '{category}'. Please select the correct category.")
                
                if teacher_features is not None and student_features is not None:
                    # Anomaly score is the Max Spatial MSE Error for this image
                    # Compute MSE per channel, then mean across channels, then max across spatial
                    err = torch.pow(student_features - teacher_features, 2)
                    anomaly_score = err.mean(dim=1).max().item()
                else:
                    # Fallback if architecture is incorrect
                    anomaly_score = 0.0
                    
            end_time = time.perf_counter()
            processing_time_ms = (end_time - start_time) * 1000
            
            # 4. Post Processing
            # Now we use the proper dynamic threshold
            prediction, confidence, severity = PostProcessor.process(anomaly_score, category=category)
            
            defect_type = "None"
            if prediction == "FAIL":
                if category in self.defect_clfs:
                    # Use fast KNN/LR classifier
                    feat = teacher_features.mean(dim=(2, 3)).squeeze().cpu().numpy()
                    defect_type = self.defect_clfs[category].predict([feat])[0]
                elif self.defect_prototypes and category in self.defect_prototypes:
                    # Fallback to prototypes
                    err = torch.pow(student_features - teacher_features, 2)
                    feat = err.amax(dim=(2, 3))
                    best_sim = -1
                    for defect_name, p_tensor in self.defect_prototypes[category].items():
                        sim = F.cosine_similarity(feat, p_tensor.unsqueeze(0)).item()
                        if sim > best_sim:
                            best_sim = sim
                            defect_type = defect_name.replace("_", " ").title()
            
            # 5. Result
            result = PredictionResult(
                category=category,
                prediction=prediction,
                confidence=confidence,
                anomaly_score=round(anomaly_score, 4),
                processing_time_ms=round(processing_time_ms, 2),
                model_version=getattr(config, 'MODEL_VERSION', '1.0'),
                device=str(self.device).upper(),
                image_size=config.INPUT_SIZE,
                status="SUCCESS",
                defect_type=defect_type,
                severity=severity
            )
            
            # Logging
            logger.info(f"Inference - Image: {Path(image_path).name}, Category: {category}, Pred: {prediction}, Conf: {confidence}%, Score: {anomaly_score:.4f}, Time: {processing_time_ms:.2f}ms")
            
            return result
            
        except Exception as e:
            logger.error(f"Inference failed for {image_path}: {e}")
            return PredictionResult(
                category=category,
                prediction="ERROR",
                confidence=0.0,
                anomaly_score=0.0,
                processing_time_ms=0.0,
                model_version=getattr(config, 'MODEL_VERSION', '1.0'),
                device=str(getattr(config, 'INFERENCE_DEVICE', "cpu")).upper(),
                image_size=config.INPUT_SIZE,
                status=f"ERROR: {str(e)}"
            )
