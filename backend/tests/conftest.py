import pytest_asyncio
import logging
from backend.core.database import connect_to_mongo, close_mongo_connection

logger = logging.getLogger(__name__)

@pytest_asyncio.fixture
async def setup_db():
    try:
        await connect_to_mongo()
    except Exception as e:
        logger.warning(f"Could not connect to MongoDB in test runner: {e}")
    yield
    try:
        await close_mongo_connection()
    except Exception:
        pass
