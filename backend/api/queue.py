from typing import Dict, Any, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, status, Depends
from bson import ObjectId
from backend.core.database import get_database
from backend.core.security import get_current_token_payload
from backend.services.queue_service import QueueService

router = APIRouter(prefix="/queue", tags=["Queue"])

def _to_dict(doc: Dict[str, Any]) -> Dict[str, Any]:
    if not doc:
        return doc
    d = dict(doc)
    d["id"] = str(d["_id"])
    del d["_id"]
    for date_field in ["created_at", "updated_at", "called_at", "started_at", "completed_at"]:
        if date_field in d and hasattr(d[date_field], "isoformat"):
            d[date_field] = d[date_field].isoformat()
    return d

@router.get("/active/me")
async def get_my_active_token(payload: Dict[str, Any] = Depends(get_current_token_payload)):
    """Retrieves the customer's currently active waiting or called queue token."""
    user_id = payload.get("sub")
    db = get_database()
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    
    token = await db.queue_tokens.find_one({
        "user_id": user_id,
        "status": {"$in": ["waiting", "called", "in_service"]},
        "created_at": {"$gte": today_start}
    }, sort=[("created_at", -1)])
    
    if not token:
        return {"has_active": False, "token": None}
    
    pos_info = await QueueService.get_queue_position(str(token["_id"]))
    d = _to_dict(token)
    d["position_info"] = pos_info
    return {"has_active": True, "token": d}

@router.get("/{token_id}")
async def get_token_details(
    token_id: str,
    payload: Dict[str, Any] = Depends(get_current_token_payload)
):
    db = get_database()
    oid = ObjectId(token_id) if ObjectId.is_valid(token_id) else None
    query = {"_id": oid} if oid else {"token_number": token_id}
    
    token = await db.queue_tokens.find_one(query)
    if not token:
        raise HTTPException(status_code=404, detail="Queue token not found")
    
    pos_info = await QueueService.get_queue_position(str(token["_id"]))
    d = _to_dict(token)
    d["position_in_queue"] = pos_info.get("position")
    d["people_ahead"] = pos_info.get("people_ahead")
    d["estimated_waiting_time_minutes"] = pos_info.get("estimated_wait_minutes")
    d["currently_serving"] = pos_info.get("currently_serving")
    return d

@router.get("/{token_id}/position")
async def get_token_position(token_id: str):
    try:
        return await QueueService.get_queue_position(token_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/status/{department_id}")
async def get_department_queue_status(department_id: str):
    db = get_database()
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    
    dept = await db.departments.find_one({"_id": ObjectId(department_id)}) if ObjectId.is_valid(department_id) else None
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
    
    waiting_count = await db.queue_tokens.count_documents({
        "department_id": department_id,
        "status": "waiting",
        "created_at": {"$gte": today_start}
    })
    
    in_service_count = await db.queue_tokens.count_documents({
        "department_id": department_id,
        "status": "in_service",
        "created_at": {"$gte": today_start}
    })
    
    completed_count = await db.queue_tokens.count_documents({
        "department_id": department_id,
        "status": "completed",
        "created_at": {"$gte": today_start}
    })
    
    active_serving = await db.queue_tokens.find_one({
        "department_id": department_id,
        "status": {"$in": ["called", "in_service"]},
        "created_at": {"$gte": today_start}
    }, sort=[("sequence_number", 1)])
    
    avg_duration = await QueueService.get_average_service_duration(department_id)
    
    return {
        "department_id": department_id,
        "department_name": dept.get("name"),
        "organization_id": dept.get("organization_id"),
        "currently_serving_token": active_serving.get("token_number") if active_serving else None,
        "waiting_count": waiting_count,
        "in_service_count": in_service_count,
        "completed_today_count": completed_count,
        "estimated_wait_per_person_minutes": avg_duration,
        "is_active": dept.get("is_active", True)
    }

