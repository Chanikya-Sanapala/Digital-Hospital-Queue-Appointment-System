from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional
from bson import ObjectId
from backend.core.database import get_database
from backend.services.queue_service import QueueService
from backend.services.websocket_manager import ws_manager
import logging

logger = logging.getLogger("queuesense.appointment_service")

class AppointmentService:
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
    async def get_service_availability(cls, service_id: str, date_str: str) -> Dict[str, Any]:
        db = get_database()
        service = await db.services.find_one({"_id": ObjectId(service_id)}) if ObjectId.is_valid(service_id) else None
        if not service:
            raise ValueError("Service not found")
        
        dept = await db.departments.find_one({"_id": ObjectId(service["department_id"])}) if ObjectId.is_valid(service.get("department_id")) else None
        
        # Standard daily operating hours: 09:00 to 17:00 (with lunch 13:00 - 14:00)
        # Duration from service
        duration_min = service.get("duration_minutes", 20)
        slots = []
        
        start_hour, start_min = 9, 0
        end_hour, end_min = 17, 0
        
        current_time = datetime.strptime(f"{date_str} {start_hour:02d}:{start_min:02d}", "%Y-%m-%d %H:%M")
        day_end = datetime.strptime(f"{date_str} {end_hour:02d}:{end_min:02d}", "%Y-%m-%d %H:%M")
        
        # Capacity per slot (default 3 concurrent patients per slot)
        slot_capacity = 3
        
        # Query existing appointments for this service and date
        existing_appointments = await db.appointments.find({
            "service_id": service_id,
            "appointment_date": date_str,
            "status": {"$nin": ["cancelled"]}
        }).to_list(length=500)
        
        slot_counts: Dict[str, int] = {}
        for app in existing_appointments:
            slot = app.get("time_slot")
            if slot:
                slot_counts[slot] = slot_counts.get(slot, 0) + 1
        
        while current_time + timedelta(minutes=duration_min) <= day_end:
            slot_end = current_time + timedelta(minutes=duration_min)
            slot_label = f"{current_time.strftime('%H:%M')} - {slot_end.strftime('%H:%M')}"
            
            # Skip lunch break 13:00 - 14:00
            if current_time.hour != 13:
                booked = slot_counts.get(slot_label, 0)
                available = booked < slot_capacity
                slots.append({
                    "time_slot": slot_label,
                    "available": available,
                    "booked_count": booked,
                    "capacity": slot_capacity
                })
            
            current_time = slot_end
        
        return {
            "date": date_str,
            "service_id": str(service["_id"]),
            "service_name": service["name"],
            "duration_minutes": duration_min,
            "slots": slots
        }

    @classmethod
    async def book_appointment(cls, user_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        db = get_database()
        now = datetime.now(timezone.utc)
        
        user = await db.users.find_one({"_id": ObjectId(user_id)}) if ObjectId.is_valid(user_id) else None
        if not user:
            raise ValueError("User not found")
        
        org = await db.organizations.find_one({"_id": ObjectId(data["organization_id"])}) if ObjectId.is_valid(data["organization_id"]) else None
        dept = await db.departments.find_one({"_id": ObjectId(data["department_id"])}) if ObjectId.is_valid(data["department_id"]) else None
        serv = await db.services.find_one({"_id": ObjectId(data["service_id"])}) if ObjectId.is_valid(data["service_id"]) else None
        
        if not org or not dept or not serv:
            raise ValueError("Invalid organization, department, or service selection.")
        
        # Check duplicate active booking for this user on this slot
        existing_user_app = await db.appointments.find_one({
            "user_id": user_id,
            "appointment_date": data["appointment_date"],
            "time_slot": data["time_slot"],
            "status": {"$nin": ["cancelled", "completed"]}
        })
        if existing_user_app:
            raise ValueError("You already have an active appointment booked for this time slot.")
        
        # Enforce slot capacity
        existing_slot_count = await db.appointments.count_documents({
            "service_id": data["service_id"],
            "appointment_date": data["appointment_date"],
            "time_slot": data["time_slot"],
            "status": {"$nin": ["cancelled"]}
        })
        if existing_slot_count >= 3:
            raise ValueError("This time slot has reached maximum capacity. Please choose another slot.")
        
        # Generate sequential token number for this department today
        today_str = data["appointment_date"]
        prefix = dept.get("queue_prefix", "Q").upper()
        
        # Count existing tokens today for this department to determine sequence
        count_today = await db.queue_tokens.count_documents({
            "department_id": data["department_id"],
            "appointment_date": today_str
        })
        sequence_num = count_today + 1
        token_number = f"{prefix}-{sequence_num:03d}"
        
        # Insert appointment
        app_doc = {
            "user_id": user_id,
            "customer_name": f"{user.get('first_name', '')} {user.get('last_name', '')}".strip() or user.get("username"),
            "customer_mobile": user.get("mobile", ""),
            "organization_id": data["organization_id"],
            "organization_name": org.get("name"),
            "department_id": data["department_id"],
            "department_name": dept.get("name"),
            "service_id": data["service_id"],
            "service_name": serv.get("name"),
            "appointment_date": data["appointment_date"],
            "time_slot": data["time_slot"],
            "token_number": token_number,
            "status": "booked",
            "notes": data.get("notes", ""),
            "created_at": now,
            "updated_at": now
        }
        
        res = await db.appointments.insert_one(app_doc)
        appointment_id = str(res.inserted_id)
        
        # Create queue token document
        token_doc = {
            "token_number": token_number,
            "sequence_number": sequence_num,
            "appointment_id": appointment_id,
            "user_id": user_id,
            "customer_name": app_doc["customer_name"],
            "customer_mobile": app_doc["customer_mobile"],
            "organization_id": data["organization_id"],
            "organization_name": org.get("name"),
            "department_id": data["department_id"],
            "department_name": dept.get("name"),
            "service_id": data["service_id"],
            "service_name": serv.get("name"),
            "appointment_date": data["appointment_date"],
            "appointment_time": data["time_slot"],
            "status": "waiting",
            "called_at": None,
            "started_at": None,
            "completed_at": None,
            "served_by_user_id": None,
            "created_at": now,
            "updated_at": now
        }
        
        t_res = await db.queue_tokens.insert_one(token_doc)
        token_id = str(t_res.inserted_id)
        
        # Link token_id in appointment
        await db.appointments.update_one(
            {"_id": res.inserted_id},
            {"$set": {"token_id": token_id}}
        )
        
        # Queue event & audit log
        await db.queue_events.insert_one({
            "token_id": token_id,
            "token_number": token_number,
            "organization_id": data["organization_id"],
            "department_id": data["department_id"],
            "event_type": "created",
            "performed_by": user_id,
            "timestamp": now,
            "details": {"source": "appointment_booking"}
        })
        
        # Broadcast queue update
        await ws_manager.broadcast_to_room(
            organization_id=data["organization_id"],
            department_id=data["department_id"],
            event_type="QUEUE_UPDATED",
            data={
                "action": "TOKEN_ADDED",
                "token_number": token_number,
                "token_id": token_id,
                "status": "waiting"
            }
        )
        
        app_doc["id"] = appointment_id
        app_doc["token_id"] = token_id
        return cls._to_str_id(app_doc)

    @classmethod
    async def cancel_appointment(cls, appointment_id: str, user_id: str, role: str) -> Dict[str, Any]:
        db = get_database()
        now = datetime.now(timezone.utc)
        oid = ObjectId(appointment_id) if ObjectId.is_valid(appointment_id) else None
        if not oid:
            raise ValueError("Invalid appointment id")
        
        app = await db.appointments.find_one({"_id": oid})
        if not app:
            raise ValueError("Appointment not found")
        
        if role != "admin" and role != "staff" and str(app.get("user_id")) != user_id:
            raise ValueError("Unauthorized to cancel this appointment.")
        
        if app.get("status") in ["completed", "in_service"]:
            raise ValueError(f"Cannot cancel an appointment that is already {app.get('status')}.")
        
        # Cancel appointment
        await db.appointments.update_one(
            {"_id": oid},
            {"$set": {"status": "cancelled", "updated_at": now}}
        )
        
        # Cancel linked token
        if app.get("token_id") and ObjectId.is_valid(app["token_id"]):
            await db.queue_tokens.update_one(
                {"_id": ObjectId(app["token_id"])},
                {"$set": {"status": "cancelled", "updated_at": now}}
            )
            
            # WS update
            await ws_manager.broadcast_to_room(
                organization_id=app["organization_id"],
                department_id=app["department_id"],
                event_type="TOKEN_CANCELLED",
                data={"token_id": app["token_id"], "token_number": app.get("token_number"), "status": "cancelled"}
            )
        
        return {"success": True, "message": "Appointment cancelled successfully."}

