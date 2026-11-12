from typing import Optional, List
from pydantic import BaseModel

class QueueTokenResponse(BaseModel):
    id: str
    token_number: str
    sequence_number: int
    appointment_id: Optional[str] = None
    user_id: str
    customer_name: str
    customer_mobile: str
    organization_id: str
    organization_name: Optional[str] = None
    department_id: str
    department_name: Optional[str] = None
    service_id: str
    service_name: Optional[str] = None
    status: str # waiting, called, in_service, completed, cancelled, missed
    appointment_date: Optional[str] = None
    appointment_time: Optional[str] = None
    position_in_queue: Optional[int] = None
    people_ahead: Optional[int] = None
    estimated_waiting_time_minutes: Optional[int] = None
    called_at: Optional[str] = None
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    created_at: str

class LiveQueueStatus(BaseModel):
    department_id: str
    department_name: str
    organization_id: str
    currently_serving_token: Optional[str] = None
    waiting_count: int
    in_service_count: int
    completed_today_count: int
    estimated_wait_per_person_minutes: int
    is_active: bool

class QueuePositionResponse(BaseModel):
    token_number: str
    status: str
    position: int
    people_ahead: int
    estimated_wait_minutes: Optional[int]
    currently_serving: Optional[str]
    department_name: str
    organization_name: str

