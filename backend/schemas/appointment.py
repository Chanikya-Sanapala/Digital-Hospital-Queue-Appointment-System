from typing import Optional, List
from pydantic import BaseModel, Field

class AppointmentCreate(BaseModel):
    organization_id: str
    department_id: str
    service_id: str
    appointment_date: str # YYYY-MM-DD
    time_slot: str # e.g. "09:30 - 10:00"
    notes: Optional[str] = None

class AppointmentResponse(BaseModel):
    id: str
    user_id: str
    customer_name: Optional[str] = None
    customer_mobile: Optional[str] = None
    organization_id: str
    organization_name: Optional[str] = None
    department_id: str
    department_name: Optional[str] = None
    service_id: str
    service_name: Optional[str] = None
    appointment_date: str
    time_slot: str
    token_id: Optional[str] = None
    token_number: Optional[str] = None
    status: str # booked, in_service, completed, cancelled, missed
    notes: Optional[str] = None
    created_at: str

class SlotAvailability(BaseModel):
    time_slot: str
    available: bool
    booked_count: int
    capacity: int

class AvailabilityResponse(BaseModel):
    date: str
    service_id: str
    service_name: str
    duration_minutes: int
    slots: List[SlotAvailability]

