from typing import Optional, List
from pydantic import BaseModel, Field

class DepartmentBase(BaseModel):
    organization_id: str
    branch_id: Optional[str] = None
    name: str = Field(..., min_length=2, max_length=100)
    code: str = Field(..., min_length=2, max_length=20)
    description: Optional[str] = ""
    floor: Optional[str] = ""
    room_number: Optional[str] = ""
    queue_prefix: str = Field(default="Q", max_length=5)
    max_daily_capacity: int = Field(default=100, ge=1)
    is_active: bool = True

class DepartmentCreate(DepartmentBase):
    pass

class DepartmentUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    description: Optional[str] = None
    floor: Optional[str] = None
    room_number: Optional[str] = None
    queue_prefix: Optional[str] = None
    max_daily_capacity: Optional[int] = None
    is_active: Optional[bool] = None

class DepartmentResponse(DepartmentBase):
    id: str
    active_tokens_count: Optional[int] = 0

class ServiceBase(BaseModel):
    organization_id: str
    department_id: str
    name: str = Field(..., min_length=2, max_length=100)
    description: Optional[str] = ""
    duration_minutes: int = Field(default=15, ge=5, le=180)
    price: float = Field(default=0.0, ge=0)
    is_active: bool = True

class ServiceCreate(ServiceBase):
    pass

class ServiceUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    duration_minutes: Optional[int] = None
    price: Optional[float] = None
    is_active: Optional[bool] = None

class ServiceResponse(ServiceBase):
    id: str
    department_name: Optional[str] = None

