import sys
import logging
from pathlib import Path
from datetime import datetime
from typing import Dict, Any

from app.services.ai_service import BaseAIService
from app.config.settings import settings
from app.services.image_analytics import analyze_image_quality, calculate_inspection_analytics
from app.services.defect_categorizer import categorize, categorize_detections
from app.services.severity_scorer import calculate_severity, get_severity_level, get_quality_risk_action

logger = logging.getLogger(__name__)

backend_root = Path(__file__).resolve().parents[2]
project_root = backend_root.parent
ai_model_path = project_root / "ai-model"
sys.path.append(str(ai_model_path))

try:
    from inference.yolo_infer import YOLOInferenceEngine
except ImportError as e:
    logger.error(f"Failed to import YOLO engine modules: {e}")
    YOLOInferenceEngine = None

class RealAIService(BaseAIService):
    def __init__(self):
        logger.info("Initializing RealAIService with YOLO...")
        if YOLOInferenceEngine:
            self.engine = YOLOInferenceEngine()
        else:
            logger.error("YOLOInferenceEngine not available.")
            self.engine = None

    async def process_inspection(self, inspection_id: str, db) -> Dict[str, Any]:
        logger.info(f"RealAIService: Starting YOLO inference for {inspection_id}")
        
        await db.inspections.update_one(
            {"inspection_id": inspection_id},
            {"$set": {"status": "Processing", "ai_status": "Analyzing..."}}
        )
        
        try:
            inspection = await db.inspections.find_one({"inspection_id": inspection_id})
            if not inspection:
                raise ValueError(f"Inspection {inspection_id} not found")
                
            image_path_rel = inspection.get("image_path")
            category = inspection.get("dataset_category")
            
            if not image_path_rel:
                raise ValueError("Missing image_path in inspection record")
                
            if image_path_rel.startswith("/"):
                image_path_rel = image_path_rel[1:]
                
            image_path_abs = (backend_root / image_path_rel).resolve()
                 
            if not image_path_abs.exists():
                raise FileNotFoundError(f"Image not found at {image_path_rel}")
                
            # Phase 2 & 3: Image Quality Analysis
            image_quality = analyze_image_quality(str(image_path_abs))
                
            if not self.engine:
                raise RuntimeError("YOLOInferenceEngine not loaded")
                
            import asyncio
            loop = asyncio.get_running_loop()
            result = await loop.run_in_executor(
                None, 
                self.engine.infer, 
                str(image_path_abs), 
                category
            )
            
            if result["status"].startswith("ERROR"):
                raise RuntimeError(result["status"])
                
            # Response Mapper logic inline for simplicity since YOLO returns dict
            primary_defect = result["defect_type"]
            cat_result = categorize(primary_defect)
            defect_category = cat_result["defect_category"]
            
            # Process detections
            raw_detections = result.get("detections", [])
            categorized_detections = categorize_detections(raw_detections)
            
            # Milestone 3B: Severity Scoring
            highest_risk_score = -1.0
            highest_risk_detection = None
            
            for det in categorized_detections:
                sev_calc = calculate_severity(det)
                det.update(sev_calc)
                det["severity_level"] = get_severity_level(det["final_score"])
                
                if det["final_score"] > highest_risk_score:
                    highest_risk_score = det["final_score"]
                    highest_risk_detection = det
            
            overall_severity_score = None
            overall_severity_level = None
            overall_severity_components = None
            quality_risk = None
            recommended_action = None
            
            if result["prediction"] == "FAIL" and highest_risk_detection:
                overall_severity_score = highest_risk_detection["final_score"]
                overall_severity_level = highest_risk_detection["severity_level"]
                overall_severity_components = {
                    "size_score": highest_risk_detection["size_score"],
                    "location_score": highest_risk_detection["location_score"],
                    "defect_type_score": highest_risk_detection["defect_type_score"],
                    "confidence_score": highest_risk_detection["confidence_score"]
                }
                
                risk_action = get_quality_risk_action(overall_severity_level, highest_risk_detection["confidence_score"])
                quality_risk = risk_action["quality_risk"]
                recommended_action = risk_action["recommended_action"]
            
            api_response = {
                "status": "SUCCESS",
                "prediction": result["prediction"],
                "confidence": round(result["confidence"], 2),
                "processing_time_ms": int(result["processing_time_ms"]),
                "model_version": result["model_version"],
                "category": result["category"],
                "inspection_id": inspection_id,
                "timestamp": datetime.utcnow().isoformat(),
                "device": result["device"],
                "defect_type": primary_defect,
                "defect_category": defect_category,
                "severity": overall_severity_level if overall_severity_level else result.get("severity"),
                "bounding_boxes": result["bounding_boxes"],
                "segmentation_masks": result["segmentation_masks"],
                "detections": categorized_detections,
                "severity_score": overall_severity_score,
                "severity_level": overall_severity_level,
                "severity_components": overall_severity_components,
                "quality_risk": quality_risk,
                "recommended_action": recommended_action
            }
            
            # Phase 4: Image Analytics Workflow
            image_analytics = calculate_inspection_analytics(image_quality, api_response)
            
            completed_at = datetime.utcnow()
            
            update_data = {
                "status": "Completed",
                "ai_status": "Completed",
                "inspection_result": api_response["prediction"],
                "confidence": api_response["confidence"],
                "processing_time": round(api_response["processing_time_ms"] / 1000, 2),
                "model_version": api_response["model_version"],
                "completed_at": completed_at,
                "device": api_response["device"],
                "defect_type": api_response["defect_type"],
                "defect_category": api_response["defect_category"],
                "severity": api_response["severity"],
                "bounding_boxes": api_response["bounding_boxes"],
                "segmentation_masks": api_response["segmentation_masks"],
                "detections": api_response["detections"],
                "severity_score": api_response["severity_score"],
                "severity_level": api_response["severity_level"],
                "severity_components": api_response["severity_components"],
                "quality_risk": api_response["quality_risk"],
                "recommended_action": api_response["recommended_action"],
                "api_response": api_response,
                "image_quality": image_quality,
                "image_analytics": image_analytics
            }
            
            await db.inspections.update_one(
                {"inspection_id": inspection_id},
                {"$set": update_data}
            )
            
            logger.info(f"RealAIService: YOLO Inference complete for {inspection_id}")
            return api_response
            
        except Exception as e:
            logger.error(f"RealAIService Error for {inspection_id}: {str(e)}", exc_info=True)
            
            error_msg = str(e)
            # If it's a category mismatch, provide an actionable status
            error_data = {
                "status": "Failed",
                "ai_status": "Failed",
                "error_message": error_msg,
                "completed_at": datetime.utcnow()
            }
            
            await db.inspections.update_one(
                {"inspection_id": inspection_id},
                {"$set": error_data}
            )
            return error_data
