import sys
import asyncio
from pathlib import Path
import os
import json

backend_root = Path(__file__).resolve().parents[1]
sys.path.append(str(backend_root))

from app.services.real_ai_service import RealAIService
from app.config.settings import settings
import logging

logging.basicConfig(level=logging.INFO)

class MockDB:
    class Inspections:
        def __init__(self):
            self.store = {}
            
        async def update_one(self, query, update):
            _id = query["inspection_id"]
            if _id not in self.store:
                self.store[_id] = {}
            if "$set" in update:
                self.store[_id].update(update["$set"])
                
        async def find_one(self, query):
            _id = query["inspection_id"]
            return self.store.get(_id)
            
    def __init__(self):
        self.inspections = self.Inspections()

async def test_integration():
    print("Testing YOLO Integration...")
    # Enable Real AI
    settings.USE_REAL_AI = True
    
    db = MockDB()
    service = RealAIService()
    
    # We need an image path. Let's use something from the dataset.
    project_root = backend_root.parent
    test_img = project_root / "ai-model" / "yolo" / "dataset" / "images" / "test" / "cable_missing_cable_001.png"
    
    if not test_img.exists():
        print(f"Test image not found at {test_img}. Please make sure it exists.")
        return
        
    insp_id = "test_insp_001"
    
    # Pre-populate MockDB
    db.inspections.store[insp_id] = {
        "inspection_id": insp_id,
        "image_path": str(test_img),
        "dataset_category": "cable"
    }
    
    print(f"Running inference on {test_img}")
    result = await service.process_inspection(insp_id, db)
    
    print("\nAPI Response:")
    print(json.dumps(result, indent=2))
    
    print("\nDB Record:")
    print(json.dumps(db.inspections.store[insp_id], indent=2, default=str))

if __name__ == "__main__":
    asyncio.run(test_integration())
