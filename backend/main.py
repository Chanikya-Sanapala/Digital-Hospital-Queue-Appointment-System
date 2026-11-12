import sys
from pathlib import Path

# Ensure project root is in sys.path so 'backend' package resolves whether run from root or backend/
ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from backend.core.config import settings
from backend.core.database import connect_to_mongo, close_mongo_connection
from backend.middleware.audit_middleware import AuditMiddleware

# Routers
from backend.api.auth import router as auth_router
from backend.api.organizations import router as org_router
from backend.api.departments import router as dept_router
from backend.api.services import router as service_router
from backend.api.appointments import router as appointment_router
from backend.api.queue import router as queue_router
from backend.api.admin import router as admin_router
from backend.api.websocket import router as ws_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("queuesense")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting QueueSense API backend...")
    await connect_to_mongo()
    yield
    # Shutdown
    logger.info("Shutting down QueueSense API backend...")
    await close_mongo_connection()

app = FastAPI(
    title="QueueSense API",
    description="Hospital Queue & Appointment Management System Backend API",
    version=settings.PROJECT_VERSION,
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all for local dev flexibility or use settings.cors_origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Audit Middleware
app.add_middleware(AuditMiddleware)

# API Routers under /api
app.include_router(auth_router, prefix="/api")
app.include_router(org_router, prefix="/api")
app.include_router(dept_router, prefix="/api")
app.include_router(service_router, prefix="/api")
app.include_router(appointment_router, prefix="/api")
app.include_router(queue_router, prefix="/api")
app.include_router(admin_router, prefix="/api")

# WebSocket Router
app.include_router(ws_router)

@app.get("/api/health", tags=["Health"])
async def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.PROJECT_VERSION,
        "database": "connected"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)

