from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, status, Depends
from bson import ObjectId
from backend.core.database import get_database
from backend.core.security import get_current_token_payload
from backend.schemas.organization import (
    OrganizationCreate,
    OrganizationUpdate,
    OrganizationResponse,
    BranchCreate,
    BranchResponse
)

router = APIRouter(prefix="/organizations", tags=["Organizations"])

def _to_dict(doc: Dict[str, Any]) -> Dict[str, Any]:
    if not doc:
        return doc
    d = dict(doc)
    d["id"] = str(d["_id"])
    del d["_id"]
    if "created_at" in d and hasattr(d["created_at"], "isoformat"):
        d["created_at"] = d["created_at"].isoformat()
    return d

@router.get("", response_model=List[OrganizationResponse])
async def list_organizations(active_only: bool = True):
    db = get_database()
    query = {"is_active": True} if active_only else {}
    orgs = await db.organizations.find(query).to_list(length=100)
    
    result = []
    for org in orgs:
        d = _to_dict(org)
        # Count departments
        count = await db.departments.count_documents({"organization_id": d["id"], "is_active": True})
        d["department_count"] = count
        result.append(OrganizationResponse(**d))
    return result

@router.get("/{org_id}", response_model=OrganizationResponse)
async def get_organization(org_id: str):
    db = get_database()
    oid = ObjectId(org_id) if ObjectId.is_valid(org_id) else None
    if not oid:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    org = await db.organizations.find_one({"_id": oid})
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    d = _to_dict(org)
    count = await db.departments.count_documents({"organization_id": d["id"], "is_active": True})
    d["department_count"] = count
    return OrganizationResponse(**d)

@router.get("/{org_id}/services")
async def get_organization_services(org_id: str):
    db = get_database()
    services = await db.services.find({"organization_id": org_id, "is_active": True}).to_list(length=200)
    results = []
    for s in services:
        results.append(_to_dict(s))
    return results

@router.get("/{org_id}/departments")
async def get_organization_departments(org_id: str):
    db = get_database()
    departments = await db.departments.find({"organization_id": org_id, "is_active": True}).to_list(length=100)
    results = []
    for dep in departments:
        results.append(_to_dict(dep))
    return results

@router.post("", response_model=OrganizationResponse)
async def create_organization(
    data: OrganizationCreate,
    payload: Dict[str, Any] = Depends(get_current_token_payload)
):
    if payload.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin privileges required")
    
    db = get_database()
    if await db.organizations.find_one({"code": data.code.upper()}):
        raise HTTPException(status_code=400, detail="Organization code already in use")
    
    doc = data.dict()
    doc["code"] = doc["code"].upper()
    res = await db.organizations.insert_one(doc)
    doc["id"] = str(res.inserted_id)
    doc["department_count"] = 0
    return OrganizationResponse(**doc)

@router.patch("/{org_id}", response_model=OrganizationResponse)
async def update_organization(
    org_id: str,
    data: OrganizationUpdate,
    payload: Dict[str, Any] = Depends(get_current_token_payload)
):
    if payload.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin privileges required")
    
    db = get_database()
    oid = ObjectId(org_id) if ObjectId.is_valid(org_id) else None
    if not oid:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    updates = {k: v for k, v in data.dict().items() if v is not None}
    if "code" in updates:
        updates["code"] = updates["code"].upper()
    
    res = await db.organizations.find_one_and_update(
        {"_id": oid},
        {"$set": updates},
        return_document=True
    )
    if not res:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    d = _to_dict(res)
    count = await db.departments.count_documents({"organization_id": d["id"], "is_active": True})
    d["department_count"] = count
    return OrganizationResponse(**d)
