from typing import List, Dict, Any
from fastapi import APIRouter, HTTPException, status, Depends
from bson import ObjectId
from backend.core.database import get_database
from backend.core.security import get_current_token_payload
from backend.schemas.appointment import AppointmentCreate, AppointmentResponse
from backend.services.appointment_service import AppointmentService

router = APIRouter(prefix="/appointments", tags=["Appointments"])

def _to_dict(doc: Dict[str, Any]) -> Dict[str, Any]:
    if not doc:
        return doc
    d = dict(doc)
    d["id"] = str(d["_id"])
    del d["_id"]
    if "created_at" in d and hasattr(d["created_at"], "isoformat"):
        d["created_at"] = d["created_at"].isoformat()
    return d

@router.post("", response_model=Dict[str, Any])
async def book_appointment(
    data: AppointmentCreate,
    payload: Dict[str, Any] = Depends(get_current_token_payload)
):
    user_id = payload.get("sub")
    try:
        app = await AppointmentService.book_appointment(user_id=user_id, data=data.dict())
        return app
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.get("/me", response_model=List[Dict[str, Any]])
async def get_my_appointments(payload: Dict[str, Any] = Depends(get_current_token_payload)):
    user_id = payload.get("sub")
    db = get_database()
    apps = await db.appointments.find({"user_id": user_id}).sort("created_at", -1).to_list(length=100)
    return [_to_dict(a) for a in apps]

@router.get("/{app_id}")
async def get_appointment(
    app_id: str,
    payload: Dict[str, Any] = Depends(get_current_token_payload)
):
    db = get_database()
    oid = ObjectId(app_id) if ObjectId.is_valid(app_id) else None
    if not oid:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    app = await db.appointments.find_one({"_id": oid})
    if not app:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    # Ownership check
    if payload.get("role") not in ["admin", "staff"] and str(app.get("user_id")) != payload.get("sub"):
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    return _to_dict(app)

@router.patch("/{app_id}/cancel")
async def cancel_appointment(
    app_id: str,
    payload: Dict[str, Any] = Depends(get_current_token_payload)
):
    user_id = payload.get("sub")
    role = payload.get("role", "customer")
    try:
        res = await AppointmentService.cancel_appointment(appointment_id=app_id, user_id=user_id, role=role)
        return res
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

