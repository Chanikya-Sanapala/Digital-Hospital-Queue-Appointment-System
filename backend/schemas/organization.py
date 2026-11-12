from typing import Optional, List, Union
from datetime import datetime
from pydantic import BaseModel, Field

class OrganizationBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    code: str = Field(..., min_length=2, max_length=20)
    address: str
    city: str
    contact_phone: str
    contact_email: str
    is_active: bool = True

class OrganizationCreate(OrganizationBase):
    pass

class OrganizationUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    is_active: Optional[bool] = None

class OrganizationResponse(OrganizationBase):
    id: str
    created_at: Optional[Union[str, datetime]] = None
    department_count: Optional[int] = 0

class BranchBase(BaseModel):
    organization_id: str
    name: str
    address: str
    is_active: bool = True

class BranchCreate(BranchBase):
    pass

class BranchResponse(BranchBase):
    id: str
