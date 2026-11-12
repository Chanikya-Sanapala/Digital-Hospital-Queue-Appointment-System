from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, status, Depends
from bson import ObjectId
from backend.core.database import get_database
from backend.core.security import get_current_token_payload
from backend.schemas.department import (
    DepartmentCreate,
    DepartmentUpdate,
    DepartmentResponse
)

router = APIRouter(prefix="/departments", tags=["Departments"])

def _to_dict(doc: Dict[str, Any]) -> Dict[str, Any]:
    if not doc:
        return doc
    d = dict(doc)
    d["id"] = str(d["_id"])
    del d["_id"]
    return d

@router.get("", response_model=List[DepartmentResponse])
async def list_departments(organization_id: Optional[str] = None):
    db = get_database()
    query = {"is_active": True}
    if organization_id:
        query["organization_id"] = organization_id
    
    depts = await db.departments.find(query).to_list(length=100)
    results = []
    for d in depts:
        item = _to_dict(d)
        # Active tokens count
        active_tokens = await db.queue_tokens.count_documents({
            "department_id": item["id"],
            "status": {"$in": ["waiting", "called", "in_service"]}
        })
        item["active_tokens_count"] = active_tokens
        results.append(DepartmentResponse(**item))
    return results

@router.get("/{dept_id}", response_model=DepartmentResponse)
async def get_department(dept_id: str):
    db = get_database()
    oid = ObjectId(dept_id) if ObjectId.is_valid(dept_id) else None
    if not oid:
        raise HTTPException(status_code=404, detail="Department not found")
    
    dept = await db.departments.find_one({"_id": oid})
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
    
    item = _to_dict(dept)
    active_tokens = await db.queue_tokens.count_documents({
        "department_id": item["id"],
        "status": {"$in": ["waiting", "called", "in_service"]}
    })
    item["active_tokens_count"] = active_tokens
    return DepartmentResponse(**item)

@router.post("", response_model=DepartmentResponse)
async def create_department(
    data: DepartmentCreate,
    payload: Dict[str, Any] = Depends(get_current_token_payload)
):
    if payload.get("role") not in ["admin", "staff"]:
        raise HTTPException(status_code=403, detail="Staff/Admin privileges required")
    
    db = get_database()
    doc = data.dict()
    doc["code"] = doc["code"].upper()
    doc["queue_prefix"] = doc["queue_prefix"].upper()
    
    res = await db.departments.insert_one(doc)
    doc["id"] = str(res.inserted_id)
    doc["active_tokens_count"] = 0
    return DepartmentResponse(**doc)

@router.patch("/{dept_id}", response_model=DepartmentResponse)
async def update_department(
    dept_id: str,
    data: DepartmentUpdate,
    payload: Dict[str, Any] = Depends(get_current_token_payload)
):
    if payload.get("role") not in ["admin", "staff"]:
        raise HTTPException(status_code=403, detail="Staff/Admin privileges required")
    
    db = get_database()
    oid = ObjectId(dept_id) if ObjectId.is_valid(dept_id) else None
    if not oid:
        raise HTTPException(status_code=404, detail="Department not found")
    
    updates = {k: v for k, v in data.dict().items() if v is not None}
    if "code" in updates:
        updates["code"] = updates["code"].upper()
    if "queue_prefix" in updates:
        updates["queue_prefix"] = updates["queue_prefix"].upper()
    
    res = await db.departments.find_one_and_update(
        {"_id": oid},
        {"$set": updates},
        return_document=True
    )
    if not res:
        raise HTTPException(status_code=404, detail="Department not found")
    
    item = _to_dict(res)
    item["active_tokens_count"] = await db.queue_tokens.count_documents({
        "department_id": item["id"],
        "status": {"$in": ["waiting", "called", "in_service"]}
    })
    return DepartmentResponse(**item)

