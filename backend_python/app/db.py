from motor.motor_asyncio import AsyncIOMotorClient
from app.config import MONGODB_URI

class DatabaseManager:
    client: AsyncIOMotorClient = None
    db = None

db_manager = DatabaseManager()

async def connect_db():
    print(f"[FastAPI MongoDB] Connecting to MongoDB...")
    db_manager.client = AsyncIOMotorClient(MONGODB_URI)
    # Get database name from URI or default to "visioninspect"
    db_name = "visioninspect"
    db_manager.db = db_manager.client[db_name]
    print("[FastAPI MongoDB] Connected successfully!")

async def close_db():
    if db_manager.client:
        db_manager.client.close()
        print("[FastAPI MongoDB] Connection closed.")

def get_db():
    return db_manager.db

# Collection accessors
def get_users_col():
    return db_manager.db["users"]

def get_batches_col():
    return db_manager.db["inspectionBatches"]

def get_products_col():
    return db_manager.db["products"]

def get_images_col():
    return db_manager.db["inspectionImages"]

def get_model_runs_col():
    return db_manager.db["modelRuns"]

def get_findings_col():
    return db_manager.db["findings"]

def get_manual_reviews_col():
    return db_manager.db["manualReviews"]

def get_quality_reports_col():
    return db_manager.db["qualityReports"]
