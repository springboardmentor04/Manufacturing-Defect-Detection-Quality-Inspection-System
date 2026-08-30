import asyncio
import certifi
import sys
import os
import cv2
import numpy as np
from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings

async def check():
    client = AsyncIOMotorClient(settings.MONGO_URI, tlsCAFile=certifi.where())
    db = client[settings.DB_NAME]
    
    doc = await db.inspections.find_one({"product_name": "MVTec - screw", "batch_number": "good"})
    if not doc:
        print("No good screw found in DB")
        return
        
    print("--- Reprocessed Screw Details ---")
    print(f"ID: {doc['_id']}")
    print(f"Status: {doc['status']}")
    print(f"Anomaly Ratio: {doc.get('anomaly_ratio')}")
    print(f"Confidence: {doc.get('confidence_score')}")
    print(f"Model used: {doc.get('model_used')}")
    print(f"ANOMALY_FAIL_RATIO setting: {settings.ANOMALY_FAIL_RATIO}")
    print(f"ANOMALY_Z_THRESHOLD setting: {settings.ANOMALY_Z_THRESHOLD}")
    
    # Let's perform a manual check of the calculation for this file
    file_path = os.path.join("uploads", doc["image_filename"])
    if os.path.exists(file_path):
        from app.services.image_processing import preprocess_image
        test_img = preprocess_image(file_path, size=settings.REFERENCE_IMAGE_SIZE)
        
        # Load reference
        from app.services.defect_detection import _cache_paths
        mean_path, std_path = _cache_paths("screw")
        if mean_path.exists() and std_path.exists():
            mean_img = np.load(mean_path)
            std_img = np.load(std_path)
            
            z_scores = np.abs(test_img - mean_img) / std_img
            mask = z_scores > settings.ANOMALY_Z_THRESHOLD
            calc_ratio = float(mask.mean())
            print(f"\nManual calculation:")
            print(f"  Calculated Anomaly Ratio: {calc_ratio}")
            print(f"  Max Z-score: {z_scores.max()}")
            print(f"  Mean Z-score: {z_scores.mean()}")
            print(f"  Std Z-score: {z_scores.std()}")
        else:
            print("Reference files for screw not found in cache")
    else:
        print(f"Image file {file_path} is missing from disk")

if __name__ == '__main__':
    asyncio.run(check())
