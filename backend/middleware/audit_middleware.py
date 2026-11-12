import time
from datetime import datetime, timezone
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from backend.core.database import get_database
import logging

logger = logging.getLogger("queuesense.audit")

class AuditMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        response = await call_next(request)
        process_time = time.time() - start_time
        
        # Log write operations (POST, PUT, PATCH, DELETE) asynchronously
        if request.method in ["POST", "PUT", "PATCH", "DELETE"] and not request.url.path.startswith("/api/auth/send-otp"):
            try:
                db = get_database()
                if db is not None:
                    client_ip = request.client.host if request.client else "unknown"
                    user_sub = None
                    auth_header = request.headers.get("Authorization")
                    if auth_header and auth_header.startswith("Bearer "):
                        # Quick non-blocking payload peek or skip
                        pass
                    
                    await db.audit_logs.insert_one({
                        "method": request.method,
                        "path": request.url.path,
                        "status_code": response.status_code,
                        "ip_address": client_ip,
                        "duration_ms": round(process_time * 1000, 2),
                        "timestamp": datetime.now(timezone.utc)
                    })
            except Exception as e:
                logger.warning(f"Failed to record audit log: {e}")
                
        return response

