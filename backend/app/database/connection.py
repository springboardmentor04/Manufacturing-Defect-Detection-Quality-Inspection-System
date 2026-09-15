# pyrefly: ignore [missing-import]
from motor.motor_asyncio import AsyncIOMotorClient
from app.config.settings import settings

class Database:
    """
    MongoDB Database connection manager using Motor.
    """
    client: AsyncIOMotorClient = None

db = Database()

async def connect_to_mongo():
    """
    Create database connection on application startup.
    """
    
    import certifi
    db.client = AsyncIOMotorClient(settings.MONGODB_URL, tlsCAFile=certifi.where())
    
    # Create indexes for frequently queried fields in Dashboard and History
    database = db.client[settings.DATABASE_NAME]
    await database.inspections.create_index("status")
    await database.inspections.create_index("engineer_id")
    await database.inspections.create_index([("upload_time", -1)])
    await database.inspections.create_index("dataset_category")
    
    print(f"Connected to MongoDB at {settings.MONGODB_URL}")
async def close_mongo_connection():
    """
    Close database connection on application shutdown.
    """
    if db.client:
        db.client.close()
        print("MongoDB connection closed")

def get_database():
    """
    Dependency to retrieve the database instance.
    """
    return db.client[settings.DATABASE_NAME]
