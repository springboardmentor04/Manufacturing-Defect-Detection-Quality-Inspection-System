"""
MongoDB connection setup using Motor (async driver).

NOTE: We explicitly pass certifi's CA bundle via tlsCAFile. This fixes a
common Windows issue where Python's default SSL certificate store is
outdated/incompatible with MongoDB Atlas, causing:

    pymongo.errors.ServerSelectionTimeoutError: SSL handshake failed:
    [SSL: TLSV1_ALERT_INTERNAL_ERROR] tlsv1 alert internal error

If you don't need this (e.g. running MongoDB locally without TLS), it's
still safe to leave in - it only affects TLS connections.
"""
import certifi
from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings

client = AsyncIOMotorClient(settings.MONGO_URI, tlsCAFile=certifi.where())
database = client[settings.DB_NAME]

# Collections used across the app
users_collection = database["users"]
inspections_collection = database["inspections"]


async def create_indexes():
    """Create required indexes. Called once at startup."""
    await users_collection.create_index("email", unique=True)
    await inspections_collection.create_index("uploaded_by")
    await inspections_collection.create_index("created_at")