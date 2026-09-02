import os
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

# Load environment variables from .env file
load_dotenv()

DEFAULT_MONGO_URI = "mongodb+srv://raiayushi381_db_user:kCDk1hl4iSAuncQ9@resume-cluster.xe3wokx.mongodb.net/?appName=resume-cluster"

MONGODB_URL = os.getenv("MONGODB_URL", DEFAULT_MONGO_URI)
DATABASE_NAME = os.getenv("DATABASE_NAME", "visioninspect_db")

class Database:
    client: AsyncIOMotorClient = None
    db = None

db_instance = Database()

async def connect_to_mongo():
    try:
        db_instance.client = AsyncIOMotorClient(MONGODB_URL, serverSelectionTimeoutMS=5000)
        db_instance.db = db_instance.client[DATABASE_NAME]
        # Test connection & create index on users collection
        await db_instance.db["users"].create_index("email", unique=True)
        print(f"Successfully connected to MongoDB Atlas database: {DATABASE_NAME}")
    except Exception as e:
        print(f"MongoDB Atlas Connection Info: {e}")

async def close_mongo_connection():
    if db_instance.client:
        db_instance.client.close()
        print("MongoDB Atlas connection closed.")

def get_database():
    return db_instance.db
