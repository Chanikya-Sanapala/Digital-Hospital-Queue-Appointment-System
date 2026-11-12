from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, status, Depends, Query
from bson import ObjectId
from backend.core.database import get_database
from backend.core.security import get_current_token_payload
from backend.schemas.department import ServiceCreate, ServiceUpdate, ServiceResponse
from backend.schemas.appointment import AvailabilityResponse
from backend.services.appointment_service import AppointmentService

router = APIRouter(prefix="/services", tags=["Services"])

def _to_dict(doc: Dict[str, Any]) -> Dict[str, Any]:
    if not doc:
        return doc
    d = dict(doc)
    d["id"] = str(d["_id"])
    del d["_id"]
    return d

@router.get("", response_model=List[ServiceResponse])
async def list_services(department_id: Optional[str] = None, organization_id: Optional[str] = None):
    db = get_database()
    query = {"is_active": True}
    if department_id:
        query["department_id"] = department_id
    if organization_id:
        query["organization_id"] = organization_id
        
    services = await db.services.find(query).to_list(length=200)
    results = []
    for s in services:
        item = _to_dict(s)
        # Fetch department name
        if item.get("department_id") and ObjectId.is_valid(item["department_id"]):
            dept = await db.departments.find_one({"_id": ObjectId(item["department_id"])})
            if dept:
                item["department_name"] = dept.get("name")
        results.append(ServiceResponse(**item))
    return results

@router.get("/{service_id}", response_model=ServiceResponse)
async def get_service(service_id: str):
    db = get_database()
    oid = ObjectId(service_id) if ObjectId.is_valid(service_id) else None
    if not oid:
        raise HTTPException(status_code=404, detail="Service not found")
    
    s = await db.services.find_one({"_id": oid})
    if not s:
        raise HTTPException(status_code=404, detail="Service not found")
    
    item = _to_dict(s)
    if item.get("department_id") and ObjectId.is_valid(item["department_id"]):
        dept = await db.departments.find_one({"_id": ObjectId(item["department_id"])})
        if dept:
            item["department_name"] = dept.get("name")
    return ServiceResponse(**item)

@router.get("/{service_id}/availability", response_model=AvailabilityResponse)
async def get_service_availability(
    service_id: str,
    date: str = Query(..., description="Date in YYYY-MM-DD format")
):
    try:
        res = await AppointmentService.get_service_availability(service_id=service_id, date_str=date)
        return AvailabilityResponse(**res)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("", response_model=ServiceResponse)
async def create_service(
    data: ServiceCreate,
    payload: Dict[str, Any] = Depends(get_current_token_payload)
):
    if payload.get("role") not in ["admin", "staff"]:
        raise HTTPException(status_code=403, detail="Staff/Admin privileges required")
    
    db = get_database()
    doc = data.dict()
    res = await db.services.insert_one(doc)
    doc["id"] = str(res.inserted_id)
    return ServiceResponse(**doc)

@router.patch("/{service_id}", response_model=ServiceResponse)
async def update_service(
    service_id: str,
    data: ServiceUpdate,
    payload: Dict[str, Any] = Depends(get_current_token_payload)
):
    if payload.get("role") not in ["admin", "staff"]:
        raise HTTPException(status_code=403, detail="Staff/Admin privileges required")
    
    db = get_database()
    oid = ObjectId(service_id) if ObjectId.is_valid(service_id) else None
    if not oid:
        raise HTTPException(status_code=404, detail="Service not found")
    
    updates = {k: v for k, v in data.dict().items() if v is not None}
    res = await db.services.find_one_and_update(
        {"_id": oid},
        {"$set": updates},
        return_document=True
    )
    if not res:
        raise HTTPException(status_code=404, detail="Service not found")
    return ServiceResponse(**_to_dict(res))

