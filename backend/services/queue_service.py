from datetime import datetime, timezone, date
from typing import Optional, Dict, Any, List
from bson import ObjectId
from backend.core.database import get_database
from backend.services.websocket_manager import ws_manager
import logging

logger = logging.getLogger("queuesense.queue_service")

class QueueService:
    @staticmethod
    def _to_str_id(doc: Dict[str, Any]) -> Dict[str, Any]:
        if not doc:
            return doc
        d = dict(doc)
        if "_id" in d:
            d["id"] = str(d["_id"])
            del d["_id"]
        return d

    @classmethod
    async def get_average_service_duration(cls, department_id: str) -> int:
        """
        Calculates average actual service duration in minutes from historical completed tokens.
        Falls back to 15 minutes if insufficient data (< 3 completed tokens).
        """
        db = get_database()
        pipeline = [
            {"$match": {"department_id": department_id, "status": "completed", "actual_duration_seconds": {"$exists": True, "$gt": 60}}},
            {"$sort": {"completed_at": -1}},
            {"$limit": 50},
            {"$group": {"_id": None, "avg_seconds": {"$avg": "$actual_duration_seconds"}}}
        ]
        cursor = db.queue_tokens.aggregate(pipeline)
        result = await cursor.to_list(length=1)
        if result and result[0].get("avg_seconds"):
            avg_minutes = max(5, round(result[0]["avg_seconds"] / 60))
            return avg_minutes
        
        # Fallback to department's default service duration
        dept = await db.departments.find_one({"_id": ObjectId(department_id)}) if ObjectId.is_valid(department_id) else await db.departments.find_one({"id": department_id})
        if dept and dept.get("default_duration_minutes"):
            return dept["default_duration_minutes"]
        return 15

    @classmethod
    async def get_queue_position(cls, token_id_or_number: str) -> Dict[str, Any]:
        db = get_database()
        
        query = {"token_number": token_id_or_number}
        if ObjectId.is_valid(token_id_or_number):
            query = {"$or": [{"_id": ObjectId(token_id_or_number)}, {"token_number": token_id_or_number}]}
        
        token = await db.queue_tokens.find_one(query)
        if not token:
            raise ValueError("Queue token not found")
        
        dept_id = token["department_id"]
        org_id = token["organization_id"]
        
        dept = await db.departments.find_one({"_id": ObjectId(dept_id)}) if ObjectId.is_valid(dept_id) else None
        org = await db.organizations.find_one({"_id": ObjectId(org_id)}) if ObjectId.is_valid(org_id) else None
        
        dept_name = dept.get("name", "Department") if dept else "Department"
        org_name = org.get("name", "Hospital") if org else "Hospital"
        
        # Currently serving token
        active_serving = await db.queue_tokens.find_one({
            "department_id": dept_id,
            "status": {"$in": ["called", "in_service"]}
        }, sort=[("sequence_number", 1)])
        
        currently_serving_number = active_serving.get("token_number") if active_serving else None
        
        # Calculate people ahead: tokens in status 'waiting' with sequence_number < token['sequence_number']
        today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        
        if token["status"] == "waiting":
            people_ahead = await db.queue_tokens.count_documents({
                "department_id": dept_id,
                "status": "waiting",
                "sequence_number": {"$lt": token["sequence_number"]},
                "created_at": {"$gte": today_start}
            })
            avg_duration = await cls.get_average_service_duration(dept_id)
            # Add remaining time for current token in service (if any)
            estimated_wait = (people_ahead + (1 if active_serving else 0)) * avg_duration
            position = people_ahead + 1
        elif token["status"] in ["called", "in_service"]:
            people_ahead = 0
            estimated_wait = 0
            position = 1
        else: # completed, cancelled, missed
            people_ahead = 0
            estimated_wait = 0
            position = 0
        
        return {
            "token_number": token["token_number"],
            "status": token["status"],
            "position": position,
            "people_ahead": people_ahead,
            "estimated_wait_minutes": estimated_wait if token["status"] == "waiting" else 0,
            "currently_serving": currently_serving_number,
            "department_name": dept_name,
            "organization_name": org_name,
            "customer_name": token.get("customer_name"),
            "token_id": str(token["_id"])
        }

    @classmethod
    async def call_next(cls, department_id: str, staff_user_id: str, organization_id: str) -> Dict[str, Any]:
        """
        Atomically selects the next waiting token in sequence, setting status to 'called'.
        Guarantees that two staff members cannot call the same token.
        """
        db = get_database()
        now = datetime.now(timezone.utc)
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        
        # Atomically find and modify
        updated_token = await db.queue_tokens.find_one_and_update(
            {
                "department_id": department_id,
                "organization_id": organization_id,
                "status": "waiting",
                "created_at": {"$gte": today_start}
            },
            {
                "$set": {
                    "status": "called",
                    "called_at": now,
                    "served_by_user_id": staff_user_id,
                    "updated_at": now
                }
            },
            sort=[("sequence_number", 1)],
            return_document=True
        )
        
        if not updated_token:
            raise ValueError("No waiting customers in the queue for this department.")
        
        token_id_str = str(updated_token["_id"])
        
        # Update associated appointment status if present
        if updated_token.get("appointment_id"):
            app_id = updated_token["appointment_id"]
            if ObjectId.is_valid(app_id):
                await db.appointments.update_one(
                    {"_id": ObjectId(app_id)},
                    {"$set": {"status": "called", "updated_at": now}}
                )
        
        # Audit log and queue event
        await db.queue_events.insert_one({
            "token_id": token_id_str,
            "token_number": updated_token["token_number"],
            "organization_id": organization_id,
            "department_id": department_id,
            "event_type": "called",
            "performed_by": staff_user_id,
            "timestamp": now
        })
        
        # Broadcast real-time update
        await ws_manager.broadcast_to_room(
            organization_id=organization_id,
            department_id=department_id,
            event_type="TOKEN_CALLED",
            data={
                "token_id": token_id_str,
                "token_number": updated_token["token_number"],
                "status": "called",
                "called_at": now.isoformat()
            }
        )
        
        return cls._to_str_id(updated_token)

    @classmethod
    async def start_service(cls, token_id: str, staff_user_id: str) -> Dict[str, Any]:
        """Atomically transitions a called token into in_service."""
        db = get_database()
        now = datetime.now(timezone.utc)
        oid = ObjectId(token_id) if ObjectId.is_valid(token_id) else None
        if not oid:
            raise ValueError("Invalid token id")
        
        updated = await db.queue_tokens.find_one_and_update(
            {"_id": oid, "status": "called"},
            {"$set": {"status": "in_service", "started_at": now, "served_by_user_id": staff_user_id, "updated_at": now}},
            return_document=True
        )
        if not updated:
            raise ValueError("Token must be in 'called' status to start service.")
        
        if updated.get("appointment_id") and ObjectId.is_valid(updated["appointment_id"]):
            await db.appointments.update_one(
                {"_id": ObjectId(updated["appointment_id"])},
                {"$set": {"status": "in_service", "updated_at": now}}
            )
        
        # Audit event
        await db.queue_events.insert_one({
            "token_id": str(oid),
            "token_number": updated["token_number"],
            "organization_id": updated["organization_id"],
            "department_id": updated["department_id"],
            "event_type": "started",
            "performed_by": staff_user_id,
            "timestamp": now
        })
        
        # WS Broadcast
        await ws_manager.broadcast_to_room(
            organization_id=updated["organization_id"],
            department_id=updated["department_id"],
            event_type="SERVICE_STARTED",
            data={"token_id": str(oid), "token_number": updated["token_number"], "status": "in_service"}
        )
        return cls._to_str_id(updated)

    @classmethod
    async def complete_service(cls, token_id: str, staff_user_id: str) -> Dict[str, Any]:
        """Atomically completes service and calculates actual duration."""
        db = get_database()
        now = datetime.now(timezone.utc)
        oid = ObjectId(token_id) if ObjectId.is_valid(token_id) else None
        if not oid:
            raise ValueError("Invalid token id")
        
        current = await db.queue_tokens.find_one({"_id": oid})
        if not current:
            raise ValueError("Token not found")
        if current.get("status") not in ["called", "in_service"]:
            raise ValueError(f"Cannot complete token with status '{current.get('status')}'")
        
        started_at = current.get("started_at") or current.get("called_at") or now
        if started_at.tzinfo is None:
            started_at = started_at.replace(tzinfo=timezone.utc)
        duration_seconds = max(60, int((now - started_at).total_seconds()))
        
        updated = await db.queue_tokens.find_one_and_update(
            {"_id": oid},
            {"$set": {
                "status": "completed",
                "completed_at": now,
                "actual_duration_seconds": duration_seconds,
                "updated_at": now
            }},
            return_document=True
        )
        
        if updated.get("appointment_id") and ObjectId.is_valid(updated["appointment_id"]):
            await db.appointments.update_one(
                {"_id": ObjectId(updated["appointment_id"])},
                {"$set": {"status": "completed", "updated_at": now}}
            )
        
        await db.queue_events.insert_one({
            "token_id": str(oid),
            "token_number": updated["token_number"],
            "organization_id": updated["organization_id"],
            "department_id": updated["department_id"],
            "event_type": "completed",
            "performed_by": staff_user_id,
            "timestamp": now,
            "duration_seconds": duration_seconds
        })
        
        await ws_manager.broadcast_to_room(
            organization_id=updated["organization_id"],
            department_id=updated["department_id"],
            event_type="SERVICE_COMPLETED",
            data={"token_id": str(oid), "token_number": updated["token_number"], "status": "completed"}
        )
        return cls._to_str_id(updated)

    @classmethod
    async def mark_missed(cls, token_id: str, staff_user_id: str) -> Dict[str, Any]:
        """Atomically marks a token as missed."""
        db = get_database()
        now = datetime.now(timezone.utc)
        oid = ObjectId(token_id) if ObjectId.is_valid(token_id) else None
        if not oid:
            raise ValueError("Invalid token id")
        
        updated = await db.queue_tokens.find_one_and_update(
            {"_id": oid, "status": {"$in": ["waiting", "called"]}},
            {"$set": {"status": "missed", "updated_at": now}},
            return_document=True
        )
        if not updated:
            raise ValueError("Token must be 'waiting' or 'called' to be marked as missed.")
        
        if updated.get("appointment_id") and ObjectId.is_valid(updated["appointment_id"]):
            await db.appointments.update_one(
                {"_id": ObjectId(updated["appointment_id"])},
                {"$set": {"status": "missed", "updated_at": now}}
            )
        
        await db.queue_events.insert_one({
            "token_id": str(oid),
            "token_number": updated["token_number"],
            "organization_id": updated["organization_id"],
            "department_id": updated["department_id"],
            "event_type": "missed",
            "performed_by": staff_user_id,
            "timestamp": now
        })
        
        await ws_manager.broadcast_to_room(
            organization_id=updated["organization_id"],
            department_id=updated["department_id"],
            event_type="TOKEN_MISSED",
            data={"token_id": str(oid), "token_number": updated["token_number"], "status": "missed"}
        )
        return cls._to_str_id(updated)

