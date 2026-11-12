import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from backend.core.config import settings

async def clear_database():
    print(f"Connecting to MongoDB Atlas database: {settings.DATABASE_NAME}...")
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.DATABASE_NAME]

    collections = await db.list_collection_names()
    print(f"Found {len(collections)} collections to clear: {collections}")

    for coll_name in collections:
        if not coll_name.startswith("system."):
            res = await db[coll_name].delete_many({})
            print(f"  - Cleared {coll_name}: {res.deleted_count} documents removed.")

    print("\nDatabase completely emptied.")
    client.close()

if __name__ == "__main__":
    asyncio.run(clear_database())

