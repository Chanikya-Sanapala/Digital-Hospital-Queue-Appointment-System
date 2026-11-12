import logging
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from backend.core.config import settings

logger = logging.getLogger("queuesense.database")

class Database:
    client: AsyncIOMotorClient = None
    db: AsyncIOMotorDatabase = None

db_instance = Database()

async def connect_to_mongo():
    logger.info("Connecting to MongoDB Atlas...")
    db_instance.client = AsyncIOMotorClient(
        settings.MONGODB_URI,
        serverSelectionTimeoutMS=5000,
        maxPoolSize=50,
        minPoolSize=10
    )
    db_instance.db = db_instance.client[settings.DATABASE_NAME]
    
    # Ping database to verify connection
    await db_instance.client.admin.command('ping')
    logger.info("Connected successfully to MongoDB Atlas!")
    
    # Initialize indexes
    await init_indexes()

async def close_mongo_connection():
    if db_instance.client:
        logger.info("Closing MongoDB Atlas connection...")
        db_instance.client.close()
        logger.info("MongoDB connection closed.")

def get_database() -> AsyncIOMotorDatabase:
    return db_instance.db

async def init_indexes():
    db = db_instance.db
    try:
        # Users indexes
        await db.users.create_index("email", unique=True)
        await db.users.create_index("username", unique=True)
        await db.users.create_index("mobile", unique=True, sparse=True)
        await db.users.create_index("google_sub", unique=True, sparse=True)
        
        # Organizations indexes
        await db.organizations.create_index("code", unique=True)
        
        # Appointments indexes
        await db.appointments.create_index([("organization_id", 1), ("department_id", 1), ("appointment_date", 1)])
        await db.appointments.create_index("user_id")
        
        # Queue tokens indexes
        await db.queue_tokens.create_index([("organization_id", 1), ("department_id", 1), ("token_number", 1)])
        await db.queue_tokens.create_index([("organization_id", 1), ("department_id", 1), ("status", 1)])
        await db.queue_tokens.create_index("appointment_id", unique=True, sparse=True)
        await db.queue_tokens.create_index("user_id")
        
        # OTP verification index with TTL
        await db.otp_verifications.create_index("email")
        await db.otp_verifications.create_index("expires_at", expireAfterSeconds=0)
        
        # Audit logs index
        await db.audit_logs.create_index("timestamp")
        
        logger.info("MongoDB indexes verified / created successfully.")
    except Exception as e:
        logger.warning(f"Note on initializing indexes: {e}")

