"""
Reprocesses all inspections currently stored in the database.
Runs both the quality analysis, defect detection, and severity assessment pipelines,
generating quality reports, anomaly ratios, confidence scores, defect heatmaps,
severity scores, and quality recommendations.
"""
import asyncio
import os
from pathlib import Path
from app.database import inspections_collection
from app.config import settings
from app.services.defect_detection import predict_defect
from app.services.image_processing import analyze_quality
from app.services.severity_assessment import calculate_severity


async def reprocess_all():
    query = {}
    cursor = inspections_collection.find(query)
    count = 0
    async for doc in cursor:
        file_path = os.path.join(settings.UPLOAD_DIR, doc["image_filename"])
        if not os.path.exists(file_path):
            print(f"File missing: {file_path}")
            continue

        # Run quality report
        try:
            quality_report = analyze_quality(file_path)
            img_w = quality_report.get("width", 256)
            img_h = quality_report.get("height", 256)
        except Exception as e:
            print(f"Quality analysis failed for {doc['_id']}: {e}")
            quality_report = None
            img_w, img_h = 256, 256

        # Run defect detection
        try:
            prediction = predict_defect(file_path, doc["product_name"])
            status = prediction["status"]
            confidence_score = prediction["confidence_score"]
            anomaly_ratio = prediction["anomaly_ratio"]
            bounding_boxes = prediction["bounding_boxes"]
            heatmap_filename = prediction["heatmap_filename"]
            model_used = prediction["model_used"]
            defect_type = prediction["defect_type"]
        except Exception as e:
            print(f"Defect prediction failed for {doc['_id']}: {e}")
            status = doc["status"]
            confidence_score = doc.get("confidence_score")
            anomaly_ratio = doc.get("anomaly_ratio")
            bounding_boxes = doc.get("bounding_boxes", [])
            heatmap_filename = doc.get("heatmap_filename")
            model_used = doc.get("model_used")
            defect_type = doc.get("defect_type")

        # Preserve MVTec ground-truth defect_type (e.g. "broken_large")
        # instead of overwriting it with the model's own guess.
        if doc.get("source") == "mvtec_ad_dataset" and doc.get("defect_type"):
            defect_type = doc["defect_type"]

        # Recalculate severity assessment with final defect_type
        severity_assessment = calculate_severity(
            status=status,
            anomaly_ratio=anomaly_ratio,
            bounding_boxes=bounding_boxes,
            defect_type=defect_type,
            confidence_score=confidence_score,
            image_width=img_w,
            image_height=img_h,
        )

        updates = {
            "status": status,
            "quality_report": quality_report,
            "anomaly_ratio": anomaly_ratio,
            "bounding_boxes": bounding_boxes,
            "heatmap_filename": heatmap_filename,
            "model_used": model_used,
            "confidence_score": confidence_score,
            "defect_type": defect_type,
            "severity_score": severity_assessment["severity_score"],
            "severity_level": severity_assessment["severity_level"],
            "quality_recommendation": severity_assessment["quality_recommendation"],
            "severity_details": severity_assessment["severity_details"],
        }
        await inspections_collection.update_one({"_id": doc["_id"]}, {"$set": updates})
        count += 1
        print(
            f"Reprocessed {count}: {doc['product_name']} -> Status: {status}, Severity: {severity_assessment['severity_score']} ({severity_assessment['severity_level']})"
        )


if __name__ == "__main__":
    asyncio.run(reprocess_all())