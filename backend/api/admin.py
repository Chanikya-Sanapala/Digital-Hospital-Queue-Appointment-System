from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, status, Depends, Query
from bson import ObjectId
from backend.core.database import get_database
from backend.core.security import get_current_token_payload
from backend.services.queue_service import QueueService
from backend.services.analytics_service import AnalyticsService

router = APIRouter(prefix="/admin", tags=["Admin Operations"])

def check_admin_or_staff(payload: Dict[str, Any]):
    if payload.get("role") not in ["admin", "staff"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted to staff or administrators."
        )

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

@router.get("/dashboard")
async def get_admin_dashboard(payload: Dict[str, Any] = Depends(get_current_token_payload)):
    check_admin_or_staff(payload)
    db = get_database()
    org_id = payload.get("organization_id")
    
    # 4 Key Metrics
    metrics = await AnalyticsService.get_admin_metrics(organization_id=org_id)
    
    # Active Queues Table snippet (waiting or in_service)
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    queue_filter: Dict[str, Any] = {
        "status": {"$in": ["waiting", "called", "in_service"]},
        "created_at": {"$gte": today_start}
    }
    if org_id:
        queue_filter["organization_id"] = org_id
        
    active_queues = await db.queue_tokens.find(queue_filter).sort([("sequence_number", 1)]).to_list(length=15)
    
    # Recent Appointments Table snippet
    app_filter: Dict[str, Any] = {}
    if org_id:
        app_filter["organization_id"] = org_id
    recent_apps = await db.appointments.find(app_filter).sort("created_at", -1).to_list(length=10)
    
    # Department performance summary
    report = await AnalyticsService.get_analytics_report(organization_id=org_id, days=1)
    
    return {
        "metrics": metrics,
        "active_queues": [_to_dict(q) for q in active_queues],
        "recent_appointments": [_to_dict(a) for a in recent_apps],
        "department_summary": report.get("department_performance", [])
    }

@router.get("/appointments")
async def list_admin_appointments(
    date: Optional[str] = None,
    status_filter: Optional[str] = None,
    department_id: Optional[str] = None,
    payload: Dict[str, Any] = Depends(get_current_token_payload)
):
    check_admin_or_staff(payload)
    db = get_database()
    query: Dict[str, Any] = {}
    
    if payload.get("organization_id"):
        query["organization_id"] = payload.get("organization_id")
    if date:
        query["appointment_date"] = date
    if status_filter:
        query["status"] = status_filter
    if department_id:
        query["department_id"] = department_id
        
    apps = await db.appointments.find(query).sort("created_at", -1).to_list(length=200)
    return [_to_dict(a) for a in apps]

@router.get("/queues")
async def list_admin_queues(
    department_id: Optional[str] = None,
    status_filter: Optional[str] = None,
    payload: Dict[str, Any] = Depends(get_current_token_payload)
):
    check_admin_or_staff(payload)
    db = get_database()
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    
    query: Dict[str, Any] = {"created_at": {"$gte": today_start}}
    if payload.get("organization_id"):
        query["organization_id"] = payload.get("organization_id")
    if department_id:
        query["department_id"] = department_id
    if status_filter:
        query["status"] = status_filter
        
    tokens = await db.queue_tokens.find(query).sort([("status", 1), ("sequence_number", 1)]).to_list(length=200)
    return [_to_dict(t) for t in tokens]

@router.post("/queues/{department_id}/call-next")
async def call_next_queue(
    department_id: str,
    payload: Dict[str, Any] = Depends(get_current_token_payload)
):
    check_admin_or_staff(payload)
    staff_id = payload.get("sub")
    
    # Get organization_id for department
    db = get_database()
    dept = await db.departments.find_one({"_id": ObjectId(department_id)}) if ObjectId.is_valid(department_id) else None
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
    
    org_id = dept.get("organization_id")
    try:
        res = await QueueService.call_next(
            department_id=department_id,
            staff_user_id=staff_id,
            organization_id=org_id
        )
        return res
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.patch("/tokens/{token_id}/start")
async def start_token_service(
    token_id: str,
    payload: Dict[str, Any] = Depends(get_current_token_payload)
):
    check_admin_or_staff(payload)
    try:
        return await QueueService.start_service(token_id=token_id, staff_user_id=payload.get("sub"))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.patch("/tokens/{token_id}/complete")
async def complete_token_service(
    token_id: str,
    payload: Dict[str, Any] = Depends(get_current_token_payload)
):
    check_admin_or_staff(payload)
    try:
        return await QueueService.complete_service(token_id=token_id, staff_user_id=payload.get("sub"))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.patch("/tokens/{token_id}/missed")
async def mark_token_missed(
    token_id: str,
    payload: Dict[str, Any] = Depends(get_current_token_payload)
):
    check_admin_or_staff(payload)
    try:
        return await QueueService.mark_missed(token_id=token_id, staff_user_id=payload.get("sub"))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/analytics")
async def get_admin_analytics(
    days: int = Query(default=7, ge=1, le=90),
    payload: Dict[str, Any] = Depends(get_current_token_payload)
):
    check_admin_or_staff(payload)
    org_id = payload.get("organization_id")
    return await AnalyticsService.get_analytics_report(organization_id=org_id, days=days)

@router.get("/customers")
async def list_customers(payload: Dict[str, Any] = Depends(get_current_token_payload)):
    check_admin_or_staff(payload)
    db = get_database()
    users = await db.users.find({"role": "customer"}).sort("created_at", -1).to_list(length=100)
    clean_users = []
    for u in users:
        d = _to_dict(u)
        if "password_hash" in d:
            del d["password_hash"]
        clean_users.append(d)
    return clean_users

