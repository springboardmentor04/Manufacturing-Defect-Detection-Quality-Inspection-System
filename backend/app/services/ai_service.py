import asyncio
import random
from datetime import datetime
from abc import ABC, abstractmethod
from ..config.settings import settings

class BaseAIService(ABC):
    @abstractmethod
    async def process_inspection(self, inspection_id: str, db):
        pass

class MockAIService(BaseAIService):
    def __init__(self):
        self.defect_types = [
            "Scratch", "Dent", "Crack", "Hole", "Discoloration", "Contamination", "No Defect"
        ]
        self.severities = ["Low", "Medium", "High"]

    async def process_inspection(self, inspection_id: str, db):
        """
        Simulates AI processing of an inspection image.
        """
        # Step 1: Simulate Processing Delay (2-5 seconds)
        # We first mark the status as Processing (the route handles this or we can do it here)
        await db.inspections.update_one(
            {"inspection_id": inspection_id},
            {"$set": {"status": "Processing", "ai_status": "Analyzing..."}}
        )
        
        delay = random.uniform(2.0, 5.0)
        await asyncio.sleep(delay)
        
        # Step 2: Generate Mock Results
        defect_type = random.choice(self.defect_types)
        
        if defect_type == "No Defect":
            status = "PASS"
            severity = "Low"
            # Higher confidence for PASS
            confidence = random.uniform(90.0, 99.0)
        else:
            # 80% chance of FAIL if there is a defect
            status = "FAIL" if random.random() < 0.8 else "PASS"
            severity = random.choice(self.severities)
            confidence = random.uniform(80.0, 99.0)

        completed_at = datetime.utcnow()
        
        # Step 3: Update Database
        update_data = {
            "status": "Completed",
            "ai_status": "Completed",
            "inspection_result": status,
            "confidence": round(confidence, 2),
            "defect_type": defect_type,
            "severity": severity,
            "completed_at": completed_at,
            "processing_time": round(delay, 2)
        }
        
        await db.inspections.update_one(
            {"inspection_id": inspection_id},
            {"$set": update_data}
        )
        
        return update_data

def get_ai_service():
    if settings.USE_REAL_AI:
        from app.services.real_ai_service import RealAIService
        return RealAIService()
    return MockAIService()

# Create a singleton instance using the config switch
mock_ai_service = get_ai_service()
