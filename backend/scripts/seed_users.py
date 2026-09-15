import asyncio
import os
import sys

# Add parent directory to path so we can import app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from motor.motor_asyncio import AsyncIOMotorClient
from app.config.settings import settings
from app.utils.security import get_password_hash

async def seed_users():
    print(f"Connecting to MongoDB at {settings.MONGODB_URL}")
    import certifi
    client = AsyncIOMotorClient(settings.MONGODB_URL, tlsCAFile=certifi.where())
    db = client[settings.DATABASE_NAME]
    users_collection = db["users"]

    # Clear existing users
    await users_collection.delete_many({})
    print("Cleared existing users.")

    users = [
        {
            "name": "Quality Engineer",
            "email": "engineer@visioninspect.ai",
            "hashed_password": get_password_hash("engineer123"),
            "role": "engineer",
            "is_active": True,
        },
        {
            "name": "Factory Supervisor",
            "email": "supervisor@visioninspect.ai",
            "hashed_password": get_password_hash("supervisor123"),
            "role": "supervisor",
            "is_active": True,
        }
    ]

    result = await users_collection.insert_many(users)
    print(f"Successfully inserted {len(result.inserted_ids)} users.")
    
    client.close()
    print("Database connection closed.")

if __name__ == "__main__":
    asyncio.run(seed_users())
