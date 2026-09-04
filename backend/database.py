"""MongoDB connection configuration for the FastAPI service."""

from motor.motor_asyncio import AsyncIOMotorClient

try:
    from .config import required_setting
except ImportError:  # pragma: no cover - supports running from backend/
    from config import required_setting


MONGODB_URL = required_setting("MONGODB_URL")
DATABASE_NAME = required_setting("DATABASE_NAME")

client = AsyncIOMotorClient(MONGODB_URL, serverSelectionTimeoutMS=10_000)
db = client[DATABASE_NAME]


async def get_database():
    return db
